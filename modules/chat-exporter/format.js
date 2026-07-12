import { getContext } from "../../core/stApi.js";
import { getSettings } from "../../core/settingsStore.js";

export function getMessages() {
    const context = getContext();
    if (!context || !context.chat) return [];
    return context.chat;
}

export function formatMessages(messages, indices) {
    const s = getSettings().chatExporter;
    const lines = [];

    indices.forEach((globalIdx) => {
        const msg = messages[globalIdx];
        if (!msg) return;
        const parts = [];

        if (s.includeNumbers) parts.push(`[${globalIdx + 1}]`);
        if (s.includeNames) {
            const name = msg.is_user
                ? (getContext().name1 || "User")
                : (msg.name || getContext().name2 || "Bot");
            parts.push(`${name}:`);
        }
        if (s.includeTimestamp && msg.send_date) parts.push(`(${msg.send_date})`);

        const header = parts.join(" ");
        const text = (msg.mes || "").trim();

        lines.push(header || null);
        lines.push(s.includePlainText ? `  ${text.replace(/\n/g, "\n  ")}` : text);
        lines.push("");
    });

    return lines.filter((l) => l !== null).join("\n");
}
