import { getSettings } from "../../core/settingsStore.js";
import { t } from "../../core/i18n.js";
import * as state from "./state.js";
import { renderFolderPanel, bindPanelControls } from "./events.js";

let mounted = false;

/**
 * Запускается один раз при загрузке расширения, независимо от того,
 * открыто ли окно. Именно здесь живёт автоактивация лорбуков при смене
 * чата — фича должна работать в фоне (поведение сохранено как в оригинале).
 */
export function initBackground() {
    state.setRerenderCallback(() => { if (mounted) renderFolderPanel(); });
    state.registerChatChangeListener();
    setTimeout(() => state.applyBindingsForChat(state.getCurrentChatId()), 1500);
}

export function mount(container) {
    mounted = true;
    const settings = getSettings().lorebookFolders;

    $(container).html(`
        <div class="lf-panel">
            <div class="lf-panel-header">
                <button id="lf-create-folder" class="menu_button">${t("folders.new_root")}</button>
            </div>
            <div class="lf-controls-row">
                <input type="text" id="lf-search-input" placeholder="${t("folders.search_placeholder")}">
                <i id="lf-compact-toggle" class="fa-solid fa-list ${settings.isCompact ? "lf-active" : ""}" title="${t("folders.compact_mode")}"></i>
                <i id="lf-export-btn" class="fa-solid fa-download" title="${t("folders.export_btn")}"></i>
                <i id="lf-import-btn" class="fa-solid fa-upload" title="${t("folders.import_btn")}"></i>
                <input type="file" id="lf-import-file" accept=".json" style="display:none;">
            </div>
            <div id="lf-folder-list" class="${settings.isCompact ? "lf-compact" : ""}"></div>
        </div>
    `);

    bindPanelControls();
    renderFolderPanel();
}

export function onShow() {
    renderFolderPanel();
}
