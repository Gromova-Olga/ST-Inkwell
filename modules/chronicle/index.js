import { getContext } from "../../core/stApi.js";
import { getSettings, saveSettings } from "../../core/settingsStore.js";
import { t } from "../../core/i18n.js";
import { escapeHtml } from "../../shared/utils.js";
import { ChronicleApiService } from "./apiService.js";
import { listPresets, getPreset, savePreset, deletePreset } from "./presets.js";
import { listEntries, appendToEntry, replaceEntry, createEntry, getRawLorebook } from "./lorebookWriter.js";
import { openSimpleModal } from "../../shared/components/simpleModal.js";

export function mount(container) {
    $(container).html(`
        <div class="chr-panel">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid var(--SmartThemeBorderColor); padding-bottom: 10px;">
                <div id="chr-mode-tabs" style="display: flex; gap: 10px;">
                    <button class="menu_button active" data-mode="arcs">Из сообщений (Арки)</button>
                    <button class="menu_button" data-mode="update">Обновление записей</button>
                    <button class="menu_button" data-mode="chapters">Из глав (Летопись)</button>
                </div>
                <div>
                    <button id="chr-manage-presets-btn" class="menu_button" title="Редактор пресетов" style="margin-right: 5px;">
                        <i class="fa-solid fa-sliders"></i> Пресеты
                    </button>
                    <button id="chr-open-settings-btn" class="menu_button" title="Настройки генерации">
                        <i class="fa-solid fa-gear"></i> Настройки
                    </button>
                </div>
            </div>

            <div id="chr-preset-manager" style="display:none; margin-bottom: 15px; border: 1px solid var(--SmartThemeBorderColor); padding: 10px; border-radius: 8px; background: rgba(0,0,0,0.15);"></div>

            <!-- Вкладка 1: Арки -->
            <div id="chr-mode-arcs-panel" class="chr-mode-panel">
                <div style="margin-bottom: 15px; display: flex; gap: 15px; align-items: center; background: rgba(0,0,0,0.15); padding: 12px; border-radius: 8px; border: 1px solid var(--SmartThemeBorderColor);">
                    <span style="font-weight: 500;">Диапазон сообщений:</span>
                    <label style="display: flex; align-items: center; gap: 8px; margin: 0;">От <input id="chr-from" type="number" min="1" value="1" style="width: 75px;" /></label>
                    <label style="display: flex; align-items: center; gap: 8px; margin: 0;">До <input id="chr-to" type="number" min="1" value="1" style="width: 75px;" /></label>
                </div>
                <div class="chr-row" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                    <label style="width: 100%; font-weight: 500;">Пресеты (можно несколько):</label>
                    <div id="chr-preset-checkboxes-arcs" style="display: flex; flex-direction: column; gap: 5px; max-height: 250px; overflow-y: auto; background: var(--SmartThemeBlurTintColor); padding: 10px; border-radius: 8px; width: 100%; border: 1px solid var(--SmartThemeBorderColor);"></div>
                </div>
            </div>

            <!-- Вкладка 2: Обновление -->
            <div id="chr-mode-update-panel" class="chr-mode-panel" style="display: none;">
                <label style="display: block; margin-bottom: 8px;">Лорбук со старыми записями <select id="chr-update-lorebook-select" style="width: 100%;"></select></label>
                <div id="chr-update-entries-list" style="max-height: 150px; overflow-y: auto; border: 1px solid var(--SmartThemeBorderColor); border-radius: 5px; padding: 6px; margin-bottom: 10px; background: rgba(0,0,0,0.1);">
                    <p style="opacity: 0.5; text-align: center;">Выберите лорбук и отметьте записи</p>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-weight: 500;">
                        <input type="checkbox" id="chr-include-chat-cb" checked /> Включить сообщения из чата (Новые события)
                    </label>
                </div>
                
                <div id="chr-range-row-update" style="margin-bottom: 15px; display: flex; gap: 15px; align-items: center; background: rgba(0,0,0,0.15); padding: 12px; border-radius: 8px; border: 1px solid var(--SmartThemeBorderColor);">
                    <span style="font-weight: 500;">Диапазон сообщений:</span>
                    <label style="display: flex; align-items: center; gap: 8px; margin: 0;">От <input id="chr-from-upd" type="number" min="1" value="1" style="width: 75px;" /></label>
                    <label style="display: flex; align-items: center; gap: 8px; margin: 0;">До <input id="chr-to-upd" type="number" min="1" value="1" style="width: 75px;" /></label>
                </div>
                
                <div class="chr-row" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                    <label style="width: 100%; font-weight: 500;">Инструкция для нейросети:</label>
                    <textarea id="chr-update-custom-prompt" style="width: 100%; min-height: 80px; background: var(--SmartThemeBlurTintColor); border: 1px solid var(--SmartThemeBorderColor);" placeholder="Например: Сравни старое состояние отношений с новыми событиями..."></textarea>
                </div>
            </div>

            <!-- Вкладка 3: Главы -->
            <div id="chr-mode-chapters-panel" class="chr-mode-panel" style="display: none;">
                <label style="display: block; margin-bottom: 8px;">Лорбук-источник глав <select id="chr-source-lorebook-select" style="width: 100%;"></select></label>
                <div id="chr-source-entries-list" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--SmartThemeBorderColor); border-radius: 5px; padding: 6px; margin-bottom: 10px; background: rgba(0,0,0,0.1);">
                    <p style="opacity: 0.5; text-align: center;">Выберите лорбук для загрузки глав</p>
                </div>
                <div class="chr-row" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                    <label style="width: 100%; font-weight: 500;">Пресеты Летописи:</label>
                    <div id="chr-preset-checkboxes-chapters" style="display: flex; flex-direction: column; gap: 5px; max-height: 150px; overflow-y: auto; background: var(--SmartThemeBlurTintColor); padding: 8px; border-radius: 5px; width: 100%; border: 1px solid var(--SmartThemeBorderColor);"></div>
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button id="chr-generate-btn" class="menu_button" style="flex: 2; font-weight: bold;">Сгенерировать</button>
                <button id="chr-reroll-btn" class="menu_button" style="flex: 1;" disabled title="Перегенерировать текущий результат"><i class="fa-solid fa-dice"></i> Reroll</button>
            </div>
            
            <div id="chr-status" style="margin-top: 10px; text-align: center;"></div>

            <!-- Зона карточек результатов -->
            <div id="chr-multi-results-section" style="display:none; margin-top: 20px;">
                <div class="lf-section-label" style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; margin-bottom: 15px;">Результаты (Блоки можно объединять и удалять)</div>
                <div id="chr-chunks-container" style="display: flex; flex-direction: column; gap: 15px;"></div>
            </div>
        </div>
    `);

    refreshRange(container);
    refreshPresetSelect(container);
    refreshLorebookSelects(container);
    bindEvents(container);
}

export function onShow(container) {
    refreshRange(container);
    refreshPresetSelect(container);
    refreshLorebookSelects(container);
}

function renderPresetManager(container) {
    const $box = $(container).find("#chr-preset-manager");
    const presets = listPresets(); 

    $box.html(`
        <div class="chr-preset-list" style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 5px;">
            ${presets.map((p) => `
                <div class="chr-preset-item" data-id="${p.id}" style="display:flex; justify-content:space-between; padding: 5px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <span>${escapeHtml(p.name)}${p.builtin ? ` <em style="opacity: 0.5;">(встроенный)</em>` : ""}</span>
                    <span>
                        <i class="fa-solid fa-pen chr-preset-edit" data-id="${p.id}" style="cursor:pointer; margin-right: 10px;" title="Редактировать"></i>
                        ${p.builtin ? "" : `<i class="fa-solid fa-trash chr-preset-delete" data-id="${p.id}" style="cursor:pointer; color: #e06c75;" title="Удалить"></i>`}
                    </span>
                </div>
            `).join("")}
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button id="chr-new-preset-btn" class="menu_button">Создать пресет</button>
            <button id="st_toolkit_reset_presets_btn" class="menu_button" style="color: #e06c75;" title="Вернуть все дефолтные пресеты к заводским настройкам">Сбросить дефолтные</button>
        </div>

        <div id="chr-preset-editor" style="display:none; margin-top: 10px; flex-direction: column; gap: 10px; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 10px;">
            <div style="display: flex; gap: 10px;">
                <input id="chr-preset-name" type="text" placeholder="Название пресета..." style="flex: 2; box-sizing: border-box;" />
                <select id="chr-preset-category" style="flex: 1;">
                    <option value="arcs">Для сообщений (Арки)</option>
                    <option value="chapters">Для глав (Летопись)</option>
                </select>
            </div>
            <textarea id="chr-preset-prompt" placeholder="Текст системного промпта..." style="width:100%; min-height: 120px; resize:vertical; box-sizing: border-box;"></textarea>
            <button id="chr-preset-save-btn" class="menu_button" style="color: #98c379;">Сохранить пресет</button>
        </div>
    `);

    let editingId = null;

    function openEditor(preset) {
        editingId = preset?.id || null;
        $box.find("#chr-preset-editor").css('display', 'flex');
        $box.find("#chr-preset-name").val(preset?.name || "");
        $box.find("#chr-preset-prompt").val(preset?.prompt || "");
        
        // Определяем категорию. Если пресет дефолтный и его ID из Глав — ставим Главы
        const isChapterBuiltin = preset?.builtin && ['chronicle_dry', 'master_status'].includes(preset?.id);
        const cat = preset?.category || (isChapterBuiltin ? 'chapters' : 'arcs');
        $box.find("#chr-preset-category").val(cat);
        
        // Убрали блокировку редактирования! Теперь можно менять текст даже у встроенных.
    }

    $box.find("#chr-new-preset-btn").on("click", () => openEditor(null));
    $box.find(".chr-preset-edit").on("click", function () { openEditor(getPreset($(this).data("id"))); });
    $box.find(".chr-preset-delete").on("click", function () {
        if (confirm("Точно удалить этот пресет?")) {
            deletePreset($(this).data("id"));
            renderPresetManager(container);
            refreshPresetSelect(container);
        }
    });
    $box.find("#chr-preset-save-btn").on("click", () => {
        const name = $box.find("#chr-preset-name").val().trim();
        const prompt = $box.find("#chr-preset-prompt").val().trim();
        const category = $box.find("#chr-preset-category").val();
        if (!name || !prompt) return;
        savePreset({ id: editingId, name, prompt, category });
        renderPresetManager(container);
        refreshPresetSelect(container);
    });
}

function refreshRange(container) {
    const total = (getContext().chat || []).length;
    $(container).find("#chr-from, #chr-from-upd").attr("max", total || 1).val(total ? 1 : 0);
    $(container).find("#chr-to, #chr-to-upd").attr("max", total || 1).val(total);
}

function refreshPresetSelect(container) {
    const settings = getSettings().chronicle;
    const allPresets = listPresets();
    const chapterBuiltinIds = ['chronicle_dry', 'master_status'];
    
    const arcPresets = allPresets.filter(p => p.category === 'arcs' || (!p.category && !chapterBuiltinIds.includes(p.id)));
    const chapterPresets = allPresets.filter(p => p.category === 'chapters' || (!p.category && chapterBuiltinIds.includes(p.id)));

    function buildHtml(presetsList, savedSelectionKey) {
        let current = settings[savedSelectionKey] || [];
        if (!Array.isArray(current)) current = [current];
        if (current.length === 0 && presetsList.length > 0) current = [presetsList[0].id];

        return presetsList.map((p) => {
            const isChecked = current.includes(p.id) ? "checked" : "";
            return `
                <label style="display: flex; align-items: center; gap: 8px; font-weight: normal; cursor: pointer;">
                    <input type="checkbox" class="chr-preset-cb" value="${p.id}" ${isChecked} style="margin: 0; width: 16px; height: 16px;" />
                    <span>${escapeHtml(p.name)}${p.builtin ? ` <em style="opacity: 0.7; font-size: 0.9em;">(встроенный)</em>` : ""}</span>
                </label>
            `;
        }).join("");
    }

    $(container).find("#chr-preset-checkboxes-arcs").html(buildHtml(arcPresets, 'lastPresetIdArcs'));
    $(container).find("#chr-preset-checkboxes-chapters").html(buildHtml(chapterPresets, 'lastPresetIdChapters'));
}

function getLorebookNames() {
    const names = [];
    $("#world_editor_select option").each(function () {
        const val = $(this).val();
        if (val !== "") names.push($(this).text());
    });
    return names;
}

function refreshLorebookSelects(container) {
    const names = getLorebookNames();
    const selects = [
        $(container).find("#chr-source-lorebook-select"),
        $(container).find("#chr-update-lorebook-select")
    ];
    selects.forEach(($select) => {
        const current = $select.val();
        $select.empty().append(`<option value="" disabled selected>Выберите лорбук</option>`);
        names.forEach((n) => $select.append(`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`));
        if (current) $select.val(current);
    });
}

async function loadSourceEntries(container, lorebookName, isUpdateTab = false) {
    const listId = isUpdateTab ? "#chr-update-entries-list" : "#chr-source-entries-list";
    const cbClass = isUpdateTab ? "chr-source-entry-cb-update" : "chr-source-entry-cb";
    const dataKey = isUpdateTab ? "sourceEntriesUpdate" : "sourceEntries";

    const $list = $(container).find(listId);
    $list.html(`<p style="opacity: 0.5; text-align: center;">Загрузка...</p>`);
    try {
        const raw = await getRawLorebook(lorebookName);
        const entries = Object.values(raw.entries || {});
        if (entries.length === 0) { $list.html(`<p style="opacity: 0.5; text-align: center;">Нет записей</p>`); return; }
        
        $list.empty();
        entries.forEach((e) => {
            const title = e.comment || e.key?.join(", ") || `#${e.uid}`;
            $list.append(`
                <label style="display: flex; gap: 8px; margin-bottom: 4px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
                    <input type="checkbox" class="${cbClass}" value="${e.uid}" />
                    <span style="font-weight: 500;">${escapeHtml(title)}</span>
                </label>
            `);
        });
        $(container).data(dataKey, raw.entries);
    } catch (err) {
        $list.html(`<p style="color: #e06c75; text-align: center;">Ошибка: ${err.message}</p>`);
    }
}

function openSettingsModal() {
    const settings = getSettings().chronicle;
    const profiles = ChronicleApiService.listProfiles();
    const profileOptions = profiles.map(p => `<option value="${escapeHtml(p.name)}" ${settings.lastProfile === p.name ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join("");

    openSimpleModal({
        id: "chr-settings-modal",
        headerHtml: `<span><i class="fa-solid fa-gear"></i> Настройки Хроники</span><button id="chr-set-close" class="stt-icon-btn">✕</button>`,
        bodyHtml: `
            <div class="stt-panel" style="padding-top: 5px;">
                <label class="chr-field">Язык <select id="chr-set-lang"><option value="ru" ${settings.language === 'ru' ? 'selected' : ''}>Русский</option><option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option></select></label>
                <label class="chr-field">Профиль <select id="chr-set-profile"><option value="" disabled ${!settings.lastProfile ? 'selected' : ''}>Выберите профиль</option>${profileOptions}</select></label>
                <div style="display: flex; gap: 10px;">
                    <label class="chr-field">Температура <input id="chr-set-temp" type="number" min="0" max="2" step="0.1" value="${settings.temperature || 0.7}" /></label>
                    <label class="chr-field">Токены <input id="chr-set-tokens" type="number" min="50" step="50" value="${settings.maxTokens || 800}" /></label>
                </div>
                
                <hr style="border-color: var(--SmartThemeBorderColor, rgba(255,255,255,0.1)); margin: 10px 0;">
                <h4 style="margin: 0; font-size: 0.9em; opacity: 0.8;">Параметры сохранения записей</h4>
                
                <label class="chr-field">Позиция вставки
                    <select id="chr-set-position">
                        <option value="0" ${settings.position == 0 ? 'selected' : ''}>↑Перс. (Перед описанием)</option>
                        <option value="1" ${settings.position == 1 ? 'selected' : ''}>↓Перс. (После описания)</option>
                        <option value="2" ${settings.position == 2 ? 'selected' : ''}>↑ПС (Перед примерами)</option>
                        <option value="3" ${settings.position == 3 ? 'selected' : ''}>↓ПС (После примеров)</option>
                        <option value="4" ${settings.position == 4 ? 'selected' : ''}>↑АЗ (Перед заметкой автора)</option>
                        <option value="5" ${settings.position == 5 ? 'selected' : ''}>↓АЗ (После заметки автора)</option>
                        <option value="6" ${settings.position == 6 ? 'selected' : ''}>На глуб. (В чате)</option>
                    </select>
                </label>
                <label class="chr-field">Статус
                    <select id="chr-set-status">
                        <option value="selective" ${settings.status === 'selective' ? 'selected' : ''}>По ключам (Selective)</option>
                        <option value="constant" ${settings.status === 'constant' ? 'selected' : ''}>Постоянно (Constant)</option>
                        <option value="vectorized" ${settings.status === 'vectorized' ? 'selected' : ''}>Векторизированная (Vectorized)</option>
                    </select>
                </label>
                <label class="chr-field" style="flex-direction: row; margin-top: 5px;">
                    <input type="checkbox" id="chr-set-keys-cb" ${settings.generateKeys ? 'checked' : ''} /> Генерировать ключи (AI)
                </label>
            </div>
        `,
        footerHtml: `<button id="chr-set-save" class="menu_button" style="width: 100%;">Сохранить настройки</button>`,
        onOpen: (modal) => {
            modal.find("#chr-set-close").on("click", () => modal.remove());
            modal.find("#chr-set-save").on("click", () => {
                settings.language = modal.find("#chr-set-lang").val();
                settings.lastProfile = modal.find("#chr-set-profile").val();
                settings.temperature = parseFloat(modal.find("#chr-set-temp").val());
                settings.maxTokens = parseInt(modal.find("#chr-set-tokens").val(), 10);
                settings.position = parseInt(modal.find("#chr-set-position").val(), 10);
                settings.status = modal.find("#chr-set-status").val();
                settings.generateKeys = modal.find("#chr-set-keys-cb").is(":checked");
                saveSettings();
                modal.remove();
            });
        }
    });
}

function bindEvents(container) {
    const $c = $(container);

    $c.find('#chr-mode-tabs button').on('click', function() {
        $('#chr-mode-tabs button').removeClass('active');
        $(this).addClass('active');
        $('.chr-mode-panel').hide();
        $(`#chr-mode-${$(this).data('mode')}-panel`).show();
    });

    $c.find('#chr-manage-presets-btn').on('click', () => {
        const $box = $c.find("#chr-preset-manager");
        $box.toggle();
        if ($box.is(":visible")) renderPresetManager(container);
    });

    $c.find('#chr-open-settings-btn').on('click', openSettingsModal);

    // Галочка включения/отключения чата в обновлении
    $c.find("#chr-include-chat-cb").on("change", function() {
        if ($(this).is(":checked")) {
            $c.find("#chr-range-row-update").slideDown();
        } else {
            $c.find("#chr-range-row-update").slideUp();
        }
    });

    $c.find("#chr-source-lorebook-select").on("change", function() {
        if ($(this).val()) loadSourceEntries(container, $(this).val());
    });
    $c.find("#chr-update-lorebook-select").on("change", function() {
        if ($(this).val()) loadSourceEntries(container, $(this).val(), true);
    });

    $c.find("#chr-generate-btn, #chr-reroll-btn").on("click", () => runGenerate(container));
}

function setStatus(container, text, isError = false) {
    const $status = $(container).find("#chr-status");
    $status.text(text || "").css("color", isError ? "#e06c75" : "inherit");
}

function buildRangeMessages(container) {
    const messages = getContext().chat || [];
    const from = Math.max(0, parseInt($(container).find("#chr-from").val(), 10) - 1);
    const to = Math.min(messages.length - 1, parseInt($(container).find("#chr-to").val(), 10) - 1);
    const result = [];
    for (let i = from; i <= to; i++) {
        if (messages[i]) result.push({ role: messages[i].is_user ? "user" : "assistant", content: (messages[i].mes || "").trim() });
    }
    return result;
}

async function runGenerate(container) {
    const $c = $(container);
    const settings = getSettings().chronicle;
    if (!settings.lastProfile) { setStatus(container, "Ошибка: Выберите профиль API в Настройках!", true); return; }

    const isArcs = $c.find('#chr-mode-tabs button[data-mode="arcs"]').hasClass('active');
    const isUpdate = $c.find('#chr-mode-tabs button[data-mode="update"]').hasClass('active');
    
    let contextMessages = [];
    let presetIds = [];
    let combinedPrompt = "";

    if (isArcs) {
        contextMessages = buildRangeMessages(container);
        if (contextMessages.length === 0) { setStatus(container, "Диапазон сообщений пуст!", true); return; }
        presetIds = $c.find("#chr-preset-checkboxes-arcs .chr-preset-cb:checked").map(function() { return $(this).val(); }).get();
        if (presetIds.length === 0) { setStatus(container, "Выберите пресет!", true); return; }
        settings.lastPresetIdArcs = presetIds;

    } else if (isUpdate) {
        const sourceEntriesMap = $c.data('sourceEntriesUpdate') || {};
        const selectedUids = $c.find(".chr-source-entry-cb-update:checked").map(function() { return $(this).val(); }).get();
        if (selectedUids.length === 0) { setStatus(container, "Отметьте хотя бы одну старую запись!", true); return; }
        
        const oldEntriesText = selectedUids.map(uid => `[СТАРАЯ ЗАПИСЬ]:\n${sourceEntriesMap[uid]?.content || ""}`).join("\n\n");
        
        const includeChat = $c.find("#chr-include-chat-cb").is(":checked");
        let chatText = "";
        
        if (includeChat) {
            const chatMessages = buildRangeMessages(container);
            chatText = "\n\nНОВЫЕ СОБЫТИЯ (ЧАТ):\n" + chatMessages.map(m => `${m.role === 'user' ? 'User' : 'Char'}: ${m.content}`).join("\n");
        }
        
        combinedPrompt = $c.find("#chr-update-custom-prompt").val().trim();
        if (!combinedPrompt) { setStatus(container, "Напишите инструкцию для нейросети!", true); return; }
        
        contextMessages = [{ role: "user", content: `ТЕКУЩИЕ ЗАПИСИ ЛОРБУКА:\n${oldEntriesText}${chatText}` }];
        
    } else {
        const sourceEntriesMap = $c.data('sourceEntries') || {};
        const selectedUids = $c.find(".chr-source-entry-cb:checked").map(function() { return $(this).val(); }).get();
        if (selectedUids.length === 0) { setStatus(container, "Отметьте хотя бы одну главу!", true); return; }
        
        const combinedText = selectedUids.map(uid => sourceEntriesMap[uid]?.content || "").join("\n\n");
        contextMessages = [{ role: "user", content: `Текст глав для анализа:\n${combinedText}` }];
        presetIds = $c.find("#chr-preset-checkboxes-chapters .chr-preset-cb:checked").map(function() { return $(this).val(); }).get();
        if (presetIds.length === 0) { setStatus(container, "Выберите пресет!", true); return; }
        settings.lastPresetIdChapters = presetIds;
    }

    // --- УМНАЯ СБОРКА ПРОМПТОВ ДЛЯ РАЗДЕЛЕНИЯ НА КАРТОЧКИ ---
    if (!isUpdate) {
        if (presetIds.length > 1) {
            // Если пресетов несколько, нумеруем их как отдельные задачи, чтобы ИИ не слил их в кашу
            combinedPrompt = presetIds.map((id, index) => `[ЗАДАЧА ${index + 1}]:\n${getPreset(id)?.prompt || ""}`).join("\n\n");
            
            // Добавляем ЖЕСТКОЕ правило ОДИН РАЗ в конец
            const multiRule = settings.language === "ru" 
                ? "\n\n[КРИТИЧЕСКОЕ ПРАВИЛО: Ты выполняешь несколько разных задач. Ответ на КАЖДУЮ задачу ДОЛЖЕН быть отделен от других строкой '=== ENTRY BOUNDARY ==='. Никакого лишнего текста между разделителями!]"
                : "\n\n[CRITICAL RULE: You are performing multiple separate tasks. The output for EACH task MUST be separated from the others by the exact string '=== ENTRY BOUNDARY ==='. No filler text between separators!]";
            combinedPrompt += multiRule;
        } else {
            combinedPrompt = getPreset(presetIds[0])?.prompt || "";
        }
    }

    if (settings.generateKeys) {
        const keyInstruction = settings.language === "ru" 
            ? "\n\nВАЖНО: В самом конце своего ответа, с новой строки, напиши 'KEYWORDS: ' и перечисли 3-7 ключевых слов для этого текста через запятую."
            : "\n\nIMPORTANT: At the very end of your response, on a new line, write 'KEYWORDS: ' and list 3-7 keywords separated by commas.";
        combinedPrompt += keyInstruction;
    }

    saveSettings();
    $c.find("#chr-generate-btn, #chr-reroll-btn").prop("disabled", true);
    setStatus(container, "Нейросеть думает...");

    try {
        let text = await ChronicleApiService.generate({
            profileName: settings.lastProfile,
            systemPrompt: combinedPrompt,
            contextMessages,
            temperature: settings.temperature || 0.7,
            maxTokens: settings.maxTokens || 800,
            language: settings.language || "ru"
        });
        
        text = text.replace(/\*/g, ""); 
        
        let globalKeys = [];
        const keyMatch = text.match(/KEYWORDS:\s*(.+)/i);
        if (keyMatch) {
            globalKeys = keyMatch[1].split(',').map(k => k.trim().replace(/['"*\.]/g, '')).filter(k => k.length > 0);
            text = text.replace(keyMatch[0], "").trim();
        }

        // Парсим карточки по разделителю
        const chunks = text.split(/=== ENTRY BOUNDARY ===/i).map(s => s.trim()).filter(s => s.length > 0);
        
        renderMultiChunks(container, chunks, globalKeys);
        setStatus(container, "");
    } catch (err) {
        setStatus(container, err.message, true);
    } finally {
        $c.find("#chr-generate-btn").prop("disabled", false);
        $c.find("#chr-reroll-btn").prop("disabled", false);
    }
}

async function renderMultiChunks(container, chunks, globalKeys) {
    const $out = $(container).find("#chr-chunks-container");
    $out.empty();
    
    const lbNames = getLorebookNames();
    const defaultLb = $(container).find("#chr-source-lorebook-select").val() || $(container).find("#chr-update-lorebook-select").val();

    chunks.forEach((chunkText, index) => {
        let title = "";
        let content = chunkText;
        const titleMatch = content.match(/1\.\s+Arc\/Event\s+Title:\s*(.+)/i) || content.match(/###\s+Memory Book Entry:\s*(.+)/i);
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
            content = content.replace(titleMatch[0], "").trim();
        }
        const keysStr = index === 0 ? globalKeys.join(", ") : "";

        const chunkHtml = `
        <div class="chr-chunk-box" style="background: rgba(0,0,0,0.15); border: 1px solid var(--SmartThemeBorderColor); padding: 12px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); position: relative;">
            
            <!-- Кнопка удаления блока -->
            <button class="chunk-delete-btn menu_button" style="position: absolute; top: 10px; right: 10px; color: #e06c75; background: rgba(0,0,0,0.5); padding: 4px 8px; border-radius: 4px;" title="Удалить карточку">
                <i class="fa-solid fa-trash"></i>
            </button>

            <textarea class="chunk-text" style="width: 100%; min-height: 120px; margin-top: 25px; margin-bottom: 10px; resize: vertical; background: rgba(0,0,0,0.2); color: inherit; padding: 8px; border-radius: 5px; border: 1px inset var(--SmartThemeBorderColor); box-sizing: border-box;">${escapeHtml(content)}</textarea>
            
            <div style="display: flex; gap: 15px; margin-bottom: 10px; background: rgba(255,255,255,0.05); padding: 6px; border-radius: 5px;">
                <label style="cursor: pointer;"><input type="radio" name="chunk-target-${index}" value="new" checked class="chunk-target-radio" /> В новую запись</label>
                <label style="cursor: pointer;"><input type="radio" name="chunk-target-${index}" value="existing" class="chunk-target-radio" /> В существующую</label>
            </div>

            <div class="chunk-new-form" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px;">
                <div style="display: flex; gap: 10px; align-items: center;">
                    <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                        <input type="checkbox" class="chunk-use-prefix-cb" checked /> Префикс:
                    </label>
                    <select class="chunk-prefix-type" style="width: 100px; padding: 4px; border-radius: 4px; background: var(--SmartThemeBlurTintColor); color: inherit; border: 1px solid var(--SmartThemeBorderColor);">
                        <option value="Arc">Arc</option>
                        <option value="Chapter">Chapter</option>
                        <option value="Арка">Арка</option>
                        <option value="Глава">Глава</option>
                    </select>
                    <input type="number" class="chunk-prefix-num" value="${index + 1}" min="1" style="width: 70px; padding: 4px; border-radius: 4px; background: var(--SmartThemeBlurTintColor); color: inherit; border: 1px solid var(--SmartThemeBorderColor);" />
                </div>
                <div style="display: flex; gap: 10px;">
                    <input type="text" class="chunk-title" placeholder="Название записи..." value="${escapeHtml(title)}" style="flex: 1;" />
                    <input type="text" class="chunk-keys" placeholder="Ключи (через запятую)..." value="${escapeHtml(keysStr)}" style="flex: 1;" />
                </div>
            </div>

            <div class="chunk-existing-form" style="display: none; gap: 10px; margin-bottom: 10px; align-items: center;">
                <select class="chunk-entry-select" style="flex: 1;"><option value="" disabled selected>Сначала выберите лорбук ниже</option></select>
                <select class="chunk-mode-select" style="width: 140px;">
                    <option value="append">Дописать</option>
                    <option value="replace">Заменить</option>
                </select>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px;">
                <div>
                    <button class="chunk-merge-up menu_button" title="Приклеить текст к верхней карточке" style="display: ${index > 0 ? 'inline-block' : 'none'};"><i class="fa-solid fa-arrow-up"></i> Объединить вверх</button>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <select class="chunk-lorebook-select">
                        <option value="" disabled selected>Лорбук для сохранения...</option>
                        ${lbNames.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")}
                    </select>
                    <button class="chunk-save-btn menu_button" style="color: #98c379;"><i class="fa-solid fa-floppy-disk"></i> Сохранить</button>
                </div>
            </div>
            <div class="chunk-status" style="font-size: 0.85em; margin-top: 5px; text-align: right;"></div>
        </div>
        `;
        $out.append(chunkHtml);
    });

    if (defaultLb) { $out.find(".chunk-lorebook-select").val(defaultLb).trigger("change"); }

    // Удаление карточки
    $out.find(".chunk-delete-btn").on("click", function() {
        $(this).closest(".chr-chunk-box").fadeOut(200, function() { $(this).remove(); });
    });

    $out.find(".chunk-target-radio").on("change", function() {
        const $box = $(this).closest(".chr-chunk-box");
        const isNew = $(this).val() === "new";
        $box.find(".chunk-new-form").toggle(isNew);
        $box.find(".chunk-existing-form").toggle(!isNew);
    });

    $out.find(".chunk-lorebook-select").on("change", async function() {
        const lbName = $(this).val();
        const $box = $(this).closest(".chr-chunk-box");
        const $entrySelect = $box.find(".chunk-entry-select");
        $entrySelect.empty().append('<option value="" disabled selected>Загрузка...</option>');
        try {
            const entries = await listEntries(lbName);
            $entrySelect.empty();
            entries.forEach(e => $entrySelect.append(`<option value="${e.uid}">${escapeHtml(e.title)}</option>`));
        } catch (e) {
            $entrySelect.empty().append('<option value="" disabled selected>Ошибка загрузки</option>');
        }
    });

    $out.find(".chunk-merge-up").on("click", function() {
        const $currentBox = $(this).closest(".chr-chunk-box");
        const $prevBox = $currentBox.prev(".chr-chunk-box");
        if ($prevBox.length) {
            const currentText = $currentBox.find(".chunk-text").val();
            const prevText = $prevBox.find(".chunk-text").val();
            $prevBox.find(".chunk-text").val(prevText + "\n\n" + currentText);
            
            const currentKeys = $currentBox.find(".chunk-keys").val();
            if (currentKeys) {
                const prevKeys = $prevBox.find(".chunk-keys").val();
                $prevBox.find(".chunk-keys").val(prevKeys ? prevKeys + ", " + currentKeys : currentKeys);
            }
            $currentBox.remove();
        }
    });

    $out.find(".chunk-save-btn").on("click", async function() {
        const $box = $(this).closest(".chr-chunk-box");
        const lb = $box.find(".chunk-lorebook-select").val();
        const text = $box.find(".chunk-text").val().trim();
        const isNew = $box.find(".chunk-target-radio:checked").val() === "new";
        const $status = $box.find(".chunk-status");

        if (!lb) { $status.text("Ошибка: Выберите лорбук!").css("color", "#e06c75"); return; }
        if (!text) { $status.text("Ошибка: Текст пустой!").css("color", "#e06c75"); return; }

        const settings = getSettings().chronicle;
        const btn = $(this);
        btn.prop("disabled", true);
        $status.text("Сохранение...").css("color", "inherit");

        try {
            if (isNew) {
                let title = $box.find(".chunk-title").val().trim();
                if (!title) { throw new Error("Укажите название записи!"); }
                
                if ($box.find(".chunk-use-prefix-cb").is(":checked")) {
                    const type = $box.find(".chunk-prefix-type").val();
                    const num = parseInt($box.find(".chunk-prefix-num").val(), 10);
                    title = `${type} ${num}: ${title}`;
                    
                    $out.find(".chunk-prefix-num").each(function() {
                        const currentNum = parseInt($(this).val(), 10);
                        if (currentNum === num) {
                            $(this).val(currentNum + 1);
                        }
                    });
                }
                
                const keys = $box.find(".chunk-keys").val().split(',').map(k => k.trim()).filter(k => k);
                
                await createEntry(lb, title, text, { position: settings.position, status: settings.status, keys: keys });
            } else {
                const uid = $box.find(".chunk-entry-select").val();
                const mode = $box.find(".chunk-mode-select").val();
                if (uid === null) { throw new Error("Выберите запись для перезаписи!"); }
                
                if (mode === "replace") await replaceEntry(lb, uid, text);
                else await appendToEntry(lb, uid, text);
            }
            
            $status.text("Успешно сохранено!").css("color", "#98c379");
            btn.text("Готово").css("color", "inherit");
            $out.find(".chunk-lorebook-select").trigger("change");
            
        } catch (e) {
            $status.text("Ошибка: " + e.message).css("color", "#e06c75");
            btn.prop("disabled", false);
        }
    });

    $(container).find("#chr-multi-results-section").show();
}