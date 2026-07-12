import { escapeHtmlWithBreaks } from "../../shared/utils.js";
import { t } from "../../core/i18n.js";

export function setupSearch(container) {
    const $c = $(container);
    let matches = [];
    let currentMatch = -1;

    function renderDisplay(query) {
        const text = $c.find("#ce-output").val();
        const display = $c.find("#ce-output-display")[0];
        if (!display) return;
        if (!query) { display.textContent = text; return; }

        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        let result = "";
        let pos = 0;

        while (pos < text.length) {
            const found = lowerText.indexOf(lowerQuery, pos);
            if (found === -1) { result += escapeHtmlWithBreaks(text.substring(pos)); break; }
            result += escapeHtmlWithBreaks(text.substring(pos, found));
            result += `<mark class="ce-highlight">${escapeHtmlWithBreaks(text.substring(found, found + query.length))}</mark>`;
            pos = found + query.length;
        }
        display.innerHTML = result;
    }

    function findMatches() {
        const text = $c.find("#ce-output").val();
        const query = $c.find("#ce-search").val().trim();
        matches = [];
        currentMatch = -1;
        $c.find("#ce-search-info").text("");
        renderDisplay(query);
        if (!query || !text) return;

        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();
        let pos = 0;
        while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
            matches.push(pos);
            pos += lowerQuery.length;
        }

        if (matches.length === 0) {
            $c.find("#ce-search-info").text(t("exporter.not_found"));
        } else {
            currentMatch = 0;
            jumpTo(currentMatch);
        }
    }

    function jumpTo(idx) {
        if (matches.length === 0) return;
        currentMatch = (idx + matches.length) % matches.length;
        $c.find("#ce-search-info").text(`${currentMatch + 1} / ${matches.length}`);

        const highlights = container.querySelectorAll(".ce-highlight");
        if (highlights[currentMatch]) {
            highlights.forEach((el) => el.classList.remove("ce-highlight-active"));
            highlights[currentMatch].classList.add("ce-highlight-active");
            highlights[currentMatch].scrollIntoView({ block: "center", behavior: "smooth" });
        }
    }

    $c.find("#ce-search").on("input", findMatches);
    $c.find("#ce-search-next").on("click", () => jumpTo(currentMatch + 1));
    $c.find("#ce-search-prev").on("click", () => jumpTo(currentMatch - 1));

    return { renderDisplay, findMatches };
}
