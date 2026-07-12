import { makeDraggable, isolateScroll } from "../utils.js";

/**
 * Открывает лёгкую плавающую модалку поверх основного окна (например,
 * результат извлечения записей лорбука). Не имеет вкладок — просто
 * заголовок/тело/футер + drag + закрытие.
 */
export function openSimpleModal({ id, headerHtml, bodyHtml, footerHtml, onOpen }) {
    $(`#${id}`).remove();

    const modal = $(`
        <div id="${id}" class="stt-simple-modal">
            <div class="stt-simple-header">${headerHtml}</div>
            <div class="stt-simple-body">${bodyHtml}</div>
            ${footerHtml ? `<div class="stt-simple-footer">${footerHtml}</div>` : ""}
        </div>
    `);

    $("body").append(modal);
    makeDraggable(modal[0], modal.find(".stt-simple-header")[0]);
    isolateScroll(modal.find(".stt-simple-body")[0]);

    if (onOpen) onOpen(modal);
    return modal;
}
