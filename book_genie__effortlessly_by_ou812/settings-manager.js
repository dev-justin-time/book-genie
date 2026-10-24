import { createGenerationSettingsContent } from './generation-settings.js';
import { createStoryDetailsContent } from './story-details-settings.js';
import { createTTSSettingsContent } from './tts-settings.js';
import { createUIStyleSettingsContent } from './ui-style-settings.js';
import config from './config.js';
import { updateChapterSizeSublabel } from './ui-helpers.js';

// --- BEGIN i18n BLOCK for Settings Menu & Tabs ---
const SETTINGS_LANG_STRINGS = {
    en: {
        settings: "Settings",
        generation: "Generation",
        storyDetails: "Story Details",
        tts: "Text-to-Speech",
        uiStyle: "UI & Style",
        contribute: "Contribute",
        close: "Close",
        share: "Share & Discover Books",
        shareInfo: 'Explore and share your created books with the community at <a href="./community-library.html" target="_blank" rel="noopener noreferrer" style="font-weight:bold; color: var(--text-link);">The Community Library</a>.',
        shareTip: 'You can save your book as a JSON file (from the main "Save" button) and then upload it to the library.',
        shareApp: "Share This App",
        shareAppInfo: "Help spread the word about the AI Book Generator!",
        copyLink: "Copy Link",
        shareEmail: "Share via Email",
        shareX: "Share on X",
        shareFacebook: "Share on Facebook",
        shareLinkedIn: "Share on LinkedIn",
        support: "Support the Project",
        supportMsg: "Your support helps keep the AI Book Generator alive and evolving:",
    },
    de: {
        settings: "Einstellungen",
        generation: "Generierung",
        storyDetails: "Geschichtendetails",
        tts: "Text-zu-Sprache",
        uiStyle: "UI & Stil",
        contribute: "Beitragen",
        close: "Schließen",
        share: "Teilen & Bücher entdecken",
        shareInfo: 'Entdecke und teile deine erstellten Bücher mit der Community in der <a href="./community-library.html" target="_blank" rel="noopener noreferrer" style="font-weight:bold; color: var(--text-link);">Community Library</a>.',
        shareTip: 'Du kannst dein Buch als JSON-Datei speichern (über die Haupt-"Speichern"-Taste) und dann in der Bibliothek hochladen.',
        shareApp: "App teilen",
        shareAppInfo: "Hilf dabei, den KI-Buchgenerator bekannt zu machen!",
        copyLink: "Link kopieren",
        shareEmail: "Per Email teilen",
        shareX: "Auf X teilen",
        shareFacebook: "Auf Facebook teilen",
        shareLinkedIn: "Auf LinkedIn teilen",
        support: "Projekt unterstützen",
        supportMsg: "Deine Unterstützung hilft, den KI-Buchgenerator am Leben zu erhalten und weiterzuentwickeln:",
    },
    fr: {
        settings: "Paramètres",
        generation: "Génération",
        storyDetails: "Détails de l'histoire",
        tts: "Synthèse vocale",
        uiStyle: "UI & Style",
        contribute: "Contribuer",
        close: "Fermer",
        share: "Partager et Découvrir des Livres",
        shareInfo: 'Découvrez et partagez vos livres créés avec la communauté sur <a href="./community-library.html" target="_blank" rel="noopener noreferrer" style="font-weight:bold; color: var(--text-link);">La Community Library</a>.',
        shareTip: 'Vous pouvez enregistrer votre livre au format JSON (depuis le bouton principal "Enregistrer"), puis le téléverser dans la bibliothèque.',
        shareApp: "Partager cette application",
        shareAppInfo: "Aidez à faire connaître le Générateur de Livres IA !",
        copyLink: "Copier le lien",
        shareEmail: "Partager par Email",
        shareX: "Partager sur X",
        shareFacebook: "Partager sur Facebook",
        shareLinkedIn: "Partager sur LinkedIn",
        support: "Soutenir le projet",
        supportMsg: "Votre soutien aide à maintenir et à faire évoluer le Générateur de Livres IA :",
    }
    // Add more as needed.
};

function getSettingsLang() {
    let lang =
        document.documentElement.getAttribute('lang') ||
        localStorage.getItem('preferredLanguage') ||
        navigator.language ||
        'en';
    if (lang && lang.length > 2) lang = lang.split('-')[0].toLowerCase();
    if (SETTINGS_LANG_STRINGS[lang]) return lang;
    return 'en';
}
function st(key) {
    const lang = getSettingsLang();
    return (SETTINGS_LANG_STRINGS[lang] && SETTINGS_LANG_STRINGS[lang][key]) || SETTINGS_LANG_STRINGS['en'][key] || key;
}
// --- END i18n BLOCK for Settings Menu L10N ---

let settingsState = {};
let settingsAiCommandConsole = null;
let settingsLogToAIConsole = null;

/**
 * Creates the content for the "Contribute" settings tab.
 * @returns {HTMLElement} The container element for contributing/support.
 */
function createContributeContent() {
    const container = document.createElement('div');
    container.classList.add('settings-section');
    container.id = 'contribute-settings'; // Unique ID for the section

    const title = document.createElement('h3');
    title.textContent = st('contribute');
    container.appendChild(title);

    // --- Share Section ---
    const shareSection = document.createElement('div');
    shareSection.classList.add('settings-subsection');
    shareSection.style.marginBottom = '20px';

    const shareTitle = document.createElement('h4');
    shareTitle.textContent = st('share');
    shareTitle.style.marginTop = '0';
    shareTitle.style.marginBottom = '10px';
    shareSection.appendChild(shareTitle);

    const shareInfo = document.createElement('p');
    shareInfo.innerHTML = st('shareInfo');
    shareInfo.style.marginBottom = '5px';
    shareSection.appendChild(shareInfo);
    
    const shareTip = document.createElement('p');
    shareTip.innerHTML = st('shareTip');
    shareTip.style.fontSize = '0.9em';
    shareTip.style.color = 'var(--text-secondary)';
    shareSection.appendChild(shareTip);

    container.appendChild(shareSection);

    // --- Share This App Section ---
    const shareAppSection = document.createElement('div');
    shareAppSection.classList.add('settings-subsection');
    shareAppSection.style.marginBottom = '20px';

    const shareAppTitle = document.createElement('h4');
    shareAppTitle.textContent = st('shareApp');
    shareAppTitle.style.marginTop = '0';
    shareAppTitle.style.marginBottom = '10px';
    shareAppSection.appendChild(shareAppTitle);

    const shareAppInfo = document.createElement('p');
    shareAppInfo.textContent = st('shareAppInfo');
    shareAppInfo.style.marginBottom = '10px';
    shareAppSection.appendChild(shareAppInfo);

    const shareButtonsContainer = document.createElement('div');
    shareButtonsContainer.classList.add('share-buttons-container');
    shareAppSection.appendChild(shareButtonsContainer);

    /**
     * @tweakable appShareUrl The URL used in the share buttons.
     */
    const appUrl = window.location.href;
    const appTitle = document.title || 'Book Genie';
    const appDescription = document.querySelector('meta[name="description"]')?.content || 'Create amazing books with AI!';

    const shareActions = [
        { 
            id: 'copy-link-btn', 
            icon: 'fas fa-copy', 
            text: st('copyLink'), 
            action: () => {
                navigator.clipboard.writeText(appUrl).then(() => {
                    alert('Link copied to clipboard!');
                    if (settingsLogToAIConsole && settingsState) {
                        settingsLogToAIConsole(settingsState.commandHistory, settingsAiCommandConsole, 'App link copied to clipboard.');
                    }
                }).catch(err => {
                    console.error('Failed to copy link:', err);
                    alert('Failed to copy link. Please copy it manually: ' + appUrl);
                });
            }
        },
        { 
            id: 'email-share-btn', 
            icon: 'fas fa-envelope', 
            text: st('shareEmail'), 
            action: () => {
                const mailtoLink = `mailto:?subject=${encodeURIComponent(appTitle)}&body=${encodeURIComponent(appDescription + '\n\nCheck it out: ' + appUrl)}`;
                window.open(mailtoLink, '_self');
            }
        },
        { 
            id: 'twitter-share-btn', 
            icon: 'fab fa-x-twitter', 
            text: st('shareX'), 
            action: () => {
                const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(appDescription)}&hashtags=AIBookGenerator,AIwriting`;
                window.open(twitterUrl, '_blank', 'noopener,noreferrer');
            }
        },
        { 
            id: 'facebook-share-btn', 
            icon: 'fab fa-facebook-f', 
            text: st('shareFacebook'), 
            action: () => {
                const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}`;
                window.open(facebookUrl, '_blank', 'noopener,noreferrer');
            }
        },
        { 
            id: 'linkedin-share-btn', 
            icon: 'fab fa-linkedin-in', 
            text: st('shareLinkedIn'), 
            action: () => {
                const linkedinUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(appUrl)}&title=${encodeURIComponent(appTitle)}&summary=${encodeURIComponent(appDescription)}`;
                window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
            }
        }
    ];

    shareActions.forEach(item => {
        const button = document.createElement('button');
        button.id = item.id;
        button.classList.add('share-button');
        button.innerHTML = `<i class="${item.icon}"></i> ${item.text}`;
        button.addEventListener('click', item.action);
        shareButtonsContainer.appendChild(button);
    });
    
    container.appendChild(shareAppSection);

    // --- Support Section ---
    const supportSection = document.createElement('div');
    supportSection.classList.add('settings-subsection');

    const supportTitle = document.createElement('h4');
    supportTitle.textContent = st('support');
    supportTitle.style.marginTop = '0';
    supportTitle.style.marginBottom = '10px';
    supportSection.appendChild(supportTitle);
    
    const info = document.createElement('p');
    info.style.textAlign = 'center';
    info.style.marginTop = '5px';
    info.style.marginBottom = '15px';
    info.textContent = st('supportMsg');
    supportSection.appendChild(info);

    // Ko-fi iframe embed
    const kofi = document.createElement('iframe');
    kofi.id = 'kofiframe';
    kofi.src = 'https://ko-fi.com/kosch/?hidefeed=true&widget=true&embed=true&preview=true';
    kofi.style.border = 'none';
    kofi.style.width = '100%';
    kofi.style.padding = '4px';
    kofi.style.background = '#f9f9f9';
    kofi.height = '712';
    kofi.title = 'kosch';
    supportSection.appendChild(kofi);
    container.appendChild(supportSection);

    return container;
}

/**
 * Initializes the settings manager, populates the settings popup with tabs and content.
 * The tab labels and every visible caption are rendered in detected language.
 * Also applies localized labels/options for all dropdowns/selects in settings menu.
 * @param {object} state - Global state object.
 * @param {HTMLElement} aiCommandConsole - The AI console element.
 * @param {function} logToAIConsole - Function to log messages.
 * @param {HTMLElement} settingsPopupElement - The main settings popup container.
 */
export function init(state, aiCommandConsole, logToAIConsole, settingsPopupElement) {
    settingsState = state;
    settingsAiCommandConsole = aiCommandConsole;
    settingsLogToAIConsole = logToAIConsole;

    // --- i18n resource for dropdown/select options ---
    const LOCALIZED_SELECT_OPTIONS = {
        en: {
            genre: {
                "Auto Detect": "Auto Detect",
                "_custom_genre": "Own Genre...",
            },
            style: {
                "Chosen by AI": "Chosen by AI",
            },
            chapterSize: [
                "Tiny (~250 words)",
                "Small (~500 words)",
                "Default (~1000 words)",
                "Large (~1500 words)",
                "Huge (~2000 words)",
                "Massive (~4000 words)",
                "Epic (~6000 words)",
                "Colossal (~8000 words)"
            ],
        },
        de: {
            genre: {
                "Auto Detect": "Automatisch erkennen",
                "_custom_genre": "Eigenes Genre...",
            },
            style: {
                "Chosen by AI": "Von KI gewählt",
            },
            chapterSize: [
                "Winzig (~250 Wörter)",
                "Klein (~500 Wörter)",
                "Standard (~1000 Wörter)",
                "Groß (~1500 Wörter)",
                "Riesig (~2000 Wörter)",
                "Massiv (~4000 Wörter)",
                "Episch (~6000 Wörter)",
                "Kolossal (~8000 Wörter)"
            ],
        },
        fr: {
            genre: {
                "Auto Detect": "Détection automatique",
                "_custom_genre": "Genre personnalisé...",
            },
            style: {
                "Chosen by AI": "Choisi par IA",
            },
            chapterSize: [
                "Minuscule (~250 mots)",
                "Petit (~500 mots)",
                "Par défaut (~1000 mots)",
                "Grand (~1500 mots)",
                "Énorme (~2000 mots)",
                "Massif (~4000 mots)",
                "Épique (~6000 mots)",
                "Colossal (~8000 mots)"
            ],
        }
    };
    const lang = getSettingsLang();

    // --- DYNAMICALLY APPLY I18N TO BUTTONS/HEADINGS for detected language ---
    const settingsContent = settingsPopupElement.querySelector('.settings-content');
    if (!settingsContent) {
        console.error("Settings content area not found inside popup!");
        return;
    }

    settingsContent.innerHTML = `
        <button id="close-settings-button" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; font-size: 20px; cursor: pointer;">${st('close')}</button>
        <h2>${st('settings')}</h2>
        <div class="settings-tab-container"></div>
        <div class="settings-tab-content-container"></div>
    `;

    const tabContainer = settingsContent.querySelector('.settings-tab-container');
    const tabContentContainer = settingsContent.querySelector('.settings-tab-content-container');

    // --- MAIN TABS (ALL LABELS IN DETECTED LANGUAGE) ---
    const tabs = [
        { id: 'generation', title: st('generation'), contentFunc: createGenerationSettingsContent },
        { id: 'story-details', title: st('storyDetails'), contentFunc: createStoryDetailsContent },
        { id: 'tts', title: st('tts'), contentFunc: createTTSSettingsContent },
        { id: 'ui-style', title: st('uiStyle'), contentFunc: createUIStyleSettingsContent },
        { id: 'contribute', title: st('contribute'), contentFunc: createContributeContent }
    ];

    // --- Helper: localize dropdown option (if needed) ---
    function localizeOption(value, map) {
        return map && map[value] ? map[value] : value;
    }

    tabs.forEach((tabInfo, index) => {
        const button = document.createElement('button');
        button.classList.add('settings-tab-button');
        button.dataset.tab = tabInfo.id;
        button.textContent = tabInfo.title;
        tabContainer.appendChild(button);

        const contentPane = document.createElement('div');
        contentPane.classList.add('settings-tab-content');
        contentPane.id = `settings-tab-${tabInfo.id}`;

        // Pass necessary arguments to content function
        const contentElement = tabInfo.contentFunc(config, settingsState, settingsAiCommandConsole, settingsLogToAIConsole);

        // --- LOCALIZE SELECT/DROPDOWN OPTIONS --- (ENHANCED)
        // 1. For "generation" tab
        if (tabInfo.id === 'generation') {
            // Genre select options
            const genreSelect = contentElement.querySelector('#genre-select');
            if (genreSelect && LOCALIZED_SELECT_OPTIONS[lang]?.genre) {
                Array.from(genreSelect.options).forEach(opt => {
                    if (LOCALIZED_SELECT_OPTIONS[lang].genre.hasOwnProperty(opt.value)) {
                        opt.textContent = LOCALIZED_SELECT_OPTIONS[lang].genre[opt.value];
                    }
                });
            }
            // Style select options
            const styleSelect = contentElement.querySelector('#style-select');
            if (styleSelect && LOCALIZED_SELECT_OPTIONS[lang]?.style) {
                Array.from(styleSelect.options).forEach(opt => {
                    if (LOCALIZED_SELECT_OPTIONS[lang].style.hasOwnProperty(opt.value)) {
                        opt.textContent = LOCALIZED_SELECT_OPTIONS[lang].style[opt.value];
                    }
                });
            }
            // Chapter size slider sublabels
            const chapterSizeSublabel = contentElement.querySelector('#chapter-size-sublabel');
            const chapterSizeSlider = contentElement.querySelector('#chapter-size-slider');
            if (chapterSizeSublabel && chapterSizeSlider && LOCALIZED_SELECT_OPTIONS[lang]?.chapterSize) {
                const size = parseInt(chapterSizeSlider.value);
                chapterSizeSublabel.textContent = LOCALIZED_SELECT_OPTIONS[lang].chapterSize[size-1] || chapterSizeSublabel.textContent;
                chapterSizeSlider.addEventListener('input', () => {
                    const size = parseInt(chapterSizeSlider.value);
                    chapterSizeSublabel.textContent = LOCALIZED_SELECT_OPTIONS[lang].chapterSize[size-1] || chapterSizeSublabel.textContent;
                });
            }
        }
        // 2. For story-details tab (dropdown default/own wording)
        if (tabInfo.id === 'story-details') {
            // Find all <select> and tweak first (default) + "Own ..." option, and "None" as applicable
            Array.from(contentElement.querySelectorAll('select')).forEach(sel => {
                if (sel.options.length > 0) {
                    // Set first option text ("Select ..."), second ("Own ..."), and possibly third ("None")
                    const labelEl = sel.parentElement?.querySelector('label');
                    if (labelEl && sel.options[0]) {
                        const labelText = labelEl.textContent.replace(':','').trim();
                        // Use "Select <label>..." localized
                        if (lang === 'de') sel.options[0].textContent = `Wähle ${labelText}...`;
                        else if (lang === 'fr') sel.options[0].textContent = `Sélectionner ${labelText}...`;
                        else sel.options[0].textContent = `Select ${labelText}...`;
                    }
                    if (sel.options[1]) {
                        const labelText = labelEl ? labelEl.textContent.replace(':','').trim() : '';
                        if (lang === 'de') sel.options[1].textContent = `Eigenes ${labelText}...`;
                        else if (lang === 'fr') sel.options[1].textContent = `${labelText} personnalisé...`;
                        else sel.options[1].textContent = `Own ${labelText}...`;
                    }
                    // "None" option (third)
                    if (sel.options[2] && sel.options[2].value === 'none') {
                        sel.options[2].textContent = (lang === 'de') ? 'Keine' : (lang === 'fr') ? 'Aucun' : 'None';
                    }
                }
                // Localize any specific dropdown values if needed (e.g., special genre names can be tweaked here)
            });
        }
        // 3. For TTS tab (browser TTS, engine select etc.)
        if (tabInfo.id === 'tts') {
            // TTS Engine select
            const engineSelect = contentElement.querySelector('#tts-engine-select');
            if (engineSelect) {
                Array.from(engineSelect.options).forEach(opt => {
                    if (lang === 'de') {
                        if (opt.value === 'auto') opt.textContent = "Automatisch (Beste)";
                        if (opt.value === 'browser') opt.textContent = "Browser SpeechSynthesis";
                        if (opt.value === 'orpheus') opt.textContent = "Orpheus (Premium, API)";
                        if (opt.value === 'microsoft') opt.textContent = "Microsoft Azure (API)";
                        if (opt.value === 'openai') opt.textContent = "OpenAI TTS (API)";
                    } else if (lang === 'fr') {
                        if (opt.value === 'auto') opt.textContent = "Automatique (Meilleur)";
                        if (opt.value === 'browser') opt.textContent = "Synthèse vocale du navigateur";
                        if (opt.value === 'orpheus') opt.textContent = "Orpheus (Premium, API)";
                        if (opt.value === 'microsoft') opt.textContent = "Microsoft Azure (API)";
                        if (opt.value === 'openai') opt.textContent = "OpenAI TTS (API)";
                    }
                });
            }
            // Gender select in browser TTS controls
            const ttsGender = contentElement.querySelector('#tts-gender-select');
            if (ttsGender) {
                Array.from(ttsGender.options).forEach(opt => {
                    if (lang === 'de') {
                        if (opt.value === '') opt.textContent = "Alle";
                        if (opt.value === 'male') opt.textContent = "Männlich";
                        if (opt.value === 'female') opt.textContent = "Weiblich";
                        if (opt.value === 'neutral') opt.textContent = "Neutral";
                    } else if (lang === 'fr') {
                        if (opt.value === '') opt.textContent = "Tous";
                        if (opt.value === 'male') opt.textContent = "Homme";
                        if (opt.value === 'female') opt.textContent = "Femme";
                        if (opt.value === 'neutral') opt.textContent = "Neutre";
                    }
                });
            }
        }

        contentPane.appendChild(contentElement);
        tabContentContainer.appendChild(contentPane);

        if (index === 0) {
            button.classList.add('active');
            contentPane.classList.add('active');
        }

        button.addEventListener('click', () => {
            tabContainer.querySelector('.settings-tab-button.active')?.classList.remove('active');
            tabContentContainer.querySelector('.settings-tab-content.active')?.classList.remove('active');

            button.classList.add('active');
            contentPane.classList.add('active');
        });
    });

    const closeButton = settingsContent.querySelector('#close-settings-button');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            settingsPopupElement.style.display = 'none';
        });
    } else {
        console.error("Close button not found after regenerating settings content.");
    }
}

/**
 * Reads the current generation settings from the UI, including custom story details.
 * @returns {object} An object containing genre, style, chapterSize, chapterCount, and story details.
 */
export function getSettings() {
    const settings = {
        genre: document.getElementById('genre-select')?.value || 'Auto Detect',
        isCustomGenre: false,
        style: document.getElementById('style-select')?.value || 'Chosen by AI',
        chapterSize: document.getElementById('chapter-size-slider')?.value || '4',
        chapterCount: parseInt(document.getElementById('chapter-count-input')?.value) || 28,
        writeLikeAuthor: '',
        isCustomWriteLikeAuthor: false,
        storyGenre: '',
        storyConflict: '',
        storyBeginning: '',
        storyMidpart: '',
        storyEnding: '',
        storyCoreConflict: '',
        isCustomStoryGenre: false,
        isCustomStoryConflict: false,
        chapterGenMode: (() => {
            const cont = document.getElementById('chapter-gen-mode-continuous');
            const stand = document.getElementById('chapter-gen-mode-standalone');
            if (cont?.checked) return 'continuous';
            if (stand?.checked) return 'standalone';
            return 'continuous';
        })()
    };

    const genreSelect = document.getElementById('genre-select');
    const customGenreInput = document.getElementById('custom-genre-input');
    if (genreSelect) {
        if (genreSelect.value === '_custom_genre' && customGenreInput) {
            settings.genre = customGenreInput.value.trim() || 'Auto Detect';
            settings.isCustomGenre = true;
        } else {
            settings.genre = genreSelect.value;
            // Check if the selected genre is one of the predefined ones or "Auto Detect"
            const predefinedGenres = ["Auto Detect", "_custom_genre", ...config.genres];
            settings.isCustomGenre = !predefinedGenres.includes(settings.genre);
        }
    }

    // Helper to get value+isCustom from selects and custom inputs
    const getDetailValue = (selectId, customInputId, customValueIdentifier = '_custom') => {
        const select = document.getElementById(selectId);
        const customInput = document.getElementById(customInputId);
        let value = select ? select.value : '';
        let isCustom = false;

        if (select && value === customValueIdentifier && customInput) {
            value = customInput.value.trim() || '';
            isCustom = true;
        } else if (select && value === "") {
             value = ""; // Explicitly handle the "Select..." option
        }
        return { value, isCustom };
    };

    // Fetching author details
    const authorDetail = getDetailValue('write-like-author', 'custom-write-like-author-input', '_custom');
    settings.writeLikeAuthor = authorDetail.value;
    settings.isCustomWriteLikeAuthor = authorDetail.isCustom;

    const storyGenreDetail = getDetailValue('story-genre', 'custom-story-genre-input');
    settings.storyGenre = storyGenreDetail.value;
    settings.isCustomStoryGenre = storyGenreDetail.isCustom;

    const storyConflictDetail = getDetailValue('story-conflict', 'custom-story-conflict-input');
    settings.storyConflict = storyConflictDetail.value;
    settings.isCustomStoryConflict = storyConflictDetail.isCustom;
    if (settings.storyConflict === 'none') {
         settings.storyConflict = 'none'; // Keep 'none' as a valid value
     }

    settings.storyBeginning = document.getElementById('story-beginning')?.value || '';
    settings.storyMidpart = document.getElementById('story-midpart')?.value || '';
    settings.storyEnding = document.getElementById('story-ending')?.value || '';
    settings.storyCoreConflict = document.getElementById('story-core-conflict')?.value || '';

    // Standardize empty selections to empty strings
    if (settings.storyBeginning === "") settings.storyBeginning = "";
    if (settings.storyMidpart === "") settings.storyMidpart = "";
    if (settings.storyEnding === "") settings.storyEnding = "";
    if (settings.storyCoreConflict === "") settings.storyCoreConflict = "";

    return settings;
}