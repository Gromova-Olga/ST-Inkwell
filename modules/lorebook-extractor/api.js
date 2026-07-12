import { getContext } from "../../core/stApi.js";

export function populateLorebookOptions(selectEl, placeholderText) {
    const $source = $("#world_editor_select option");
    const $select = $(selectEl);

    $select.empty();
    $select.append(`<option value="">${placeholderText}</option>`);

    $source.each((i, el) => {
        const value = $(el).val();
        const text = $(el).text();
        if (value !== "") $select.append(`<option value="${value}">${text}</option>`);
    });
}

export async function fetchLorebookEntries(lorebookName) {
    const context = getContext();
    const headers = context.getRequestHeaders();

    const response = await fetch("/api/worldinfo/get", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: lorebookName }),
        cache: "no-cache",
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Object.values(data.entries || {});
}
