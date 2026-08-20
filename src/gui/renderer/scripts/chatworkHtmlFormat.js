/**
 * Mirrors CLI HTML body formatting from ShowCommand.formatAsHtml (formatContent).
 * Keep in sync when export HTML rules change.
 */
(function (global) {
    'use strict';

    function normalizeId(s) {
        if (typeof s !== 'string') {
            s = String(s);
        }
        return /^\d+\.0$/.test(s) ? s.slice(0, -2) : s;
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function parseGenericInfoBlocks(s, replacer) {
        const open = '[info]';
        const close = '[/info]';
        let result = '';
        let i = 0;
        while (i < s.length) {
            const start = s.indexOf(open, i);
            if (start === -1) {
                result += s.slice(i);
                break;
            }
            result += s.slice(i, start);
            let depth = 1;
            let pos = start + open.length;
            let end = -1;
            while (pos < s.length && depth > 0) {
                const nextOpen = s.indexOf(open, pos);
                const nextClose = s.indexOf(close, pos);
                if (nextClose === -1) {
                    break;
                }
                if (nextOpen !== -1 && nextOpen < nextClose) {
                    depth++;
                    pos = nextOpen + open.length;
                } else {
                    depth--;
                    if (depth === 0) {
                        end = nextClose + close.length;
                        break;
                    }
                    pos = nextClose + close.length;
                }
            }
            if (end === -1) {
                result += s.slice(start);
                break;
            }
            const inner = s.slice(start + open.length, end - close.length);
            result += replacer(inner);
            i = end;
        }
        return result;
    }

    /**
     * @param {string} content - raw Chatwork body
     * @param {{ userMap?: Map<string,string>, inThreadMessageIds?: Set<string> }} opts
     */
    function formatChatworkBodyHtml(content, opts) {
        const userMap = opts && opts.userMap ? opts.userMap : new Map();
        const inThreadMessageIds =
            opts && opts.inThreadMessageIds ? opts.inThreadMessageIds : new Set();

        let s = escapeHtml(content || '').replace(/\n/g, '<br>');

        const codeBlocks = [];
        const qtBlocks = [];
        const CODE_PL = '\u0001CODE';
        const QT_PL = '\u0001QT';
        const PL_END = '\u0001';

        s = s.replace(/\[code\]([\s\S]*?)\[\/code\]/g, function (_m, inner) {
            const idx = codeBlocks.length;
            codeBlocks.push(inner);
            return CODE_PL + idx + PL_END;
        });
        s = s.replace(/\[qt\]([\s\S]*?)\[\/qt\]/gs, function (_m, inner) {
            const idx = qtBlocks.length;
            qtBlocks.push(inner);
            return QT_PL + idx + PL_END;
        });

        s = s
            .replace(
                /\[info\]\[dtext:chatroom_member_is\]\[piconname:(\d+)\]\[dtext:chatroom_added\]\[\/info\]/g,
                function (_m, id) {
                    const name = userMap.get(id) ?? 'User ' + id;
                    return '<div class="info-box info-box-system">' + escapeHtml(name) + ' joined the group.</div>';
                }
            )
            .replace(
                /\[info\]\[dtext:chatroom_chat_edited\]\[piconname:(\d+)\]\[dtext:chatroom_added\]\[\/info\]/g,
                function (_m, id) {
                    const name = userMap.get(id) ?? 'User ' + id;
                    return '<div class="info-box info-box-system">' + escapeHtml(name) + ' joined the group.</div>';
                }
            )
            .replace(
                /\[info\]\[title\]\[dtext:chatroom_chat_edited\]\[\/title\]\[dtext:chatroom_member_is\]\[piconname:(\d+)\]\[dtext:chatroom_added\]\[\/info\]/g,
                function (_m, id) {
                    const name = userMap.get(id) ?? 'User ' + id;
                    return '<div class="info-box info-box-system">' + escapeHtml(name) + ' joined the group.</div>';
                }
            )
            .replace(/\[dtext:chatroom_chat_edited\]/g, function () {
                return '<span class="info-label">(Message edited)</span>';
            })
            .replace(/\[qtmeta\s+aid=\d+\s+time=(\d+)(?:\s+to=\d+-\d+)?\]/g, function (_match, timestamp) {
                const date = new Date(parseInt(timestamp, 10) * 1000);
                const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const weekday = weekdays[date.getDay()];
                return (
                    '<span class="quote-time">' +
                    year +
                    '/' +
                    month +
                    '/' +
                    day +
                    ' (' +
                    weekday +
                    ')</span>'
                );
            })
            .replace(/(https?:\/\/[^\s<>"']+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="auto-link">$1</a>')
            .replace(/\[rp\s+aid=\d+\s+to=(\d+)-(\d+)\]/g, function (_m, roomId, messageId) {
                const mid = normalizeId(messageId);
                const rid = normalizeId(roomId);
                const inThread = inThreadMessageIds.has(mid);
                const href = inThread ? '#msg-' + mid : 'https://www.chatwork.com/#!rid' + rid + '-' + mid;
                const target = inThread ? '' : ' target="_blank" rel="noopener noreferrer"';
                return (
                    '<a href="' +
                    href +
                    '" class="reply-link"' +
                    target +
                    '><span class="reply-icon">[RE]</span></a>'
                );
            })
            .replace(/\[To:(\d+)\](.+?)\[\/To\]/g, '<span class="mention">@$2</span>')
            .replace(
                /\[info\].*?\[preview\s+id=(\d+)\s+ht=(\d+)\].*?\[download:(\d+)\](.+?)\[\/download\].*?\[\/info\]/gs,
                function (_match, previewId, _height, downloadId, filename) {
                    const trimmedFilename = escapeHtml(filename.trim());
                    return (
                        '<div class="file-attachment">' +
                        '<a href="https://www.chatwork.com/gateway/download_file.php?bin=1&file_id=' +
                        downloadId +
                        '&preview=0" target="_blank" rel="noopener noreferrer">' +
                        trimmedFilename +
                        '</a></div>'
                    );
                }
            )
            .replace(/\[info\]\[download:(\d+)\](.+?)\[\/download\]\[\/info\]/g, function (_match, downloadId, filename) {
                const trimmedFilename = escapeHtml(filename.trim());
                return (
                    '<div class="file-attachment">' +
                    '<a href="https://www.chatwork.com/gateway/download_file.php?bin=1&file_id=' +
                    downloadId +
                    '&preview=0" class="file-download-link" target="_blank" rel="noopener noreferrer">📎 ' +
                    trimmedFilename +
                    '</a></div>'
                );
            });

        s = parseGenericInfoBlocks(s, function (inner) {
            const titleMatch = inner.match(/\[title\]([\s\S]*?)\[\/title\]/);
            let trimmed =
                titleMatch && titleMatch[1].trim()
                    ? titleMatch[1].trim()
                    : inner.replace(/\[\/?[^\]]*\]/g, '').trim();
            if (!trimmed) {
                trimmed = '—';
            }
            return '<div class="info-box">' + escapeHtml(trimmed) + '</div>';
        });

        const codePlaceholderRe = new RegExp(CODE_PL + '(\\d+)' + PL_END, 'g');
        const qtPlaceholderRe = new RegExp(QT_PL + '(\\d+)' + PL_END, 'g');
        s = s.replace(codePlaceholderRe, function (_m, i) {
            const inner = codeBlocks[parseInt(i, 10)];
            return inner != null ? '<pre class="code-block"><code>' + inner + '</code></pre>' : '';
        });
        s = s.replace(qtPlaceholderRe, function (_m, i) {
            const inner = qtBlocks[parseInt(i, 10)];
            return inner != null ? '<blockquote class="quote-block">' + inner + '</blockquote>' : '';
        });
        return s;
    }

    function formatDateTimeCli(d) {
        const pad = function (n) {
            return String(n).padStart(2, '0');
        };
        return (
            d.getFullYear() +
            '/' +
            pad(d.getMonth() + 1) +
            '/' +
            pad(d.getDate()) +
            ' ' +
            pad(d.getHours()) +
            ':' +
            pad(d.getMinutes())
        );
    }

    function utf8ToBase64(str) {
        try {
            return btoa(unescape(encodeURIComponent(str)));
        } catch {
            return '';
        }
    }

    function utf8FromBase64(b64) {
        if (!b64) {
            return '';
        }
        try {
            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) {
                bytes[i] = bin.charCodeAt(i);
            }
            return new TextDecoder().decode(bytes);
        } catch {
            return '';
        }
    }

    global.ChatworkHtmlFormat = {
        normalizeId: normalizeId,
        escapeHtml: escapeHtml,
        formatBodyHtml: formatChatworkBodyHtml,
        formatDateTimeCli: formatDateTimeCli,
        utf8ToBase64: utf8ToBase64,
        utf8FromBase64: utf8FromBase64,
    };
})(typeof window !== 'undefined' ? window : globalThis);
