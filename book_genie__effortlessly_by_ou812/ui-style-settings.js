// ui-style-settings.js
import { setBodyBackground } from './background-manager.js';
import { getSettings } from './settings-manager.js';
import config from './config.js'; // Import for languages

const neonPrimaryColor = "#39ff14";
const neonAccentColor = "#0ff";

/**
 * Creates the content for the "UI & Style" settings tab.
 * @param {object} config - Global configuration object.
 * @param {object} state - Global state object (for command history and generating flag).
 * @param {HTMLElement} aiCommandConsole - The console element to log to.
 * @param {function} logToAIConsole - The logging function.
 * @returns {HTMLElement} The container element for the UI style settings.
 */
export function createUIStyleSettingsContent(config, state, aiCommandConsole, logToAIConsole) {
    const container = document.createElement('div');
    container.classList.add('settings-section');
    container.id = 'ui-style-settings';

    const mainTitle = document.createElement('h3');
    mainTitle.textContent = 'UI & Style';
    container.appendChild(mainTitle);

    // --- UI Language Select Section ---
    const langSelectorSection = document.createElement('div');
    langSelectorSection.classList.add('settings-subsection');
    langSelectorSection.style.marginBottom = '17px';

    const langLabel = document.createElement('label');
    langLabel.setAttribute('for', 'ui-language-select');
    langLabel.textContent = 'UI Language:';
    langLabel.style.display = 'block';
    langLabel.style.marginBottom = '5px';

    const langSelect = document.createElement('select');
    langSelect.id = 'ui-language-select';
    langSelect.name = 'ui-language-select';

    // Add options: Default/detected (at top), English, all config.languages, "More..." (free entry)
    const detectedLang = document.documentElement.getAttribute('lang') || localStorage.getItem('preferredLanguage') || navigator.language || 'en';
    function getLangShort(code) {
        if (!code) return 'en';
        return code.length > 2 ? code.split('-')[0].toLowerCase() : code.toLowerCase();
    }
    // Store supported languages, avoid duplicates
    const already = new Set();
    function addOption(code, label, isDetected = false) {
        if (!code || already.has(code)) return;
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = label + (isDetected ? " (Current)" : "");
        if (isDetected) opt.selected = true;
        langSelect.appendChild(opt);
        already.add(code);
    }

    // 1. Default/detected language as first option ("System Default"), or if no detected, use English
    addOption(detectedLang, `System Default [${getLangShort(detectedLang)}]`, true);

    // 2. Always offer English (original/untranslated UI)
    addOption('en', 'English (Original)');

    // 3. All config.languages
    let userHasEnglish = detectedLang === 'en';
    config.languages.forEach(lang => {
        if (!already.has(lang.code)) {
            addOption(lang.code, lang.name);
            if (lang.code === 'en') userHasEnglish = true;
        }
    });

    // 4. Custom/free input ("More...") triggers popup to add own language
    const customOpt = document.createElement('option');
    customOpt.value = 'more';
    customOpt.textContent = 'More... (Custom Language)';
    langSelect.appendChild(customOpt);

    langSelectorSection.appendChild(langLabel);
    langSelectorSection.appendChild(langSelect);

    // Free entry popup logic
    langSelect.addEventListener('change', () => {
        if (langSelect.value === 'more') {
            showCustomLanguagePopupForUI(langSelect);
        } else {
            setSelectedUILanguage(langSelect.value);
        }
    });

    container.appendChild(langSelectorSection);

    // On load, ensure correct value is set and html lang/other affected locations are updated
    setTimeout(() => {
        let stored = localStorage.getItem('preferredLanguage') || null;
        if (stored && langSelect.value !== stored && langSelect.querySelector(`option[value="${stored}"]`)) {
            langSelect.value = stored;
        }
        setSelectedUILanguage(langSelect.value, true);
    }, 100);

    // --- UI Theme Select Section ---
    const themeContainer = document.createElement('div');
    themeContainer.classList.add('settings-subsection');

    const styleLabel = document.createElement('label');
    styleLabel.setAttribute('for', 'ui-style-select');
    styleLabel.textContent = 'UI Theme & Font:';
    styleLabel.style.display = 'block';
    styleLabel.style.marginBottom = '5px';
    themeContainer.appendChild(styleLabel);

    const styleSelect = document.createElement('select');
    styleSelect.id = 'ui-style-select';
    styleSelect.name = 'ui-style-select';
    themeContainer.appendChild(styleSelect);

    // Define Theme Options
    const themeOptions = [
        { value: "default", text: "Default Light" },
        { value: "dark-mode", text: "Dark Mode" },
        { value: "sepia-mode", text: "Sepia Mode" },
        { value: "high-contrast-mode", text: "High Contrast" },
        { value: "darkmode-neon", text: "Dark Mode Neon" },   // New neon theme
        { value: "terminal-green", text: "Terminal Green" },
        { value: "parchment", text: "Parchment" },
        { value: "blueprint", text: "Blueprint" },
        { value: "newspaper", text: "Newspaper" },
        { value: "minimalist", text: "Minimalist" },
        { value: "hacker-neon", text: "Hacker Neon" }
    ];

    const fontOptions = [
         { value: "default-font", text: "Default Font (Arial)" },
         { value: "classic-serif", text: "Classic Serif (Merriweather)" },
         { value: "modern-sans", text: "Modern Sans (Open Sans)" },
         { value: "typewriter", text: "Typewriter (Roboto Mono)" },
         { value: "comic-style", text: "Comic Style (Comic Neue)" }
    ];

    themeOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        styleSelect.appendChild(option);
    });
    fontOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        styleSelect.appendChild(option);
    });

    // Apply Saved Style
    const savedStyle = localStorage.getItem('selectedUIStyle') || 'default';
    styleSelect.value = savedStyle;
    applyUIStyle(savedStyle);
    styleSelect.addEventListener('change', () => {
        const selectedStyle = styleSelect.value;
        localStorage.setItem('selectedUIStyle', selectedStyle);
        applyUIStyle(selectedStyle);
        logToAIConsole(state.commandHistory, aiCommandConsole, `UI Theme/Font changed to: ${selectedStyle}`);
    });

    container.appendChild(themeContainer);

    // --- Book Cover Image Preview and Regeneration ---
    const backgroundContainer = document.createElement('div');
    backgroundContainer.classList.add('settings-subsection', 'background-preview-container');
    backgroundContainer.style.marginTop = '20px';

    const backgroundTitle = document.createElement('h4');
    backgroundTitle.textContent = 'Book Cover Image';
    backgroundTitle.style.marginBottom = '10px';
    backgroundContainer.appendChild(backgroundTitle);

    // Image Preview with enlargeable thumbnail and overlay edit button
    const previewImageWrapper = document.createElement('div');
    previewImageWrapper.style.position = 'relative';
    previewImageWrapper.style.display = 'flex';
    previewImageWrapper.style.justifyContent = 'center';
    previewImageWrapper.style.alignItems = 'center';
    previewImageWrapper.style.marginBottom = '15px';

    const previewImage = document.createElement('img');
    previewImage.id = 'background-preview-image';
    previewImage.alt = 'Current Book Cover Preview';
    previewImage.style.display = 'block';
    previewImage.style.maxWidth = '100%';
    previewImage.style.maxHeight = '200px';
    previewImage.style.objectFit = 'contain';
    previewImage.style.borderRadius = '4px';
    previewImage.style.border = '1px solid var(--border-secondary)';
    previewImage.style.cursor = 'pointer';
    previewImage.style.transition = 'box-shadow 0.2s';

    // Get current background URL
    const currentBg = document.body.style.backgroundImage;
    if (currentBg && currentBg !== 'none') {
        const urlMatch = currentBg.match(/url\("?(.+?)"?\)/);
        if (urlMatch && urlMatch[1]) {
            previewImage.src = urlMatch[1];
            previewImage.style.display = 'block';
        } else {
            previewImage.alt = 'No background image set';
            previewImage.style.display = 'none';
        }
    } else {
        previewImage.alt = 'No background image set';
        previewImage.style.display = 'none';
    }

    // Overlay edit icon
    const editIconBtn = document.createElement('button');
    editIconBtn.title = 'Edit and regenerate cover image';
    editIconBtn.style.position = 'absolute';
    editIconBtn.style.top = '10px';
    editIconBtn.style.right = '10px';
    editIconBtn.style.background = 'rgba(255,255,255,0.93)';
    editIconBtn.style.border = '1px solid #bbb';
    editIconBtn.style.borderRadius = '50%';
    editIconBtn.style.width = '34px';
    editIconBtn.style.height = '34px';
    editIconBtn.style.display = previewImage.src ? 'flex' : 'none';
    editIconBtn.style.justifyContent = 'center';
    editIconBtn.style.alignItems = 'center';
    editIconBtn.style.fontSize = '17px';
    editIconBtn.style.zIndex = 22;
    editIconBtn.style.cursor = 'pointer';
    editIconBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.07)';
    editIconBtn.style.transition = 'background 0.15s';
    editIconBtn.innerHTML = '<i class="fas fa-pen" aria-hidden="true"></i>';
    editIconBtn.setAttribute('aria-label', 'Edit Cover Image');

    // Enlarge on click (popup overlay)
    previewImage.addEventListener('click', () => {
        if (!previewImage.src) return;
        // Prevent double popup
        if (document.querySelector('.enlarge-image-popup')) return;
        const popup = document.createElement('div');
        popup.className = 'enlarge-image-popup';
        popup.style.position = 'fixed';
        popup.style.top = '0';
        popup.style.left = '0';
        popup.style.width = '100vw';
        popup.style.height = '100vh';
        popup.style.background = 'rgba(0,0,0,0.85)';
        popup.style.display = 'flex';
        popup.style.justifyContent = 'center';
        popup.style.alignItems = 'center';
        popup.style.zIndex = 8000;

        const enlarged = document.createElement('img');
        enlarged.src = previewImage.src;
        enlarged.style.maxWidth = '84vw';
        enlarged.style.maxHeight = '84vh';
        enlarged.style.boxShadow = '0 7px 30px #0009,0 1px 1px #fff4';
        enlarged.style.borderRadius = '12px';
        enlarged.style.background = 'white';
        enlarged.style.padding = '4px';

        popup.appendChild(enlarged);

        // Close logic
        popup.addEventListener('click', (e) => {
            if (e.target === popup) popup.remove();
        });
        document.body.appendChild(popup);

        // Escape key closes
        document.addEventListener('keydown', function escH(ev){
            if (ev.key === 'Escape') {
                popup.remove();
                document.removeEventListener('keydown', escH);
            }
        });
    });

    // Regeneration Prompt + Button
    const promptLabel = document.createElement('label');
    promptLabel.setAttribute('for', 'background-regenerate-prompt');
    promptLabel.textContent = 'Refine Regeneration Prompt (Optional):';
    promptLabel.style.display = 'block';
    promptLabel.style.marginBottom = '5px';

    const regeneratePrompt = document.createElement('textarea');
    regeneratePrompt.id = 'background-regenerate-prompt';
    regeneratePrompt.rows = 2;
    regeneratePrompt.placeholder = 'e.g., "More dramatic lighting", "Focus on the castle", "Add a starry night sky"';
    regeneratePrompt.style.marginBottom = '6px';

    const regenerateButton = document.createElement('button');
    regenerateButton.id = 'regenerate-background-button';
    regenerateButton.textContent = 'Regenerate Cover Image';

    // Regenerate by click on overlay edit icon as well as button
    function openEditPopupOrFocus() {
        regeneratePrompt.focus();
        regeneratePrompt.scrollIntoView({ behavior: 'smooth', block: 'center' });
        regeneratePrompt.style.borderColor = '#388E3C';
        setTimeout(() => { regeneratePrompt.style.borderColor = ''; }, 900);
    }
    editIconBtn.addEventListener('click', openEditPopupOrFocus);

    // Paste controls into wrapper
    previewImageWrapper.appendChild(previewImage);
    previewImageWrapper.appendChild(editIconBtn);
    backgroundContainer.appendChild(previewImageWrapper);

    backgroundContainer.appendChild(promptLabel);
    backgroundContainer.appendChild(regeneratePrompt);
    backgroundContainer.appendChild(regenerateButton);

    regenerateButton.addEventListener('click', async () => {
        if (state.generating) {
            alert("A generation process is already running. Please wait.");
            return;
        }

        state.generating = true;
        regenerateButton.disabled = true;
        regenerateButton.textContent = 'Regenerating...';
        logToAIConsole(state.commandHistory, aiCommandConsole, 'Attempting to regenerate background image...');

        try {
            const inputTextElement = document.getElementById('input-text');
            const titleElement = document.querySelector('h1');
            const userInput = inputTextElement ? inputTextElement.value : 'AI Book Generator';
            const bookTitle = titleElement ? titleElement.textContent : 'AI Book';
            const refinement = regeneratePrompt.value.trim();

            const currentSettings = getSettings();
            const { genre, style } = currentSettings;

            let basePrompt = `Regenerate cover image for a book titled "${bookTitle}" about "${userInput.substring(0, 100)}...".`;
            if (genre && genre !== 'Auto Detect') basePrompt += ` Genre: ${genre}.`;
            if (style && style !== 'Chosen by AI') basePrompt += ` Style: ${style}.`;
            if (refinement) basePrompt += ` Refinement: ${refinement}.`;
            else basePrompt += ` Focus on the core theme.`;

            const imageGenResult = await websim.imageGen({
                prompt: basePrompt,
                aspect_ratio: "16:9"
            });
            const newImageUrl = imageGenResult.url;

            setBodyBackground(newImageUrl);
            previewImage.src = newImageUrl;
            previewImage.style.display = 'block';
            editIconBtn.style.display = 'flex';
            regeneratePrompt.value = '';

            logToAIConsole(state.commandHistory, aiCommandConsole, `Background image regenerated successfully. Remember to save the book to keep the new image URL.`);
        } catch (error) {
            console.error("Error regenerating background image:", error);
            logToAIConsole(state.commandHistory, aiCommandConsole, `Error regenerating background image: ${error.message}`);
            alert(`Failed to regenerate background image: ${error.message}`);
        } finally {
            state.generating = false;
            regenerateButton.disabled = false;
            regenerateButton.textContent = 'Regenerate Cover Image';
        }
    });

    container.appendChild(backgroundContainer);

    // --- Image Edit Options Popup (Optional future hook) ---

    return container;
}

// --- Helper: set UI language and propagate throughout app ---
function setSelectedUILanguage(langCode, skipAlreadySet) {
    // "System Default" (first option) means use whatever would be detected; otherwise set and store
    if (langCode === 'more') return;
    let appliedLang = langCode === '' ? 'en' : langCode;
    if (appliedLang === 'System Default' || appliedLang === 'default' || appliedLang === 'auto') {
        // Remove force setting; default detection will fire
        localStorage.removeItem('preferredLanguage');
        // The app will detect browser/default again, so set html lang accordingly
        document.documentElement.setAttribute('lang', navigator.language ? navigator.language.split('-')[0] : 'en');
    } else {
        localStorage.setItem('preferredLanguage', appliedLang);
        document.documentElement.setAttribute('lang', appliedLang);
    }

    // Fire a synthetic event so listeners can re-localize tabs/main ui if needed
    const evt = new CustomEvent('ui-language-changed', { detail: { lang: appliedLang } });
    window.dispatchEvent(evt);

    // Optionally, reload main UI content if a language was freshly set
    if (!skipAlreadySet) {
        location.reload(); // Safest: force reload for translation to fully apply everywhere
    }
}

// --- Helper: Show popup for custom UI language code ---
function showCustomLanguagePopupForUI(langSelectElem) {
    if (document.querySelector('.ui-language-popup')) return;
    const popup = document.createElement('div');
    popup.className = 'ui-language-popup';
    popup.style.position = 'fixed';
    popup.style.top = '0';
    popup.style.left = '0';
    popup.style.width = '100vw';
    popup.style.height = '100vh';
    popup.style.background = 'rgba(0,0,0,0.6)';
    popup.style.display = 'flex';
    popup.style.justifyContent = 'center';
    popup.style.alignItems = 'center';
    popup.style.zIndex = 13000;

    popup.innerHTML = `
        <div style="background:white;border-radius:10px;padding:32px;box-shadow:0 7px 27px #0006;max-width:380px;width:90vw;position:relative">
            <button style="position:absolute;top:10px;right:13px;font-size:19px;background:none;border:none;cursor:pointer;">&times;</button>
            <h3 style="margin-top:0;margin-bottom:16px;">Custom UI Language</h3>
            <div style="margin-bottom:12px;">
                <label for="custom-ui-language-code" style="font-weight:bold;">Language Code (e.g. de, fr, es, it, ru):</label><br>
                <input id="custom-ui-language-code" type="text" style="width:90%;padding:8px;margin-top:7px;border:1px solid #ccc;">
            </div>
            <div style="margin-bottom:16px;">
                <label for="custom-ui-language-name" style="font-weight:bold;">Display Name (e.g. Deutsch, Français):</label><br>
                <input id="custom-ui-language-name" type="text" style="width:90%;padding:8px;margin-top:7px;border:1px solid #ccc;">
            </div>
            <button id="add-custom-lang-btn" style="padding:8px 18px;font-weight:bold;background:#5c6bc0;color:#fff;border:none;border-radius:5px;cursor:pointer;">Add Language</button>
        </div>
    `;

    document.body.appendChild(popup);

    // Logic for close
    popup.querySelector('button').onclick = () => { popup.remove(); };
    popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); });

    // Add/custom logic
    popup.querySelector('#add-custom-lang-btn').onclick = () => {
        const code = popup.querySelector('#custom-ui-language-code').value.trim().toLowerCase();
        const name = popup.querySelector('#custom-ui-language-name').value.trim();
        if (!code || !name) {
            alert('Enter both code and display name.');
            return;
        }
        // Validate code
        if (!/^[a-z]{2}(-[a-z]{2})?$/i.test(code)) {
            alert("Use a valid code (like 'de', 'fr', 'ru', 'zh-CN').");
            return;
        }
        // Add to select and local storage if not already present
        let found = langSelectElem.querySelector(`option[value="${code}"]`);
        if (!found) {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = name;
            langSelectElem.appendChild(opt);
        }
        langSelectElem.value = code;
        setSelectedUILanguage(code);
        popup.remove();
    };
}

/**
 * Applies the selected UI style class to the body.
 * @param {string} styleClass - The CSS class name for the style or font.
 */
function applyUIStyle(styleClass) {
    const body = document.body;
    const isFontClass = styleClass.includes('-font');

    const classList = Array.from(body.classList);
    classList.forEach(cls => {
        if ((cls.includes('-mode') || cls.includes('-theme') || cls.includes('-green') || cls.includes('-neon') || ['parchment', 'blueprint', 'newspaper', 'minimalist'].includes(cls)) || cls.includes('-font')) {
             if ((isFontClass && cls.includes('-font')) || (!isFontClass && !cls.includes('-font'))) {
                body.classList.remove(cls);
             }
        }
    });

    if (styleClass !== 'default' && styleClass !== 'default-font') {
        body.classList.add(styleClass);
    }

    let fontFamily = 'Arial, sans-serif';
    switch(styleClass) {
        case 'classic-serif': fontFamily = "'Merriweather', serif"; break;
        case 'modern-sans': fontFamily = "'Open Sans', sans-serif"; break;
        case 'typewriter': fontFamily = "'Roboto Mono', monospace"; break;
        case 'comic-style': fontFamily = "'Comic Neue', cursive"; break;
    }
    body.style.fontFamily = fontFamily;
    document.documentElement.style.setProperty('--font-family-base', fontFamily);
}