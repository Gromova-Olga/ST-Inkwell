import { getContext } from "../../core/stApi.js";


const bookLocks = new Map();

function withLorebookLock(name, fn) {
    const prev = bookLocks.get(name) || Promise.resolve();
    const next = prev.then(fn, fn);
    bookLocks.set(name, next.catch(() => {}));
    return next;
}

export async function getRawLorebook(name) {
    const context = getContext();
    return context.loadWorldInfo(name);
}

export async function saveRawLorebook(name, data) {
    const context = getContext();
    await context.saveWorldInfo(name, data, true);
}

function nextUid(entries) {
    const uids = Object.values(entries)
        .filter(Boolean)
        .map((e) => Number(e.uid) || 0);
    return uids.length ? Math.max(...uids) + 1 : 0;
}

function blankEntry(uid, title, content, opts = {}) {
    return {
        uid,
        key: opts.keys || [],
        keysecondary: [],
        comment: title,
        content,
        constant: opts.status === 'constant',
        selective: opts.status !== 'constant',
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

async function forceTavernUIUpdate(lorebookName) {
    const context = getContext();

    if (typeof context.reloadWorldInfoEditor === 'function') {
        await context.reloadWorldInfoEditor(lorebookName, true);
    }

    if (typeof context.updateWorldInfoList === 'function') {
        await context.updateWorldInfoList();
    }
}

export async function appendToEntry(lorebookName, uid, text) {
    return withLorebookLock(lorebookName, async () => {
        const raw = await getRawLorebook(lorebookName);
        if (!raw.entries[uid]) throw new Error("Запись не найдена в лорбуке.");

        raw.entries[uid].content = raw.entries[uid].content
            ? `${raw.entries[uid].content}\n\n${text}`
            : text;

        await saveRawLorebook(lorebookName, raw);
        await forceTavernUIUpdate(lorebookName);
    });
}

export async function replaceEntry(lorebookName, uid, text) {
    return withLorebookLock(lorebookName, async () => {
        const raw = await getRawLorebook(lorebookName);
        if (!raw.entries[uid]) throw new Error("Запись не найдена в лорбуке.");

        raw.entries[uid].content = text;

        await saveRawLorebook(lorebookName, raw);
        await forceTavernUIUpdate(lorebookName);
    });
}

export async function createEntry(lorebookName, title, text, opts = {}) {
    return withLorebookLock(lorebookName, async () => {
        const raw = await getRawLorebook(lorebookName);
        const uid = nextUid(raw.entries || {});

        raw.entries = raw.entries || {};
        raw.entries[uid] = blankEntry(uid, title, text, opts);

        await saveRawLorebook(lorebookName, raw);
        await forceTavernUIUpdate(lorebookName);
    });
}

export async function listEntries(lorebookName) {
    const raw = await getRawLorebook(lorebookName);
    return Object.values(raw.entries || {})
        .filter(Boolean)
        .map((e) => ({
            uid: e.uid,
            title: e.comment || e.key?.join(", ") || `#${e.uid}`,
        }));
}
