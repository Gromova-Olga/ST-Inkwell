import { getSettings, saveSettings } from "../../core/settingsStore.js";
import { t } from "../../core/i18n.js";
import * as state from "./state.js";
import { renderFolderTree, openFolders, openChatsSections, openCharChats } from "./render.js";

export async function renderFolderPanel() {
    const settings = getSettings().lorebookFolders;
    const list = $("#lf-folder-list");
    if (list.length === 0) return; // вкладка сейчас не смонтирована

    if (settings.folders.length === 0) {
        list.html(`<div class="lf-empty">${t("folders.empty")}</div>`);
        return;
    }
    list.html(`<div class="lf-empty">${t("folders.loading")}</div>`);

    const allChats = await state.getAllCharacterChats();
    const chatId = state.getCurrentChatId();
    const bound = chatId ? settings.chatBindings[chatId] || [] : [];

    list.html(`<div class="lf-subfolders-list" style="margin-left:0; border:none; padding:0;">${renderFolderTree(null, settings, allChats, bound)}</div>`);
    bindTreeEvents();
}

export function bindPanelControls() {
    $(document).off("click.lfcreate").on("click.lfcreate", "#lf-create-folder", handleCreateFolder);

    $(document).off("input.lfsearch").on("input.lfsearch", "#lf-search-input", function () {
        const term = $(this).val().toLowerCase();
        $(".lf-folder-item").each(function () {
            const name = $(this).find(".lf-folder-name").first().text().toLowerCase();
            const hasMatch = name.includes(term) ||
                $(this).find(".lf-book-name").filter(function () { return $(this).text().toLowerCase().includes(term); }).length > 0;
            $(this).toggle(hasMatch || !term);
        });
    });

    $(document).off("click.lfcompact").on("click.lfcompact", "#lf-compact-toggle", function () {
        const settings = getSettings().lorebookFolders;
        settings.isCompact = !settings.isCompact;
        $(this).toggleClass("lf-active", settings.isCompact);
        $("#lf-folder-list").toggleClass("lf-compact", settings.isCompact);
        saveSettings();
    });

    $(document).off("click.lfexport").on("click.lfexport", "#lf-export-btn", function () {
        const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(getSettings().lorebookFolders, null, 2));
        const link = document.createElement("a");
        link.href = data;
        link.download = "lorebook_folders.json";
        link.click();
        toastr.success(t("folders.backup_ok"), "Lorebook Folders");
    });

    $(document).off("click.lfimport").on("click.lfimport", "#lf-import-btn", function () {
        $("#lf-import-file").trigger("click");
    });

    $(document).off("change.lfimportfile").on("change.lfimportfile", "#lf-import-file", function (e) {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = (ev) => {
            try {
                const d = JSON.parse(ev.target.result);
                if (d.folders) {
                    Object.assign(getSettings().lorebookFolders, d);
                    saveSettings();
                    renderFolderPanel();
                    toastr.success(t("folders.import_ok"), "Lorebook Folders");
                } else {
                    toastr.error(t("folders.import_err_data"), "Lorebook Folders");
                }
            } catch (err) {
                toastr.error(t("folders.import_err_read"), "Lorebook Folders");
            }
        };
        r.readAsText(f);
        e.target.value = "";
    });
}

function handleCreateFolder() {
    const input = $(`<div class="lf-inline-input-wrapper" style="margin-bottom:8px;"><input type="text" class="lf-inline-input" placeholder="${t("folders.placeholder_new_folder")}"><i class="fa-solid fa-check" style="color:#98c379;"></i><i class="fa-solid fa-xmark" style="color:#e06c75;"></i></div>`);
    $("#lf-folder-list").prepend(input);
    input.find("input").trigger("focus");
    input.find(".fa-check").on("click", () => {
        const n = input.find("input").val().trim();
        if (n) {
            const s = getSettings().lorebookFolders;
            s.folders.push({ id: `f_${Date.now()}`, name: n, parentId: null });
            saveSettings();
            renderFolderPanel();
        }
    });
    input.find(".fa-xmark").on("click", () => input.remove());
}

function bindTreeEvents() {
    const settings = getSettings().lorebookFolders;

    $(".lf-folder-header").off("click").on("click", function (e) {
        if ($(e.target).closest(".lf-folder-actions, .lf-inline-input-wrapper").length) return;
        const id = $(this).closest(".lf-folder-item").data("folder-id");
        $(this).siblings(".lf-folder-contents").first().slideToggle(200, function () {
            if ($(this).is(":visible")) openFolders.add(id); else openFolders.delete(id);
            $(this).siblings(".lf-folder-header").find(".lf-folder-toggle").text($(this).is(":visible") ? "▼" : "▶");
        });
    });

    $(".lf-btn-bind").off("click").on("click", function (e) { e.stopPropagation(); state.toggleChatBinding($(this).data("folder-id")); });

    $(".lf-btn-color").off("click").on("click", function (e) { e.stopPropagation(); $(this).siblings(".lf-color-picker").trigger("click"); });
    $(".lf-color-picker").off("change").on("change", function () {
        const folder = settings.folders.find((f) => f.id === $(this).data("folder-id"));
        if (folder) { folder.color = $(this).val(); saveSettings(); renderFolderPanel(); }
    });

    $(".lf-btn-add-subfolder").off("click").on("click", function (e) {
        e.stopPropagation();
        const pid = $(this).data("folder-id");
        const cont = $(this).closest(".lf-folder-item").children(".lf-folder-contents");
        if (!cont.is(":visible")) $(this).closest(".lf-folder-header").trigger("click");
        const input = $(`<div class="lf-inline-input-wrapper"><input type="text" class="lf-inline-input" placeholder="${t("folders.placeholder_subfolder")}"><i class="fa-solid fa-check" style="color:#98c379;"></i><i class="fa-solid fa-xmark" style="color:#e06c75;"></i></div>`);
        cont.children(".lf-subfolders-list").prepend(input);
        input.find("input").trigger("focus");
        input.find(".fa-check").on("click", () => {
            const n = input.find("input").val().trim();
            if (n) { settings.folders.push({ id: `f_${Date.now()}`, name: n, parentId: pid }); saveSettings(); renderFolderPanel(); }
        });
        input.find(".fa-xmark").on("click", () => input.remove());
    });

    $(".lf-btn-add-book").off("click").on("click", function (e) {
        e.stopPropagation();
        const fid = $(this).data("folder-id");
        const un = state.getUnassignedLorebooks(fid);
        if (un.length === 0) { toastr.info(t("folders.all_assigned"), "Lorebook Folders"); return; }
        const cont = $(this).closest(".lf-folder-item").children(".lf-folder-contents");
        if (!cont.is(":visible")) $(this).closest(".lf-folder-header").trigger("click");
        const add = $(`<div class="lf-inline-add"><select class="lf-add-select"><option disabled selected>${t("folders.select_placeholder")}</option>${un.map((b) => `<option value="${b.name}">${b.name}</option>`).join("")}</select><i class="fa-solid fa-check" style="color:#98c379;"></i></div>`);
        cont.children(".lf-section-label").first().after(add);
        add.find(".fa-check").on("click", () => {
            const b = add.find("select").val();
            if (b) { settings.assignments[b] = settings.assignments[b] || []; settings.assignments[b].push(fid); saveSettings(); renderFolderPanel(); }
        });
    });

    $(".lf-btn-rename").off("click").on("click", function (e) {
        e.stopPropagation();
        const folder = settings.folders.find((f) => f.id === $(this).data("folder-id"));
        const span = $(this).closest(".lf-folder-header").find(".lf-folder-name");
        span.hide();
        const input = $(`<div class="lf-inline-input-wrapper"><input type="text" class="lf-inline-input" value="${folder.name}"><i class="fa-solid fa-check"></i></div>`);
        span.after(input);
        input.find("input").trigger("focus");
        input.find(".fa-check").on("click", () => {
            const n = input.find("input").val().trim();
            if (n) { folder.name = n; saveSettings(); renderFolderPanel(); }
        });
    });

    $(".lf-btn-delete").off("click").on("click", function (e) {
        e.stopPropagation();
        if (confirm(t("folders.delete_confirm"))) {
            state.deleteFolderRecursive($(this).data("folder-id"), settings);
            saveSettings();
            renderFolderPanel();
        }
    });

    // Кнопка открепления книги от папки — в оригинале была нарисована в
    // разметке, но без обработчика; здесь довели до рабочего состояния.
    $(".lf-book-remove").off("click").on("click", function (e) {
        e.stopPropagation();
        const bookName = $(this).data("book-name");
        const folderId = $(this).data("folder-id");
        if (settings.assignments[bookName]) {
            settings.assignments[bookName] = settings.assignments[bookName].filter((fid) => fid !== folderId);
            if (settings.assignments[bookName].length === 0) delete settings.assignments[bookName];
            saveSettings();
            renderFolderPanel();
        }
    });

    $(".lf-chats-toggle").off("click").on("click", function (e) {
        e.stopPropagation();
        const id = $(this).data("folder-id");
        $(this).siblings(".lf-chats-section").slideToggle(200, function () {
            if ($(this).is(":visible")) openChatsSections.add(id); else openChatsSections.delete(id);
        });
    });

    $(".lf-char-header").off("click").on("click", function (e) {
        e.stopPropagation();
        const key = `${$(this).data("folder-id")}_${$(this).data("char")}`;
        $(this).siblings(".lf-char-chats").slideToggle(200, function () {
            if ($(this).is(":visible")) openCharChats.add(key); else openCharChats.delete(key);
        });
    });

    $(".lf-btn-chat-bind").off("click").on("click", function (e) {
        e.stopPropagation();
        const fid = $(this).data("folder-id");
        const cid = $(this).data("chat-id");
        settings.chatBindings[cid] = settings.chatBindings[cid] || [];
        const idx = settings.chatBindings[cid].indexOf(fid);
        if (idx === -1) settings.chatBindings[cid].push(fid); else settings.chatBindings[cid].splice(idx, 1);
        saveSettings();
        renderFolderPanel();
    });

    $(".lf-folder-item").off("dragstart dragover drop")
        .on("dragstart", function (e) {
            if ($(e.target).closest(".lf-book-item").length) return;
            e.stopPropagation();
            e.originalEvent.dataTransfer.setData("lf-folder-id", $(this).data("folder-id"));
        })
        .on("dragover", function (e) { e.preventDefault(); e.stopPropagation(); $(this).addClass("lf-drag-over"); })
        .on("dragleave", function () { $(this).removeClass("lf-drag-over"); })
        .on("drop", function (e) {
            e.preventDefault(); e.stopPropagation(); $(this).removeClass("lf-drag-over");
            const tid = $(this).data("folder-id");
            const fid = e.originalEvent.dataTransfer.getData("lf-folder-id");
            const bn = e.originalEvent.dataTransfer.getData("lf-book-name");
            if (bn) {
                settings.assignments[bn] = settings.assignments[bn] || [];
                if (!settings.assignments[bn].includes(tid)) { settings.assignments[bn].push(tid); saveSettings(); renderFolderPanel(); }
            } else if (fid && fid !== tid && !state.isDescendant(tid, fid, settings)) {
                const fidx = settings.folders.findIndex((f) => f.id === fid);
                const tidx = settings.folders.findIndex((f) => f.id === tid);
                const [m] = settings.folders.splice(fidx, 1);
                m.parentId = settings.folders[tidx].parentId;
                settings.folders.splice(tidx, 0, m);
                saveSettings();
                renderFolderPanel();
            }
        });

    $(".lf-book-item").off("dragstart").on("dragstart", function (e) {
        e.stopPropagation();
        e.originalEvent.dataTransfer.setData("lf-book-name", $(this).data("book-name"));
    });
}
