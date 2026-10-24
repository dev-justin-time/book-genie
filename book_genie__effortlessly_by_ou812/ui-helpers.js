import { formatChapterContent } from './format-chapter.js'; // Ensure formatChapterContent is imported if used internally

/**
 * Sets up the collapse/expand functionality for a chapter element.
 * @param {HTMLElement} chapterElement - The main container div for the chapter.
 * @param {HTMLInputElement} collapseCheckbox - The hidden checkbox controlling the state.
 * @param {HTMLLabelElement} collapseLabel - The visible label acting as the button.
 */
export function setupChapterCollapse(chapterElement, collapseCheckbox, collapseLabel) {
    // Initial text setting is handled in updateCollapseState

    function updateCollapseState(event) {
        const isCollapsed = collapseCheckbox.checked;
        chapterElement.classList.toggle('collapsed', isCollapsed);

        // Update label text based on state
        if (isCollapsed) {
            // Use CSS :before pseudo-element to show title, clear direct text
            collapseLabel.textContent = '';
        } else {
            collapseLabel.textContent = 'Collapse Chapter';
        }


        // Use requestAnimationFrame to ensure DOM updates are processed before scrolling
        requestAnimationFrame(() => {
            // Only scroll if the event was triggered by a user click on the label *and* the chapter was just collapsed
            if (event && event.type === 'click' && event.target === collapseLabel && isCollapsed) {
                // Find the next chapter element
                let nextChapterElement = chapterElement.nextElementSibling;
                while (nextChapterElement && !nextChapterElement.classList.contains('chapter')) {
                    nextChapterElement = nextChapterElement.nextElementSibling;
                }

                if (nextChapterElement) {
                    // Scroll to the start of the next chapter
                    nextChapterElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    // If it's the last chapter, try scrolling to the next major section
                    const nextSection = document.getElementById('below-footer-zone') || document.querySelector('footer');
                    if (nextSection) {
                        nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                         // Fallback: scroll to the label itself if no next section found
                        collapseLabel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
            }
            // No explicit scroll logic needed for expand or programmatic changes for now
        });
    }

    // Use 'click' on the label to detect user interaction for scrolling and state update
    collapseLabel.addEventListener('click', updateCollapseState);

    // Listen to 'change' on checkbox for programmatic changes (like loading), pass a null event
    // This ensures the state updates visually and the label text updates without triggering the scroll logic
    collapseCheckbox.addEventListener('change', () => updateCollapseState(null));

    // Initialize state based on checkbox (might be pre-checked if loaded)
    // Call directly without event check for initial setup
    updateCollapseState(null); // Call this to set initial label text and class

}

/**
 * Adds a language option to the select dropdown.
 * @param {HTMLSelectElement} languageSelect - The language select element.
 * @param {string} code - The language code (value).
 * @param {string} name - The language name (text).
 */
export function addLanguageOption(languageSelect, code, name) {
    const customOption = languageSelect.querySelector('option[value="custom"]');
    // Check if option already exists
    if (languageSelect.querySelector(`option[value="${code}"]`)) {
        return; // Don't add duplicates
    }
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    languageSelect.insertBefore(option, customOption);
}

/**
 * Saves a custom language to localStorage.
 * @param {string} code - The language code.
 * @param {string} name - The language name.
 */
export function saveCustomLanguage(code, name) {
    let customLanguages = JSON.parse(localStorage.getItem('customLanguages') || '[]');
    if (!customLanguages.some(lang => lang.code === code)) {
        customLanguages.push({ code: code, name: name });
        localStorage.setItem('customLanguages', JSON.stringify(customLanguages));
    }
}

/**
 * Adds a custom genre option to the genre select dropdown.
 * @param {HTMLSelectElement} genreSelect - The genre select element.
 * @param {string} genreName - The name of the custom genre.
 */
export function addCustomGenreOption(genreSelect, genreName) {
    if (!genreSelect) return;
    const customOption = genreSelect.querySelector('option[value="_custom_genre"]');
    // Check if option already exists (case-insensitive value check)
    const genreValue = genreName; // Use the name as the value for custom genres
    if (Array.from(genreSelect.options).some(opt => opt.value.toLowerCase() === genreValue.toLowerCase())) {
        return; // Don't add duplicates
    }
    const option = document.createElement('option');
    option.value = genreValue;
    option.textContent = genreName;
    // Insert before the "Own Genre..." option
    if (customOption) {
        genreSelect.insertBefore(option, customOption);
    } else {
        genreSelect.appendChild(option); // Fallback if "Own Genre..." isn't found
    }
}

/**
 * Saves a custom genre to localStorage.
 * @param {string} genreName - The name of the custom genre.
 */
export function saveCustomGenre(genreName) {
    let customGenres = JSON.parse(localStorage.getItem('customGenres') || '[]');
    // Check if genre already exists (case-insensitive check)
    if (!customGenres.some(g => g.toLowerCase() === genreName.toLowerCase())) {
        customGenres.push(genreName);
        localStorage.setItem('customGenres', JSON.stringify(customGenres));
    }
}

/**
 * Updates the chapter size slider's sublabel based on its value.
 * @param {HTMLInputElement} slider - The chapter size slider input element.
 * @param {HTMLElement} sublabelElement - The element displaying the sublabel text.
 */
export function updateChapterSizeSublabel(slider, sublabelElement) {
    const value = parseInt(slider.value);
    let sublabel = '';

    switch (value) {
        case 1: sublabel = 'Tiny (~250 words)'; break;
        case 2: sublabel = 'Small (~500 words)'; break;
        case 3: sublabel = 'Default (~1000 words)'; break;
        case 4: sublabel = 'Large (~1500 words)'; break;
        case 5: sublabel = 'Huge (~2000 words)'; break;
        case 6: sublabel = 'Massive (~4000 words)'; break;
        case 7: sublabel = 'Epic (~6000 words)'; break;
        case 8: sublabel = 'Colossal (~8000 words)'; break;
        default: sublabel = 'Default (~1000 words)'; break;
    }
    if (sublabelElement) { // Check if element exists before setting textContent
        sublabelElement.textContent = sublabel;
    } else {
        console.warn("Sublabel element not found for chapter size slider.");
    }
}

/**
 * Creates and attaches the "Analyze & Improve" icon button for the main prompt textfield.
 * On click, opens a popup that analyzes the current prompt, AI-enhances it, and shows improved alternatives.
 * @param {HTMLTextAreaElement} inputTextArea - The main book idea/topic textarea.
 * @param {HTMLElement} aiCommandConsole - The AI command console element for status logs.
 * @param {object} state - Global state object for command history, etc.
 * @param {function} logToAIConsole - Logging function.
 * @param {object} settings - Current generation settings.
 */
export function attachPromptAnalysisIcon(inputTextArea, aiCommandConsole, state, logToAIConsole, settings) {
    // Only attach if not already present
    if (inputTextArea.parentElement && inputTextArea.parentElement.querySelector('.input-analyze-btn')) return;

    // Ensure parent is relative for pos
    const parent = inputTextArea.parentElement;
    if (parent && getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
    }

    // Create icon button ("🧠" or magnifier/lightbulb)
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'input-analyze-btn';
    btn.title = 'Analyze & Improve Book Prompt';
    btn.setAttribute('aria-label', 'Analyze & Improve Book Prompt');
    btn.innerHTML = `<span style="font-size:17px;pointer-events:none;">🧠</span>`; // Tunable: Could use actual SVG or lightbulb.

    // Style: small circle inside/right-aligned in box, z-index over border
    btn.style.position = 'absolute';
    btn.style.right = '12px';
    btn.style.top = '11px';
    btn.style.background = 'rgba(255,255,255,0.97)';
    btn.style.border = '1px solid #bbb';
    btn.style.borderRadius = '50%';
    btn.style.width = '28px';
    btn.style.height = '28px';
    btn.style.display = 'flex';
    btn.style.justifyContent = 'center';
    btn.style.alignItems = 'center';
    btn.style.fontSize = '17px';
    btn.style.zIndex = 30;
    btn.style.padding = '0';
    btn.style.margin = '0';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.07)';
    btn.style.transition = 'background 0.15s';

    btn.addEventListener('mouseenter', () => {
        btn.style.background = '#eef4ff';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.background = 'rgba(255,255,255,0.97)';
    });

    btn.addEventListener('click', () => {
        openPromptAnalysisPopup(inputTextArea, aiCommandConsole, state, logToAIConsole, settings);
    });

    // Append the button directly into textarea's parent (assumed to be .prompt-textarea-container)
    parent.appendChild(btn);
}

/**
 * Opens the popup to analyze and improve the prompt.
 * @param {HTMLTextAreaElement} inputTextArea
 * @param {HTMLElement} aiCommandConsole
 * @param {object} state
 * @param {function} logToAIConsole
 * @param {object} settings - Current settings (genre, style, etc.)
 */
function openPromptAnalysisPopup(inputTextArea, aiCommandConsole, state, logToAIConsole, settings) {
    if (document.querySelector('.prompt-analyze-popup')) return;

    const popup = document.createElement('div');
    popup.className = 'prompt-analyze-popup';
    popup.style.position = 'fixed';
    popup.style.top = 0;
    popup.style.left = 0;
    popup.style.width = '100vw';
    popup.style.height = '100vh';
    popup.style.background = 'rgba(36,39,51,0.49)';
    popup.style.display = 'flex';
    popup.style.justifyContent = 'center';
    popup.style.alignItems = 'center';
    popup.style.zIndex = 6000;

    popup.innerHTML = `
        <div class="prompt-analyze-content" style="max-width:570px;width:97vw;padding:28px 28px 18px 28px;background:white;border-radius:11px;box-shadow:0 7px 40px rgba(0,0,0,0.19);position:relative;">
            <button class="prompt-analyze-close" style="position:absolute;top:12px;right:14px;font-size:22px;background:none;border:none;color:#636363;cursor:pointer;">&times;</button>
            <h3 style="margin-top:0;">Prompt Analysis & AI Improvement</h3>
            <p style="font-size:1.01em;color:#444;margin-bottom:12px;">
                Your current input: <span style="font-style:italic;" id="analyze-current-input"></span>
            </p>
            <div id="analyze-status" style="margin-bottom:8px;color:#888;font-size:0.97em;">
                <span style="display:none;" id="analyze-loading"><span class="loading-spinner" style="width:16px;height:16px;border:2px solid #ccc;border-top-color:#5c6bc0;border-radius:50%;display:inline-block;vertical-align:middle;animation:spin 1s linear infinite;margin-right:4px;"></span> Running AI analysis...</span>
            </div>
            <div id="analyze-results" style="margin-bottom:18px;"></div>
            <div id="improved-prompts"></div>
            <div style="margin-top:20px;display:flex;gap:12px;">
                <button id="apply-improvement-btn" style="display:none;padding:10px 16px;font-weight:bold;background:#5c6bc0;color:white;border-radius:6px;border:none;font-size:1em;cursor:pointer;">Apply This Prompt</button>
                <button class="prompt-analyze-close" style="padding:10px 16px;background:#858585;color:white;border-radius:6px;border:none;font-size:1em;cursor:pointer;">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    // Focus and close logic
    const closeBtns = popup.querySelectorAll('.prompt-analyze-close');
    closeBtns.forEach(btn => btn.onclick = () => popup.remove());
    popup.addEventListener('click', (e) => {
        if (e.target === popup) popup.remove();
    });
    document.addEventListener('keydown', function escAnalyze(event) {
        if (event.key === 'Escape') {
            popup.remove();
            document.removeEventListener('keydown', escAnalyze);
        }
    });

    // Set input text
    const currentPrompt = inputTextArea.value.trim();
    popup.querySelector('#analyze-current-input').textContent = currentPrompt ? `"${currentPrompt}"` : '(empty)';
    const status = popup.querySelector('#analyze-status');
    const resultsDiv = popup.querySelector('#analyze-results');
    const improvedPromptsDiv = popup.querySelector('#improved-prompts');
    const loading = popup.querySelector('#analyze-loading');
    const applyBtn = popup.querySelector('#apply-improvement-btn');

    // Reset previous state
    resultsDiv.textContent = '';
    improvedPromptsDiv.innerHTML = '';
    applyBtn.style.display = 'none';

    if (!currentPrompt) {
        resultsDiv.innerHTML = `<span style="color:#a33;font-size:1em;">Enter a prompt in the main text field first to analyze.</span>`;
        return;
    }

    // Show loading
    loading.style.display = 'inline-block';
    status.textContent = '';

    // --- Main AI call: Analyze, elevate, produce alternatives (with explanations) ---
    (async () => {
        try {
            // Compose a prompt including context and actual settings for improvement
            let settingsContext = '';
            if (settings && typeof settings === 'object') {
                if (settings.genre && settings.genre !== 'Auto Detect') settingsContext += `Genre: ${settings.genre}. `;
                if (settings.style && settings.style !== 'Chosen by AI') settingsContext += `Style: ${settings.style}. `;
                if (settings.chapterCount) settingsContext += `Chapters: ${settings.chapterCount}. `;
            }
            const aiPrompt = `
You are an expert writing assistant specialized in book idea refinement.
Analyze the user's prompt below, identify weaknesses, missing details, or ambiguity, and suggest specific ways to make it a better book prompt. 
Consider the book context and current generation settings: ${settingsContext.trim()}

Provide:
1. A brief critique of the original prompt (1-2 sentences).
2. 3 improved, elevated, or more specific starter prompts, with short explanations of what they change or why they're better for book writing.
Each improved version should be ready to use for an AI-powered book generator and highlight at least one key upgrade (scope, clarity, creativity, narrative structure, etc).

Respond with JSON only, using this schema:
{
  "analysis": string, // Critique/commentary
  "improvements": [
    {"prompt": string, "explanation": string},
    ...
  ]
}
`;

            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: aiPrompt,
                    },
                    {
                        role: "user",
                        content: `User's Prompt: "${currentPrompt}"`,
                    },
                ],
                json: true
            });

            loading.style.display = 'none';

            // Parse and display results
            let result;
            try {
                result = JSON.parse(completion.content);
            } catch (e) {
                throw new Error("Failed to parse AI response.");
            }
            if (!result || typeof result !== 'object') throw new Error("No analysis result.");

            resultsDiv.innerHTML = `<div style="margin-bottom:10px;color:#395">
                <strong>Analysis: </strong> ${escapeHtml(result.analysis)}
            </div>`;

            if (Array.isArray(result.improvements)) {
                // List the improvements, each with apply option
                improvedPromptsDiv.innerHTML = result.improvements.map((imp, idx) => `
                    <div class="improvement" style="border:1px solid #dadada;border-radius:6px;padding:10px 11px 7px 11px;margin-bottom:13px;display:flex;flex-direction:column;gap:7px;background:#f7fbfa;">
                        <div style="font-size:1.07em;font-weight:500;"><span style="color:#3e6ae1">✨ Suggestion ${idx+1}:</span> <span class="improved-version-text">${escapeHtml(imp.prompt || '')}</span></div>
                        <div style="color:#868686;font-size:0.95em;">${escapeHtml(imp.explanation || '')}</div>
                        <button class="apply-improvement-internal" style="align-self:flex-end;margin-top:2px;padding:5px 10px;background:#5c6bc0;color:white;border-radius:6px;border:none;font-size:0.99em;cursor:pointer;" data-idx="${idx}">
                            Use This
                        </button>
                    </div>
                `).join('');

                // Attach click handler to all buttons
                improvedPromptsDiv.querySelectorAll('.apply-improvement-internal').forEach(btn => {
                    btn.onclick = (e) => {
                        e.preventDefault();
                        const i = parseInt(btn.dataset.idx, 10);
                        if (isNaN(i) || !result.improvements[i]) return;
                        inputTextArea.value = result.improvements[i].prompt;
                        inputTextArea.focus();
                        if (logToAIConsole) logToAIConsole(state.commandHistory, aiCommandConsole, `Applied improved prompt version #${i+1}`);
                        popup.remove();
                    };
                });
            }

        } catch (err) {
            loading.style.display = 'none';
            status.textContent = '';
            resultsDiv.innerHTML = `<span style="color:#b23;font-size:1em;">Error analyzing prompt: ${err.message || err}</span>`;
        }
    })();

    // Helper
    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, function(m) {
            switch(m) {
                case "&": return "&amp;";
                case "<": return "&lt;";
                case ">": return "&gt;";
                case '"': return "&quot;";
                case "'": return "&#39;";
                default: return m;
            }
        });
    }
}