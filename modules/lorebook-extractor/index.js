import { t } from "../../core/i18n.js";
import { escapeHtml, downloadText, copyToClipboard } from "../../shared/utils.js";
import { openSimpleModal } from "../../shared/components/simpleModal.js";
import { populateLorebookOptions, fetchLorebookEntries } from "./api.js";

let currentEntries = [];

export function mount(container) {
    $(container).html(`
        <div class="le-panel">
            <div class="le-select-row">
                <select id="le-lorebook-select"></select>
            </div>
            <div id="le-entries-list"><p class="le-hint">${t("extractor.hint")}</p></div>
            <div id="le-entries-controls" style="display:none;">
                <button id="le-select-all" class="menu_button">${t("extractor.select_all")}</button>
                <button id="le-deselect-all" class="menu_button">${t("extractor.deselect_all")}</button>
                <button id="le-extract-btn" class="menu_button">${t("extractor.extract")}</button>
            </div>
        </div>
    `);

    const $select = $(container).find("#le-lorebook-select");
    refreshLorebookList($select);

    $select.on("change", async function () {
        const name = $(this).find("option:selected").text();
        const val = $(this).val();
        if (val === "") {
            $(container).find("#le-entries-list").html(`<p class="le-hint">${t("extractor.hint")}</p>`);
            $(container).find("#le-entries-controls").hide();
            currentEntries = [];
            return;
        }
        await loadEntries(container, name);
    });

    $(container).find("#le-select-all").on("click", () => $(container).find(".le-entry-checkbox").prop("checked", true));
    $(container).find("#le-deselect-all").on("click", () => $(container).find(".le-entry-checkbox").prop("checked", false));
    $(container).find("#le-extract-btn").on("click", () => extractSelected(container));
}

export function onShow(container) {
    refreshLorebookList($(container).find("#le-lorebook-select"));
}

function refreshLorebookList($select) {
    const selectedVal = $select.val();
    populateLorebookOptions($select[0], t("extractor.select_lorebook"));
    if (selectedVal) $select.val(selectedVal);
}

async function loadEntries(container, lorebookName) {
    const $list = $(container).find("#le-entries-list");
    $list.html(`<p>${t("extractor.loading")}</p>`);
    $(container).find("#le-entries-controls").hide();
    currentEntries = [];

    try {
        currentEntries = await fetchLorebookEntries(lorebookName);
        renderEntries(container, currentEntries);
    } catch (error) {
        $list.html(`<p class="le-error">${t("extractor.error")}: ${escapeHtml(error.message)}</p>`);
    }
}

function renderEntries(container, entries) {
    const $list = $(container).find("#le-entries-list");
    $list.empty();

    if (entries.length === 0) {
        $list.html(`<p class="le-hint">${t("extractor.no_entries")}</p>`);
        return;
    }

    $(container).find("#le-entries-controls").show();

    entries.forEach((entry, i) => {
        const title = entry.comment || entry.key?.join(", ") || `${t("extractor.entry_n")} ${i + 1}`;
        const uid = entry.uid ?? i;
        const preview = (Array.isArray(entry.content) ? entry.content.join(" ") : (entry.content || "")).substring(0, 80);

        $list.append(`
            <div class="le-entry-item">
                <input type="checkbox" id="le_entry_${uid}" class="le-entry-checkbox" data-uid="${uid}" />
                <label for="le_entry_${uid}">
                    <span class="le-entry-title">${escapeHtml(title)}</span>
                    ${preview ? `<span class="le-entry-preview">${escapeHtml(preview)}…</span>` : ""}
                </label>
            </div>
        `);
    });
}

function extractSelected(container) {
    const selectedUids = $(container).find(".le-entry-checkbox:checked").map((i, el) => $(el).data("uid")).get();
    if (selectedUids.length === 0) { alert(t("extractor.pick_one")); return; }

    const selected = currentEntries.filter((e) => selectedUids.includes(e.uid));
    const text = selected.map((entry) => {
        const title = entry.comment || entry.key?.join(", ") || t("extractor.untitled");
        const content = Array.isArray(entry.content) ? entry.content.join("\n") : (entry.content || "");
        return `=== ${title} ===\n${content}`;
    }).join("\n\n");

    openResultModal(text, selected.length);
}

function openResultModal(text, count) {
    openSimpleModal({
        id: "le-result-modal",
        headerHtml: `<span>📄 ${t("extractor.result_title")} (${count} ${t("extractor.entries_word")})</span><button id="le-result-close" class="stt-icon-btn">✕</button>`,
        bodyHtml: `<textarea id="le-result-text" readonly>${escapeHtml(text)}</textarea>`,
        footerHtml: `
            <button id="le-result-copy" class="menu_button">${t("common.copy")}</button>
            <button id="le-result-export" class="menu_button">${t("common.download_txt")}</button>
            <button id="le-result-close-btn" class="menu_button">${t("common.close")}</button>
        `,
        onOpen: (modal) => {
            modal.find("#le-result-close, #le-result-close-btn").on("click", () => modal.remove());
            modal.find("#le-result-copy").on("click", () => {
                copyToClipboard(text).then(() => {
                    const btn = modal.find("#le-result-copy");
                    const original = btn.text();
                    btn.text(t("common.copied"));
                    setTimeout(() => btn.text(original), 2000);
                });
            });
            modal.find("#le-result-export").on("click", () => downloadText("lorebook_export.txt", text));
        },
    });
}
