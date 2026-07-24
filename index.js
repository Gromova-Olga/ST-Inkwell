import { registerTab, toggleWindow, openWindowToTab } from "./core/windowManager.js";
import { t } from "./core/i18n.js";
import { saveSettings } from "./core/settingsStore.js";
import * as folders from "./modules/lorebook-folders/index.js";
import * as exporter from "./modules/chat-exporter/index.js";
import * as extractor from "./modules/lorebook-extractor/index.js";
import * as chronicle from "./modules/chronicle/index.js";

const EXTENSION_NAME = "ST-Inkwell";

function createTopBarIcon() {
    if ($("#stt-drawer-icon").length) return;

    // Та же разметка, что использует сама SillyTavern и остальные расширения
    // для иконок в шапке (drawer / drawer-toggle / drawer-icon) — за счёт этого
    // иконка автоматически получает правильный размер и цвет темы, без хардкода.
    const btn = $(`
        <div id="stt-drawer" class="drawer">
            <div class="drawer-toggle drawer-header">
                <div id="stt-drawer-icon" class="drawer-icon fa-solid fa-toolbox interactable" title="${t("window.title")}" tabindex="0" role="button"></div>
            </div>
        </div>
    `);

    const holder = $("#top-settings-holder");
    if (holder.length) {
        holder.append(btn);
    } else {
        $("body").append(btn.css({ position: "fixed", top: "8px", right: "8px", zIndex: 9999 }));
    }

    // Реального выпадающего drawer-content у нас нет — просто открываем своё окно
    $("#stt-drawer-icon").on("click", toggleWindow);
}

function addPerMessageButton() {
    $(".mes_buttons").each(function () {
        if ($(this).find("#stt-mes-btn").length === 0) {
            $(this).prepend(`<div id="stt-mes-btn" class="mes_button fa-solid fa-toolbox interactable" title="${t("window.title")}" tabindex="0" role="button"></div>`);
        }
    });
}

function initPerMessageButton() {
    $(document).on("click", "#stt-mes-btn", () => openWindowToTab("exporter"));

    addPerMessageButton();

    const chatEl = document.getElementById("chat");
    if (chatEl) {
        const observer = new MutationObserver(addPerMessageButton);
        observer.observe(chatEl, { childList: true, subtree: true });
    }
}

function initChronicleReset() {
    $(document).on('click', '#st_toolkit_reset_presets_btn', async () => {
        const confirmReset = confirm("Обновить встроенные пресеты? Это сбросит текущие настройки модуля chronicle и перезагрузит страницу.");
        
        if (confirmReset) {
            const context = SillyTavern.getContext();
            
            if (context.extensionSettings && context.extensionSettings["ST-Toolkit"]) {
                
                // 1. Зачищаем старые пресеты
                delete context.extensionSettings["ST-Toolkit"].chronicle;
                
                // 2. Вызываем сохранение (оно запустит таймер дебаунса ST)
                saveSettings();
                
                // 3. Меняем вид кнопки, чтобы было понятно, что мы ждем записи
                const $btn = $('#st_toolkit_reset_presets_btn');
                $btn.html('<i class="fa-solid fa-hourglass-half fa-spin"></i> Сохраняем на диск...');
                $btn.css('pointer-events', 'none'); // Блокируем повторные клики
                
                // 4. Ждем целых 3 секунды! Этого с запасом хватит, чтобы ST
                // отправил запрос к API и физически перезаписал файл settings.json
                setTimeout(() => {
                    location.reload();
                }, 3000); 
            }
        }
    });
}

jQuery(async () => {
    console.log(`[${EXTENSION_NAME}] Loading...`);
    try {
        registerTab("folders", { titleKey: "tab.folders", icon: "fa-folder-tree", mount: folders.mount, onShow: folders.onShow });
        registerTab("extractor", { titleKey: "tab.extractor", icon: "fa-book-open", mount: extractor.mount, onShow: extractor.onShow });
        registerTab("exporter", { titleKey: "tab.exporter", icon: "fa-file-export", mount: exporter.mount, onShow: exporter.onShow });
        registerTab("chronicle", { titleKey: "tab.chronicle", icon: "fa-scroll", mount: chronicle.mount, onShow: chronicle.onShow });

        // Автоактивация лорбуков при смене чата должна работать в фоне,
        // даже когда окно закрыто — запускаем её отдельно от монтирования вкладки.
        folders.initBackground();

        createTopBarIcon();
        initPerMessageButton();

        initChronicleReset();

        console.log(`[${EXTENSION_NAME}] ✅ Loaded successfully`);
    } catch (error) {
        console.error(`[${EXTENSION_NAME}] ❌ Failed to load:`, error);
    }
});
