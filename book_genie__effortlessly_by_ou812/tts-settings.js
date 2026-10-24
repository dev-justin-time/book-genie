/**
 * tts-settings.js - Text-to-Speech Settings Panel
 *
 * - Allows selection and configuration of TTS engine (auto/browser/Orpheus/Microsoft/OpenAI/ElevenLabs)
 * - Shows and persists detailed controls for browser TTS: voice/language/gender/pitch/rate/volume and multiple simultaneous "overlay" effects.
 * - ElevenLabs integration: spend no API key, list all available 11Labs voices from websim, allow custom voice ID input, and fetch top voices on load.
 * - Effect settings (flanger, phaser, room reverb, echo, distortion, equalizer, robot-voice, etc.) are all adjustable and persist.
 * - Live preview applies all current settings in the browser.
 * - All settings/effects are used for chapter "Read Aloud".
 */

/**
 * Creates and returns the TTS settings content pane (DOM element) for the settings popup.
 * @param {object} config - Global configuration (not directly used here).
 * @param {object} state - Global state (for command history, generation status).
 * @param {HTMLElement} aiCommandConsole - Element used for TTS-related logging.
 * @param {function} logToAIConsole - Logging function, e.g. (commandHistory, consoleEl, msg) => void
 * @returns {HTMLElement}
 */
export function createTTSSettingsContent(config, state, aiCommandConsole, logToAIConsole) {
    // --- Container setup ---
    const container = document.createElement('div');
    container.classList.add('settings-section');
    container.id = 'tts-settings';

    // Title
    const title = document.createElement('h3');
    title.textContent = 'Text-to-Speech';
    container.appendChild(title);

    // Check support for SpeechSynthesis
    if (!('speechSynthesis' in window)) {
        const message = document.createElement('p');
        message.textContent = 'Text-to-Speech is not supported by your browser.';
        message.style.color = 'red';
        container.appendChild(message);
        return container;
    }

    // All voice & engine state (populated below)
    let voices = [];
    let voiceGenderMap = {};
    let elevenLabsVoices = [];
    let loadingVoices = false;

    // =========================
    // --- 1. Engine Select ---
    // =========================
    const engineGroup = document.createElement('div');
    engineGroup.style.marginBottom = '18px';

    // Label for TTS Engine
    const engineLabel = document.createElement('label');
    engineLabel.setAttribute('for', 'tts-engine-select');
    engineLabel.textContent = 'TTS Engine:';
    engineLabel.style.display = 'block';
    engineLabel.style.marginBottom = '5px';
    engineGroup.appendChild(engineLabel);

    // Engine dropdown select for user to pick which backend is used for "read aloud"
    const engineSelect = document.createElement('select');
    engineSelect.id = 'tts-engine-select';
    engineSelect.name = 'tts-engine-select';
    [
        { value: 'auto', text: 'Auto (Best)' },
        { value: 'browser', text: 'Browser SpeechSynthesis' },
        { value: 'elevenlabs', text: 'ElevenLabs (Pro, Quality, API-Free)' },
        { value: 'orpheus', text: 'Orpheus (Premium, API)' },
        { value: 'microsoft', text: 'Microsoft Azure (API)' },
        { value: 'openai', text: 'OpenAI TTS (API)' }
    ].forEach(({ value, text }) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = text;
        engineSelect.appendChild(opt);
    });
    // Set initial selection from local storage (user preference)
    const storedEngine = localStorage.getItem('selectedTTSEngine') || 'auto';
    engineSelect.value = storedEngine;
    engineGroup.appendChild(engineSelect);
    container.appendChild(engineGroup);

    // =========================
    // --- 2. ElevenLabs ------
    // =========================
    const elevenLabsGroup = document.createElement('div');
    elevenLabsGroup.id = 'elevenlabs-controls';
    elevenLabsGroup.style.marginBottom = '22px';
    elevenLabsGroup.style.display = (engineSelect.value === 'elevenlabs') ? 'block' : 'none';

    const voiceSelectLabel = document.createElement('label');
    voiceSelectLabel.setAttribute('for', 'elevenlabs-voice-select');
    voiceSelectLabel.textContent = 'ElevenLabs Voice:';
    voiceSelectLabel.style.marginBottom = '3px';
    voiceSelectLabel.style.display = 'block';
    elevenLabsGroup.appendChild(voiceSelectLabel);

    // Voice select
    const voiceSelect = document.createElement('select');
    voiceSelect.id = 'elevenlabs-voice-select';
    voiceSelect.name = 'elevenlabs-voice-select';
    voiceSelect.style.minWidth = '240px';
    elevenLabsGroup.appendChild(voiceSelect);

    // Prelisten Button
    const prelistenBtn = document.createElement('button');
    prelistenBtn.textContent = 'Prelisten Voice';
    prelistenBtn.type = 'button';
    prelistenBtn.style.marginLeft = '12px';
    prelistenBtn.style.padding = '7px 18px';
    prelistenBtn.style.background = 'var(--button-bg)';
    prelistenBtn.style.color = '#fff';
    prelistenBtn.style.border = 'none';
    prelistenBtn.style.borderRadius = '5px';
    prelistenBtn.style.cursor = 'pointer';
    prelistenBtn.style.fontSize = '1em';
    voiceSelectLabel.appendChild(prelistenBtn);

    // Custom voice label (for the actual input box)
    const customVoiceLabel = document.createElement('label');
    customVoiceLabel.textContent = 'Custom ElevenLabs Voice ID (Optional):';
    customVoiceLabel.setAttribute('for', 'elevenlabs-custom-voice');
    customVoiceLabel.style.display = 'block';
    customVoiceLabel.style.margin = '4px 0 3px 0';
    elevenLabsGroup.appendChild(customVoiceLabel);

    // Custom voice input
    const customVoiceInput = document.createElement('input');
    customVoiceInput.type = 'text';
    customVoiceInput.id = 'elevenlabs-custom-voice';
    customVoiceInput.placeholder = 'Paste ElevenLabs Voice ID (optional)';
    customVoiceInput.style.marginBottom = '8px';
    customVoiceInput.style.width = '98%';
    // Display only if the custom option is selected, else hidden
    customVoiceInput.style.display = 'none';
    elevenLabsGroup.appendChild(customVoiceInput);

    // --- Save/Delete for custom IDs ---
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '8px';
    btnRow.style.marginBottom = '4px';

    // Save button
    const saveVoiceIdBtn = document.createElement('button');
    saveVoiceIdBtn.textContent = 'Save This Voice ID';
    saveVoiceIdBtn.type = 'button';
    saveVoiceIdBtn.style.padding = '7px 17px';
    saveVoiceIdBtn.style.background = '#f4f4fa';
    saveVoiceIdBtn.style.color = '#3636bf';
    saveVoiceIdBtn.style.border = '1px solid #c0c8ea';
    saveVoiceIdBtn.style.borderRadius = '5px';
    saveVoiceIdBtn.style.cursor = 'pointer';
    saveVoiceIdBtn.style.fontSize = '0.98em';
    saveVoiceIdBtn.style.display = 'none';
    btnRow.appendChild(saveVoiceIdBtn);

    // Delete button
    const deleteVoiceIdBtn = document.createElement('button');
    deleteVoiceIdBtn.textContent = 'Delete This Voice ID';
    deleteVoiceIdBtn.type = 'button';
    deleteVoiceIdBtn.style.padding = '7px 13px';
    deleteVoiceIdBtn.style.background = '#fae6e6';
    deleteVoiceIdBtn.style.color = '#c92828';
    deleteVoiceIdBtn.style.border = '1px solid #e4a9a9';
    deleteVoiceIdBtn.style.borderRadius = '5px';
    deleteVoiceIdBtn.style.cursor = 'pointer';
    deleteVoiceIdBtn.style.fontSize = '0.98em';
    deleteVoiceIdBtn.style.display = 'none';
    btnRow.appendChild(deleteVoiceIdBtn);

    elevenLabsGroup.appendChild(btnRow);

    // Info row
    const elevenLabsInfo = document.createElement('div');
    elevenLabsInfo.id = 'elevenlabs-voice-info';
    elevenLabsInfo.style.fontSize = '0.92em';
    elevenLabsInfo.style.color = 'var(--text-secondary)';
    elevenLabsInfo.style.marginTop = '5px';
    elevenLabsGroup.appendChild(elevenLabsInfo);

    // Use localStorage value if available
    customVoiceInput.value = localStorage.getItem('elevenlabsCustomVoiceId') || '';

    // -------------------------
    // Logic for populating, saving, and deleting custom voices here
    // -------------------------
    const CUSTOM_KEY = 'elevenlabsSavedVoiceIdsList';
    // --- Voice Option helpers ---
    function resolveVoiceLabel(id) {
        // Tries to use house voice map, else fallback
        const dict = {
            "21m00Tcm4TlvDq8ikWAM": 'Rachel [en, US] - Natural female (USA)',
            "6F5Zhi321D3Oq7v1oNT4": 'Hank (M) [en, US] - Resonant, bass-baritone',
            "LRpNiUBlcqgIsKUzcrlN": 'Grandpa Georg (M) [en, US] - Warm, elderly male',
            "Sg8zw6Na9OqprPcNwJo1": 'Amelia (F) [en, US] - Amelia (Tobi Knödel)',
            "AZnzlk1XvdvUeBnXmlld": 'Matilda [en, US/UK] - Natural female (US/UK blend)',
            "EXAVITQu4vr4xnSDxMaL": 'Bella [en, US] - Young girl',
            "ErXwobaYiN019PkySvjV": 'Antoni [en, US] - Natural male',
            "TxGEqnHWrfWFTfGW9XjX": 'Elli [en, US] - Soft and neutral',
            "MF3mGyEYCl7XYWbV9V6O": 'Callum [en, UK] - British male',
            "yoZ06aMxZJJ28mfd3POQ": 'Josh [en, US] - Natural male',
            "P0cYvKUVMu1qQBa8g4dE": 'Charlotte [en, US] - Warm female',
            "XN5dTrMAe6EpkcJUL1VH": 'Clyde [en, US South] - Southern US male',
            "oWAxZDx7w5VEj9dCyTzz": 'Mimi [en, US] - Clear, youthful female',
            "4YYIPFl9wE5c4L2eu2Gb": 'Burt Reynolds (M) [en, US] - Burt Reynolds',
            "rAmra0SCIYOxYmRNDSm3": 'Lana Weiss (F) [en, US] - Lana Weiss',
            "flHkNRp1BlvT73UL6gyz": 'Jessica Anne Bogart (F) [en, US] - Jessica Anne Bogart',
            "Uyx98Ek4uMNmWN7E28CD": 'Aakash Aryan (M) [en, IN] - Aakash Aryan',
            "VD1if7jDVYtAKs4P0FIY": 'Milli Maple (F) [en, US] - Milli Maple'
        };
        if (dict[id]) return dict[id];
        if (window.elevenLabsVoicesList) {
            const v = window.elevenLabsVoicesList.find(v => v && v.id === id);
            if(v && v.name) return v.name + ' ('+id.substring(0,8)+'...)';
        }
        return `Custom Voice (${id.substring(0,8)}...)`;
    }
    function getBestVoiceList() {
        return [
            {id: "21m00Tcm4TlvDq8ikWAM", name: resolveVoiceLabel("21m00Tcm4TlvDq8ikWAM")},
            {id: "6F5Zhi321D3Oq7v1oNT4", name: resolveVoiceLabel("6F5Zhi321D3Oq7v1oNT4")},
            {id: "LRpNiUBlcqgIsKUzcrlN", name: resolveVoiceLabel("LRpNiUBlcqgIsKUzcrlN")},
            {id: "Sg8zw6Na9OqprPcNwJo1", name: resolveVoiceLabel("Sg8zw6Na9OqprPcNwJo1")},
            {id: "AZnzlk1XvdvUeBnXmlld", name: resolveVoiceLabel("AZnzlk1XvdvUeBnXmlld")},
            {id: "EXAVITQu4vr4xnSDxMaL", name: resolveVoiceLabel("EXAVITQu4vr4xnSDxMaL")},
            {id: "ErXwobaYiN019PkySvjV", name: resolveVoiceLabel("ErXwobaYiN019PkySvjV")},
            {id: "TxGEqnHWrfWFTfGW9XjX", name: resolveVoiceLabel("TxGEqnHWrfWFTfGW9XjX")},
            {id: "MF3mGyEYCl7XYWbV9V6O", name: resolveVoiceLabel("MF3mGyEYCl7XYWbV9V6O")},
            {id: "yoZ06aMxZJJ28mfd3POQ", name: resolveVoiceLabel("yoZ06aMxZJJ28mfd3POQ")},
            {id: "P0cYvKUVMu1qQBa8g4dE", name: resolveVoiceLabel("P0cYvKUVMu1qQBa8g4dE")},
            {id: "XN5dTrMAe6EpkcJUL1VH", name: resolveVoiceLabel("XN5dTrMAe6EpkcJUL1VH")},
            {id: "oWAxZDx7w5VEj9dCyTzz", name: resolveVoiceLabel("oWAxZDx7w5VEj9dCyTzz")},
            {id: "4YYIPFl9wE5c4L2eu2Gb", name: resolveVoiceLabel("4YYIPFl9wE5c4L2eu2Gb")},
            {id: "rAmra0SCIYOxYmRNDSm3", name: resolveVoiceLabel("rAmra0SCIYOxYmRNDSm3")},
            {id: "flHkNRp1BlvT73UL6gyz", name: resolveVoiceLabel("flHkNRp1BlvT73UL6gyz")},
            {id: "Uyx98Ek4uMNmWN7E28CD", name: resolveVoiceLabel("Uyx98Ek4uMNmWN7E28CD")},
            {id: "VD1if7jDVYtAKs4P0FIY", name: resolveVoiceLabel("VD1if7jDVYtAKs4P0FIY")}
        ];
    }
    function getSavedCustomVoices() {
        try {
            const list = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
            return Array.isArray(list) ? list : [];
        } catch {
            return [];
        }
    }
    function saveCustomVoices(list) {
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
    }
    function addCustomVoice(id, name) {
        if (!id || !id.trim()) return;
        let list = getSavedCustomVoices();
        // Remove if exists to prevent duplicates, then add to top
        list = list.filter(v => v.id !== id);
        list.unshift({ id, name: name || resolveVoiceLabel(id) });
        // Limit to reasonable number
        if (list.length > 20) list.pop();
        saveCustomVoices(list);
    }
    function deleteCustomVoice(id) {
        let list = getSavedCustomVoices().filter(v => v.id !== id);
        saveCustomVoices(list);
    }
    function isSavedCustomVoice(id) {
        if (!id || id === "__custom__" || !id.trim()) return false;
        return getSavedCustomVoices().some(v => v.id === id);
    }
    function updateCustomVoiceControls() {
        const selectedValue = voiceSelect.value;
        const isCustomSelected = isSavedCustomVoice(selectedValue);
        const isAddNewSelected = selectedValue === '__custom__';
        
        customVoiceInput.style.display = isAddNewSelected ? 'block' : 'none';
        saveVoiceIdBtn.style.display = (isAddNewSelected && customVoiceInput.value.trim().length >= 10) ? 'inline-block' : 'none';
        deleteVoiceIdBtn.style.display = isCustomSelected ? 'inline-block' : 'none';

        if (isAddNewSelected) {
            customVoiceInput.focus();
        }
    }
    function populateVoiceSelect() {
        const lastSelected = localStorage.getItem('elevenlabsSelectedVoiceId');
        voiceSelect.innerHTML = '';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Select Voice...";
        voiceSelect.appendChild(defaultOption);

        // Standard voices optgroup
        const standardGroup = document.createElement('optgroup');
        standardGroup.label = "Standard Voices";
        getBestVoiceList().forEach(v => {
            if (v && v.id) {
                const opt = document.createElement('option');
                opt.value = v.id;
                opt.textContent = resolveVoiceLabel(v.id);
                standardGroup.appendChild(opt);
            }
        });
        voiceSelect.appendChild(standardGroup);
        
        // Custom voices optgroup
        const customVoices = getSavedCustomVoices();
        if (customVoices.length > 0) {
            const customGroup = document.createElement('optgroup');
            customGroup.label = "Your Saved Voices";
            customVoices.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.id;
                opt.textContent = v.name || resolveVoiceLabel(v.id);
                opt.className = 'custom-voice-option';
                customGroup.appendChild(opt);
            });
            voiceSelect.appendChild(customGroup);
        }

        // Add "Use Custom" option at the end
        const customOption = document.createElement('option');
        customOption.value = '__custom__';
        customOption.textContent = 'Add or Use Custom Voice ID...';
        voiceSelect.appendChild(customOption);

        // Restore last selection if it exists in the new list
        if (lastSelected && voiceSelect.querySelector(`option[value="${lastSelected}"]`)) {
            voiceSelect.value = lastSelected;
        } else {
            voiceSelect.value = "";
        }

        updateCustomVoiceControls();
    }
    
    // Initial population
    populateVoiceSelect();

    // --- Controls for saving/deleting custom IDs
    customVoiceInput.addEventListener('input', () => {
        saveVoiceIdBtn.style.display = (customVoiceInput.value.trim().length >= 10) ? 'inline-block' : 'none';
    });

    saveVoiceIdBtn.addEventListener('click', () => {
        const id = customVoiceInput.value.trim();
        if (id.length < 10) {
            alert("Voice ID must be at least 10 characters.");
            return;
        }
        addCustomVoice(id, `Custom Voice (${id.substring(0, 8)}...)`);
        localStorage.setItem('elevenlabsSelectedVoiceId', id);
        populateVoiceSelect();
        voiceSelect.value = id; // Ensure the new voice is selected
        updateCustomVoiceControls();
        elevenLabsInfo.textContent = `Saved Voice ID "${id.substring(0, 8)}...".`;
        logToAIConsole(state.commandHistory, aiCommandConsole, `Saved new custom ElevenLabs Voice ID: ${id}`);
    });

    deleteVoiceIdBtn.addEventListener('click', () => {
        const currentId = voiceSelect.value;
        if (!isSavedCustomVoice(currentId)) return;
        if (confirm(`Delete custom voice ID "${currentId}"? This will remove it from your saved list.`)) {
            deleteCustomVoice(currentId);
            localStorage.setItem('elevenlabsSelectedVoiceId', ''); // Reset selection
            populateVoiceSelect();
            elevenLabsInfo.textContent = `Deleted custom Voice ID.`;
            logToAIConsole(state.commandHistory, aiCommandConsole, `Deleted custom ElevenLabs Voice ID: ${currentId}`);
        }
    });

    // Voice select change handler (shows/hides input, updates selection)
    voiceSelect.addEventListener('change', () => {
        localStorage.setItem('elevenlabsSelectedVoiceId', voiceSelect.value);
        updateCustomVoiceControls();
    });

    // --- Prelisten Button for voice
    prelistenBtn.addEventListener('click', async () => {
        let voiceId;
        if (voiceSelect.value === '__custom__') {
            voiceId = customVoiceInput.value.trim();
        } else {
            voiceId = voiceSelect.value;
        }
        if (!voiceId) {
            alert("Select or enter a voice first.");
            prelistenBtn.disabled = false;
            prelistenBtn.textContent = "Prelisten Voice";
            return;
        }
        prelistenBtn.disabled = true;
        prelistenBtn.textContent = "Playing...";
        try {
            const sampleText = 'This is what your current ElevenLabs voice sounds like. Adjust your selection to choose your favorite narrator.';
            const result = await window.websim.textToSpeech({
                text: sampleText,
                voice: voiceId
            });
            if (!result.url) throw new Error("No audio returned.");
            const audio = new Audio(result.url);
            audio.onended = () => {
                prelistenBtn.disabled = false;
                prelistenBtn.textContent = "Prelisten Voice";
            };
            audio.onerror = () => {
                prelistenBtn.disabled = false;
                prelistenBtn.textContent = "Prelisten Voice";
                alert("Could not play audio preview for this voice.");
            };
            audio.play();
        } catch (e) {
            prelistenBtn.disabled = false;
            prelistenBtn.textContent = "Prelisten Voice";
            alert("Failed to prelisten: " + (e.message || e));
        }
    });

    // --- Display/hide subtabs per selected engine ---
    engineSelect.addEventListener('change', () => {
        localStorage.setItem('selectedTTSEngine', engineSelect.value);
        elevenLabsGroup.style.display = (engineSelect.value === 'elevenlabs') ? 'block' : 'none';
    });

    container.appendChild(elevenLabsGroup);

    // --- 2. Browser TTS Controls: Voice, Language, Gender, Effects, Live Preview ---
    // Browser TTS controls are only shown for 'browser' or 'auto' engines
    const browserVoiceGroup = document.createElement('div');
    browserVoiceGroup.id = 'browser-tts-controls';
    browserVoiceGroup.style.marginBottom = '20px';
    browserVoiceGroup.style.display = (engineSelect.value === 'browser' || engineSelect.value === 'auto') ? 'block' : 'none';

    // Voice language filter select
    const langLabel = document.createElement('label');
    langLabel.setAttribute('for', 'tts-lang-select');
    langLabel.textContent = 'Language Filter:';
    langLabel.style.marginBottom = '3px';
    browserVoiceGroup.appendChild(langLabel);
    const langSelect = document.createElement('select');
    langSelect.id = 'tts-lang-select';
    langSelect.name = 'tts-lang-select';
    langSelect.style.marginLeft = '10px';
    langLabel.appendChild(langSelect);

    // Gender filter
    const genderLabel = document.createElement('label');
    genderLabel.textContent = 'Voice Gender:';
    genderLabel.htmlFor = 'tts-gender-select';
    genderLabel.style.marginLeft = '12px';
    browserVoiceGroup.appendChild(genderLabel);
    const genderSelect = document.createElement('select');
    genderSelect.id = 'tts-gender-select';
    genderSelect.name = 'tts-gender-select';
    [
        { value: '', text: 'All' },
        { value: 'male', text: 'Male' },
        { value: 'female', text: 'Female' },
        { value: 'neutral', text: 'Neutral' }
    ].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.text;
        genderSelect.appendChild(o);
    });
    // Load stored gender preference
    genderSelect.value = localStorage.getItem('ttsVoiceGender') || '';
    genderLabel.appendChild(genderSelect);

    // Overlay voice parameters (pitch/rate/volume sliders)
    const paramGroup = document.createElement('div');
    paramGroup.style.marginTop = '12px';
    paramGroup.style.display = 'grid';
    paramGroup.style.gridTemplateColumns = 'auto 1fr auto 1fr';
    paramGroup.style.gap = '0 12px';
    const slidersMeta = [
        { id: 'tts-volume', label: 'Volume', min: 0, max: 1, step: 0.05, def: 1, effect: false },
        { id: 'tts-rate', label: 'Speed', min: 0.5, max: 2.5, step: 0.05, def: 1, effect: false },
        { id: 'tts-pitch', label: 'Pitch', min: 0.5, max: 2, step: 0.05, def: 1, effect: false }
    ];
    const sliderRefs = [];
    // Each parameter (slider) for text-to-speech audio
    slidersMeta.forEach(({ id, label, min, max, step, def }) => {
        const lbl = document.createElement('label');
        lbl.setAttribute('for', id);
        lbl.textContent = label + ':';
        lbl.style.textAlign = 'right';
        paramGroup.appendChild(lbl);

        const slider = document.createElement('input');
        slider.type = 'range'; slider.id = id; slider.min = min; slider.max = max; slider.step = step;
        slider.value = localStorage.getItem(id) || def;
        slider.style.width = '100px';
        paramGroup.appendChild(slider);

        sliderRefs.push(slider);

        // Update local storage and flag preview as needing update
        slider.addEventListener('input', () => {
            localStorage.setItem(id, slider.value);
            updatePreviewChanged();
        });
    });
    browserVoiceGroup.appendChild(paramGroup);

    // --- Effects area: Each with fine-grained controls/persistence
    // All overlay effects and their individual advanced options, can combine any number
    const overlayEffects = [
        { 
            id: 'tts-effect-flanger', text: 'Flanger', 
            settings: [
                { type: 'range', id: 'flanger-depth', label: 'Depth', min: 0.01, max: 0.9, step: 0.01, def: 0.25 },
                { type: 'range', id: 'flanger-rate',  label: 'Rate',  min: 0.1, max: 5, step: 0.05, def: 0.6 }
            ]
        },
        { 
            id: 'tts-effect-phaser', text: 'Phaser', 
            settings: [
                { type: 'range', id: 'phaser-rate', label: 'Rate', min: 0.1, max: 12, step: 0.1, def: 2 },
                { type: 'range', id: 'phaser-stages', label: 'Stages', min: 2, max: 24, step: 1, def: 4 }
            ]
        },
        { 
            id: 'tts-effect-roomreverb', text: 'Room Reverb', 
            settings: [
                { type: 'range', id: 'reverb-mix', label: 'Mix', min: 0, max: 1, step: 0.05, def: 0.45 },
                { type: 'range', id: 'reverb-time', label: 'Room Size', min: 0.5, max: 2.5, step: 0.05, def: 1.2 }
            ]
        },
        { 
            id: 'tts-effect-echo', text: 'Echo', 
            settings: [
                { type: 'range', id: 'echo-delay', label: 'Delay (ms)', min: 50, max: 700, step: 10, def: 110 },
                { type: 'range', id: 'echo-feedback', label: 'Feedback', min: 0.05, max: 0.9, step: 0.01, def: 0.32 }
            ]
        },
        { 
            id: 'tts-effect-distortion', text: 'Distortion', 
            settings: [
                { type: 'range', id: 'distortion-amount', label: 'Amount', min: 0, max: 1, step: 0.01, def: 0.15 }
            ]
        },
        { 
            id: 'tts-effect-eq', text: 'Equalizer (EQ)',
            settings: [
                { type: 'range', id: 'eq-bass', label: 'Bass', min: -15, max: 15, step: 1, def: 0 },
                { type: 'range', id: 'eq-mid', label: 'Mid', min: -15, max: 15, step: 1, def: 0 },
                { type: 'range', id: 'eq-treble', label: 'Treble', min: -15, max: 15, step: 1, def: 0 }
            ]
        },
        { 
            id: 'tts-effect-robot', text: 'Robot Voice',
            settings: [
                { type: 'range', id: 'robot-rate', label: 'Robotness', min: 0.05, max: 1, step: 0.01, def: 0.35 }
            ]
        }
        // More effects can be added easily
    ];

    // Render all overlay effect checkboxes and their advanced controls
    const effectGroup = document.createElement('div');
    effectGroup.style.marginTop = '8px';
    effectGroup.style.display = 'flex';
    effectGroup.style.flexWrap = 'wrap';
    effectGroup.style.gap = '12px';

    // Container for effect settings
    const effectSettingsArea = document.createElement('div');
    effectSettingsArea.classList.add('tts-effect-settings-panel');
    effectSettingsArea.style.marginTop = '10px';
    effectSettingsArea.style.background = 'var(--chapter-box-bg)';
    effectSettingsArea.style.borderRadius = '8px';
    effectSettingsArea.style.padding = '9px 14px';
    effectSettingsArea.style.display = 'none';

    // Store refs for checkboxes/settings
    const effectRefs = [];
    const effectSettingsRefs = {};

    overlayEffects.forEach(({ id, text, settings }) => {
        // Checkbox for effect
        const label = document.createElement('label');
        label.style.display = 'flex'; label.style.alignItems = 'center'; label.style.gap = '4px';
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.id = id;
        let effectSettings = JSON.parse(localStorage.getItem('ttsOverlayEffects') || '{}');
        cb.checked = !!effectSettings[id];
        cb.classList.add('tts-effect-control');
        cb.addEventListener('change', () => {
            let eff = JSON.parse(localStorage.getItem('ttsOverlayEffects') || '{}');
            eff[id] = cb.checked;
            localStorage.setItem('ttsOverlayEffects', JSON.stringify(eff));
            if(cb.checked && settings && settings.length > 0) {
                showEffectSettingsArea(id, settings, eff);
            } else {
                hideEffectSettingsArea(id);
            }
            updatePreviewChanged();
        });
        effectGroup.appendChild(label);
        label.appendChild(cb);
        label.appendChild(document.createTextNode(text));
        effectRefs.push(cb);

        // Settings block for effect
        if (settings && settings.length > 0) {
            const settingsBlock = document.createElement('div');
            settingsBlock.className = `tts-effect-settings for-${id}`;
            settingsBlock.style.display = cb.checked ? 'block' : 'none';
            settingsBlock.style.marginBottom = "8px";
            settingsBlock.style.marginLeft = "32px";
            settingsBlock.style.padding = "3px 8px";
            settingsBlock.style.background = "var(--export-options-bg, #f7f7f7)";
            settingsBlock.style.borderRadius = "6px";
            settingsBlock.style.boxShadow = cb.checked ? "0 1px 4px rgba(0,0,0,.04)" : "none";
            settingsBlock.appendChild(document.createElement('div')).textContent = text + " Settings:";

            // Sliders/inputs for effect settings
            settings.forEach(opt => {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.gap = '8px';
                row.style.margin = '4px 0';

                const lbl = document.createElement('label');
                lbl.setAttribute('for', opt.id);
                lbl.textContent = opt.label + ':';
                lbl.style.minWidth = "80px";
                row.appendChild(lbl);

                const settingInput = document.createElement('input');
                settingInput.type = opt.type;
                settingInput.id = opt.id;
                settingInput.name = opt.id;
                settingInput.style.width = opt.type === 'range' ? '100px' : 'auto';
                settingInput.min = opt.min;
                settingInput.max = opt.max;
                settingInput.step = opt.step;
                // Value, restored from storage or default
                const valStore = JSON.parse(localStorage.getItem('ttsOverlayEffectParams') || '{}');
                let settingValue = (valStore[opt.id] !== undefined) ? valStore[opt.id] : opt.def;
                settingInput.value = settingValue;
                // Value live display
                const valLabel = document.createElement('span');
                valLabel.style.fontSize = '0.93em';
                valLabel.textContent = `(${settingInput.value})`;
                settingInput.addEventListener('input', () => {
                    valLabel.textContent = `(${settingInput.value})`;
                    // Save EACH param change instantly
                    let params = JSON.parse(localStorage.getItem('ttsOverlayEffectParams') || '{}');
                    params[opt.id] = settingInput.value;
                    localStorage.setItem('ttsOverlayEffectParams', JSON.stringify(params));
                    updatePreviewChanged();
                });

                row.appendChild(settingInput);
                row.appendChild(valLabel);
                settingsBlock.appendChild(row);
            });

            effectSettingsRefs[id] = settingsBlock;
            effectSettingsArea.appendChild(settingsBlock);

            // Show/hide appropriate settings area per checked state
            if (cb.checked) {
                settingsBlock.style.display = 'block';
                effectSettingsArea.style.display = 'block';
            } else {
                settingsBlock.style.display = 'none';
            }
        }
    });

    // Show effect settings panel for selected effect
    function showEffectSettingsArea(effectId, settings, effectOnObj) {
        for (const key in effectSettingsRefs) {
            if (effectSettingsRefs[key]) {
                effectSettingsRefs[key].style.display = (key === effectId) ? "block" : "none";
            }
        }
        effectSettingsArea.style.display = 'block';
    }
    // Hide effect settings area for unselected effect
    function hideEffectSettingsArea(effectId) {
        if (effectSettingsRefs[effectId]) effectSettingsRefs[effectId].style.display = 'none';
        // Hide all panel if none active
        const anyOpen = Object.values(effectSettingsRefs).some(el => el.style.display === 'block');
        if (!anyOpen) effectSettingsArea.style.display = 'none';
    }

    browserVoiceGroup.appendChild(effectGroup);
    browserVoiceGroup.appendChild(effectSettingsArea);

    // Voice picker and preview row
    const voiceRow = document.createElement('div');
    voiceRow.className = 'tts-preview-row';
    voiceRow.style.marginTop = '12px';
    // Voice label
    const voiceLabel = document.createElement('label');
    voiceLabel.setAttribute('for', 'tts-voice-select');
    voiceLabel.textContent = 'Voice:';
    voiceLabel.style.marginRight = '8px';
    voiceRow.appendChild(voiceLabel);

    // Voice select dropdown (per voice)
    const ttsVoiceSelect = document.createElement('select');
    ttsVoiceSelect.id = 'tts-voice-select';
    ttsVoiceSelect.name = 'tts-voice-select';
    ttsVoiceSelect.style.minWidth = '170px';
    voiceRow.appendChild(ttsVoiceSelect);

    // Live Preview Button
    const previewButton = document.createElement('button');
    previewButton.id = 'tts-preview-button';
    previewButton.textContent = 'Preview Voice & Effects';
    previewButton.type = 'button';

    // "Changed!" indicator for unsaved/unpreviewed changes
    const changedIndicator = document.createElement('span');
    changedIndicator.className = 'changed-indicator';
    changedIndicator.style.display = 'none';
    changedIndicator.textContent = 'Changed!';
    voiceRow.appendChild(previewButton);
    voiceRow.appendChild(changedIndicator);

    previewButton.addEventListener('click', () => {
        playVoicePreview();
        changedIndicator.style.display = 'none';
    });

    browserVoiceGroup.appendChild(voiceRow);

    // Info note about effects/applicability
    const infoRow = document.createElement('p');
    infoRow.style.fontSize = '0.94em';
    infoRow.style.fontStyle = 'italic';
    infoRow.style.color = 'var(--text-secondary)';
    infoRow.style.marginTop = '8px';
    infoRow.innerHTML = 'All selected voice and effect settings apply for chapter <b>Read Aloud</b>.<br><span class="tts-effect-applied"></span>';
    browserVoiceGroup.appendChild(infoRow);

    container.appendChild(browserVoiceGroup);

    // --- 3. API TTS Engines (OpenAI/Microsoft/Orpheus) - settings blocks ---
    const apiCredGroup = document.createElement('div');
    apiCredGroup.id = 'api-tts-fields';
    apiCredGroup.style.display = (['microsoft', 'orpheus', 'openai'].includes(engineSelect.value)) ? 'block' : 'none';
    apiCredGroup.style.marginBottom = '16px';

    // OpenAI config
    const openaiDiv = document.createElement('div');
    openaiDiv.id = 'openai-block';
    openaiDiv.style.display = engineSelect.value === 'openai' ? 'block' : 'none';
    const openaiKey = document.createElement('input');
    openaiKey.type = 'text';
    openaiKey.placeholder = 'OpenAI API Key';
    openaiKey.value = localStorage.getItem('openaiApiKey') || '';
    openaiKey.style.width = '220px';
    openaiKey.addEventListener('change', () => {
        localStorage.setItem('openaiApiKey', openaiKey.value.trim());
    });
    openaiDiv.appendChild(openaiKey);

    const openaiVoiceSel = document.createElement('select');
    openaiVoiceSel.id = 'openai-voice-select';
    [
        { value: 'alloy', text: 'Alloy (neutral/male)' },
        { value: 'echo', text: 'Echo (neutral/female)' },
        { value: 'fable', text: 'Fable (female/softer)' },
        { value: 'onyx', text: 'Onyx (male/gravitas)' },
        { value: 'nova', text: 'Nova (female/expressive)' },
        { value: 'shimmer', text: 'Shimmer (female)' }
    ].forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value; o.textContent = opt.text;
        openaiVoiceSel.appendChild(o);
    });
    openaiVoiceSel.value = localStorage.getItem('openaiVoice') || 'alloy';
    openaiVoiceSel.style.marginLeft = '10px';
    openaiVoiceSel.addEventListener('change', () => {
        localStorage.setItem('openaiVoice', openaiVoiceSel.value);
    });
    openaiDiv.appendChild(openaiVoiceSel);
    apiCredGroup.appendChild(openaiDiv);

    // Microsoft config
    const msDiv = document.createElement('div');
    msDiv.id = 'microsoft-block';
    msDiv.style.display = engineSelect.value === 'microsoft' ? 'block' : 'none';
    const msKey = document.createElement('input');
    msKey.type = 'text';
    msKey.placeholder = 'Microsoft API Key';
    msKey.value = localStorage.getItem('microsoftApiKey') || '';
    msKey.style.width = '220px';
    msKey.addEventListener('change', () => {
        localStorage.setItem('microsoftApiKey', msKey.value.trim());
    });
    msDiv.appendChild(msKey);
    const msRegion = document.createElement('input');
    msRegion.type = 'text';
    msRegion.placeholder = 'Region (e.g., eastus)';
    msRegion.value = localStorage.getItem('microsoftRegion') || 'eastus';
    msRegion.style.marginLeft = '10px';
    msRegion.style.width = '125px';
    msRegion.addEventListener('change', () => {
        localStorage.setItem('microsoftRegion', msRegion.value.trim());
    });
    msDiv.appendChild(msRegion);

    const msVoice = document.createElement('input');
    msVoice.type = 'text';
    msVoice.placeholder = 'Voice (e.g., en-US-JennyNeural)';
    msVoice.value = localStorage.getItem('microsoftVoice') || 'en-US-AriaNeural';
    msVoice.style.marginLeft = '10px';
    msVoice.style.width = '175px';
    msVoice.addEventListener('change', () => {
        localStorage.setItem('microsoftVoice', msVoice.value.trim());
    });
    msDiv.appendChild(msVoice);

    apiCredGroup.appendChild(msDiv);

    // Orpheus config
    const orphDiv = document.createElement('div');
    orphDiv.id = 'orpheus-block';
    orphDiv.style.display = engineSelect.value === 'orpheus' ? 'block' : 'none';
    const orphKey = document.createElement('input');
    orphKey.type = 'text';
    orphKey.placeholder = 'Orpheus API Key';
    orphKey.value = localStorage.getItem('orpheusApiKey') || '';
    orphKey.style.width = '180px';
    orphKey.addEventListener('change', () => {
        localStorage.setItem('orpheusApiKey', orphKey.value.trim());
    });
    orphDiv.appendChild(orphKey);
    const orphHost = document.createElement('input');
    orphHost.type = 'text';
    orphHost.placeholder = 'Endpoint Host';
    orphHost.value = localStorage.getItem('orpheusHost') || '';
    orphHost.style.marginLeft = '10px';
    orphHost.style.width = '160px';
    orphHost.addEventListener('change', () => {
        localStorage.setItem('orpheusHost', orphHost.value.trim());
    });
    orphDiv.appendChild(orphHost);
    const orphModel = document.createElement('input');
    orphModel.type = 'text';
    orphModel.placeholder = 'Voice Model (default: narrator)';
    orphModel.value = localStorage.getItem('orpheusModel') || 'narrator';
    orphModel.style.marginLeft = '10px';
    orphModel.style.width = '165px';
    orphModel.addEventListener('change', () => {
        localStorage.setItem('orpheusModel', orphModel.value.trim());
    });
    orphDiv.appendChild(orphModel);
    apiCredGroup.appendChild(orphDiv);

    container.appendChild(apiCredGroup);

    // --- Engine change logic, enhanced for showing/hiding groups ---
    engineSelect.addEventListener('change', () => {
        localStorage.setItem('selectedTTSEngine', engineSelect.value);
        browserVoiceGroup.style.display = (engineSelect.value === 'browser' || engineSelect.value === 'auto') ? 'block' : 'none';
        elevenLabsGroup.style.display = (engineSelect.value === 'elevenlabs') ? 'block' : 'none';
        apiCredGroup.style.display = (['microsoft', 'orpheus', 'openai'].includes(engineSelect.value)) ? 'block' : 'none';
        logToAIConsole(state.commandHistory, aiCommandConsole, `TTS engine changed to: ${engineSelect.value}`);
        if (engineSelect.value === 'elevenlabs') {
            // Load voices if not present
            if (!elevenLabsVoices.length && !loadingVoices) {
                loadElevenLabsVoices();
            }
            // Show/hide per custom value
            updateCustomVoiceControls();
            // Restore custom id if in storage
            if (localStorage.getItem('elevenlabsSelectedVoiceId') === '__custom__') {
                voiceSelect.value = '__custom__';
                updateCustomVoiceControls();
            }
        }
    });

    // --- 4. Voice List Population and Filtering ---
    // Voice population for browser TTS (with language and gender filtering)
    function updateVoices() {
        // Get voices from browser
        voices = speechSynthesis.getVoices();
        // Map each language to its label for language filter
        let langs = Object.values(voices.reduce((acc, v) => {
            acc[v.lang] = v.lang;
            return acc;
        }, {}));
        langs = langs.sort((a, b) => a.localeCompare(b));
        langSelect.innerHTML = `<option value="">All Languages</option>`;
        langs.forEach(lang => {
            const opt = document.createElement('option');
            opt.value = lang;
            opt.textContent = lang;
            langSelect.appendChild(opt);
        });
        updateVoiceSelect();
    }
    // Track settings changes ("Changed!" indicator)
    let previewNeedsUpdate = false;
    function updatePreviewChanged() {
        changedIndicator.style.display = 'inline-block';
        previewNeedsUpdate = true;
    }
    // Actual per-voice filtering (by language/gender)
    function updateVoiceSelect() {
        const languageFilter = langSelect.value;
        const genderFilter = genderSelect.value;
        ttsVoiceSelect.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = 'default';
        defaultOption.textContent = 'Default Browser Voice';
        ttsVoiceSelect.appendChild(defaultOption);

        // Compute "gender" for each browser voice (basic heuristic based on name matches)
        voiceGenderMap = {};
        voices.forEach(voice => {
            const voiceName = (voice.name || '').toLowerCase();
            const isMale = /male|man|john|david|dan|paul|matt|sam|daniel/.test(voiceName);
            const isFemale = /female|woman|lisa|maria|jane|emma|violet|zoe|aria|jenny|nicole/.test(voiceName);
            let vg = '';
            if (isMale) vg = 'male';
            if (isFemale) vg = 'female';
            if (!isMale && !isFemale) vg = 'neutral';
            voiceGenderMap[voice.voiceURI] = vg;
        });

        // Filter by language & gender, append to selector
        voices.filter(voice => {
            if (languageFilter && voice.lang !== languageFilter) return false;
            if (genderFilter && voiceGenderMap[voice.voiceURI] !== genderFilter) return false;
            return true;
        }).forEach(voice => {
            const opt = document.createElement('option');
            opt.value = voice.voiceURI;
            const label = `${voice.name} (${voice.lang}${voiceGenderMap[voice.voiceURI] ? ', ' + voiceGenderMap[voice.voiceURI] : ''})`;
            opt.textContent = label;
            ttsVoiceSelect.appendChild(opt);
        });

        // Restore selection from storage
        let stored = localStorage.getItem('selectedTTSVoiceURI');
        if (stored && ttsVoiceSelect.querySelector(`option[value="${stored}"]`)) {
            ttsVoiceSelect.value = stored;
        } else {
            ttsVoiceSelect.value = 'default';
        }
    }

    // --- Event Listeners for filter dropdowns and selectors ---
    langSelect.addEventListener('change', () => { updateVoiceSelect(); updatePreviewChanged(); });
    genderSelect.addEventListener('change', () => {
        localStorage.setItem('ttsVoiceGender', genderSelect.value);
        updateVoiceSelect();
        updatePreviewChanged();
    });
    ttsVoiceSelect.addEventListener('change', () => {
        localStorage.setItem('selectedTTSVoiceURI', ttsVoiceSelect.value);
        updatePreviewChanged();
    });
    // React to browser API async updates
    if (typeof speechSynthesis.onvoiceschanged !== 'undefined') {
        speechSynthesis.onvoiceschanged = updateVoices;
    }
    updateVoices();

    // --- Listen for all slider/effect updates, flag preview as changed ---
    sliderRefs.forEach(slider => {
        slider.addEventListener('input', updatePreviewChanged);
    });
    effectRefs.forEach(cb => {
        cb.addEventListener('change', updatePreviewChanged);
    });

    // --- 5. Live Preview Generation (all browser settings and effects applied) ---
    // Synthesize and speak a test phrase using all current params and effects for preview in browser
    function playVoicePreview() {
        // Select desired browser voice, or fallback to default
        const selectedURI = ttsVoiceSelect.value;
        let v = null;
        if (selectedURI && selectedURI !== 'default') {
            v = voices.find(voice => voice.voiceURI === selectedURI);
        }
        // Preview phrase
        const testPhrase = "This is your selected voice, with all applied effects. " +
            "Try adjusting language, gender, speed, pitch, and effects for your individual perfect read aloud.";
        const utter = new SpeechSynthesisUtterance(testPhrase);
        utter.volume = parseFloat(document.getElementById('tts-volume').value) || 1;
        utter.rate = parseFloat(document.getElementById('tts-rate').value) || 1;
        utter.pitch = parseFloat(document.getElementById('tts-pitch').value) || 1;
        if (v) {
            utter.voice = v;
            utter.lang = v.lang;
        }

        // Display overlays summary (effects applied)
        let overlays = JSON.parse(localStorage.getItem('ttsOverlayEffects') || '{}');
        let overlaysSummary = [];
        Object.entries(overlays).forEach(([effectKey, enabled]) => {
            if (enabled) {
                let paramsObj = JSON.parse(localStorage.getItem('ttsOverlayEffectParams') || '{}');
                let advancedSummary = '';
                const struct = overlayEffects.find(e => e.id === effectKey);
                if (struct && struct.settings) {
                    advancedSummary = ': ' + struct.settings.map(s => s.label + '=' + (paramsObj[s.id] ?? s.def)).join(', ');
                }
                overlaysSummary.push(struct ? struct.text + advancedSummary : effectKey);
            }
        });

        utter.onstart = () => {
            logToAIConsole(state.commandHistory, aiCommandConsole,
                `Preview: Voice "${v ? v.name : "Default"}", Lang: "${v ? v.lang : navigator.language}", Pitch: ${utter.pitch}, Rate: ${utter.rate}, Volume: ${utter.volume}` +
                (overlaysSummary.length ? "; overlay effects: " + overlaysSummary.join("; ") : ''));
            infoRow.innerHTML = `Previewing: ${v ? v.name : 'Default'}, ${v ? v.lang : ''} 
                ${overlaysSummary.length ? ' | <span class="tts-effect-applied">' + overlaysSummary.join('; ') + '</span>' : ''}
            `;
        };
        utter.onend = () => {
            infoRow.innerHTML = 'Preview finished. All settings/effects apply for <b>Read Aloud</b>.' +
                (overlaysSummary.length ? ' <span class="tts-effect-applied">' + overlaysSummary.join('; ') + '</span>' : '');
            previewNeedsUpdate = false;
        };
        utter.onerror = (e) => {
            infoRow.textContent = "TTS Preview Error: " + e.error;
        };
        speechSynthesis.speak(utter);
    }

    // --- 6. API engine controls always persist immediately, and show/hide appropriately ---
    // Functionally, these controls trigger the actual API on "read aloud" usage.

    // --- Page info about persistence ---
    const savedRow = document.createElement('p');
    savedRow.textContent = "Voice/effect settings are saved immediately and used for all further read alouds. Use chapter tools → 'Read Aloud' to listen or STOP button to stop any playback.";
    savedRow.style.fontSize = '0.92em';
    savedRow.style.fontStyle = 'italic';
    savedRow.style.marginTop = '11px';
    container.appendChild(savedRow);

    // Show "changed" indicator whenever any main param/effect changes
    [
        langSelect, genderSelect, ttsVoiceSelect,
        ...effectRefs,
        ...sliderRefs
    ].forEach(el => {
        el.addEventListener('input', updatePreviewChanged);
        el.addEventListener('change', updatePreviewChanged);
    });

    // --- Add Stop button for current read aloud ---
    const stopTTSBtn = document.createElement('button');
    stopTTSBtn.textContent = 'Stop Read Aloud';
    stopTTSBtn.id = 'tts-stop-button';
    stopTTSBtn.style.marginTop = '8px';
    stopTTSBtn.style.padding = '8px 18px';
    stopTTSBtn.style.background = '#d32f2f';
    stopTTSBtn.style.color = 'white';
    stopTTSBtn.style.border = 'none';
    stopTTSBtn.style.borderRadius = '5px';
    stopTTSBtn.style.fontWeight = 'bold';
    stopTTSBtn.style.cursor = 'pointer';
    stopTTSBtn.style.fontSize = '1.05em';

    stopTTSBtn.addEventListener('click', () => {
        // Stop browser TTS
        try {
            if (window.speechSynthesis && window.speechSynthesis.speaking) window.speechSynthesis.cancel();
            // Stop ElevenLabs
            if (window.elevenlabsTTS_Audio) { window.elevenlabsTTS_Audio.pause(); window.elevenlabsTTS_Audio = null; }
            // Stop Orpheus
            if (window.orpheusTTSAudio) { window.orpheusTTSAudio.pause(); window.orpheusTTSAudio = null; }
            // Stop Microsoft
            if (window.microsoftTTSAudio) { window.microsoftTTSAudio.pause(); window.microsoftTTSAudio = null; }
            // Stop OpenAI
            if (window.openaiTTSAudio) { window.openaiTTSAudio.pause(); window.openaiTTSAudio = null; }
            // Optionally signal reading chapter to null
            if (state && typeof state === 'object') state.currentlyReadingChapter = null;
            logToAIConsole && logToAIConsole(state.commandHistory, aiCommandConsole, 'Read aloud stopped by user.');
            stopTTSBtn.blur();
        } catch (e) {
            logToAIConsole && logToAIConsole(state.commandHistory, aiCommandConsole, 'Stop error: ' + (e?.message ?? e));
        }
    });
    elevenLabsGroup.appendChild(stopTTSBtn);
    browserVoiceGroup.appendChild(stopTTSBtn.cloneNode(true)); // Add to both browser and elevenlabs settings

    // --- Initial load on show if elevenlabs is selected ---
    if (engineSelect.value === 'elevenlabs') {
        setTimeout(loadElevenLabsVoices, 47);
    }

    // --- Full voice fetch for preset list (called on tab open and after custom add) ---
    async function loadElevenLabsVoices() {
        elevenLabsInfo.textContent = "Loading ElevenLabs voices...";
        // --- Define the best readers list directly ---
        function getBestReadersList() {
            return [
                {id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", lang: "en", accent: "US"},
                {id: "6F5Zhi321D3Oq7v1oNT4", name: "Hank", lang: "en", accent: "US"},
                {id: "LRpNiUBlcqgIsKUzcrlN", name: "Grandpa Georg", lang: "en", accent: "US"},
                {id: "Sg8zw6Na9OqprPcNwJo1", name: "Amelia", lang: "en", accent: "US"},
                {id: "AZnzlk1XvdvUeBnXmlld", name: "Matilda", lang: "en", accent: "US/UK"},
                {id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", lang: "en", accent: "US"},
                {id: "ErXwobaYiN019PkySvjV", name: "Antoni", lang: "en", accent: "US"},
                {id: "TxGEqnHWrfWFTfGW9XjX", name: "Elli", lang: "en", accent: "US"},
                {id: "MF3mGyEYCl7XYWbV9V6O", name: "Callum", lang: "en", accent: "UK"},
                {id: "yoZ06aMxZJJ28mfd3POQ", name: "Josh", lang: "en", accent: "US"},
                {id: "P0cYvKUVMu1qQBa8g4dE", name: "Charlotte", lang: "en", accent: "US"},
                {id: "XN5dTrMAe6EpkcJUL1VH", name: "Clyde", lang: "en", accent: "US South"},
                {id: "oWAxZDx7w5VEj9dCyTzz", name: "Mimi", lang: "en", accent: "US"},
                {id: "4YYIPFl9wE5c4L2eu2Gb", name: "Burt Reynolds", lang: "en", accent: "US"},
                {id: "rAmra0SCIYOxYmRNDSm3", name: "Lana Weiss", lang: "en", accent: "US"},
                {id: "flHkNRp1BlvT73UL6gyz", name: "Jessica Anne Bogart", lang: "en", accent: "US"},
                {id: "Uyx98Ek4uMNmWN7E28CD", name: "Aakash Aryan", lang: "en", accent: "IN"},
                {id: "VD1if7jDVYtAKs4P0FIY", name: "Milli Maple", lang: "en", accent: "US" }
            ];
        }

        let voicesList = getBestReadersList();
        try {
            if (window.websim && window.websim.textToSpeech && typeof window.websim.textToSpeech === 'function') {
                const result = await window.websim.textToSpeech({ q: "*", infoOnly: true });
                let respVoices = result?.voices || [];
                // Ensure manually curated voices present
                for(const patch of getBestReadersList()) {
                    if (!respVoices.some(v => v.id === patch.id)) {
                        respVoices.push(patch);
                    }
                }
                voicesList = respVoices;
            }
        } catch { }
        // Guarantee manually added voices included
        const ensureVoiceFinal = (id) => {
            if (!voicesList.some(v => v && v.id === id)) {
                voicesList.push(getBestReadersList().find(v => v.id === id));
            }
        };
        [
            "6F5Zhi321D3Oq7v1oNT4", // Hank
            "LRpNiUBlcqgIsKUzcrlN", // Grandpa Georg
            "Sg8zw6Na9OqprPcNwJo1", // Amelia (Tobi Knödel)
            "4YYIPFl9wE5c4L2eu2Gb", // Burt Reynolds 
            "rAmra0SCIYOxYmRNDSm3", // Lana Weiss
            "flHkNRp1BlvT73UL6gyz", // Jessica Anne Bogart
            "Uyx98Ek4uMNmWN7E28CD", // Aakash Aryan
            "VD1if7jDVYtAKs4P0FIY", // Milli Maple
        ].forEach(ensureVoiceFinal);

        // Memo voice list for re-use
        window.elevenLabsVoicesList = voicesList;

        // --- Inject voices and append saved custom IDs ---
        populateVoiceSelect(voicesList);

        elevenLabsInfo.textContent = `Loaded ${voicesList.length} ElevenLabs voices. Your saved are under "Your Saved Voice IDs" below.`;
    }

    return container;
}