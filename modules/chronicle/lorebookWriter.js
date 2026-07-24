import { getContext, eventSource, event_types } from "../../core/stApi.js";

// Скачиваем весь лорбук
export async function getRawLorebook(name) {
    const context = getContext();
    const response = await fetch("/api/worldinfo/get", {
        method: "POST",
        headers: context.getRequestHeaders(),
        body: JSON.stringify({ name }),
        cache: "no-cache",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json(); 
}

// Отправляем весь лорбук обратно
export async function saveRawLorebook(name, data) {
    const context = getContext();
    const response = await fetch("/api/worldinfo/edit", {
        method: "POST",
        headers: context.getRequestHeaders(),
        body: JSON.stringify({ name, data }),
    });
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ошибка API: ${errText.substring(0, 100)}`);
    }
}

// Утилита для вычисления следующего свободного ID
function nextUid(entries) {
    const uids = Object.values(entries).map((e) => Number(e.uid) || 0);
    return uids.length ? Math.max(...uids) + 1 : 0;
}

// Шаблон новой записи
function blankEntry(uid, title, content, opts = {}) {
    return {
        uid,
        key: opts.keys || [],
        keysecondary: [],
        comment: title,
        content,
        constant: opts.status === 'constant',
        selective: opts.status !== 'constant', // И selective, и vectorized должны быть тут true
        vectorized: opts.status === 'vectorized', 
        selectiveLogic: 0,
        addMemo: true,
        order: 100,
        position: opts.position ?? 0,
        disable: false,
        probability: 100,
        useProbability: true,
    };
}

// --- ФУНКЦИЯ-ТРИГГЕР ДЛЯ ОБНОВЛЕНИЯ ИНТЕРФЕЙСА ---
function forceTavernUIUpdate() {
    // Даем серверу 300мс на сохранение файла на диск
    setTimeout(() => {
        const context = getContext();
        
        // Дергаем официальные функции обновления Таверны, которые мы нашли в консоли!
        if (typeof context.reloadWorldInfoEditor === 'function') {
            context.reloadWorldInfoEditor();
        } else if (typeof context.updateWorldInfoList === 'function') {
            context.updateWorldInfoList();
        }
        
        // Страховочный эмиттер для старых версий
        if (eventSource && event_types && event_types.WORLDINFO_UPDATED) {
            eventSource.emit(event_types.WORLDINFO_UPDATED);
        }
    }, 300); 
}

export async function appendToEntry(lorebookName, uid, text) {
    const raw = await getRawLorebook(lorebookName);
    if (!raw.entries[uid]) throw new Error("Запись не найдена в лорбуке.");
    
    raw.entries[uid].content = raw.entries[uid].content ? `${raw.entries[uid].content}\n\n${text}` : text;
    await saveRawLorebook(lorebookName, raw);
    forceTavernUIUpdate(lorebookName);
}

export async function replaceEntry(lorebookName, uid, text) {
    const raw = await getRawLorebook(lorebookName);
    if (!raw.entries[uid]) throw new Error("Запись не найдена в лорбуке.");
    
    raw.entries[uid].content = text;
    await saveRawLorebook(lorebookName, raw);
    forceTavernUIUpdate(lorebookName);
}

export async function createEntry(lorebookName, title, text, opts = {}) {
    const raw = await getRawLorebook(lorebookName);
    const uid = nextUid(raw.entries || {});
    
    raw.entries = raw.entries || {};
    raw.entries[uid] = blankEntry(uid, title, text, opts);
    
    await saveRawLorebook(lorebookName, raw);
    forceTavernUIUpdate(lorebookName);
}

export async function listEntries(lorebookName) {
    const raw = await getRawLorebook(lorebookName);
    return Object.values(raw.entries || {}).map((e) => ({
        uid: e.uid,
        title: e.comment || e.key?.join(", ") || `#${e.uid}`,
    }));
}