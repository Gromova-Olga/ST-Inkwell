import { getSettings, saveSettings } from "../../core/settingsStore.js";

export function listPresets() {
    return getSettings().chronicle.presets;
}

export function getPreset(id) {
    return listPresets().find((p) => p.id === id) || null;
}

export function savePreset({ id, name, prompt }) {
    const presets = getSettings().chronicle.presets;
    const existing = id ? presets.find((p) => p.id === id) : null;

    if (existing) {
        if (existing.builtin) throw new Error("Встроенный пресет нельзя перезаписать — сохрани как новый");
        existing.name = name;
        existing.prompt = prompt;
    } else {
        presets.push({ id: `p_${Date.now()}`, name, prompt, builtin: false });
    }
    saveSettings();
}

export function deletePreset(id) {
    const settings = getSettings().chronicle;
    const preset = settings.presets.find((p) => p.id === id);
    if (!preset || preset.builtin) return;
    settings.presets = settings.presets.filter((p) => p.id !== id);
    saveSettings();
}
