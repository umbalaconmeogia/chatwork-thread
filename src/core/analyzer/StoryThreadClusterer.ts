import { DatabaseManager } from '../database/DatabaseManager';
import type { Message, RelationshipType, ThreadKind } from '../types/chatwork';
import {
  extractReplyQuoteTargetMessageIds,
  detectRelationshipType,
  isExcludedFromStoryClustering,
} from './chatworkMessageLinks';

const ORPHAN_THREAD_KIND = 'orphan' as const satisfies NonNullable<ThreadKind>;

export interface StoryClusterStats {
  storyThreadsCreated: number;
  totalMessagesInStories: number;
  componentCount: number;
  singletonCount: number;
  components: { size: number }[];
  /** Root messages not placed in any story cluster (same as orphan bucket size when written). */
  orphanMessageCount: number;
  /** Whether an orphan bucket thread was created (or would be in dry-run). */
  orphanThreadCreated: boolean;
}

class UnionFind {
  private parent = new Map<string, string>();

  find(x: string): string {
    let p = this.parent.get(x);
    if (p === undefined) {
      this.parent.set(x, x);
      return x;
    }
    if (p !== x) {
      p = this.find(p);
      this.parent.set(x, p);
    }
    return p;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) {
      this.parent.set(ra, rb);
    }
  }
}

function storyTitleFromMessage(msg: Message): string {
  const raw = (msg.content || '').replace(/\s+/g, ' ').trim();
  const snippet = raw.length > 60 ? `${raw.slice(0, 60)}…` : raw || '(empty)';
  return `Story: ${snippet}`;
}

export class StoryThreadClusterer {
  /**
   * Cluster messages of a root thread into story threads (DB-only).
   * Remaining messages go into one `thread_kind = orphan` child thread.
   * @param dryRun when true, no writes; returns planned stats
   */
  static clusterRootThread(
    db: DatabaseManager,
    rootThreadId: number,
    options: { dryRun?: boolean; minSize?: number } = {}
  ): StoryClusterStats {
    const dryRun = options.dryRun === true;
    const minSize = options.minSize ?? 2;

    const root = db.getThreadSync(rootThreadId);
    if (!root) {
      throw new Error(`Thread ${rootThreadId} not found`);
    }
    if (root.parent_thread_id != null && root.parent_thread_id !== undefined) {
      throw new Error(
        `Thread ${rootThreadId} is a story thread (parent_thread_id=${root.parent_thread_id}). Use the root thread id.`
      );
    }

    const messages = db.getThreadMessagesSync(rootThreadId);
    if (messages.length === 0) {
      return {
        storyThreadsCreated: 0,
        totalMessagesInStories: 0,
        componentCount: 0,
        singletonCount: 0,
        components: [],
        orphanMessageCount: 0,
        orphanThreadCreated: false,
      };
    }

    const clusterMessages = messages.filter((m) => !isExcludedFromStoryClustering(m.content));
    if (clusterMessages.length === 0) {
      if (!dryRun) {
        db.executeInTransaction(() => {
          db.deleteThreadsByParentIdSync(rootThreadId);
          db.touchThreadUpdatedAtSync(rootThreadId);
        });
      }
      return {
        storyThreadsCreated: 0,
        totalMessagesInStories: 0,
        componentCount: 0,
        singletonCount: 0,
        components: [],
        orphanMessageCount: 0,
        orphanThreadCreated: false,
      };
    }

    const rootRoomId = root.room_id ?? null;
    if (rootRoomId) {
      const bad = messages.filter((m) => m.room_id !== rootRoomId);
      if (bad.length > 0) {
        throw new Error(
          `Root thread has room_id=${rootRoomId} but ${bad.length} message(s) have a different room_id. Fix data or clear threads.room_id on root.`
        );
      }
    }

    const idSet = new Set(messages.map((m) => m.id));
    const uf = new UnionFind();

    for (const m of messages) {
      uf.find(m.id);
      const targets = extractReplyQuoteTargetMessageIds(m.content);
      for (const t of targets) {
        if (t === m.id) continue;
        if (!idSet.has(t)) continue;
        uf.union(m.id, t);
      }
    }

    const groups = new Map<string, Message[]>();
    for (const m of messages) {
      const r = uf.find(m.id);
      const arr = groups.get(r);
      if (arr) arr.push(m);
      else groups.set(r, [m]);
    }

    const components = [...groups.values()].map((g) => ({ size: g.length }));
    const multi = [...groups.values()].filter((g) => g.length >= minSize);
    const singletonCount = [...groups.values()].filter((g) => g.length < minSize).length;

    const inStoryIds = new Set<string>();
    for (const g of multi) {
      for (const m of g) {
        inStoryIds.add(m.id);
      }
    }
    const orphans = clusterMessages
      .filter((m) => !inStoryIds.has(m.id))
      .sort((a, b) => a.send_time - b.send_time);
    const orphanMessageCount = orphans.length;
    const orphanThreadCreated = orphanMessageCount > 0;

    if (dryRun) {
      return {
        storyThreadsCreated: multi.length,
        totalMessagesInStories: multi.reduce((s, g) => s + g.length, 0),
        componentCount: multi.length,
        singletonCount,
        components: multi.map((g) => ({ size: g.length })),
        orphanMessageCount,
        orphanThreadCreated,
      };
    }

    db.executeInTransaction(() => {
      db.deleteThreadsByParentIdSync(rootThreadId);

      for (const group of multi) {
        group.sort((a, b) => a.send_time - b.send_time);
        const anchor = group[0];
        const title = storyTitleFromMessage(anchor);
        const storyThread = db.createThreadSync(title, undefined, {
          roomId: rootRoomId,
          parentThreadId: rootThreadId,
        });

        for (let i = 0; i < group.length; i++) {
          const msg = group[i];
          let rel: RelationshipType;
          if (i === 0) {
            rel = 'root';
          } else {
            const detected = detectRelationshipType(msg.content);
            rel = detected === 'manual' ? 'reply' : detected;
          }
          db.addMessageToThreadSync(storyThread.id, msg.id, rel);
        }
      }

      if (orphans.length > 0) {
        const orphanThread = db.createThreadSync(
          'Orphan messages',
          'Messages in this root not grouped into a story by reply/quote (auto; re-run create thread-stories to refresh)',
          {
            roomId: rootRoomId,
            parentThreadId: rootThreadId,
            threadKind: ORPHAN_THREAD_KIND,
          }
        );
        for (let i = 0; i < orphans.length; i++) {
          db.addMessageToThreadSync(
            orphanThread.id,
            orphans[i].id,
            i === 0 ? 'root' : 'manual'
          );
        }
      }

      db.touchThreadUpdatedAtSync(rootThreadId);
    });

    return {
      storyThreadsCreated: multi.length,
      totalMessagesInStories: multi.reduce((s, g) => s + g.length, 0),
      componentCount: multi.length,
      singletonCount,
      components: multi.map((g) => ({ size: g.length })),
      orphanMessageCount,
      orphanThreadCreated,
    };
  }
}
