// Единственное место в проекте, где мы завязаны на глубину вложенности
// файла относительно корня SillyTavern. Все остальные файлы импортируют
// то, что им нужно, отсюда через простой относительный путь внутри
// расширения (../../core/stApi.js и т.п.) — так при переносе/переименовании
// модулей ничего не ломается.

export {
    extension_settings,
    getContext,
} from "../../../../extensions.js";

export {
    saveSettingsDebounced,
    eventSource,
    event_types,
    getPastCharacterChats,
} from "../../../../../script.js";

// Те же классы chat_completion_source и список прокси, что использует
// сама Таверна для отправки запросов к разным API — нужны, чтобы
// собрать запрос под конкретный Connection Profile вручную.
export {
    proxies,
    chat_completion_sources,
} from "../../../../openai.js";
