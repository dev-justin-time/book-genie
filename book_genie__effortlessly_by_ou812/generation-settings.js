import { updateChapterSizeSublabel, addCustomGenreOption, saveCustomGenre } from './ui-helpers.js';
import config from './config.js';

// --- i18n for tab headline and labels ---
const GEN_SETTINGS_LANG = {
    en: {
        tabHeadline: 'Content Generation Settings',
        genre: 'Genre:',
        ownGenre: 'Own Genre...',
        style: 'Style:',
        chosenByAI: 'Chosen by AI',
        chapterCount: 'Number of Chapters:',
        chapterSize: 'Chapter Generation Size:',
        sublabel: [
            "Tiny (~250 words)",
            "Small (~500 words)",
            "Default (~1000 words)",
            "Large (~1500 words)",
            "Huge (~2000 words)",
            "Massive (~4000 words)",
            "Epic (~6000 words)",
            "Colossal (~8000 words)"
        ],
        modeLabel: 'Book Generation Mode:',
        continuous: 'Continuous (Chapters Build Story Progressively)',
        continuousDesc: "Each chapter will continue from the previous one, using story context so far (for novels, sagas, biographies, etc).",
        standalone: 'Standalone (Each Chapter Uses Only Main Prompt)',
        standaloneDesc: "All chapters are generated independently from the main prompt (good for anthologies, essays, instructional books, etc).",
        uploadToggleShow: 'Show Story Upload',
        uploadToggleHide: 'Hide Story Upload',
        uploadOpt: 'Optional: Upload a Story/Script/Document to base generation on:',
        uploadHint: "Supported: <b>TXT, DOCX, RTF, PDF</b>, and most readable script/story formats.<br>Content will be imported as the base for book generation.<br>You can also just paste text manually into the input field if you prefer.",
        processing: 'Processing document...',
        processingPdf: 'Extracting text from PDF...',
        extractingDocx: 'Extracting DOCX...',
        extractingRtf: 'Extracting RTF...',
        processingError: 'Error processing file: ',
        fileLoaded: 'File loaded. Generating book...',
        loaded: 'Loaded file as text. Generating book...',
        loadedPdf: 'Extracted PDF text. Generating book...',
        loadedDocx: 'Extracted DOCX. Generating book...',
        loadedRtf: 'Extracted RTF. Generating book...',
    },
    de: {
        tabHeadline: 'Einstellungen zur Inhaltserstellung',
        genre: 'Genre:',
        ownGenre: 'Eigenes Genre...',
        style: 'Stil:',
        chosenByAI: 'Von KI gewählt',
        chapterCount: 'Anzahl der Kapitel:',
        chapterSize: 'Kapitel-Generierungsgröße:',
        sublabel: [
            "Winzig (~250 Wörter)",
            "Klein (~500 Wörter)",
            "Standard (~1000 Wörter)",
            "Groß (~1500 Wörter)",
            "Riesig (~2000 Wörter)",
            "Massiv (~4000 Wörter)",
            "Episch (~6000 Wörter)",
            "Kolossal (~8000 Wörter)"
        ],
        modeLabel: 'Buch-Generierungsmodus:',
        continuous: 'Fortlaufend (Kapitel bauen die Story progressiv auf)',
        continuousDesc: "Jedes Kapitel setzt die Geschichte des vorherigen Kapitels fort (z. B. für Romane, Sagas, Biografien usw.).",
        standalone: 'Unabhängig (Jedes Kapitel mit Haupt-Input)',
        standaloneDesc: "Alle Kapitel werden unabhängig voneinander auf Basis der Haupteingabe erstellt (z. B. für Anthologien, Essays usw.).",
        uploadToggleShow: 'Story-Upload anzeigen',
        uploadToggleHide: 'Story-Upload ausblenden',
        uploadOpt: 'Optional: Laden Sie eine Geschichte/Skript/Dokument hoch als Grundlage:',
        uploadHint: "Unterstützt: <b>TXT, DOCX, RTF, PDF</b> und die meisten skript-/storytauglichen Formate.<br>Inhalt wird als Basis für die Bucherstellung importiert.<br>Oder geben Sie Text direkt in das Feld ein.",
        processing: 'Dokument wird verarbeitet...',
        processingPdf: 'Text aus PDF extrahieren...',
        extractingDocx: 'DOCX extrahieren...',
        extractingRtf: 'RTF extrahieren...',
        processingError: 'Fehler beim Verarbeiten der Datei: ',
        fileLoaded: 'Datei geladen. Buch wird erstellt...',
        loaded: 'Datei als Text geladen. Buch wird generiert...',
        loadedPdf: 'PDF-Text extrahiert. Buch wird erstellt...',
        loadedDocx: 'DOCX extrahiert. Buch wird erstellt...',
        loadedRtf: 'RTF extrahiert. Buch wird erstellt...',
    },
    fr: {
        tabHeadline: 'Paramètres de génération de contenu',
        genre: 'Genre :',
        ownGenre: 'Genre personnalisé...',
        style: 'Style :',
        chosenByAI: 'Choisi par IA',
        chapterCount: 'Nombre de chapitres :',
        chapterSize: 'Taille de génération du chapitre :',
        sublabel: [
            "Minuscule (~250 mots)",
            "Petit (~500 mots)",
            "Par défaut (~1000 mots)",
            "Grand (~1500 mots)",
            "Énorme (~2000 mots)",
            "Massif (~4000 mots)",
            "Épique (~6000 mots)",
            "Colossal (~8000 mots)"
        ],
        modeLabel: 'Mode de génération du livre :',
        continuous: 'Continu (chapitres bâtissent l\'histoire progressivement)',
        continuousDesc: "Chaque chapitre prolonge l'histoire du précédent (pour romans, sagas, biographies, etc.).",
        standalone: 'Indépendant (chaque chapitre selon l\'entrée principale)',
        standaloneDesc: "Tous les chapitres sont générés indépendamment de l'entrée principale (idéal anthologies, essais, manuels, etc.).",
        uploadToggleShow: 'Afficher l\'import d\'histoire',
        uploadToggleHide: 'Masquer l\'import d\'histoire',
        uploadOpt: 'Optionnel : importer une histoire/script/document pour guider la génération :',
        uploadHint: "Pris en charge : <b>TXT, DOCX, RTF, PDF</b> et la plupart des scripts/formats d’histoire lisibles.<br>Le contenu sera importé comme base pour la génération du livre.<br>Vous pouvez aussi simplement coller du texte à la main dans le champ.",
        processing: 'Traitement du document...',
        processingPdf: 'Extraction du texte PDF...',
        extractingDocx: 'Extraction DOCX...',
        extractingRtf: 'Extraction RTF...',
        processingError: 'Erreur de traitement du fichier : ',
        fileLoaded: 'Fichier chargé. Génération du livre...',
        loaded: 'Fichier texte chargé. Génération du livre...',
        loadedPdf: 'Texte PDF extrait. Génération du livre...',
        loadedDocx: 'DOCX extrait. Génération du livre...',
        loadedRtf: 'RTF extrait. Génération du livre...',
    }
};

// Helper: get applied lang, fallback 'en'
function getLang() {
    let lang = document.documentElement.getAttribute('lang') || localStorage.getItem('preferredLanguage') || navigator.language || 'en';
    if (lang && lang.length > 2) lang = lang.split('-')[0].toLowerCase();
    return GEN_SETTINGS_LANG[lang] ? lang : 'en';
}
function t(key) {
    const lang = getLang();
    return GEN_SETTINGS_LANG[lang][key] || GEN_SETTINGS_LANG['en'][key] || key;
}
function sublabel(idx) {
    const lang = getLang();
    return GEN_SETTINGS_LANG[lang].sublabel && GEN_SETTINGS_LANG[lang].sublabel[idx-1] ? GEN_SETTINGS_LANG[lang].sublabel[idx-1] : '';
}

/**
 * Creates the content for the "Generation" settings tab.
 * @param {object} config - Global configuration object.
 * @param {object} state - Global state object.
 * @param {HTMLElement} aiCommandConsole - The console element to log to.
 * @param {function} logToAIConsole - The logging function.
 * @returns {HTMLElement} The container element for the generation settings.
 */
export function createGenerationSettingsContent(config, state, aiCommandConsole, logToAIConsole) {
    const container = document.createElement('div');
    container.classList.add('settings-section');
    container.id = 'generation-settings';

    const title = document.createElement('h3');
    title.textContent = t('tabHeadline');
    container.appendChild(title);

    // Genre Select
    const genreLabel = document.createElement('label');
    genreLabel.setAttribute('for', 'genre-select');
    genreLabel.textContent = t('genre');
    container.appendChild(genreLabel);

    const genreSelect = document.createElement('select');
    genreSelect.id = 'genre-select';
    genreSelect.name = 'genre-select';
    container.appendChild(genreSelect);

    // Custom Genre Input
    const customGenreInput = document.createElement('input');
    customGenreInput.type = 'text';
    customGenreInput.id = 'custom-genre-input';
    customGenreInput.placeholder = t('ownGenre');
    customGenreInput.classList.add('custom-input');
    customGenreInput.style.display = 'none';
    customGenreInput.style.marginTop = '5px';
    container.appendChild(customGenreInput);

    // "Auto Detect"
    const autoDetectOption = document.createElement('option');
    autoDetectOption.value = "Auto Detect";
    autoDetectOption.textContent = t('genre').includes('Genre') ? 'Auto Detect' : t('genre');
    genreSelect.appendChild(autoDetectOption);

    // "Own Genre..."
    const customGenreOption = document.createElement('option');
    customGenreOption.value = "_custom_genre";
    customGenreOption.textContent = t('ownGenre');
    genreSelect.appendChild(customGenreOption);

    // Saved custom genres
    const savedCustomGenres = JSON.parse(localStorage.getItem('customGenres') || '[]');
    savedCustomGenres.forEach(genreName => {
        addCustomGenreOption(genreSelect, genreName);
    });

    // Predefined genres from config
    config.genres.forEach(genre => {
        if (!genreSelect.querySelector(`option[value="${genre}"]`)) {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreSelect.appendChild(option);
        }
    });

    genreSelect.value = "Auto Detect";

    genreSelect.addEventListener('change', () => {
        if (genreSelect.value === "_custom_genre") {
            customGenreInput.style.display = 'block';
            customGenreInput.value = '';
            customGenreInput.focus();
            logToAIConsole(state.commandHistory, aiCommandConsole, `Genre set to: Own Genre (input required)`);
        } else {
            customGenreInput.style.display = 'none';
            if (genreSelect.value !== "Auto Detect") {
                logToAIConsole(state.commandHistory, aiCommandConsole, `Genre setting changed to: ${genreSelect.value}`);
            }
        }
    });

    customGenreInput.addEventListener('change', () => {
        const newGenre = customGenreInput.value.trim();
        if (newGenre && genreSelect.value === '_custom_genre') {
            const exists = Array.from(genreSelect.options).some(opt => opt.value.toLowerCase() === newGenre.toLowerCase());

            if (!exists) {
                addCustomGenreOption(genreSelect, newGenre);
                saveCustomGenre(newGenre);
                genreSelect.value = newGenre;
                customGenreInput.style.display = 'none';
                logToAIConsole(state.commandHistory, aiCommandConsole, `Custom genre "${newGenre}" added and selected.`);
            } else {
                const existingOption = Array.from(genreSelect.options).find(opt => opt.value.toLowerCase() === newGenre.toLowerCase());
                if (existingOption) {
                    genreSelect.value = existingOption.value;
                    customGenreInput.style.display = 'none';
                    logToAIConsole(state.commandHistory, aiCommandConsole, `Selected existing genre: ${genreSelect.value}`);
                }
            }
        } else if (!newGenre && genreSelect.value === '_custom_genre') {
            logToAIConsole(state.commandHistory, aiCommandConsole, `Custom genre input cleared.`);
        }
    });

    // Style Select
    const styleLabel = document.createElement('label');
    styleLabel.setAttribute('for', 'style-select');
    styleLabel.textContent = t('style');
    styleLabel.style.marginTop = '10px';
    styleLabel.style.display = 'block';
    container.appendChild(styleLabel);

    const styleSelect = document.createElement('select');
    styleSelect.id = 'style-select';
    styleSelect.name = 'style-select';

    const aiOption = document.createElement('option');
    aiOption.value = "Chosen by AI";
    aiOption.textContent = t('chosenByAI');
    styleSelect.appendChild(aiOption);

    config.styles.forEach(style => {
        const option = document.createElement('option');
        option.value = style;
        option.textContent = style;
        styleSelect.appendChild(option);
    });
    styleSelect.value = "Chosen by AI";
    container.appendChild(styleSelect);

    styleSelect.addEventListener('change', () => {
        logToAIConsole(state.commandHistory, aiCommandConsole, `Style setting changed to: ${styleSelect.value}`);
    });

    // Chapter Count Input
    const chapterCountLabel = document.createElement('label');
    chapterCountLabel.setAttribute('for', 'chapter-count-input');
    chapterCountLabel.textContent = t('chapterCount');
    chapterCountLabel.style.marginTop = '10px';
    chapterCountLabel.style.display = 'block';
    container.appendChild(chapterCountLabel);

    const chapterCountInput = document.createElement('input');
    chapterCountInput.type = 'number';
    chapterCountInput.id = 'chapter-count-input';
    chapterCountInput.name = 'chapter-count-input';
    chapterCountInput.min = '1';
    chapterCountInput.max = '100';
    chapterCountInput.value = '5';
    chapterCountInput.style.width = '80px';
    container.appendChild(chapterCountInput);

    chapterCountInput.addEventListener('change', () => {
        const count = parseInt(chapterCountInput.value) || 5;
        const min = parseInt(chapterCountInput.min) || 1;
        const max = parseInt(chapterCountInput.max) || 100;
        let validatedCount = Math.max(min, Math.min(max, count));
        if (validatedCount !== count) {
            chapterCountInput.value = validatedCount;
        }
        logToAIConsole(state.commandHistory, aiCommandConsole, `Number of Chapters setting changed to: ${validatedCount}`);
    });

    // Chapter Size Slider
    const chapterSizeLabel = document.createElement('label');
    chapterSizeLabel.setAttribute('for', 'chapter-size-slider');
    chapterSizeLabel.textContent = t('chapterSize');
    chapterSizeLabel.style.marginTop = '10px';
    chapterSizeLabel.style.display = 'block';
    container.appendChild(chapterSizeLabel);

    const chapterSizeSlider = document.createElement('input');
    chapterSizeSlider.type = 'range';
    chapterSizeSlider.id = 'chapter-size-slider';
    chapterSizeSlider.name = 'chapter-size-slider';
    chapterSizeSlider.min = '1';
    chapterSizeSlider.max = '8';
    chapterSizeSlider.value = '3';
    chapterSizeSlider.step = '1';
    container.appendChild(chapterSizeSlider);

    // Sublabel for Chapter Size (localized)
    const chapterSizeSublabel = document.createElement('p');
    chapterSizeSublabel.id = 'chapter-size-sublabel';
    chapterSizeSublabel.style.textAlign = 'center';
    chapterSizeSublabel.style.marginTop = '2px';
    chapterSizeSublabel.style.fontSize = '0.9em';
    chapterSizeSublabel.textContent = sublabel(parseInt(chapterSizeSlider.value));
    container.appendChild(chapterSizeSublabel);

    // Attach Listeners for Chapter Size Slider
    chapterSizeSlider.addEventListener('input', () => {
        chapterSizeSublabel.textContent = sublabel(parseInt(chapterSizeSlider.value));
    });

    chapterSizeSlider.addEventListener('change', () => {
        logToAIConsole(state.commandHistory, aiCommandConsole, `Chapter Size setting finalized at: ${chapterSizeSlider.value} (${chapterSizeSublabel.textContent})`);
    });

    // CONTEXT CHAINING/CONTINUITY
    const chainGroup = document.createElement('div');
    chainGroup.style.marginTop = '18px';
    chainGroup.style.padding = '12px';
    chainGroup.style.background = 'var(--chapter-box-bg)';
    chainGroup.style.borderRadius = '6px';

    const chainLabel = document.createElement('label');
    chainLabel.textContent = t('modeLabel');
    chainLabel.style.display = 'block';
    chainLabel.style.fontWeight = 'bold';
    chainLabel.style.marginBottom = '7px';
    chainGroup.appendChild(chainLabel);

    const radioContinuous = document.createElement('input');
    radioContinuous.type = 'radio';
    radioContinuous.id = 'chapter-gen-mode-continuous';
    radioContinuous.name = 'chapter-gen-mode';
    radioContinuous.value = 'continuous';
    radioContinuous.style.marginRight = '5px';
    radioContinuous.checked = true;
    const lblContinuous = document.createElement('label');
    lblContinuous.htmlFor = radioContinuous.id;
    lblContinuous.textContent = t('continuous');
    chainGroup.appendChild(radioContinuous);
    chainGroup.appendChild(lblContinuous);

    const descContinuous = document.createElement('div');
    descContinuous.style.fontSize = '0.92em';
    descContinuous.style.marginLeft = '25px';
    descContinuous.style.marginBottom = '7px';
    descContinuous.style.color = 'var(--text-secondary)';
    descContinuous.textContent = t('continuousDesc');
    chainGroup.appendChild(descContinuous);

    const radioStandalone = document.createElement('input');
    radioStandalone.type = 'radio';
    radioStandalone.id = 'chapter-gen-mode-standalone';
    radioStandalone.name = 'chapter-gen-mode';
    radioStandalone.value = 'standalone';
    radioStandalone.style.marginRight = '5px';
    const lblStandalone = document.createElement('label');
    lblStandalone.htmlFor = radioStandalone.id;
    lblStandalone.textContent = t('standalone');
    chainGroup.appendChild(radioStandalone);
    chainGroup.appendChild(lblStandalone);

    const descStandalone = document.createElement('div');
    descStandalone.style.fontSize = '0.92em';
    descStandalone.style.marginLeft = '25px';
    descStandalone.style.color = 'var(--text-secondary)';
    descStandalone.textContent = t('standaloneDesc');
    chainGroup.appendChild(descStandalone);

    [radioContinuous, radioStandalone].forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                logToAIConsole(state.commandHistory, aiCommandConsole,
                    `Changed book generation mode: ${radio.value === 'continuous' ? t('continuous') : t('standalone')}`);
            }
        });
    });
    container.appendChild(chainGroup);

    // Upload Story/Script
    const uploadSection = document.createElement('div');
    uploadSection.style.marginTop = '25px';
    uploadSection.style.background = 'var(--chapter-box-bg)';
    uploadSection.style.padding = '12px';
    uploadSection.style.borderRadius = '8px';
    uploadSection.style.border = '1px solid var(--border-secondary)';

    const uploadLabel = document.createElement('label');
    uploadLabel.setAttribute('for', 'story-upload-input');
    uploadLabel.style.fontWeight = 'bold';
    uploadLabel.style.display = 'block';
    uploadLabel.style.marginBottom = '7px';
    uploadLabel.textContent = t('uploadOpt');
    uploadSection.appendChild(uploadLabel);

    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.id = 'story-upload-input';
    uploadInput.accept = '.docx,.rtf,.txt,.pdf,.odt,.doc,.md,.html,.epub,.csv,.json,.xml,text/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf';
    uploadInput.style.display = 'block';
    uploadInput.style.marginBottom = '7px';
    uploadSection.appendChild(uploadInput);

    const uploadHint = document.createElement('span');
    uploadHint.style.fontSize = '0.93em';
    uploadHint.style.color = 'var(--text-secondary)';
    uploadHint.innerHTML = t('uploadHint');
    uploadSection.appendChild(uploadHint);

    if (!state.uploadedStoryContent) state.uploadedStoryContent = '';

    uploadInput.addEventListener('change', async (event) => {
        const file = uploadInput.files[0];
        if (!file) return;

        Array.from(uploadSection.childNodes).forEach(x => {
            if (x.className === 'upload-status-msg') {
                x.remove();
            }
        });

        const loadingMsg = document.createElement('div');
        loadingMsg.textContent = t('processing');
        loadingMsg.style.color = 'var(--text-secondary)';
        loadingMsg.className = 'upload-status-msg';
        uploadSection.appendChild(loadingMsg);

        const ext = file.name.split('.').pop().toLowerCase();

        async function autoStartGenerationWithContent(importedText) {
            const inputTextEl = document.getElementById('input-text');
            if (inputTextEl) inputTextEl.value = importedText;
            logToAIConsole(state.commandHistory, aiCommandConsole, `File imported. Generating book based on uploaded document...`);
            setTimeout(() => {
                const generateBtn = document.getElementById('generate-button');
                if (generateBtn && !generateBtn.disabled) {
                    generateBtn.click();
                } else {
                    logToAIConsole(state.commandHistory, aiCommandConsole, 'Could not start generation automatically (button not found or disabled).');
                }
            }, 450);
        }

        try {
            let textContent = '';

            if (ext === 'txt' || ext === 'md' || file.type.startsWith('text')) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    textContent = e.target.result;
                    state.uploadedStoryContent = textContent;
                    logToAIConsole(state.commandHistory, aiCommandConsole, `Uploaded file loaded. Generating book based on uploaded document.`);
                    loadingMsg.textContent = t('fileLoaded');
                    autoStartGenerationWithContent(textContent);
                };
                reader.readAsText(file);
                return;
            } else if (ext === 'pdf') {
                try {
                    loadingMsg.textContent = t('processingPdf');
                    const pdfJsScriptId = 'pdfjs-script-loader';
                    if (!window.pdfjsLib && !document.getElementById(pdfJsScriptId)) {
                        const script = document.createElement('script');
                        script.id = pdfJsScriptId;
                        script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js';
                        script.onload = () => { pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js'; };
                        document.head.appendChild(script);
                        await new Promise(resolve => script.onload = resolve);
                    }
                    if (!window.pdfjsLib) throw new Error('PDF.js failed to load.');
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    let pdfText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        const pageText = content.items.map(item => item.str).join(' ');
                        pdfText += pageText + '\n\n';
                    }
                    state.uploadedStoryContent = pdfText;
                    logToAIConsole(state.commandHistory, aiCommandConsole, `Successfully extracted text from PDF. Generating book based on uploaded document.`);
                    loadingMsg.textContent = t('loadedPdf');
                    autoStartGenerationWithContent(pdfText);
                } catch (error) {
                    loadingMsg.textContent = t('processingError') + (error && error.message ? error.message : error);
                    throw error;
                }
            } else if (ext === 'docx' || ext === 'doc') {
                loadingMsg.textContent = t('extractingDocx');
                const mammothScriptId = 'mammoth-script-loader';
                if (!window.mammoth && !document.getElementById(mammothScriptId)) {
                    const script = document.createElement('script');
                    script.id = mammothScriptId;
                    script.src = 'https://unpkg.com/mammoth/mammoth.browser.min.js';
                    document.head.appendChild(script);
                    await new Promise(resolve => script.onload = resolve);
                }
                if (!window.mammoth) throw new Error('Mammoth.js failed to load.');
                const arrayBuffer = await file.arrayBuffer();
                const result = await window.mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
                const tmpDiv = document.createElement('div');
                tmpDiv.innerHTML = result.value;
                let docxText = tmpDiv.innerText || '';
                state.uploadedStoryContent = docxText;
                logToAIConsole(state.commandHistory, aiCommandConsole, `Extracted DOCX. Generating book based on uploaded document.`);
                loadingMsg.textContent = t('loadedDocx');
                autoStartGenerationWithContent(docxText);
            } else if (ext === 'rtf') {
                loadingMsg.textContent = t('extractingRtf');
                const reader = new FileReader();
                reader.onload = function (e) {
                    const rtf = e.target.result;
                    let txt = '';
                    try {
                        const tmpDiv = document.createElement('div');
                        tmpDiv.innerHTML = rtfToHtml(rtf);
                        txt = tmpDiv.innerText || '';
                    } catch (err) {
                        txt = rtf;
                    }
                    state.uploadedStoryContent = txt;
                    logToAIConsole(state.commandHistory, aiCommandConsole, `Extracted RTF. Generating book based on uploaded document.`);
                    loadingMsg.textContent = t('loadedRtf');
                    autoStartGenerationWithContent(txt);
                };
                reader.readAsText(file);
                return;
            } else {
                const reader = new FileReader();
                reader.onload = function (e) {
                    textContent = e.target.result;
                    state.uploadedStoryContent = textContent;
                    logToAIConsole(state.commandHistory, aiCommandConsole, `Loaded file with generic loader. Generating book based on uploaded document.`);
                    loadingMsg.textContent = t('loaded');
                    autoStartGenerationWithContent(textContent);
                };
                reader.readAsText(file);
                return;
            }
        } catch (err) {
            loadingMsg.textContent = t('processingError') + (err && err.message ? err.message : err);
            logToAIConsole(state.commandHistory, aiCommandConsole, `ERROR: Failed uploading/processing file - ${err && err.message ? err.message : err}`);
        }
    });

    function rtfToHtml(rtfText) {
        return rtfText
            .replace(/\\par[d]?/g, "<br>")
            .replace(/\\b ([^\\]+)\\b0/g, "<b>$1</b>")
            .replace(/\\i ([^\\]+)\\i0/g, "<i>$1</i>")
            .replace(/\\ul ([^\\]+)\\ulnone/g, "<u>$1</u>")
            .replace(/\\'([0-9a-f]{2})/g, (m, code) => String.fromCharCode(parseInt(code, 16)))
            .replace(/\\[\w]+\s?/g, "");
    }

    // Collapsable section
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.textContent = t('uploadToggleShow');
    toggleBtn.style.margin = '6px 0 10px 0';
    toggleBtn.style.display = 'block';
    toggleBtn.style.backgroundColor = 'var(--chapter-tool-bg)';
    toggleBtn.style.color = 'var(--chapter-tool-text)';
    toggleBtn.style.border = '1px solid var(--border-secondary)';
    toggleBtn.style.borderRadius = '4px';
    toggleBtn.style.cursor = 'pointer';
    let sectionVisible = false;
    uploadSection.style.display = 'none';
    toggleBtn.addEventListener('click', () => {
        sectionVisible = !sectionVisible;
        uploadSection.style.display = sectionVisible ? 'block' : 'none';
        toggleBtn.textContent = sectionVisible ? t('uploadToggleHide') : t('uploadToggleShow');
    });

    container.appendChild(toggleBtn);
    container.appendChild(uploadSection);

    return container;
}