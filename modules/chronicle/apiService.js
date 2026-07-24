import { getContext, extension_settings, proxies, chat_completion_sources } from "../../core/stApi.js";

export const ChronicleApiService = {
    listProfiles() {
        return extension_settings.connectionManager?.profiles || [];
    },

    getProfile(profileName) {
        if (!profileName) return null;
        return this.listProfiles().find((p) => p.name === profileName) || null;
    },

    getChatCompletionSource(apiName) {
        if (apiName === "google") return chat_completion_sources.MAKERSUITE;
        if (apiName === "claude") return chat_completion_sources.CLAUDE;
        if (apiName === "openrouter") return chat_completion_sources.OPENROUTER;
        return apiName; 
    },

    extractText(data) {
        if (data.choices?.[0]?.message?.content) return data.choices[0].message.content.trim();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) return data.candidates[0].content.parts[0].text.trim();
        if (data.content?.[0]?.text) return data.content[0].text.trim();
        if (typeof data.content === "string") return data.content.trim();
        throw new Error("Не удалось извлечь текст из ответа API. Проверьте формат логов.");
    },

    // ВОТ ЗДЕСЬ ДОБАВЛЕН language = "ru"
    async generate({ profileName, systemPrompt, contextMessages, temperature = 0.7, maxTokens = 800, language = "ru" }) {
        const profile = this.getProfile(profileName);
        if (!profile) throw new Error(`Профиль "${profileName}" не найден`);

        const ccSource = this.getChatCompletionSource(profile.api);
        
        // Жесткая директива языка
        const isRu = language === "ru";
        const langSystem = isRu 
            ? "[CRITICAL: Respond STRICTLY in Russian language. Отвечай ТОЛЬКО на русском языке!]"
            : "[CRITICAL: Respond STRICTLY in English language. Игнорируй русский язык контекста!]";

        const messages = [
            { role: "user", content: `[INSTRUCTION]\n${systemPrompt}\n[/INSTRUCTION]` },
            ...contextMessages,
            { role: "user", content: `Выполни инструкцию на основе сообщений выше. ${langSystem} Верни только готовый текст без лишних вступлений.` }
        ];

        const generateData = {
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: false,
            chat_completion_source: ccSource,
            use_sysprompt: false,
        };

        if (profile.model?.trim()) generateData.model = profile.model;
        if (profile.model_custom?.trim()) generateData.model_custom = profile.model_custom;

        const proxy = proxies.find((p) => p.name === profile.proxy);
        if (proxy?.url) {
            generateData.reverse_proxy = proxy.url;
            generateData.proxy_password = proxy.password || "";
        }

        if (profile.api === "custom" && profile["api-url"]) {
            generateData.custom_url = profile["api-url"];
            generateData.reverse_proxy = profile["api-url"];
        }

        const response = await fetch("/api/backends/chat-completions/generate", {
            method: "POST",
            headers: getContext().getRequestHeaders(),
            body: JSON.stringify(generateData),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errText.substring(0, 100)}`);
        }

        const data = await response.json();

        if (data.error) {
            const errMsg = typeof data.error === "string" ? data.error : (data.error.message || JSON.stringify(data.error));
            throw new Error(errMsg);
        }
        if (!data.choices && !data.candidates && !data.content) {
            throw new Error("Пустой ответ от API (возможно, ошибка модели)");
        }

        return this.extractText(data);
    },
};