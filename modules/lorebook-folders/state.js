import { getContext, eventSource, event_types, getPastCharacterChats } from "../../core/stApi.js";
import { getSettings, saveSettings } from "../../core/settingsStore.js";
import { t } from "../../core/i18n.js";

let rerenderCallback = null;

/** UI-слой подписывается сюда, чтобы state.js мог попросить перерисоваться
 *  после фоновых событий (смена чата), не зная ничего про render.js. */
export function setRerenderCallback(fn) {
    rerenderCallback = fn;
}

function requestRerender() {
    if (typeof rerenderCallback === "function") rerenderCallback();
}

export function getCurrentChatId() {
    try {
        const ctx = getContext();
        return ctx.chatId ?? ctx.getCurrentChatId?.() ?? null;
    } catch (e) {
        return null;
    }
}

export function getAllLorebooks() {
    const books = [];
    $("#world_info option").each(function () {
        const val = $(this).val();
        const name = $(this).text().trim();
        if (val && name && name !== "---") books.push({ value: val, name });
    });
    return books;
}

export function getUnassignedLorebooks(folderId) {
    const settings = getSettings().lorebookFolders;
    return getAllLorebooks().filter((b) => {
        const folders = settings.assignments[b.name] || [];
        return !folders.includes(folderId);
    });
}

export function setLorebookActive(bookName, active) {
    const select = $("select#world_info");
    let currentVals = select.val() || [];
    if (!Array.isArray(currentVals)) currentVals = [currentVals];

    let bookVal = null;
    select.find("option").each(function () {
        if ($(this).text().trim() === bookName) bookVal = $(this).val();
    });
    if (bookVal === null) return;

    let newVals;
    if (active) {
        if (currentVals.includes(bookVal)) return;
        newVals = [...currentVals, bookVal];
    } else {
        newVals = currentVals.filter((v) => v !== bookVal);
    }
    select.val(newVals).trigger("change");
}

let lastActivatedFolders = [];

export function applyBindingsForChat(chatId) {
    const settings = getSettings().lorebookFolders;

    lastActivatedFolders.forEach((folderId) => {
        Object.entries(settings.assignments)
            .filter(([, folders]) => Array.isArray(folders) && folders.includes(folderId))
            .forEach(([name]) => setLorebookActive(name, false));
    });

    if (!chatId) {
        lastActivatedFolders = [];
        requestRerender();
        return;
    }

    const boundFolders = settings.chatBindings[chatId] || [];
    boundFolders.forEach((folderId) => {
        Object.entries(settings.assignments)
            .filter(([, folders]) => Array.isArray(folders) && folders.includes(folderId))
            .forEach(([name]) => setLorebookActive(name, true));
    });
    lastActivatedFolders = boundFolders;

    if (boundFolders.length > 0) {
        const names = boundFolders
            .map((fid) => settings.folders.find((f) => f.id === fid)?.name)
            .filter(Boolean)
            .join(", ");
        toastr.info(`${t("folders.activated_msg")} ${names}`, "Lorebook Folders", { timeOut: 2000 });
    }

    requestRerender();
}

export function toggleChatBinding(folderId) {
    const chatId = getCurrentChatId();
    if (!chatId) {
        toastr.warning(t("folders.open_chat_warn"), "Lorebook Folders");
        return;
    }
    const settings = getSettings().lorebookFolders;
    const folder = settings.folders.find((f) => f.id === folderId);
    if (!folder) return;

    settings.chatBindings[chatId] = settings.chatBindings[chatId] || [];
    const idx = settings.chatBindings[chatId].indexOf(folderId);
    if (idx === -1) {
        settings.chatBindings[chatId].push(folderId);
        toastr.success(t("folders.bound_success"), "Lorebook Folders");
    } else {
        settings.chatBindings[chatId].splice(idx, 1);
        toastr.info(t("folders.unbound_info"), "Lorebook Folders");
    }
    saveSettings();
    requestRerender();
}

export async function getAllCharacterChats() {
    const ctx = getContext();
    const result = [];
    for (let i = 0; i < (ctx.characters || []).length; i++) {
        const c = ctx.characters[i];
        try {
            const chats = (await getPastCharacterChats(i)) || [];
            chats.forEach((chat) => result.push({ charName: c.name, chatId: chat.file_id }));
        } catch (e) {
            if (c.chat) result.push({ charName: c.name, chatId: c.chat });
        }
    }
    return result;
}

export function deleteFolderRecursive(folderId, settings) {
    const children = settings.folders.filter((f) => f.parentId === folderId);
    children.forEach((c) => deleteFolderRecursive(c.id, settings));
    settings.folders = settings.folders.filter((f) => f.id !== folderId);
    for (const k in settings.assignments) {
        settings.assignments[k] = settings.assignments[k].filter((fid) => fid !== folderId);
        if (settings.assignments[k].length === 0) delete settings.assignments[k];
    }
    for (const cid in settings.chatBindings) {
        settings.chatBindings[cid] = settings.chatBindings[cid].filter((fid) => fid !== folderId);
    }
}

export function isDescendant(targetId, potentialParentId, settings) {
    let current = settings.folders.find((f) => f.id === targetId);
    while (current) {
        if (current.id === potentialParentId) return true;
        current = settings.folders.find((f) => f.id === current.parentId);
    }
    return false;
}

/** Регистрирует фоновый слушатель смены чата — работает независимо от
 *  того, открыта вкладка «Папки» сейчас или нет (как и в оригинале). */
export function registerChatChangeListener() {
    eventSource.on(event_types.CHAT_CHANGED, () => {
        setTimeout(() => applyBindingsForChat(getCurrentChatId()), 500);
    });
}
