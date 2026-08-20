import type { RelationshipType } from '../types/chatwork';

/**
 * Message IDs referenced by structural reply/quote markers only (excludes [To:account] / [picon:]).
 * Used for story clustering to reduce false edges.
 */
export function extractReplyQuoteTargetMessageIds(content: string): string[] {
  const messageIds: string[] = [];
  const patterns = [
    /返信[：:]\s*(\d+)/g,
    /引用[：:]\s*(\d+)/g,
    /\[reply\s+time=\d+\s+to=(\d+)\]/g,
    /\[rp\s+aid=\d+\s+to=\d+-(\d+)\]/g,
    /\[qt\]\[qtmeta\s+aid=\d+\s+time=\d+\s+to=\d+-(\d+)\]/g,
    /rid\d+-(\d+)/g,
    /to=\d+-(\d+)/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((match = re.exec(content)) !== null) {
      messageIds.push(match[1]);
    }
  }

  return [...new Set(messageIds)];
}

/** Full extraction (mentions, picon, text patterns, etc.) — same semantics as legacy ThreadAnalyzer. */
export function extractMessageIds(content: string): string[] {
  const messageIds: string[] = [];
  const patterns = [
    /返信[：:]\s*(\d+)/g,
    /引用[：:]\s*(\d+)/g,
    /message[：:]\s*(\d+)/g,
    /msg[：:]\s*(\d+)/g,
    /\[To:(\d+)\]/g,
    /\[picon:(\d+)\]/g,
    /\[reply\s+time=\d+\s+to=(\d+)\]/g,
    /\[rp\s+aid=\d+\s+to=\d+-(\d+)\]/g,
    /\[qt\]\[qtmeta\s+aid=\d+\s+time=\d+\s+to=\d+-(\d+)\]/g,
    /rid\d+-(\d+)/g,
    /to=\d+-(\d+)/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((match = re.exec(content)) !== null) {
      messageIds.push(match[1]);
    }
  }

  return [...new Set(messageIds)];
}

export function detectRelationshipType(content: string): RelationshipType {
  if (content.includes('返信') || content.includes('[reply')) return 'reply';
  if (content.includes('引用') || content.includes('[To:')) return 'quote';
  return 'manual';
}

/**
 * System / room notices that must not participate in story clustering or the orphan bucket.
 * Covers Chatwork markup (see ShowCommand / chatworkHtmlFormat) and plain "User {digits} joined the group."
 */
export function isExcludedFromStoryClustering(content: string | null | undefined): boolean {
  const c = content ?? '';
  if (c.includes('dtext:chatroom_groupchat_created')) return true;
  if (/User\s+\d+\s+joined the group\./.test(c)) return true;
  if (
    /\[info\]\[dtext:chatroom_member_is\]\[piconname:\d+\]\[dtext:chatroom_added\]\[\/info\]/.test(c)
  )
    return true;
  if (
    /\[info\]\[dtext:chatroom_chat_edited\]\[piconname:\d+\]\[dtext:chatroom_added\]\[\/info\]/.test(c)
  )
    return true;
  if (
    /\[info\]\[title\]\[dtext:chatroom_chat_edited\]\[\/title\]\[dtext:chatroom_member_is\]\[piconname:\d+\]\[dtext:chatroom_added\]\[\/info\]/.test(
      c
    )
  )
    return true;
  return false;
}
