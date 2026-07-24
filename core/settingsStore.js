import { extension_settings, saveSettingsDebounced } from "./stApi.js";

export const EXTENSION_NAME = "ST-Inkwell";

const DEFAULTS = {
    ui: {
        language: "ru",
    },
    lorebookFolders: {
        folders: [],
        assignments: {},
        chatBindings: {},
        isCompact: false,
    },
    chatExporter: {
        includePlainText: true,
        includeNames: true,
        includeTimestamp: false,
        includeNumbers: false,
    },
    chronicle: {
        lastProfile: "",
        lastPresetId: "arc",
        temperature: 0.7,
        maxTokens: 800,
        presets: [
            {
                id: "entry_base",
                name: "1. Main entry (Основной лог: сюжет, факты и атмосфера)",
                builtin: true,
                prompt: `[SYSTEM INSTRUCTION: MEMORY BOOK PROTOCOL]
I want you to keep a structured event log (Memory Book) after the completion of each story Arc or important scene. Your task is to record not only the plot but also the world logic, the state of the characters, and the development of their relationships.
When I ask you to summarize or conclude an Arc, use the following template strictly in this format:
***
### Memory Book Entry: Arc [Number] (HEADING: ESSENCE OF THE EVENT)
**1. Arc/Event Title:**
Provide a short, concise title reflecting the main theme.
**2. Brief Narrative (The Vibe):**
A concise retelling of the arc's plot (3-5 sentences).
* Describe the setup, climax, and resolution.
* Convey the atmosphere (tension, coziness, horror, action).
* Highlight key turning points (plot twists).

**3. Key Facts (Hard Logic):**
A list of specific, undeniable changes in the world and the characters' states. Use bullet points.
* **Character Status:** Injuries, illnesses, new abilities, physical changes.
* **Inventory/Resources:** What was found, lost, or created (weapons, key items, base).
* **NPCs/Enemies:** Who died, who became an ally, who revealed themselves as an enemy.
* **Location:** Where the characters are currently located, changes in the environment.

**4. Relationship Dynamics (Chemistry):**
A psychological analysis of the connections between the characters.
* How has their attitude toward each other changed?
* Were there any conflicts, reconciliations, or growing closeness?
* Key quotes or thoughts that define their connection at this moment.`,
            },
            {
                id: "entry_rel",
                name: "2. 4.1 Relationship Current (Поведенческая реальность)",
                builtin: true,
                prompt: `4.1 [RELATIONSHIP CURRENT — Arc X]
This overwrites all previous relationship states.
This is behavioral reality, not history.

== [Character A] <-> [Character B] ==
DEFAULT MODE:
[How they coexist in a normal, everyday scene — 2-3 sentences.
Specific actions, not emotional analysis.]

[CHARACTER A]'S ACTIVE PATTERNS:
- [specific behavior they are currently demonstrating]
- [specific behavior]

[CHARACTER B]'S ACTIVE PATTERNS:
- [specific behavior]
- [specific behavior]

WHAT NO LONGER HAPPENS:
- [Character A] does not [outdated pattern from earlier arcs]
- [Character B] does not [outdated pattern]

TENSION/UNRESOLVED:
[What is still unresolved or hanging in the air between them — 1-2 sentences.
If nothing — skip this.]

== [Character A]/[Character B] <-> [NPC, if any are active] ==
* [NPC Name]: [1-2 sentences of their current status]`,
            },
            {
                id: "entry_psych",
                name: "3. 4.2 Psychological Legacy (Травмы, триггеры, регуляция)",
                builtin: true,
                prompt: `4.2 [PSYCHOLOGICAL LEGACY — Arc X]
This is not a healing arc tracker. Trauma does not resolve linearly 
and does not resolve on schedule. Do not soften or resolve any item 
below unless it is explicitly moved to RESOLVED.

[INSTRUCTION: REPEAT THE FOLLOWING WOUND BLOCK FOR BOTH [CHARACTER A] AND [CHARACTER B]]

== [Character Name] — Active Wounds ==

WOUND: [brief name, e.g., "Forced restraint / captivity"]
ORIGIN: [1 sentence — what happened]
CURRENT SEVERITY: [Raw / Managed / Dormant — not "Healing", this is not a progress scale]
TRIGGERS (do not neutralize without explicit permission):
- [specific physical/situational trigger, e.g., "hands pinning wrists above head"]
- [trigger]
REACTION PATTERN: [what happens physically/behaviorally — freeze, dissociation, 
  fight response, specific phrase or shutdown]
WHAT HELPS (does not cure, only regulates):
- [specific action by a partner that reduces intensity]
WHAT DOES NOT HELP / MAKES IT WORSE:
- [pattern to avoid]

DO NOT: resolve this wound through a single conversation, a single 
tender scene, or narrative convenience. Regression under stress is 
expected and realistic, not a continuity error.

== RESOLVED (moved here only by explicit author instruction) ==
[empty, until you explicitly decide that something is truly resolved]`,
            },
            {
                id: "entry_conflict",
                name: "4. 4.3 Conflict State (Угрозы, союзники, таймеры)",
                builtin: true,
                prompt: `4.3 [CONFLICT STATE — Arc X]
Overwrites previous conflict state.

== Active Threats ==
* [Name/Faction]: [what they want] / [current threat level: 
  Watching / Pressuring / Active Move] / [what they know]

== Open Questions (unresolved plot threads) ==
* [Question that keeps the plot open, e.g., "Who orchestrated the kidnapping?"]

== Standing Assets / Allies ==
* [Name]: [what they provide] / [conditions/debt, if any] / [reliability]

== Ticking Clocks ==
* [Something with a deadline, e.g., "Thea's Vitae blockage — duration unknown, 
  physiological deadline"]`,
            },
            {
                id: "entry_sex",
                name: "5. 4.4 Sexual Dynamics & Intimacy (Секс, кинки, лимиты)",
                builtin: true,
                prompt: `4.4 [SEXUAL DYNAMICS & INTIMACY — Arc X]
This overwrites previous sexual states. Sexual intimacy is an extension 
of psychological and relationship reality, not a separate mechanical 
minigame. If the relationship is strained (see 4.1), sex reflects that.

== CURRENT DYNAMIC & VIBE ==
[How they engage in sex RIGHT NOW in this arc — 2-3 sentences. 
Not a list of positions, but the emotional and physical "vibe". 
E.g., "Desperate, almost aggressive grounding", "Playful but with a heavy dominant edge", "Slow, sensory, and hyper-focused on touch."]

== INITIATION & ROLES ==
* Initiator: [Who initiates and how? E.g., "Helga via physical invasion of personal space", "Catherine via verbal provocation or prolonged eye contact."]
* Power Dynamic: [Current power balance. E.g., "Situational switch, but Helga takes lead when Catherine dissociates", "Fixed Dom/Sub, but Catherine demands verbal praise."]
* Pacing & Focus: [Sensory/emotional focus. E.g., "High friction, fast pacing, focus on raw physical sensation", "Slow, eye-contact heavy, focus on emotional connection."]

== ACTIVE KINKS & PREFERENCES ==
* In Rotation (Active now):
  - [Specific kink/fetish currently active. E.g., "Light breath play", "Overstimulation", "Praise/degradation mix"]
  - [Another item]
* Baseline (The foundation):
  - [Core preferences always present. E.g., "Deep kissing", "Sensory deprivation (blindfolds)", "Morning sex"]
* Edge / Exploring (Pushing boundaries):
  - [Things they are testing or moving toward, not yet routine. E.g., "Light impact play", "Public risk/exhibitionism"]

== HARD LIMITS & SEXUAL TRIGGERS (CRITICAL) ==
* HARD LIMITS (Absolute NOs):
  - [Strict taboos. E.g., "No non-con/dub-con", "No blood/gore", "No specific body play due to dysphoria"]
* SOFT LIMITS & SEXUAL TRIGGERS (Tied to 4.2):
  - [What causes flashbacks or shutdown *specifically in bed*. E.g., "Hands pinning wrists above head triggers captivity wound (4.2)", "Sudden loud noises break arousal instantly"]
* AFTERCARE & REGULATION:
  - [What is required IMMEDIATELY AFTER to return to baseline. E.g., "Catherine requires physical weight/pressure and silence", "Helga needs verbal reassurance and physical distance to decompress"]

== SEXUAL TENSION / UNRESOLVED ==
[What is sexually unresolved or hanging in the air — 1-2 sentences. 
E.g., "Catherine is holding back her dominant tendencies out of fear of triggering Helga", "Helga wants to try X but is too embarrassed to ask."]`,
            },
            {
                id: "chronicle_dry",
                name: "6. Chronicle Update Protocol (Сухая выжимка сюжета)",
                builtin: true,
                prompt: `[SYSTEM INSTRUCTION: CHRONICLE UPDATE PROTOCOL]
ROLE: You are the lorebook archivist for a roleplay game.
TASK: Analyze the provided chapter texts (Arcs) and extract only the dry plot chronology.

RULES & CONSTRAINTS:
* Ignore emotions, "The Vibe", and deep relationship analysis.
* Record only established facts: who killed whom, what secrets were revealed, what deals were made, who moved where.
* Write as briefly as possible, in a telegraphic style. Limit to 2-3 sentences per Act.
* OUTPUT LANGUAGE: English (to save tokens and ensure optimal AI comprehension).
***`,
            },
            {
                id: "master_status",
                name: "7. Master Status Update (Текущий срез: психика и политика)",
                builtin: true,
                prompt: `[SYSTEM INSTRUCTION: MASTER STATUS UPDATE PROTOCOL]
ROLE: You are a psychologist and analyst for a roleplay game.
TASK: Analyze the provided chapter texts and update the current "Master Statuses" of the characters.

RULES & CONSTRAINTS:
* NO HISTORY: I do not need the history of how relationships changed. Provide only the final snapshot at the exact moment the last chapter ends.
* CHARACTER PROFILE: Form a concise profile of the main character (physiology, psychology, new abilities).
* RELATIONSHIP STATUS: Describe the dynamic ([Character A] <-> [Character B], [Character A] <-> [NPC], etc.) in 1-2 concise sentences reflecting the current balance of power and level of trust.
* POLITICS: Update the active list of enemies and allies based on the latest events.
* OUTPUT LANGUAGE: English.`,
            },
        ],
    },
};

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function ensureDefaults(target, defaults) {
    for (const key of Object.keys(defaults)) {
        const def = defaults[key];
        if (target[key] === undefined) {
            target[key] = Array.isArray(def) || typeof def === "object" ? clone(def) : def;
        } else if (def !== null && typeof def === "object" && !Array.isArray(def)) {
            ensureDefaults(target[key], def);
        }
    }
    return target;
}

/**
 * Возвращает объект настроек всего расширения. Все три модуля хранят
 * свою часть внутри одного extension_settings[EXTENSION_NAME], чтобы не
 * плодить три независимых ключа в настройках SillyTavern.
 */
export function getSettings() {
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || {};
    return ensureDefaults(extension_settings[EXTENSION_NAME], DEFAULTS);
}

export function saveSettings() {
    saveSettingsDebounced();
}

export function getLanguage() {
    return getSettings().ui.language || "ru";
}

export function setLanguage(lang) {
    getSettings().ui.language = lang;
    saveSettings();
}
