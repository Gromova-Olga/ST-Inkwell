import { getLanguage, setLanguage } from "./settingsStore.js";
import { t } from "./i18n.js";
import { makeDraggable, isolateScroll } from "../shared/utils.js";

const tabModules = {}; // id -> { titleKey, icon, mount(container), onShow(container)? }
let windowEl = null;
const initializedTabs = new Set();

export function registerTab(id, opts) {
    tabModules[id] = opts;
}

function buildWindow() {
    const ids = Object.keys(tabModules);

    const tabsHtml = ids.map((id, i) => {
        const m = tabModules[id];
        return `
            <button class="stt-tab${i === 0 ? " active" : ""}" data-tab="${id}">
                <i class="fa-solid ${m.icon}"></i> <span>${t(m.titleKey)}</span>
            </button>`;
    }).join("");

    const panelsHtml = ids.map((id, i) => `
        <div class="stt-panel" data-panel="${id}" style="${i === 0 ? "" : "display:none"}"></div>
    `).join("");

    const el = $(`
        <div id="stt-window" class="stt-window">
            <div id="stt-header" class="stt-header">
                <div class="stt-title"><i class="fa-solid fa-toolbox"></i> <span>${t("window.title")}</span></div>
                <div class="stt-header-actions">
                    <i id="stt-lang-toggle" class="fa-solid fa-language" title="RU / EN"></i>
                    <i id="stt-close" class="fa-solid fa-xmark" title="${t("common.close")}"></i>
                </div>
            </div>
            <div class="stt-tabs">${tabsHtml}</div>
            <div class="stt-body">${panelsHtml}</div>
        </div>
    `);

    $("body").append(el);
    windowEl = el;

    el.find(".stt-tab").on("click", function () {
        activateTab($(this).data("tab"));
    });

    el.find("#stt-close").on("click", closeWindow);
    el.find("#stt-lang-toggle").on("click", () => {
        setLanguage(getLanguage() === "ru" ? "en" : "ru");
        rebuildWindow();
    });

    makeDraggable(el[0], el.find("#stt-header")[0]);
    isolateScroll(el.find(".stt-body")[0]);

    const firstId = ids[0];
    if (firstId) activateTab(firstId);
}

function activateTab(id) {
    if (!windowEl || !tabModules[id]) return;

    windowEl.find(".stt-tab").removeClass("active");
    windowEl.find(`.stt-tab[data-tab="${id}"]`).addClass("active");
    windowEl.find(".stt-panel").hide();
    const panel = windowEl.find(`.stt-panel[data-panel="${id}"]`);
    panel.show();

    if (!initializedTabs.has(id)) {
        tabModules[id].mount(panel[0]);
        initializedTabs.add(id);
    } else if (typeof tabModules[id].onShow === "function") {
        tabModules[id].onShow(panel[0]);
    }
}

function rebuildWindow() {
    const wasOpen = !!windowEl;
    const activeTab = windowEl ? windowEl.find(".stt-tab.active").data("tab") : null;
    if (windowEl) windowEl.remove();
    windowEl = null;
    initializedTabs.clear();
    if (wasOpen) {
        buildWindow();
        if (activeTab) activateTab(activeTab);
    }
}

export function openWindow() {
    if (windowEl) {
        windowEl.show();
        return;
    }
    buildWindow();
}

export function openWindowToTab(id) {
    openWindow();
    activateTab(id);
}

export function closeWindow() {
    if (windowEl) windowEl.hide();
}

export function toggleWindow() {
    if (windowEl && windowEl.is(":visible")) {
        closeWindow();
    } else {
        openWindow();
    }
}
