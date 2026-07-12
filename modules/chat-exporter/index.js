import { getContext } from "../../core/stApi.js";
import { getSettings, saveSettings } from "../../core/settingsStore.js";
import { t } from "../../core/i18n.js";
import { escapeHtml, downloadText, copyToClipboard } from "../../shared/utils.js";
import { getMessages, formatMessages } from "./format.js";
import { setupSearch } from "./search.js";
import { buildExportHtml } from "./htmlTemplate.js";

export function mount(container) {
    const s = getSettings().chatExporter;

    $(container).html(`
        <div class="ce-panel">
            <div class="ce-settings-row">
                <label><input type="checkbox" id="ce_plain_text" ${s.includePlainText ? "checked" : ""}/> ${t("exporter.opt_plain_text")}</label>
                <label><input type="checkbox" id="ce_names" ${s.includeNames ? "checked" : ""}/> ${t("exporter.opt_names")}</label>
                <label><input type="checkbox" id="ce_timestamp" ${s.includeTimestamp ? "checked" : ""}/> ${t("exporter.opt_timestamp")}</label>
                <label><input type="checkbox" id="ce_numbers" ${s.includeNumbers ? "checked" : ""}/> ${t("exporter.opt_numbers")}</label>
            </div>
            <div id="ce-range-row">
                <label>${t("exporter.from")} <input id="ce-from" type="number" min="1" value="1" /></label>
                <label>${t("exporter.to")} <input id="ce-to" type="number" min="1" value="1" /></label>
                <span class="ce-separator">${t("exporter.specific_label")}</span>
                <input id="ce-specific" type="text" placeholder="${t("exporter.specific_placeholder")}" />
            </div>
            <div id="ce-filter-row">
                <label>${t("exporter.author")}
                    <select id="ce-author-filter">
                        <option value="all">${t("exporter.author_all")}</option>
                        <option value="user">${t("exporter.author_user")}</option>
                        <option value="bot">${t("exporter.author_bot")}</option>
                    </select>
                </label>
                <button id="ce-preview-btn" class="menu_button">${t("exporter.preview")}</button>
            </div>
            <div id="ce-search-row">
                <input id="ce-search" type="text" placeholder="${t("common.search")}" />
                <button id="ce-search-prev" class="menu_button" title="▲">▲</button>
                <button id="ce-search-next" class="menu_button" title="▼">▼</button>
                <span id="ce-search-info"></span>
            </div>
            <div id="ce-output-wrapper">
                <div id="ce-output-display"></div>
                <textarea id="ce-output" readonly style="display:none"></textarea>
            </div>
            <div id="ce-panel-footer">
                <button id="ce-copy-btn" class="menu_button">${t("common.copy")}</button>
                <button id="ce-export-btn" class="menu_button">${t("common.download_txt")}</button>
                <button id="ce-export-html-btn" class="menu_button">${t("exporter.download_html")}</button>
            </div>
        </div>
    `);

    refreshRange(container);
    bindEvents(container);
}

export function onShow(container) {
    refreshRange(container);
}

function refreshRange(container) {
    const total = getMessages().length;
    $(container).find("#ce-from").attr("max", total || 1).val(total ? 1 : 0);
    $(container).find("#ce-to").attr("max", total || 1).val(total);
}

function currentIndicesFromRange($c, total) {
    const from = Math.max(0, parseInt($c.find("#ce-from").val(), 10) - 1);
    const to = Math.min(total - 1, parseInt($c.find("#ce-to").val(), 10) - 1);
    const arr = [];
    for (let i = from; i <= to; i++) arr.push(i);
    return arr;
}

function bindEvents(container) {
    const $c = $(container);
    const s = getSettings().chatExporter;

    $c.find("#ce_plain_text").on("input", (e) => { s.includePlainText = $(e.target).prop("checked"); saveSettings(); });
    $c.find("#ce_names").on("input", (e) => { s.includeNames = $(e.target).prop("checked"); saveSettings(); });
    $c.find("#ce_timestamp").on("input", (e) => { s.includeTimestamp = $(e.target).prop("checked"); saveSettings(); });
    $c.find("#ce_numbers").on("input", (e) => { s.includeNumbers = $(e.target).prop("checked"); saveSettings(); });

    const searchApi = setupSearch(container);

    $c.find("#ce-preview-btn").on("click", () => {
        const messages = getMessages();
        const total = messages.length;
        if (total === 0) { toastr.warning(t("exporter.no_messages"), "Chat Exporter"); return; }

        const authorFilter = $c.find("#ce-author-filter").val();
        let indices = [];
        const specificVal = $c.find("#ce-specific").val().trim();

        if (specificVal) {
            indices = specificVal.split(",").map((v) => parseInt(v.trim(), 10) - 1).filter((n) => !isNaN(n) && n >= 0 && n < total);
            if (indices.length === 0) { toastr.error(t("exporter.no_numbers"), "Chat Exporter"); return; }
        } else {
            const from = Math.max(0, parseInt($c.find("#ce-from").val(), 10) - 1);
            const to = Math.min(total - 1, parseInt($c.find("#ce-to").val(), 10) - 1);
            if (from > to) { toastr.error(t("exporter.range_error"), "Chat Exporter"); return; }
            for (let i = from; i <= to; i++) indices.push(i);
        }

        if (authorFilter === "user") indices = indices.filter((i) => messages[i].is_user);
        else if (authorFilter === "bot") indices = indices.filter((i) => !messages[i].is_user);

        if (indices.length === 0) { toastr.warning(t("exporter.no_filtered"), "Chat Exporter"); return; }

        const result = formatMessages(messages, indices);
        $c.find("#ce-output").val(result);

        setTimeout(() => {
            const query = $c.find("#ce-search").val().trim();
            searchApi.renderDisplay(query);
            if (query) searchApi.findMatches();
        }, 50);
    });

    $c.find("#ce-copy-btn").on("click", () => {
        const text = $c.find("#ce-output").val();
        if (!text) { toastr.warning(t("exporter.press_preview_first")); return; }
        copyToClipboard(text).then(() => toastr.success(t("exporter.copied"), "Chat Exporter"));
    });

    $c.find("#ce-export-btn").on("click", () => {
        const text = $c.find("#ce-output").val();
        if (!text) { toastr.warning(t("exporter.press_preview_first")); return; }
        downloadText(`chat-export-${Date.now()}.txt`, text);
    });

    $c.find("#ce-export-html-btn").on("click", () => {
        const text = $c.find("#ce-output").val();
        if (!text) { toastr.warning(t("exporter.press_preview_first")); return; }

        const messages = getMessages();
        const context = getContext();
        const chatName = context?.characters?.[context?.characterId]?.name || "Chat";
        const date = new Date().toLocaleString();
        const settings = getSettings().chatExporter;
        const indices = currentIndicesFromRange($c, messages.length);

        const messagesHtml = indices.map((idx) => {
            const msg = messages[idx];
            if (!msg) return "";
            const isUser = msg.is_user;
            const name = isUser ? (context.name1 || "User") : (msg.name || context.name2 || "Bot");
            const timestamp = msg.send_date || "";
            const msgText = escapeHtml((msg.mes || "").trim()).replace(/\n/g, "<br>");

            const metaParts = [];
            if (settings.includeNumbers) metaParts.push(`<span class="msg-num">#${idx + 1}</span>`);
            if (settings.includeTimestamp && timestamp) metaParts.push(`<span class="msg-time">${timestamp}</span>`);
            const meta = metaParts.length ? `<div class="msg-meta">${metaParts.join(" ")}</div>` : "";

            return `
            <div class="message ${isUser ? "message-user" : "message-bot"}">
                <div class="message-header">
                    <span class="message-name">${name}</span>
                    ${meta}
                </div>
                <div class="message-body">${msgText}</div>
            </div>`;
        }).join("\n");

        const html = buildExportHtml({ chatName, date, messagesHtml, count: indices.length });
        downloadText(`${chatName}-export-${Date.now()}.html`, html, "text/html;charset=utf-8");
    });
}
