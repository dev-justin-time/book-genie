import { openAiPromptPopup } from './ai-prompt-popup.js';
import { formatChapterContent, openFormatPopup } from './format-chapter.js';
import { replaceTitleWithInput, reAttachImageControls } from './event-listeners.js'; 
import { openImagePopup } from './image-popup.js'; 

/**
 * Fetches the current generation settings from the UI.
 * Marked as async because it uses dynamic import with await.
 * @returns {Promise<object>} A promise resolving to an object containing the full settings.
 */
async function getCurrentSettings() {
    try {
        const { getSettings } = await import('./settings-manager.js'); // Dynamic import
        if (typeof getSettings === 'function') {
            return getSettings(); // Use function from settings manager
        } else {
            return { genre: 'Auto Detect', style: 'Chosen by AI', chapterSize: '4', chapterCount: 28 };
        }
    } catch (error) {
        console.error('Error importing settings manager or getting settings:', error);
        return { genre: 'Auto Detect', style: 'Chosen by AI', chapterSize: '4', chapterCount: 28 }; // Fallback defaults
    }
}

/**
 * Selects the best TTS engine based on available APIs and settings
 * @returns {string} The selected engine ID ('browser', 'elevenlabs', 'openai', 'microsoft', 'orpheus')
 */
function selectBestTTSEngine() {
    // User preference
    const userPreference = localStorage.getItem('selectedTTSEngine');
    if (userPreference && userPreference !== 'auto') return userPreference;
    // Try ElevenLabs (now always available via websim)
    return 'elevenlabs';
}

/**
 * Handles actions triggered by tool menu buttons.
 * @param {string} action - The action to execute.
 * @param {string} userInput - Book idea/topic.
 * @param {string} chapterTitle - Current chapter title (not numbered).
 * @param {HTMLElement} chapterElement - .chapter main element.
 * @param {string} language - Language code.
 * @param {number|string} chapterNumber - Chapter number.
 * @param {object} settings - Generation settings.
 * @param {object} state - Global state { generating, commandHistory, bookmarkedChapterId, currentlyReadingChapter }.
 * @param {object} dependencies - Utility fns and helpers (openImagePopup, logToAIConsole etc).
 * @param {object} uiElements - All key UI elements.
 */
export async function handleChapterToolAction(
    action, userInput, chapterTitle, chapterElement, language, chapterNumber, settings, state,
    dependencies,
    uiElements
) {
    // Safely handle potentially undefined arguments
    if (!action || !chapterElement) {
        console.error("Missing required parameters in handleChapterToolAction");
        return;
    }
    
    // Safely access elements with null checks
    const contentDiv = chapterElement.querySelector('.chapter-content');
    if (!contentDiv) {
        console.error("Chapter content element not found");
        return;
    }
    
    const chapterId = chapterElement.id || `chapter-${chapterNumber}`;
    const chapterToolsContainer = chapterElement.querySelector('.chapter-tools');
    
    // Safely access dependencies with null checks
    const logToAIConsole = dependencies?.logToAIConsole || ((a, b, c) => console.log(c));
    const aiCommandConsole = uiElements?.aiCommandConsole;
    const gotoBookmarkButton = uiElements?.gotoBookmarkButton;
    const chaptersContainer = uiElements?.chaptersContainer;

    // Safely initialize state variables if undefined
    state = state || {};
    settings = settings || {};
    
    // Helper to update bookmark UI with null-safety
    function updateBookmarkUI(button, container, bookmarkedId) {
        if (!button || !container) return;
        
        if (button) {
            button.style.display = bookmarkedId ? 'inline-block' : 'none';
            button.disabled = !bookmarkedId;
        }
        
        // Remove existing bookmarks with null-safety
        const prev = container.querySelector('.bookmarked-toc-item');
        if (prev) prev.classList.remove('bookmarked-toc-item');
        
        if (bookmarkedId) {
            const tocBox = container.querySelector(`.chapter-box[href="#${bookmarkedId}"]`);
            if (tocBox) tocBox.classList.add('bookmarked-toc-item');
            else console.warn(`TOC box for ${bookmarkedId} not found`);
        }
    }

    // --- Bookmark ---
    if (action === 'bookmark') {
        const previouslyBookmarked = document.querySelector('.bookmarked-chapter');
        if (previouslyBookmarked) previouslyBookmarked.classList.remove('bookmarked-chapter');
        if (chapterId === state.bookmarkedChapterId) {
            state.bookmarkedChapterId = null;
            updateBookmarkUI(gotoBookmarkButton, chaptersContainer, null);
            logToAIConsole(state.commandHistory, aiCommandConsole, `Bookmark removed from Chapter ${chapterNumber}.`);
            return;
        }
        chapterElement.classList.add('bookmarked-chapter');
        state.bookmarkedChapterId = chapterId;
        updateBookmarkUI(gotoBookmarkButton, chaptersContainer, state.bookmarkedChapterId);
        logToAIConsole(state.commandHistory, aiCommandConsole, `Bookmark set for Chapter ${chapterNumber} (${chapterId}).`);
        if (gotoBookmarkButton && gotoBookmarkButton.style.display !== 'none') gotoBookmarkButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    // --- Jump to TOC/top ---
    if (action === 'toc') {
        const toc = document.getElementById('table-of-contents');
        if (toc) toc.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    // --- Format text (now opens paragraph editor popup) ---
    if (action === 'format') {
        openFormatPopup(userInput, chapterTitle, chapterElement, language, chapterNumber, settings, state, dependencies, uiElements);
        logToAIConsole(state.commandHistory, aiCommandConsole, `Opened paragraph editor for Chapter ${chapterNumber}.`);
        return;
    }

    // --- Edit Chapter (in-place) ---
    if (action === 'edit') {
        if (contentDiv.isContentEditable) {
            logToAIConsole(state.commandHistory, aiCommandConsole, `Chapter ${chapterNumber} is already being edited.`);
            return;
        }
        logToAIConsole(state.commandHistory, aiCommandConsole, `Editing Chapter ${chapterNumber}...`);
        const originalHTML = contentDiv.innerHTML;
        const h2Element = contentDiv.querySelector('h2');
        const wasH2Editable = h2Element && h2Element.style.cursor === 'pointer';

        contentDiv.contentEditable = true;
        contentDiv.classList.add('editing');
        contentDiv.querySelectorAll('.image-controls').forEach(controls => {
            controls.contentEditable = false;
        });
        if (h2Element) {
            h2Element.contentEditable = false;
            h2Element.style.cursor = 'default';
            h2Element.title = '';
        }
        if (chapterToolsContainer) chapterToolsContainer.style.display = 'none';

        const editControls = document.createElement('div');
        editControls.classList.add('chapter-edit-controls');
        editControls.innerHTML = `
            <button class="chapter-save-button">Save Changes</button>
            <button class="chapter-cancel-button">Cancel</button>
        `;
        chapterElement.appendChild(editControls);

        const saveButton = editControls.querySelector('.chapter-save-button');
        const cancelButton = editControls.querySelector('.chapter-cancel-button');

        saveButton.addEventListener('click', () => {
            contentDiv.contentEditable = false;
            contentDiv.classList.remove('editing');
            editControls.remove();
            if (chapterToolsContainer) chapterToolsContainer.style.display = 'flex';
            const currentH2 = contentDiv.querySelector('h2');
            if (currentH2 && wasH2Editable) {
                currentH2.style.cursor = 'pointer';
                currentH2.title = 'Click to edit title';
                currentH2.replaceWith(currentH2.cloneNode(true));
                const newH2 = contentDiv.querySelector('h2');
                if(newH2) newH2.addEventListener('click', () => dependencies.replaceTitleWithInput(newH2, chapterNumber, chapterId, uiElements), { once: true });
            }
            contentDiv.querySelectorAll('.image-container').forEach(container => dependencies.reAttachImageControls(container));
            logToAIConsole(state.commandHistory, aiCommandConsole, `Chapter ${chapterNumber} edits saved.`);
        }, { once: true });

        cancelButton.addEventListener('click', () => {
            contentDiv.innerHTML = originalHTML;
            contentDiv.contentEditable = false;
            contentDiv.classList.remove('editing');
            editControls.remove();
            if (chapterToolsContainer) chapterToolsContainer.style.display = 'flex';
            const restoredH2 = contentDiv.querySelector('h2');
            if (restoredH2 && wasH2Editable) {
                restoredH2.style.cursor = 'pointer';
                restoredH2.title = 'Click to edit title';
                restoredH2.replaceWith(restoredH2.cloneNode(true));
                const newH2 = contentDiv.querySelector('h2');
                if (newH2) newH2.addEventListener('click', () => dependencies.replaceTitleWithInput(newH2, chapterNumber, chapterId, uiElements), { once: true });
            }
            contentDiv.querySelectorAll('.image-container').forEach(container => dependencies.reAttachImageControls(container));
            logToAIConsole(state.commandHistory, aiCommandConsole, `Chapter ${chapterNumber} edits cancelled.`);
        }, { once: true });

        contentDiv.focus();
        return;
    }

    // --- Generate Images popup (Immerse/Full Option-Rich) ---
    if (action === 'image') {
        if (state.generating) {
            alert("Wait for current generation to finish before adding images.");
            logToAIConsole(state.commandHistory, aiCommandConsole, `Image popup for Chapter ${chapterNumber} skipped (busy).`);
            return;
        }
        // Fetch latest settings for more context if needed
        let imageSettings = settings;
        try {
            imageSettings = await getCurrentSettings();
        } catch (e) {}

        // Open the full-featured, option-rich popup window for image generation/insertion
        openImagePopup(
            userInput,
            chapterTitle,
            chapterElement,
            imageSettings,
            state,
            dependencies,
            uiElements
        );
        logToAIConsole(state.commandHistory, aiCommandConsole, `Opened Image Generator popup for Chapter ${chapterNumber}.`);
        return;
    }

    // --- AI: AI Command popup for this chapter ---
    if (action === 'ai') {
        let currentSettings = settings;
        try {
            currentSettings = await getCurrentSettings();
        } catch (e) {}
        openAiPromptPopup(userInput, chapterTitle, chapterElement, language, chapterNumber, currentSettings, state, dependencies, uiElements);
        return;
    }

    // --- NEW: Smart Reload (load only this chapter from selected JSON) ---
    if (action === 'reload') {
        // Show file picker for JSON file selection
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json,application/json';

        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                // Read and parse JSON
                const text = await file.text();
                const data = JSON.parse(text);

                if (!data.chapters || !Array.isArray(data.chapters)) {
                    alert('Invalid book file (no chapters found).');
                    return;
                }
                // Find the right chapter using chapter number or title "fuzzy match"
                const ourChapterNum = Number(chapterId.replace(/chapter-/, ''));
                let chapterData = null;
                // Check explicit index (if saving order is always preserved)
                if (data.chapters[ourChapterNum - 1]) {
                    chapterData = data.chapters[ourChapterNum - 1];
                }
                // If chapter titles might not align, try to match by title
                const mainH2 = contentDiv.querySelector('h2');
                let chapterTitleFromUI = mainH2 ? (mainH2.textContent || '').replace(/^\d+\.\s*/, '').trim() : '';
                if (!chapterData && chapterTitleFromUI) {
                    chapterData = data.chapters.find(
                        ch => (ch.title || '').trim().toLocaleLowerCase() === chapterTitleFromUI.toLocaleLowerCase()
                    );
                }
                if (!chapterData) {
                    alert(`This chapter not found in the uploaded JSON file.`);
                    return;
                }

                // --- Apply chapterData to UI ---
                // Replace chapter title, paragraphs, and images (if present)
                // Title
                if (chapterData.title) {
                    if (mainH2) {
                        mainH2.textContent = `${ourChapterNum}. ${chapterData.title}`;
                    }
                    // Update TOC box as well:
                    const tocBox = document.querySelector(`.chapter-box[href="#${chapterId}"]`);
                    if (tocBox) {
                        tocBox.textContent = `${ourChapterNum}. ${chapterData.title}`;
                    }
                    // Update collapse label dataset, if present
                    const collapseLabel = chapterElement.querySelector(`label[for="chapter-collapse-${ourChapterNum}"]`);
                    if (collapseLabel) {
                        collapseLabel.dataset.chapterTitle = `${ourChapterNum}. ${chapterData.title}`;
                    }
                }

                // Remove all content except title
                Array.from(contentDiv.childNodes).forEach(node => {
                    if (node !== mainH2) contentDiv.removeChild(node);
                });

                // Add paragraphs and images in new format
                if (Array.isArray(chapterData.content)) {
                    for (const item of chapterData.content) {
                        if (item.imageUrl) {
                            // Handle round images
                            const isRound = item.isRound || false;
                            // Use .image-popup.js "createImageContainer" if available
                            let container;
                            try {
                                const { createImageContainer } = await import('./image-popup.js');
                                container = createImageContainer(item.imageUrl, isRound, contentDiv);
                            } catch {
                                // fallback if import fails
                                const img = document.createElement('img');
                                img.src = item.imageUrl;
                                if (isRound) img.classList.add('round-cutout');
                                contentDiv.appendChild(img);
                                continue;
                            }
                            contentDiv.appendChild(container);
                        } else if (item.text !== null && item.text !== undefined) {
                            const p = document.createElement('p');
                            // Handle line breaks in content
                            String(item.text).split('\n').forEach((line, idx, arr) => {
                                p.appendChild(document.createTextNode(line));
                                if (idx < arr.length - 1) p.appendChild(document.createElement('br'));
                            });
                            if (p.textContent.trim()) {
                                contentDiv.appendChild(p);
                            }
                        }
                    }
                } else if (typeof chapterData.content === 'string') {
                    // Old format
                    chapterData.content.split(/\n\s*\n/).forEach(paragraph => {
                        if (paragraph.trim()) {
                            const p = document.createElement('p');
                            String(paragraph).split('\n').forEach((line, idx, arr) => {
                                p.appendChild(document.createTextNode(line));
                                if (idx < arr.length - 1) p.appendChild(document.createElement('br'));
                            });
                            contentDiv.appendChild(p);
                        }
                    });
                }
                // Formatting
                formatChapterContent(chapterElement);

                logToAIConsole(state.commandHistory, aiCommandConsole, `Reloaded content for Chapter ${ourChapterNum} from file.`);
                alert('Chapter reloaded from file.');

            } catch (err) {
                console.error('Error loading chapter from file:', err);
                alert('Failed to reload chapter: ' + (err.message || err));
            }
        });

        // Simulate 'click' to open file picker
        fileInput.click();
        return;
    }

    // --- Read aloud with TTS ---
    if (action === 'readAloud') {
        if (!('speechSynthesis' in window) && selectBestTTSEngine() === 'browser') {
            alert('Sorry, your browser does not support text-to-speech.');
            logToAIConsole(state.commandHistory, aiCommandConsole, `ReadAloud failed: Browser unsupported.`);
            const readAloudButton = chapterElement.querySelector('.chapter-tool-button[data-action="readAloud"]');
            if (readAloudButton) readAloudButton.disabled = true;
            return;
        }
        // --- PATCH: Refetch custom voice id and logic directly each time
        let selectedEngine = localStorage.getItem('selectedTTSEngine') || 'auto';
        if (selectedEngine === 'auto') {
            selectedEngine = selectBestTTSEngine();
            logToAIConsole(state.commandHistory, aiCommandConsole, `Auto-selected TTS engine: ${selectedEngine}`);
        }

        stopAllAudio();
        const readAloudButton = chapterElement.querySelector('.chapter-tool-button[data-action="readAloud"]');
        const wasReading = state.currentlyReadingChapter === chapterId;
        if (wasReading) {
            state.currentlyReadingChapter = null;
            if (readAloudButton) readAloudButton.innerHTML = '&#x1F50A;';
            clearTextHighlights();
            logToAIConsole(state.commandHistory, aiCommandConsole, `Speech stopped for Chapter ${chapterNumber}.`);
            return;
        }
        if (state.currentlyReadingChapter) {
            const oldButton = document.querySelector(`#${state.currentlyReadingChapter} .chapter-tool-button[data-action="readAloud"]`);
            if (oldButton) oldButton.innerHTML = '&#x1F50A;';
        }
        let textToRead = '';
        contentDiv.querySelectorAll('p').forEach(p => { textToRead += p.textContent + ' '; });
        if (textToRead.trim() === '') {
            alert('No text to read.');
            logToAIConsole(state.commandHistory, aiCommandConsole, `ReadAloud skipped: No text in Chapter ${chapterNumber}.`);
            return;
        }
        clearTextHighlights();
        if (readAloudButton) readAloudButton.innerHTML = '&#x23F9;&#xFE0F;';
        state.currentlyReadingChapter = chapterId;

        try {
            switch (selectedEngine) {
                case 'elevenlabs': {
                    // --- PATCH: always use current input or selection ---
                    let voiceId = '';
                    // Priority: If custom voice selected, grab the current input box live, else saved custom, else saved select
                    const customVoiceInputEl = document.getElementById('elevenlabs-custom-voice');
                    if (customVoiceInputEl && (customVoiceInputEl.offsetParent !== null || customVoiceInputEl.style.display === 'block')) {
                        if (customVoiceInputEl.value.trim()) {
                            voiceId = customVoiceInputEl.value.trim();
                            // Update discovered value in localStorage for consistency
                            localStorage.setItem('elevenlabsCustomVoiceId', voiceId);
                            localStorage.setItem('elevenlabsSelectedVoiceId', '__custom__');
                        }
                    }
                    if (!voiceId) {
                        // Fallback to saved values if popup not open
                        const savedSelectedVoice = localStorage.getItem('elevenlabsSelectedVoiceId');
                        const savedCustomVoice = localStorage.getItem('elevenlabsCustomVoiceId');
                        if (savedSelectedVoice === '__custom__' && savedCustomVoice) {
                            voiceId = savedCustomVoice.trim();
                        } else if (savedSelectedVoice && savedSelectedVoice !== '__custom__') {
                            voiceId = savedSelectedVoice;
                        } else if (savedCustomVoice) {
                            voiceId = savedCustomVoice.trim();
                        }
                    }
                    if (!voiceId) voiceId = "pNInz6obpgDQGcFmaJgB";
                    // Now call elevenlabs TTS with this
                    await elevenLabsTTS_patch_custom_voice(textToRead, chapterElement, chapterId, chapterNumber, state, readAloudButton, logToAIConsole, aiCommandConsole, state.commandHistory, voiceId);
                    break;
                }
                case 'orpheus':
                    await orpheusTTS(textToRead, chapterElement, chapterId, chapterNumber, state, readAloudButton, logToAIConsole, aiCommandConsole, state.commandHistory);
                    break;
                case 'microsoft':
                    await microsoftTTS(textToRead, chapterElement, chapterId, chapterNumber, state, readAloudButton, logToAIConsole, aiCommandConsole, state.commandHistory);
                    break;
                case 'openai':
                    await openaiTTS(textToRead, chapterElement, chapterId, chapterNumber, state, readAloudButton, logToAIConsole, aiCommandConsole, state.commandHistory);
                    break;
                case 'browser':
                default:
                    await browserTTS(textToRead, chapterElement, chapterId, chapterNumber, language, state, readAloudButton, logToAIConsole, aiCommandConsole, state.commandHistory);
                    break;
            }
        } catch (error) {
            console.error(`TTS Engine Error:`, error);
            logToAIConsole(state.commandHistory, aiCommandConsole, `TTS (${selectedEngine}) error: ${error.message}`);
            alert(`TTS Error: ${error.message}`);
            state.currentlyReadingChapter = null;
            if (readAloudButton) readAloudButton.innerHTML = '&#x1F50A;';
            clearTextHighlights();
            // Browser fallback unchanged
            if (selectedEngine !== 'browser') {
                try {
                    logToAIConsole(state.commandHistory, aiCommandConsole, `Falling back to browser TTS...`);
                    await browserTTS(textToRead, chapterElement, chapterId, chapterNumber, language, state, readAloudButton, logToAIConsole, aiCommandConsole, state.commandHistory);
                } catch (fallbackError) {
                    logToAIConsole(state.commandHistory, aiCommandConsole, `Browser fallback failed: ${fallbackError.message}`);
                }
            }
        }
        return;
    }

    // --- Regenerate Chapter (tool menu button) ---
    if (action === 'regenerate') {
        if (state.generating) {
            alert("A generation process is already running. Please wait.");
            return;
        }
        state.generating = true;
        logToAIConsole(state.commandHistory, aiCommandConsole, `Regenerating Chapter ${chapterNumber}...`);
        const currentSettings = await getCurrentSettings();
        try {
            await dependencies.generateChapterContent(
                userInput,
                chapterTitle,
                chapterElement,
                language,
                chapterNumber,
                currentSettings.genre,
                currentSettings.style,
                currentSettings.chapterSize
            );
            logToAIConsole(state.commandHistory, aiCommandConsole, `Chapter ${chapterNumber} regenerated.`);
        } catch (error) {
            logToAIConsole(state.commandHistory, aiCommandConsole, `Error regenerating Chapter ${chapterNumber}: ${error.message}`);
            alert(`Error: ${error.message}`);
        } finally {
            state.generating = false;
        }
        return;
    }

    // --- NEW: Sources & Links Feature ---
    if (action === 'sources') {
        openSourcesLinksPopup(userInput, chapterTitle, chapterElement, language, chapterNumber, settings, state, dependencies, uiElements);
        return;
    }
}

// Helper Functions for TTS/audio
function stopAllAudio() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (window.orpheusTTSAudio) { window.orpheusTTSAudio.pause(); window.orpheusTTSAudio = null; }
    if (window.microsoftTTSAudio) { window.microsoftTTSAudio.pause(); window.microsoftTTSAudio = null; }
    if (window.openaiTTSAudio) { window.openaiTTSAudio.pause(); window.openaiTTSAudio = null; }
    if (window.elevenlabsTTS_Audio) { window.elevenlabsTTS_Audio.pause(); window.elevenlabsTTS_Audio = null; }
    clearTextHighlights();
}

function clearTextHighlights() {
    document.querySelectorAll('.tts-active-paragraph').forEach(p => p.classList.remove('tts-active-paragraph'));
    document.querySelectorAll('.tts-active-word').forEach(span => {
        const text = span.textContent;
        const textNode = document.createTextNode(text);
        span.parentNode.replaceChild(textNode, span);
    });
}

// Browser TTS implementation 
async function browserTTS(text, chapterElement, chapterId, chapterNumber, language, state, readAloudButton, logToAIConsole, aiCommandConsole, commandHistory) {
    const paragraphs = chapterElement.querySelectorAll('.chapter-content p');
    const selectedVoiceURI = localStorage.getItem('selectedTTSVoiceURI');
    let voices = speechSynthesis.getVoices();
    const utterances = [];
    paragraphs.forEach((paragraph, index) => {
        const paragraphText = paragraph.textContent;
        if (!paragraphText.trim()) return;
        const utterance = new SpeechSynthesisUtterance(paragraphText);
        if (selectedVoiceURI && selectedVoiceURI !== 'default') {
            const selectedVoice = voices.find(voice => voice.voiceURI === selectedVoiceURI);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
                utterance.lang = selectedVoice.lang;
            } else {
                utterance.lang = language;
            }
        } else {
            utterance.lang = language;
        }
        utterance.volume = parseFloat(localStorage.getItem('tts-volume') || '1');
        utterance.rate = parseFloat(localStorage.getItem('tts-rate') || '1');
        utterance.pitch = parseFloat(localStorage.getItem('tts-pitch') || '1');
        utterance.paragraphElement = paragraph;
        utterance.onboundary = function(event) {
            if (event.name === 'word') {
                paragraph.querySelectorAll('.tts-active-word').forEach(span => {
                    const text = span.textContent;
                    const textNode = document.createTextNode(text);
                    span.parentNode.replaceChild(textNode, span);
                });
                try {
                    const text = paragraph.textContent;
                    const word = text.substring(event.charIndex, event.charIndex + event.charLength);
                    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT, null, false);
                    let currentNode, charCount = 0, found = false;
                    while ((currentNode = walker.nextNode()) && !found) {
                        const nodeText = currentNode.nodeValue;
                        if (charCount + nodeText.length > event.charIndex) {
                            const nodeIndex = event.charIndex - charCount;
                            if (nodeIndex >= 0 && nodeIndex < nodeText.length) {
                                const range = document.createRange();
                                range.setStart(currentNode, nodeIndex);
                                range.setEnd(currentNode, nodeIndex + event.charLength);
                                const span = document.createElement('span');
                                span.className = 'tts-active-word';
                                span.style.textDecoration = 'underline';
                                span.style.fontWeight = 'bold';
                                span.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
                                range.surroundContents(span);
                                found = true;
                            }
                        }
                        charCount += nodeText.length;
                    }
                } catch (e) {}
            }
        };
        utterance.onstart = function() {
            clearTextHighlights();
            paragraph.classList.add('tts-active-paragraph');
            paragraph.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
            paragraph.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        utterance.onend = function() {
            if (index < utterances.length - 1 && state.currentlyReadingChapter === chapterId) {
                setTimeout(() => {
                    if (state.currentlyReadingChapter === chapterId) {
                        speechSynthesis.speak(utterances[index + 1]);
                    }
                }, 300);
            } else if (index === utterances.length - 1) {
                if (state.currentlyReadingChapter === chapterId) {
                    state.currentlyReadingChapter = null;
                    if (readAloudButton) readAloudButton.innerHTML = '&#x1F50A;';
                    clearTextHighlights();
                    logToAIConsole(commandHistory, aiCommandConsole, `Finished reading Chapter ${chapterNumber}.`);
                }
            }
        };
        utterances.push(utterance);
    });
    const handleError = (error) => {
        if (state.currentlyReadingChapter === chapterId) {
            state.currentlyReadingChapter = null;
            if (readAloudButton) readAloudButton.innerHTML = '&#x1F50A;';
            clearTextHighlights();
        }
    };
    try {
        if (utterances.length > 0) {
            speechSynthesis.speak(utterances[0]);
            logToAIConsole(commandHistory, aiCommandConsole, `Reading Chapter ${chapterNumber} with browser TTS...`);
        } else throw new Error("No text to read")
    } catch (error) {
        handleError(error);
        throw error;
    }
}

// Orpheus TTS (audio via API, highlight first paragraph only for now)
async function orpheusTTS(text, chapterElement, chapterId, chapterNumber, state, readAloudButton, logToAIConsole, aiCommandConsole, commandHistory) {
    const apiKey = localStorage.getItem('orpheusApiKey');
    const host = localStorage.getItem('orpheusHost');
    const selectedModel = localStorage.getItem('orpheusModel') || 'narrator';
    if (!host) throw new Error("Orpheus API endpoint not configured.");
    if (!apiKey) throw new Error("Orpheus API key not provided.");
    logToAIConsole(commandHistory, aiCommandConsole, `Requesting Orpheus TTS for Chapter ${chapterNumber}...`);
    const paragraphs = chapterElement.querySelectorAll('.chapter-content p');
    if (paragraphs.length > 0) {
        paragraphs[0].classList.add('tts-active-paragraph');
        paragraphs[0].style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
        paragraphs[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const response = await fetch(`${host}/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ text, model: selectedModel, output_format: 'mp3' })
    });
    if (!response.ok) {
        let errorText = '';
        try { errorText = (await response.json()).error || response.statusText; }
        catch { errorText = response.statusText; }
        throw new Error(`Orpheus API Error (${response.status}): ${errorText}`);
    }
    const data = await response.json();
    if (!data.audio_url) throw new Error("No audio URL from Orpheus API");
    window.orpheusTTSAudio = new Audio(data.audio_url);
    window.orpheusTTSAudio.onended = () => {
        clearTextHighlights();
        if (state.currentlyReadingChapter === chapterId) {
            state.currentlyReadingChapter = null;
            if (readAloudButton) readAloudButton.innerHTML = '&#x1F50A;';
            logToAIConsole(commandHistory, aiCommandConsole, `Finished Orpheus TTS for Chapter ${chapterNumber}.`);
        }
    };
    window.orpheusTTSAudio.onerror = (e) => {
        clearTextHighlights();
        if (state.currentlyReadingChapter === chapterId) {
            state.currentlyReadingChapter = null;
            if (readAloudButton) readAloudButton.innerHTML = '&#x1F50A;';
        }
    };
    await window.orpheusTTSAudio.play();
}

// Microsoft Azure TTS
async function microsoftTTS(text, chapterElement, chapterId, chapterNumber, state, readAloudButton, logToAIConsole, aiCommandConsole, commandHistory) {
    const apiKey = localStorage.getItem('microsoftApiKey');
    const region = localStorage.getItem('microsoftRegion') || 'eastus';
    const voiceName = localStorage.getItem('microsoftVoice') || 'en-US-AriaNeural';
    if (!apiKey) throw new Error("Microsoft Azure API key not configured.");
    const paragraphs = chapterElement.querySelectorAll('.chapter-content p');
    if (paragraphs.length > 0) {
        paragraphs[0].classList.add('tts-active-paragraph');
        paragraphs[0].style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
        paragraphs[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const ssml = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
            <voice name="${voiceName}">
                ${text}
            </voice>
        </speak>`;
    logToAIConsole(commandHistory, aiCommandConsole, `Requesting Microsoft Azure TTS for Chapter ${chapterNumber}...`);
    const apiUrl = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
            'Ocp-Apim-Subscription-Key': apiKey
        },
        body: ssml
    });
    if (!response.ok) throw new Error(`Azure API Error (${response.status}): ${response.statusText}`);
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    window.microsoftTTSAudio = new Audio(audioUrl);
    window.microsoftTTSAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        clearTextHighlights();
        if (state.currentlyReadingChapter === chapterId) {
            state.currentlyReadingChapter = null;
            if (readAloudButton) readAloudButton.innerHTML = '&#x1F50A;';
            logToAIConsole(commandHistory, aiCommandConsole, `Finished Microsoft TTS for Chapter ${chapterNumber}.`);
        }
    };
    window.microsoftTTSAudio.onerror = (e) => {
        URL.revokeObjectURL(audioUrl);
        clearTextHighlights();
        if (state.currentlyReadingChapter === chapterId) {
            state.currentlyReadingChapter = null;
            if (readAloudButton) readAloudButton.innerHTML = '&#x1F50A;';
        }
    };
    await window.microsoftTTSAudio.play();
}

// OpenAI TTS
async function openaiTTS(text, chapterElement, chapterId, chapterNumber, state, readAloudButton, logToAIConsole, aiCommandConsole, commandHistory) {
    const apiKey = localStorage.getItem('openaiApiKey');
    const model = localStorage.getItem('openaiModel') || 'tts-1';
    const voice = localStorage.getItem('openaiVoice') || 'alloy';
    if (!apiKey) throw new Error("OpenAI API key not configured.");
    const paragraphs = chapterElement.querySelectorAll('.chapter-content p');
    if (paragraphs.length > 0) {
        paragraphs[0].classList.add('tts-active-paragraph');
        paragraphs[0].style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
        paragraphs[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    logToAIConsole(commandHistory, aiCommandConsole, `Requesting OpenAI TTS for Chapter ${chapterNumber}...`);
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, voice, input: text })
    });
    if (!response.ok) {
        let errorMessage = response.statusText;
        try { errorMessage = (await response.json()).error?.message || errorMessage; } catch {}
        throw new Error(`OpenAI API Error (${response.status}): ${errorMessage}`);
    }
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    window.openaiTTSAudio = new Audio(audioUrl);
    window.openaiTTSAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        clearTextHighlights();
        if (state.currentlyReadingChapter === chapterId) {
            state.currentlyReadingChapter = null;
            if (readAloudButton) readAloudButton.innerHTML = '&#x1F50A;';
            logToAIConsole(commandHistory, aiCommandConsole, `Finished OpenAI TTS for Chapter ${chapterNumber}.`);
        }
    };
    window.openaiTTSAudio.onerror = (e) => {
        URL.revokeObjectURL(audioUrl);
        clearTextHighlights();
        if (state.currentlyReadingChapter === chapterId) {
            state.currentlyReadingChapter = null;
            if (readAloudButton) readAloudButton.innerHTML = '&#x1F50A;';
        }
    };
    await window.openaiTTSAudio.play();
}

// --- ElevenLabs TTS Integration (Updated: ensure all paragraphs read sequentially, like browser TTS) ---
async function elevenLabsTTS_patch_custom_voice(text, chapterElement, chapterId, chapterNumber, state, readAloudButton, logToAIConsole, aiCommandConsole, commandHistory, voiceId) {
    // Defensive voiceId
    voiceId = (voiceId || "pNInz6obpgDQGcFmaJgB").trim();
    if (!voiceId) voiceId = "pNInz6obpgDQGcFmaJgB";

    // Target: play each paragraph's audio sequentially, as in browserTTS (handling long content, pausing/stopping allowed)
    const paragraphs = Array.from(chapterElement.querySelectorAll('.chapter-content p')).filter(p=>p.textContent.trim().length>0);
    if (paragraphs.length === 0) {
        alert("No text found for reading aloud.");
        logToAIConsole(commandHistory, aiCommandConsole, `No paragraphs found for Chapter ${chapterNumber}.`);
        if (readAloudButton) readAloudButton.innerHTML = '&#x1F50A;';
        state.currentlyReadingChapter = null;
        clearTextHighlights();
        return;
    }
    let stopped = false;
    // Expose a global for allowing stop function
    window.elevenlabsTTS_Audio = null;

    function handleStop() {
        stopped = true;
        if (window.elevenlabsTTS_Audio) {
            window.elevenlabsTTS_Audio.pause();
            window.elevenlabsTTS_Audio = null;
        }
        state.currentlyReadingChapter = null;
        if (readAloudButton) readAloudButton.innerHTML = '&#x1F50A;';
        clearTextHighlights();
    }

    // Patch: Allow global stop
    window._stopElevenLabsTTS = handleStop;

    // Listen for stop events globally (stop button or user interaction should trigger this)
    if (!window._stopButtonListenerSet) {
        window._stopButtonListenerSet = true;
        document.addEventListener('click', function(e) {
            if (e.target && e.target.id === 'tts-stop-button') handleStop();
        });
    }

    async function playParagraphsSequentially(idx) {
        if (stopped || state.currentlyReadingChapter !== chapterId) {
            handleStop();
            return;
        }
        if (idx >= paragraphs.length) {
            // All finished
            handleStop();
            logToAIConsole(commandHistory, aiCommandConsole, `Finished reading all paragraphs of Chapter ${chapterNumber}.`);
            return;
        }
        const paragraph = paragraphs[idx];
        clearTextHighlights();
        paragraph.classList.add('tts-active-paragraph');
        paragraph.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
        paragraph.scrollIntoView({ behavior: 'smooth', block: 'center' });

        try {
            const currentText = paragraph.textContent.trim();
            if (!currentText) {
                playParagraphsSequentially(idx + 1);
                return;
            }
            logToAIConsole(commandHistory, aiCommandConsole, `Reading paragraph ${idx + 1} of Chapter ${chapterNumber}`);
            // Patch: always use the selected or input voiceId
            const result = await websim.textToSpeech({
                text: currentText,
                voice: voiceId
            });
            if (!result.url) throw new Error("No audio url returned from websim ElevenLabs TTS.");
            const audio = new Audio(result.url);
            window.elevenlabsTTS_Audio = audio;

            audio.onended = () => {
                window.elevenlabsTTS_Audio = null;
                if (!stopped && state.currentlyReadingChapter === chapterId) {
                    setTimeout(()=>playParagraphsSequentially(idx + 1), 350);
                } else {
                    handleStop();
                }
            };
            audio.onerror = (e) => {
                window.elevenlabsTTS_Audio = null;
                logToAIConsole(commandHistory, aiCommandConsole, `Audio playback error in ElevenLabs for Chapter ${chapterNumber}: ${e && e.message ? e.message : ''}`);
                // Skip to next paragraph
                setTimeout(()=>playParagraphsSequentially(idx + 1), 800);
            };
            audio.play();
        } catch (error) {
            logToAIConsole(commandHistory, aiCommandConsole, `Error reading paragraph ${idx+1} via ElevenLabs: ${error.message}`);
            // Skip this paragraph, continue
            setTimeout(()=>playParagraphsSequentially(idx + 1), 500);
        }
    }

    // Start reading all
    state.currentlyReadingChapter = chapterId;
    if (readAloudButton) readAloudButton.innerHTML = '&#x23F9;&#xFE0F;'; // Stop icon
    clearTextHighlights();
    try {
        await playParagraphsSequentially(0);
    } catch (error) {
        handleStop();
        logToAIConsole(commandHistory, aiCommandConsole, `ElevenLabs TTS error: ${error.message}`);
        alert(`TTS Error: ${error.message}`);
    }
}

/**
 * Opens a popup to let user search and add source links related to the chapter.
 * Generated links will be added after the chapter's paragraphs.
 */
function openSourcesLinksPopup(userInput, chapterTitle, chapterElement, language, chapterNumber, settings, state, dependencies, uiElements) {
    // Prevent duplicate popups
    if (document.querySelector('.sources-links-popup')) return;

    const chapterContent = chapterElement.querySelector('.chapter-content');
    if (!chapterContent) {
        alert('Chapter content area not found.');
        return;
    }

    // Popup structure
    const popup = document.createElement('div');
    popup.className = 'sources-links-popup';
    popup.style.position = 'fixed';
    popup.style.top = 0;
    popup.style.left = 0;
    popup.style.width = '100%';
    popup.style.height = '100%';
    popup.style.background = 'rgba(0,0,0,0.6)';
    popup.style.display = 'flex';
    popup.style.justifyContent = 'center';
    popup.style.alignItems = 'center';
    popup.style.zIndex = '10020';

    popup.innerHTML = `
      <div class="sources-links-content" style="max-width:700px;width:98%;background:var(--popup-content-bg,#fff);border-radius:8px;box-shadow:0 6px 32px rgba(0,0,0,.20);padding:30px 25px;position:relative;display:flex;flex-direction:column;gap:18px;">
        <button class="popup-close-button" style="position:absolute;top:8px;right:13px;background:none;border:none;font-size:24px;cursor:pointer;">&times;</button>
        <h3 style="margin-top:0;margin-bottom:0;">Add Sources & Links (Chapter ${chapterNumber})</h3>
        <p style="color:var(--text-secondary);font-size:0.97em;">Find, search, and add helpful links, articles, academic papers, datasets, Wikipedia references or primary sources related to this chapter.
            <br>
            <span style="color:#6a6;">You can research <b>multiple times</b> to accumulate diverse sources. For each search, select any helpful entries. Tip: Try different queries for academic, technical, and journalistic sources as needed.</span>
        </p>
        <input id="sources-search-input" type="text" placeholder="Search topic, phrase, or URL... (eg: 'background music history', 'UNESCO world heritage', 'Wikipedia: Beethoven', 'arXiv: deep learning review', 'dataset climate change')" style="padding:10px;border-radius:5px;border:1px solid var(--input-border,#ccc);font-size:1em;width:100%;">
        <div style="display:flex;gap:7px;margin-bottom:5px;">
            <button id="sources-search-btn" style="margin-top:-2px;padding:10px 18px;font-weight:bold;background:var(--button-bg,#5c6bc0);color:var(--button-text,#fff);border:none;border-radius:5px;cursor:pointer;">&#x1F50D; Search</button>
            <button id="sources-advanced-btn" style="padding:10px 14px;font-weight:bold;background:#faf7b7;color:#5c6bc0;border:1px solid #eecb6b;border-radius:5px;cursor:pointer;font-size:1em;">
                &#x1F50E; Advanced Settings
            </button>
            <button id="sources-clear-all-btn" style="margin-left:auto;background:none;color:#a00;font-size:13px;padding:0 7px;border:none;" title="Clear all added sources in this chapter">Clear All Sources</button>
        </div>
        <div id="sources-advanced-settings" style="display:none;margin-bottom:4px;border:1px solid #eecb6b;background:#fffdeb;border-radius:5px;padding:10px 7px;">
            <label style="display:inline-block;margin-right:8px;">
                <input type="checkbox" id="sources-filter-academic">
                Prefer academic papers
            </label>
            <label style="display:inline-block;margin-right:8px;">
                <input type="checkbox" id="sources-filter-datasets">
                Include datasets
            </label>
            <label style="display:inline-block;margin-right:8px;">
                <input type="checkbox" id="sources-filter-wikipedia">
                Prefer Wikipedia
            </label>
            <label style="display:inline-block;margin-right:8px;">
                <input type="checkbox" id="sources-filter-open">
                Only open-access sources
            </label>
            <label style="display:inline-block;">
                <input type="checkbox" id="sources-filter-news">
                Include news media
            </label>
        </div>
        <div id="sources-results-area" style="margin-top:8px;min-height:64px;"></div>
        <div style="text-align:right;">
            <button id="sources-insert-selected-btn" style="display:none;padding:10px 22px;background:var(--button-bg,#5c6bc0);color:var(--button-text,#fff);border:none;border-radius:5px;font-weight:bold;">Insert Selected</button>
        </div>
      </div>
    `;

    document.body.appendChild(popup);

    // --- Style for selection feedback etc. included in main CSS. ---

    // --- Popup logic
    const closeBtn = popup.querySelector('.popup-close-button');
    closeBtn.addEventListener('click', () => { popup.remove(); });

    popup.addEventListener('click', e => {
        if (e.target === popup) popup.remove();
    });
    document.addEventListener('keydown', function escHandler(event) {
        if (event.key === 'Escape') {
            popup.remove();
            document.removeEventListener('keydown', escHandler);
        }
    });

    // --- Handler for clear all sources in chapter
    const clearAllBtn = popup.querySelector('#sources-clear-all-btn');
    clearAllBtn.addEventListener('click', () => {
        if (confirm('Remove all previously added sources and links from this chapter?')) {
            const existingContainer = chapterContent.querySelector('.chapter-sources-container');
            if (existingContainer) existingContainer.remove();
        }
    });

    // --- Advanced settings toggle logic
    const advancedBtn = popup.querySelector('#sources-advanced-btn');
    const advancedSettings = popup.querySelector('#sources-advanced-settings');
    advancedBtn.addEventListener('click', () => {
        if (advancedSettings.style.display === 'none') {
            advancedSettings.style.display = 'block';
            advancedBtn.textContent = '&#x25B2; Hide Advanced';
        } else {
            advancedSettings.style.display = 'none';
            advancedBtn.textContent = '&#x1F50E; Advanced Settings';
        }
    });

    // --- Handler for search
    const searchInput = popup.querySelector('#sources-search-input');
    const searchBtn = popup.querySelector('#sources-search-btn');
    const resultsArea = popup.querySelector('#sources-results-area');
    const insertBtn = popup.querySelector('#sources-insert-selected-btn');

    // Helper: Utility to get current search query (default to chapterTitle if empty)
    function getQuery() {
        const query = searchInput.value.trim();
        if (query) return query;
        // Default: use chapter title as context
        return chapterTitle || userInput || '';
    }

    async function doSourcesSearch() {
        searchBtn.disabled = true;
        resultsArea.innerHTML = `<div style="text-align:center;padding:18px;"><span class="loading-spinner" style="width:24px;height:24px;display:inline-block;border:3px solid #ececec;border-radius:50%;border-top-color:#3699f3;animation:spin 1s linear infinite;vertical-align:middle;"></span> Searching sources...</div>`;
        insertBtn.style.display = 'none';

        // Collect advanced filter settings
        const filters = {
            academic: popup.querySelector('#sources-filter-academic')?.checked,
            datasets: popup.querySelector('#sources-filter-datasets')?.checked,
            wikipedia: popup.querySelector('#sources-filter-wikipedia')?.checked,
            open: popup.querySelector('#sources-filter-open')?.checked,
            news: popup.querySelector('#sources-filter-news')?.checked,
        };

        try {
            // Prompt engineering: Boosts for academic/journal/news/dataset/Wikipedia open-access
            let filterContext = '';
            if (filters.academic) filterContext += 'Prioritize academic sources: peer-reviewed papers, journals, and preprints (arXiv, JSTOR, SSRN, etc). ';
            if (filters.datasets) filterContext += 'Include (if found) any public or open datasets or code repositories, and major database references. ';
            if (filters.wikipedia) filterContext += 'Prefer/provide links to the relevant Wikipedia articles, if available. ';
            if (filters.open) filterContext += 'Provide only open-access or freely available sources, skip paywalled results. ';
            if (filters.news) filterContext += 'Include recent major news media articles if relevant. ';

            // More research, up to 8 results to allow wide selection
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Return a JSON array (up to 8 entries) of credible, relevant links for the user's topic. 
Prioritize diversity: include academic publications, datasets, public research, major news, Wikipedia, library catalogs, and reputable open-access resources. 
For each, specify a "type" field ("journal","academic","wikipedia","dataset","news","reference","book","general","official","gov","code","video","media"), a "title", "url", and a concise 2-sentence description. ${filterContext}
Respond ONLY with a JSON array and no other text or explanations.
Schema (per item): {"type":string, "title":string, "url":string, "description":string}`,
                    },
                    {
                        role: "user",
                        content: `Query: ${getQuery()}
Book: "${userInput}"
Chapter: "${chapterTitle}"
Language: ${language}
Genre: ${settings.genre || ""}
Style: ${settings.style || ""}`
                    }
                ],
                json: true,
            });

            let links;
            try {
                links = JSON.parse(completion.content);
            } catch (e) {
                throw new Error("AI did not return valid JSON.");
            }
            if (!Array.isArray(links) || links.length === 0) throw new Error("No results found.");

            resultsArea.innerHTML = '';
            links.forEach(item => {
                const div = document.createElement('div');
                div.classList.add('sources-links-result');
                div.innerHTML = `
                    <div class="sources-links-title">${escapeHtml(item.title || item.url)}</div>
                    <div class="sources-links-link">
                        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
                            ${escapeHtml(item.url)}
                        </a>
                        <span style="font-size:0.87em;border-radius:4px;background:#e8ecef;padding:1px 8px;margin-left:7px;">${escapeHtml(item.type || "")}</span>
                    </div>
                    <div class="sources-links-desc">${escapeHtml(item.description || "")}</div>
                    <span class="checkmark">&#10003;</span>
                `;
                div.addEventListener('click', () => {
                    div.classList.toggle('selected');
                    updateSelected();
                });
                resultsArea.appendChild(div);
            });
        } catch (error) {
            resultsArea.innerHTML = `<div style="color:#c00;background:#fee;padding:10px;border-radius:6px;margin:0 6px 0 0;">Error: ${error.message || 'Failed to search.'}</div>`;
        } finally {
            searchBtn.disabled = false;
            updateSelected();
        }
    }

    // Selection UX
    function updateSelected() {
        const selected = resultsArea.querySelectorAll('.sources-links-result.selected');
        insertBtn.style.display = selected.length > 0 ? 'inline-block' : 'none';
        insertBtn.textContent = selected.length === 1 ? 'Insert Selected Link' : `Insert ${selected.length} Selected Links`;
    }

    // Search triggers
    searchBtn.addEventListener('click', doSourcesSearch);
    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') doSourcesSearch();
    });

    // On popup open, autofocus search bar and run initial search
    setTimeout(() => {
        searchInput.focus();
        if ((chapterTitle || '').length > 2 && chapterTitle.length < 120) {
            doSourcesSearch();
        }
    }, 40);

    // Helper: Insert selected links below chapter paragraphs
    insertBtn.addEventListener('click', () => {
        const selectedLinks = Array.from(resultsArea.querySelectorAll('.sources-links-result.selected'));
        if (selectedLinks.length === 0) return;
        // Container for links
        let sourcesContainer = chapterContent.querySelector('.chapter-sources-container');
        if (!sourcesContainer) {
            sourcesContainer = document.createElement('div');
            sourcesContainer.className = 'chapter-sources-container';
            sourcesContainer.style.marginTop = '28px';
            sourcesContainer.style.borderTop = '2px dotted var(--border-secondary, #bbb)';
            sourcesContainer.style.padding = '10px 0 0 0';
            sourcesContainer.innerHTML = `<div style="color:var(--text-link,#5c6bc0);font-weight:bold;margin-bottom:7px;font-size:1.13em;">Sources & Links</div>`;
            chapterContent.appendChild(sourcesContainer);
        }
        selectedLinks.forEach(linkDiv => {
            // Clone as a new DOM element for the chapter
            const linkTitle = linkDiv.querySelector('.sources-links-title')?.textContent || '';
            const linkUrl = linkDiv.querySelector('.sources-links-link a')?.href || '';
            const linkDesc = linkDiv.querySelector('.sources-links-desc')?.textContent || '';
            const linkType = linkDiv.querySelector('.sources-links-link span')?.textContent || '';
            const linkItem = document.createElement('div');
            linkItem.className = 'chapter-source-link';
            linkItem.style.marginBottom = '7px';
            linkItem.innerHTML = `
                <a href="${escapeHtml(linkUrl)}" target="_blank" style="font-weight:bold;color:#2563eb;text-decoration:underline;word-break:break-all;">${escapeHtml(linkTitle || linkUrl)}</a>
                ${linkType ? `<span style="background:#e8ecef;border-radius:4px;color:#003570;font-size:0.85em;margin-left:8px;padding:1px 7px;">${escapeHtml(linkType)}</span>` : ''}
                <span style="font-size:0.92em;color:var(--text-secondary,#777);display:block;margin-top:2px;">${escapeHtml(linkDesc)}</span>
            `;
            sourcesContainer.appendChild(linkItem);
        });
        // Optionally, scroll to the sources section
        sourcesContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });

        // Optional: log operation to the AI command console
        if (dependencies?.logToAIConsole && uiElements?.aiCommandConsole && state?.commandHistory) {
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Inserted ${selectedLinks.length} link(s) as sources for Chapter ${chapterNumber}.`);
        }

        popup.remove();
    });

    // Helper: Escape HTML
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}