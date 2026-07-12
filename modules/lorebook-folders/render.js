import { t } from "../../core/i18n.js";

export const openFolders = new Set();
export const openChatsSections = new Set();
export const openCharChats = new Set();

export function renderFolderTree(parentId, settings, allChats, boundFolders) {
    const children = settings.folders.filter((f) => (f.parentId || null) === parentId);
    if (children.length === 0) return "";

    return children.map((f) => {
        const books = Object.entries(settings.assignments)
            .filter(([, folders]) => folders.includes(f.id))
            .map(([name]) => name);
        const isBound = boundFolders.includes(f.id);

        const booksHtml = books.length === 0
            ? `<div class="lf-no-books">${t("folders.no_books_tip")}</div>`
            : books.map((name) => `
                <div class="lf-book-item" draggable="true" data-book-name="${name}">
                    <span>📖</span><span class="lf-book-name">${name}</span>
                    <i class="lf-book-remove fa-solid fa-xmark" data-book-name="${name}" data-folder-id="${f.id}"></i>
                </div>`).join("");

        const charMap = {};
        allChats.forEach((c) => {
            if (!charMap[c.charName]) charMap[c.charName] = [];
            charMap[c.charName].push(c);
        });

        const charsHtml = Object.entries(charMap).map(([charName, chats]) => {
            const chatsHtml = chats.map((c) => {
                const isChatBound = (settings.chatBindings[c.chatId] || []).includes(f.id);
                return `<div class="lf-chat-item"><span class="lf-chat-name">${c.chatId.replace(charName + " - ", "")}</span>
                <i class="lf-btn-chat-bind fa-solid ${isChatBound ? "fa-link-slash" : "fa-link"} ${isChatBound ? "lf-active" : ""}" data-folder-id="${f.id}" data-chat-id="${c.chatId}"></i></div>`;
            }).join("");
            const isCharOpen = openCharChats.has(`${f.id}_${charName}`);
            return `<div class="lf-char-group"><div class="lf-char-header" data-folder-id="${f.id}" data-char="${charName}"><span class="lf-char-arrow">${isCharOpen ? "▼" : "▶"}</span><span class="lf-char-name">${charName}</span></div>
            <div class="lf-char-chats" ${isCharOpen ? "" : 'style="display:none;"'}>${chatsHtml}</div></div>`;
        }).join("");

        const isOpen = openFolders.has(f.id);
        const isChatsOpen = openChatsSections.has(f.id);

        return `<div class="lf-folder-item ${isBound ? "lf-bound" : ""}" draggable="true" data-folder-id="${f.id}">
            <div class="lf-folder-header"><span class="lf-folder-toggle">${isOpen ? "▼" : "▶"}</span><i class="fa-solid fa-folder lf-folder-icon" style="color: ${f.color || "var(--stt-accent, #dcdcdc)"};"></i><span class="lf-folder-name">${f.name}</span>
            <span class="lf-folder-actions">
                <i class="lf-btn-add-subfolder fa-solid fa-folder-plus" title="${t("folders.add_subfolder")}" data-folder-id="${f.id}"></i>
                <i class="lf-btn-bind fa-solid fa-link${isBound ? " lf-active" : ""}" title="${t("folders.bind_chat")}" data-folder-id="${f.id}"></i>
                <input type="color" class="lf-color-picker" data-folder-id="${f.id}" value="${f.color || "#e0e0e0"}" style="display:none;"><i class="lf-btn-color fa-solid fa-palette" title="${t("folders.color_folder")}" data-folder-id="${f.id}"></i>
                <i class="lf-btn-add-book fa-solid fa-plus" title="${t("folders.add_book")}" data-folder-id="${f.id}"></i><i class="lf-btn-rename fa-solid fa-pen" title="${t("folders.rename")}" data-folder-id="${f.id}"></i><i class="lf-btn-delete fa-solid fa-trash" title="${t("folders.delete")}" data-folder-id="${f.id}"></i>
            </span></div>
            <div class="lf-folder-contents" data-folder-id="${f.id}" ${isOpen ? "" : 'style="display:none;"'}>
                <div class="lf-subfolders-list">${renderFolderTree(f.id, settings, allChats, boundFolders)}</div><div class="lf-section-label">${t("folders.lorebooks_label")}</div>${booksHtml}
                <div class="lf-section-label lf-chats-toggle" data-folder-id="${f.id}">${t("folders.chat_bindings")} <span class="lf-chats-arrow">${isChatsOpen ? "▼" : "▶"}</span></div>
                <div class="lf-chats-section" data-folder-id="${f.id}" ${isChatsOpen ? "" : 'style="display:none;"'}>${charsHtml}</div>
            </div></div>`;
    }).join("");
}
