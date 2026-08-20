import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Find a .env file by walking up from several start directories (cwd, src/gui, repo root).
 * Parses DATABASE_PATH from that file so it wins over stale process.env (dotenv default is no override).
 */
export function loadCliEnv() {
    const seeds = [
        process.cwd(),
        path.resolve(__dirname, '..'),
        path.resolve(__dirname, '../..'),
        path.resolve(__dirname, '../../..'),
    ];
    const visitedRoots = new Set();
    for (const start of seeds) {
        let current = path.resolve(start);
        for (let i = 0; i < 12; i++) {
            if (visitedRoots.has(current)) {
                break;
            }
            visitedRoots.add(current);
            const envPath = path.join(current, '.env');
            if (fs.existsSync(envPath)) {
                const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
                dotenv.config({ path: envPath, override: true });
                return { envPath, root: current, parsed };
            }
            const parent = path.dirname(current);
            if (parent === current) {
                break;
            }
            current = parent;
        }
    }
    dotenv.config({ override: true });
    return { envPath: null, root: process.cwd(), parsed: {} };
}

export function resolveDatabasePath(envRoot, parsedFromEnvFile = {}) {
    const raw =
        parsedFromEnvFile.DATABASE_PATH ||
        process.env.DATABASE_PATH ||
        './data/chatwork-thread.db';
    return path.isAbsolute(raw) ? raw : path.resolve(envRoot, raw);
}

function allRows(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const out = [];
    while (stmt.step()) {
        out.push(stmt.getAsObject());
    }
    stmt.free();
    return out;
}

function getRow(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (!stmt.step()) {
        stmt.free();
        return null;
    }
    const row = stmt.getAsObject();
    stmt.free();
    return row;
}

/**
 * Open the CLI SQLite file using sql.js (WASM — no native compile; works on Windows without VS Build Tools).
 */
export async function openCliDatabase() {
    const { envPath, root, parsed } = loadCliEnv();
    const dbPath = resolveDatabasePath(root, parsed);
    console.log('[CLI DB] .env:', envPath ?? '(not found; using process env only)');
    console.log('[CLI DB] DATABASE_PATH →', dbPath);

    if (!fs.existsSync(dbPath)) {
        console.log('[CLI DB] file not found — thread list falls back to electron-store');
        return { db: null, dbPath, envPath, envRoot: root, persist: null };
    }

    try {
        const wasmDir = path.join(__dirname, '../node_modules/sql.js/dist');
        const SQL = await initSqlJs({
            locateFile: (file) => path.join(wasmDir, file),
        });
        const fileBuf = fs.readFileSync(dbPath);
        const db = new SQL.Database(fileBuf);
        const persist = () => {
            const data = db.export();
            fs.writeFileSync(dbPath, Buffer.from(data));
        };
        return { db, dbPath, envPath, envRoot: root, persist };
    } catch (err) {
        console.error('[CLI DB] open failed:', err.message);
        return { db: null, dbPath, envPath, envRoot: root, persist: null, error: err.message };
    }
}

function sendTimeToIso(sendTime) {
    const n = Number(sendTime);
    if (!Number.isFinite(n)) {
        return new Date().toISOString();
    }
    const ms = n < 1e12 ? n * 1000 : n;
    return new Date(ms).toISOString();
}

export function createCliDbApi(db, persist) {
    return {
        getThreadsList() {
            // Single scan with JOIN — avoid correlated COUNT per row (very slow in sql.js).
            const rows = allRows(
                db,
                `
        SELECT t.id, t.name, t.created_at, t.updated_at, t.parent_thread_id, t.room_id, t.thread_kind,
          COUNT(tm.message_id) AS message_count
        FROM threads t
        LEFT JOIN thread_messages tm ON tm.thread_id = t.id
        GROUP BY t.id, t.name, t.created_at, t.updated_at, t.parent_thread_id, t.room_id, t.thread_kind
        ORDER BY t.updated_at DESC
        LIMIT 500
      `
            );
            return rows.map((r) => ({
                id: r.id,
                name: r.name,
                created_at: r.created_at,
                updated_at: r.updated_at,
                parent_thread_id:
                    r.parent_thread_id != null && r.parent_thread_id !== ''
                        ? Number(r.parent_thread_id)
                        : null,
                room_id: r.room_id != null && r.room_id !== '' ? String(r.room_id) : null,
                message_count: Number(r.message_count) || 0,
            }));
        },

        getThreadDetail(threadId) {
            const id = Number(threadId);
            if (!Number.isFinite(id)) {
                return null;
            }

            const row = getRow(db, 'SELECT * FROM threads WHERE id = ?', [id]);
            if (!row) {
                return null;
            }

            const messages = allRows(
                db,
                `
        SELECT m.id, m.content, m.send_time, m.sender_name, m.room_id, m.sender_id
        FROM messages m
        INNER JOIN thread_messages tm ON m.id = tm.message_id
        WHERE tm.thread_id = ?
        ORDER BY m.send_time ASC
      `,
                [id]
            );

            return {
                id: row.id,
                name: row.name,
                description: row.description,
                created_at: row.created_at,
                updated_at: row.updated_at,
                parent_thread_id:
                    row.parent_thread_id != null && row.parent_thread_id !== ''
                        ? Number(row.parent_thread_id)
                        : null,
                room_id: row.room_id != null && row.room_id !== '' ? String(row.room_id) : null,
                thread_kind: row.thread_kind === 'orphan' ? 'orphan' : null,
                data: {
                    messages: messages.map((m) => ({
                        id: m.id,
                        content: m.content,
                        sender: m.sender_name || 'Unknown',
                        sender_name: m.sender_name,
                        sender_id: m.sender_id,
                        room_id: m.room_id,
                        send_time: m.send_time,
                        timestamp: sendTimeToIso(m.send_time),
                    })),
                },
            };
        },

        deleteThread(threadId) {
            if (typeof persist !== 'function') {
                throw new Error('persist not available');
            }
            const id = Number(threadId);
            if (!Number.isFinite(id)) {
                return false;
            }
            const exists = getRow(db, 'SELECT id FROM threads WHERE id = ?', [id]);
            if (!exists) {
                return false;
            }
            const delTm = db.prepare('DELETE FROM thread_messages WHERE thread_id = ?');
            delTm.run([id]);
            delTm.free();
            const delT = db.prepare('DELETE FROM threads WHERE id = ?');
            delT.run([id]);
            delT.free();
            persist();
            return true;
        },

        exportThreadsJson() {
            const rows = allRows(db, 'SELECT id FROM threads ORDER BY updated_at DESC');
            return rows
                .map((r) => this.getThreadDetail(r.id))
                .filter(Boolean);
        },
    };
}
