import { extension_settings, saveSettingsDebounced } from "./stApi.js";

export const EXTENSION_NAME = "ST-Inkwell";

const DEFAULTS = {
    ui: {
        language: "ru",
    },
    lorebookFolders: {
        folders: [],
        assignments: {},
        chatBindings: {},
        isCompact: false,
    },
    chatExporter: {
        includePlainText: true,
        includeNames: true,
        includeTimestamp: false,
        includeNumbers: false,
    },
};

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function ensureDefaults(target, defaults) {
    for (const key of Object.keys(defaults)) {
        const def = defaults[key];
        if (target[key] === undefined) {
            target[key] = Array.isArray(def) || typeof def === "object" ? clone(def) : def;
        } else if (def !== null && typeof def === "object" && !Array.isArray(def)) {
            ensureDefaults(target[key], def);
        }
    }
    return target;
}

/**
 * Возвращает объект настроек всего расширения. Все три модуля хранят
 * свою часть внутри одного extension_settings[EXTENSION_NAME], чтобы не
 * плодить три независимых ключа в настройках SillyTavern.
 */
export function getSettings() {
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || {};
    return ensureDefaults(extension_settings[EXTENSION_NAME], DEFAULTS);
}

export function saveSettings() {
    saveSettingsDebounced();
}

export function getLanguage() {
    return getSettings().ui.language || "ru";
}

export function setLanguage(lang) {
    getSettings().ui.language = lang;
    saveSettings();
}
