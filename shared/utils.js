export function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export function escapeHtmlWithBreaks(str) {
    return escapeHtml(str).replace(/\n/g, "<br>");
}

export function downloadText(filename, content, mime = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function copyToClipboard(text) {
    return navigator.clipboard.writeText(text);
}

/**
 * Делает modalEl перетаскиваемым за handleEl. Поддерживает мышь и тач,
 * ограничивает окно границами вьюпорта. Используется и главным окном
 * с вкладками, и плавающими поповерами поверх него.
 */
export function makeDraggable(modalEl, handleEl) {
    if (!modalEl || !handleEl) return;
    let dragging = false;
    let startX, startY, origLeft, origTop;

    const start = (e) => {
        dragging = true;
        const ev = e.type.includes("touch") ? e.touches[0] : e;
        startX = ev.clientX;
        startY = ev.clientY;
        const rect = modalEl.getBoundingClientRect();
        origLeft = rect.left;
        origTop = rect.top;
        modalEl.style.right = "auto";
        modalEl.style.bottom = "auto";
        if (!e.type.includes("touch")) e.preventDefault();
    };

    const move = (e) => {
        if (!dragging) return;
        const ev = e.type.includes("touch") ? e.touches[0] : e;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let newLeft = origLeft + dx;
        let newTop = origTop + dy;
        const maxX = window.innerWidth - modalEl.offsetWidth;
        const maxY = window.innerHeight - modalEl.offsetHeight;
        newLeft = Math.max(0, Math.min(newLeft, maxX));
        newTop = Math.max(0, Math.min(newTop, maxY));
        modalEl.style.left = `${newLeft}px`;
        modalEl.style.top = `${newTop}px`;
        modalEl.style.position = "fixed";
    };

    const end = () => { dragging = false; };

    handleEl.addEventListener("mousedown", start);
    handleEl.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("mousemove", move);
    document.addEventListener("touchmove", move, { passive: true });
    document.addEventListener("mouseup", end);
    document.addEventListener("touchend", end);
}

/** Изолирует скролл/тач внутри элемента от движка чата SillyTavern. */
export function isolateScroll(el) {
    if (!el) return;
    const stop = (e) => e.stopPropagation();
    ["touchstart", "touchmove", "touchend", "wheel"].forEach((evt) =>
        el.addEventListener(evt, stop, { passive: true })
    );
}
