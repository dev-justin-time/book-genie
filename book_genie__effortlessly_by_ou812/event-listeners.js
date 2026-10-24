// event-listeners.js
import { detectLanguage, generateChapterData, loadBookData, saveBookData } from './book-manager.js';
import { generateChapterContent } from './chapter-generator.js';
import { handleChapterToolAction } from './chapter-tools.js';
import { setBodyBackground } from './background-manager.js';
import { detectGenre } from './genre-manager.js';
import { setupChapterCollapse, addLanguageOption, saveCustomLanguage, updateChapterSizeSublabel, addCustomGenreOption, saveCustomGenre } from './ui-helpers.js';
import config from './config.js'; // Import config for genre list check
import { formatChapterContent } from './format-chapter.js'; // Ensure formatChapterContent is imported if used internally
import { createImageContainer, updateMoveButtonStates, moveImage } from './image-popup.js'; // Ensure moveImage is imported if needed here

/**
 * Reads the current generation settings from the UI.
 * Marked as async because it uses dynamic import with await.
 * @returns {Promise<object>} A promise resolving to an object containing genre, style, chapterSize, and chapterCount.
 */
async function getCurrentSettings() {
    const genreSelect = document.getElementById('genre-select');
    const styleSelect = document.getElementById('style-select');
    const chapterSizeSlider = document.getElementById('chapter-size-slider');
    const chapterCountInput = document.getElementById('chapter-count-input');

    // Get settings potentially including custom ones
    let settings = {
        genre: 'Auto Detect', style: 'Chosen by AI', chapterSize: '4', chapterCount: 28,
    };
    try {
        const settingsManager = await import('./settings-manager.js'); // Dynamic import
        if (typeof settingsManager.getSettings === 'function') {
            settings = settingsManager.getSettings(); // Use function from settings manager if available
        } else {
             console.warn('settingsManager.getSettings is not a function. Using default UI values.');
            settings = {
                genre: genreSelect ? genreSelect.value : 'Auto Detect',
                style: styleSelect ? styleSelect.value : 'Chosen by AI',
                chapterSize: chapterSizeSlider ? chapterSizeSlider.value : '4',
                chapterCount: chapterCountInput ? parseInt(chapterCountInput.value) || 28 : 28
            };
        }
    } catch (error) {
        console.error('Error importing settings manager:', error);
         console.warn('Falling back to default UI values for settings.');
        settings = {
            genre: genreSelect ? genreSelect.value : 'Auto Detect',
            style: styleSelect ? styleSelect.value : 'Chosen by AI',
            chapterSize: chapterSizeSlider ? chapterSizeSlider.value : '4',
            chapterCount: chapterCountInput ? parseInt(chapterCountInput.value) || 28 : 28
        };
    }

    return settings;
}

/**
 * Adds a message to the AI command console history.
 * @param {string[]} commandHistory - The array storing command history.
 * @param {HTMLElement} aiCommandConsole - The console display element.
 * @param {string} message - The message to add.
 */
export function logToAIConsole(commandHistory, aiCommandConsole, message) {
    if (!aiCommandConsole) {
        console.warn("AI Command Console element not found, cannot log message:", message);
        return;
    }
    const messageString = String(message);
    commandHistory.push(messageString);
    if (commandHistory.length > 15) { // Keep a bit more history
        commandHistory.shift();
    }
    aiCommandConsole.innerHTML = commandHistory.map(msg => `<div>${msg.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`).join('');
    aiCommandConsole.scrollTop = aiCommandConsole.scrollHeight;
}

/**
 * Updates the state and visibility of the Go to Bookmark button and TOC highlight.
 * @param {HTMLElement} button - The Go to Bookmark button element.
 * @param {HTMLElement} chaptersContainer - The container for TOC chapter boxes.
 * @param {string|null} bookmarkedId - The ID of the bookmarked chapter, or null.
 */
function updateBookmarkUI(button, chaptersContainer, bookmarkedId) {
    if (button) {
        button.style.display = bookmarkedId ? 'inline-block' : 'none';
        button.disabled = !bookmarkedId;
    }

    const previouslyHighlighted = chaptersContainer.querySelector('.bookmarked-toc-item');
    if (previouslyHighlighted) {
        previouslyHighlighted.classList.remove('bookmarked-toc-item');
    }

    if (bookmarkedId) {
        chaptersContainer.querySelectorAll('.chapter-box').forEach(box => {
            if (box.href.endsWith(`#${bookmarkedId}`)) {
                // Use Unicode or Font Awesome actual bookmark icon
                // Remove old icon if any
                const oldIcon = box.querySelector('.bm-icon');
                if (oldIcon) oldIcon.remove();

                // --- Font Awesome Bookmark Icon ---
                const bookmarkIcon = document.createElement('span');
                bookmarkIcon.className = "bm-icon";
                // Use fa-bookmark or Unicode as fallback
                bookmarkIcon.innerHTML = '<i class="fa fa-bookmark"></i>';
                // If Font Awesome is not available, fallback:
                if (!(window.FontAwesomeConfig || document.querySelector('link[href*="font-awesome"]') || document.querySelector('style').textContent.includes('fa-bookmark'))) {
                    bookmarkIcon.innerHTML = '';
                }
                box.insertBefore(bookmarkIcon, box.firstChild);

                box.classList.add('bookmarked-toc-item');
            } else {
                // Remove old icon
                const oldIcon = box.querySelector('.bm-icon');
                if (oldIcon) oldIcon.remove();
                box.classList.remove('bookmarked-toc-item');
            }
        });
    } else {
        // Remove ALL bookmark icons
        chaptersContainer.querySelectorAll('.chapter-box .bm-icon').forEach(icon => icon.remove());
        chaptersContainer.querySelectorAll('.chapter-box').forEach(box => box.classList.remove('bookmarked-toc-item'));
    }
}

/**
 * Saves the edited chapter title, updates the H2 and the TOC.
 * @param {HTMLInputElement} inputElement - The input field containing the new title.
 * @param {HTMLElement} h2Element - The original H2 element (or the H2 to recreate).
 * @param {number} chapterNumber - The number of the chapter.
 * @param {string} chapterId - The ID of the chapter element (e.g., 'chapter-1').
 * @param {object} uiElements - Object containing UI elements (specifically chaptersContainer).
 */
function saveTitleEdit(inputElement, h2Element, chapterNumber, chapterId, uiElements) {
    const newTitle = inputElement.value.trim() || `Chapter ${chapterNumber}`; // Use fallback if empty
    const newTitleText = `${chapterNumber}. ${newTitle}`;

    // Recreate H2 element
    const newH2 = document.createElement('h2');
    newH2.textContent = newTitleText;
    newH2.dataset.chapterNumber = chapterNumber; // Store number for future edits
    newH2.dataset.chapterId = chapterId;
    newH2.style.cursor = 'pointer'; // Make it look clickable again
    newH2.title = 'Click to edit title';
    // Add click listener to the new H2
    newH2.addEventListener('click', () => replaceTitleWithInput(newH2, chapterNumber, chapterId, uiElements), { once: true });

    // Replace input with the new H2
    inputElement.replaceWith(newH2);

    // Update Table of Contents
    const tocBox = uiElements.chaptersContainer.querySelector(`.chapter-box[href="#${chapterId}"]`);
    if (tocBox) {
        tocBox.textContent = newTitleText;
    }

    // Update collapse label dataset
    const chapterElement = newH2.closest('.chapter');
    if (chapterElement) {
        const collapseLabel = chapterElement.querySelector(`label[for="chapter-collapse-${chapterNumber}"]`);
        if (collapseLabel) {
            collapseLabel.dataset.chapterTitle = newTitleText;
            // NO NEED to update label text here when collapsed, CSS ::before handles it.
        }
    }

    console.log(`Chapter ${chapterNumber} title updated to: "${newTitle}"`);
    // Optional: logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Chapter ${chapterNumber} title updated.`);
}

/**
 * Replaces the H2 title element with an input field for editing.
 * @param {HTMLElement} h2Element - The H2 element to replace.
 * @param {number} chapterNumber - The number of the chapter.
 * @param {string} chapterId - The ID of the chapter element (e.g., 'chapter-1').
 * @param {object} uiElements - Object containing UI elements (needed for TOC update).
 */
export function replaceTitleWithInput(h2Element, chapterNumber, chapterId, uiElements) { // Made exportable for use in other modules if needed
    const currentTitleText = h2Element.textContent;
    // Extract only the title part, removing the number and dot+space
    const currentTitle = currentTitleText.replace(/^\d+\.\s*/, '').trim();

    const inputElement = document.createElement('input');
    inputElement.type = 'text';
    inputElement.value = currentTitle;
    inputElement.classList.add('chapter-title-edit-input'); // Add class for styling
    inputElement.style.width = 'calc(100% - 40px)'; // Adjust width as needed
    inputElement.style.fontSize = '1.5em'; // Match h2 font size approximately
    inputElement.style.margin = '0';
    inputElement.style.padding = '5px';
    inputElement.style.border = '1px solid #ccc';
    inputElement.style.borderRadius = '4px';
    inputElement.dataset.originalTitle = currentTitle; // Store original in case of escape

    // Replace H2 with input
    h2Element.replaceWith(inputElement);
    inputElement.focus(); // Focus the input field
    inputElement.select(); // Select the text

    // Add event listeners for saving/cancelling
    inputElement.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission if any
            saveTitleEdit(inputElement, h2Element, chapterNumber, chapterId, uiElements);
            // Listeners are automatically removed when inputElement is replaced
        } else if (event.key === 'Escape') {
            // Restore original H2
            h2Element.textContent = `${chapterNumber}. ${inputElement.dataset.originalTitle}`; // Restore text
             // Add click listener back to the original H2
            h2Element.addEventListener('click', () => replaceTitleWithInput(h2Element, chapterNumber, chapterId, uiElements), { once: true });
            inputElement.replaceWith(h2Element);
            console.log(`Chapter ${chapterNumber} title edit cancelled.`);
             // Listeners automatically removed
        }
    });

    // Save on blur (losing focus)
    inputElement.addEventListener('blur', () => {
        // Check if the element is still in the DOM (might have been replaced by Enter/Escape)
        if (inputElement.parentNode) {
            saveTitleEdit(inputElement, h2Element, chapterNumber, chapterId, uiElements);
        }
    });
}

/**
 * Re-attaches event listeners to the control buttons within an image container.
 * This is useful after operations that might remove/replace the container or its parent.
 * @param {HTMLElement} imageContainer - The .image-container element.
 */
export function reAttachImageControls(imageContainer) {
    // Add null check to prevent undefined errors
    if (!imageContainer) {
        console.warn("Attempted to reattach controls to undefined image container");
        return;
    }
    
    const deleteButton = imageContainer.querySelector('.image-control-button.delete');
    const moveUpButton = imageContainer.querySelector('.image-control-button[title="Move Image Up"]');
    const moveDownButton = imageContainer.querySelector('.image-control-button[title="Move Image Down"]');

    if (deleteButton) {
        // Clone and replace to remove old listeners before adding new ones
        const newDeleteButton = deleteButton.cloneNode(true);
        deleteButton.replaceWith(newDeleteButton);
        newDeleteButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this image?')) {
                // Store references before removal
                const parent = imageContainer.parentElement;
                const prev = imageContainer.previousElementSibling;
                const next = imageContainer.nextElementSibling;
                
                imageContainer.remove();
                
                // Update neighbors after removing (with null safety)
                if (parent) {
                    if (prev && prev.classList && prev.classList.contains('image-container')) 
                        updateMoveButtonStates(prev);
                    if (next && next.classList && next.classList.contains('image-container')) 
                        updateMoveButtonStates(next);
                }
            }
        });
    }

    // Add null checks for the rest of the buttons too
    if (moveUpButton) {
        const newMoveUpButton = moveUpButton.cloneNode(true);
        moveUpButton.replaceWith(newMoveUpButton);
        newMoveUpButton.addEventListener('click', () => {
            if (typeof moveImage === 'function') {
                moveImage(imageContainer, 'up');
            }
        });
    }

    if (moveDownButton) {
        const newMoveDownButton = moveDownButton.cloneNode(true);
        moveDownButton.replaceWith(newMoveDownButton);
        newMoveDownButton.addEventListener('click', () => {
            if (typeof moveImage === 'function') {
                moveImage(imageContainer, 'down');
            }
        });
    }

    // Update button states after re-attaching listeners
    if (typeof updateMoveButtonStates === 'function') {
        updateMoveButtonStates(imageContainer);
    }
}

// --- Listener Initialization Functions ---

export function initializeMenuButtonListener(menuButton, inputArea) {
    menuButton.addEventListener('click', () => {
        inputArea.classList.toggle('collapsed');
        menuButton.textContent = inputArea.classList.contains('collapsed') ? 'Show Input' : 'Hide Input';
    });
}

/* ================= Mouseover Info Popup for Chapter Tool Buttons ================= */

/**
 * Attaches a rich mouseover info popup to any button element with a given message.
 * Handles delayed show, fast hide, and follows cursor for best UX.
 * @param {HTMLElement} button - The button to attach the tooltip to.
 * @param {string} message - The explanatory info to display.
 */
export function attachInfoTooltip(button, message) {
    if (!button) return;
    let tooltip;

    function showTooltip(e) {
        // Defensive check for button/tooltip
        if (tooltip) return; // Don't stack
        tooltip = document.createElement('div');
        tooltip.className = 'info-tooltip';
        tooltip.innerText = message;
        document.body.appendChild(tooltip);

        // Position near button or mouse
        function position(ev) {
            // Defensive checks; default to center of window if event missing
            let x = (ev && typeof ev.clientX === 'number') ? ev.clientX : 0;
            let y = (ev && typeof ev.clientY === 'number') ? ev.clientY : 0;

            // Fallback to button position if no event (keyboard focus or drag/click with missing event)
            if ((!x && !y) || Number.isNaN(x) || Number.isNaN(y)) {
                if (button && typeof button.getBoundingClientRect === 'function') {
                    const rect = button.getBoundingClientRect();
                    x = rect.left + rect.width / 2;
                    y = rect.top + rect.height + 12;
                } else {
                    // Ultimate fallback to center of window
                    x = window.innerWidth/2;
                    y = window.innerHeight/2;
                }
            }
            // Default offset
            tooltip.style.left = x + 16 + "px";
            tooltip.style.top = y + 16 + "px";
            // Prevent offscreen
            const rectTip = tooltip.getBoundingClientRect();
            if (rectTip.right > window.innerWidth - 12)
                tooltip.style.left = (window.innerWidth - rectTip.width - 16) + "px";
            if (rectTip.bottom > window.innerHeight - 8)
                tooltip.style.top = (window.innerHeight - rectTip.height - 8) + "px";
        }

        tooltip.classList.add('visible');
        position(e);

        // Listen for mousemove to move tooltip, but only if button exists and tooltip not removed
        function mousemoveListener(ev) {
            if (tooltip && document.body.contains(tooltip)) position(ev);
        }
        button.addEventListener('mousemove', mousemoveListener);

        // Accessibility: on focus, ensure tooltip is visible near the button
        if (!e) {
            setTimeout(() => {
                if (button && typeof button.getBoundingClientRect === 'function') {
                    const rect = button.getBoundingClientRect();
                    tooltip.style.left = rect.left + rect.width / 2 + "px";
                    tooltip.style.top = rect.bottom + 20 + "px";
                }
            }, 10);
        }

        function hideTooltip() {
            if (tooltip) {
                button.removeEventListener('mousemove', mousemoveListener);
                if (tooltip.parentNode) tooltip.remove();
                tooltip = null;
            }
        }
        // Remove on scroll
        window.addEventListener('scroll', hideTooltip, { once: true });

        button.addEventListener('mouseleave', hideTooltip, { once: true });
        button.addEventListener('blur', hideTooltip, { once: true });
        // Hide on mousedown
        button.addEventListener('mousedown', hideTooltip, { once: true });
    }

    button.addEventListener('mouseenter', showTooltip);
    button.addEventListener('focus', showTooltip);
}

/*
 * Enhanced: Descriptions for each tool button (mouse over)
 */
const TOOL_INFOS = {
    'tool-toggle': 'Show or hide chapter tool menu.',
    'regenerate': 'Create a new version of this chapter using the book settings. Useful to try another AI draft, or after changing the book topic/style.',
    'reload': 'Reload this chapter\'s text from a saved JSON book file, replacing current content.',
    'readAloud': 'Let the computer read this chapter aloud using Text-to-Speech (TTS).\nChoose your preferred voice/engine in Settings.',
    'edit': 'Edit this chapter directly. Use Save or Cancel after making changes.',
    'format': 'Open the Paragraph Editor for precise control: edit, reflow, or individually regenerate paragraphs.',
    'image': 'Generate or insert relevant images into this chapter. You can use templates, describe a scene, or upload your own.',
    'sources': 'Add credible sources, references, or external links related to this chapter.\nSupports Wikipedia, news, research papers, and more.',
    'ai': 'Apply a custom AI command to revise or expand this chapter.',
    'bookmark': 'Set a bookmark on this chapter for quick return. Only one chapter can be bookmarked at a time.',
    'toc': 'Scroll back to the top of this book or table of contents.'
};

// Helper function to create and setup the chapter tools menu
function createChapterToolsMenu(chapterNumber, chapterTitle, chapterElement, userInput, language, state, dependencies, uiElements) {
    const chapterTools = document.createElement('div');
    chapterTools.classList.add('chapter-tools', 'tools-collapsed'); // Start collapsed

    const toggleButton = document.createElement('button');
    toggleButton.classList.add('chapter-tool-button', 'tool-toggle-button');
    toggleButton.title = "Show/Hide Tools";
    toggleButton.innerHTML = '&#x2026;'; // Vertical ellipsis icon
    // -------- Mouseover Info Popup for Toggle Button --------
    attachInfoTooltip(toggleButton, TOOL_INFOS['tool-toggle']);
    toggleButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent chapter collapse toggling
        chapterTools.classList.toggle('tools-collapsed');
    });
    chapterTools.appendChild(toggleButton);

    const toolOptionsContainer = document.createElement('div');
    toolOptionsContainer.classList.add('tool-options');

    // --- Create Buttons Individually and Attach Listeners ---

    // Regenerate Button
    const regenerateButton = document.createElement('button');
    regenerateButton.classList.add('chapter-tool-button');
    regenerateButton.dataset.action = "regenerate";
    regenerateButton.title = "Regenerate Chapter (using current settings)";
    regenerateButton.innerHTML = `<svg class="regenerate-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="currentColor"/></svg>`;
    attachInfoTooltip(regenerateButton, TOOL_INFOS['regenerate']);
    regenerateButton.addEventListener('click', async (event) => { // Make listener async
        event.preventDefault();
        event.stopPropagation();
        if (state.generating) {
            alert("Generation is already in progress. Please wait.");
            return;
        }

        const icon = regenerateButton.querySelector('.regenerate-icon');
        state.generating = true;
        regenerateButton.disabled = true;
        if (icon) icon.classList.add('spinning');

        dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Regenerating Chapter ${chapterNumber} using current settings...`);
        const currentSettings = await getCurrentSettings(); // Await the settings

        try {
            // Get potentially updated title before regenerating
            const currentTitleElement = chapterElement.querySelector('.chapter-content h2');
            const currentChapterTitle = currentTitleElement ? currentTitleElement.textContent.replace(/^\d+\.\s*/, '').trim() : chapterTitle;

            await dependencies.generateChapterContent(
                userInput, currentChapterTitle, chapterElement, language, chapterNumber,
                currentSettings.genre, currentSettings.style, currentSettings.chapterSize // Pass settings
            );
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Chapter ${chapterNumber} regenerated successfully using current settings.`);
        } catch(error) {
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Error regenerating Chapter ${chapterNumber}: ${error.message}`);
            alert(`Error regenerating chapter: ${error.message}`);
        } finally {
             state.generating = false;
             regenerateButton.disabled = false;
             if (icon) icon.classList.remove('spinning');
        }
    });
    toolOptionsContainer.appendChild(regenerateButton);

    // Reload Button
    const reloadButton = document.createElement('button');
    reloadButton.classList.add('chapter-tool-button');
    reloadButton.dataset.action = "reload";
    reloadButton.title = "Reload from File";
    reloadButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`;
    attachInfoTooltip(reloadButton, TOOL_INFOS['reload']);
    reloadButton.addEventListener('click', async (event) => { // Make listener async
        event.preventDefault();
        event.stopPropagation();
        if (state.generating) return;

        const fileInput = uiElements.fileInput;
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            alert('Please load a file first to use the Reload feature.');
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Reload skipped for Chapter ${chapterNumber}: No file loaded.`);
            return;
        }

        dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Reloading Chapter ${chapterNumber} from file...`);
        state.generating = true;
        reloadButton.disabled = true;

        try {
            // Assuming loadBookData reloads the entire book, which might not be ideal for *just* reloading one chapter.
            // If loadBookData reloads everything, this logic needs adjustment.
            // For now, assuming it handles reloading appropriately based on the file.
            await dependencies.loadBookData(
                 fileInput.files[0], uiElements.chaptersContainer, uiElements.bookContent, uiElements.title, uiElements.languageSelect,
                 uiElements.genreSelect, uiElements.styleSelect, uiElements.chapterSizeSlider, uiElements.chapterSizeSublabel, uiElements.chapterCountInput
            );
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Book reloaded from file (Chapter ${chapterNumber} content updated).`);
        } catch(error) {
            console.error("Error reloading chapter:", error);
            alert(`Error reloading chapter ${chapterNumber}: ${error.message}`);
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Error reloading Chapter ${chapterNumber}: ${error.message}`);
        } finally {
             state.generating = false;
             reloadButton.disabled = false;
        }
    });
    toolOptionsContainer.appendChild(reloadButton);

    // --- Other Tool Buttons ---
    const toolActions = [
        { action: 'readAloud', title: 'Read Aloud / Stop Reading', icon: '&#x1F50A;' }, // Use standard speaker icon
        { action: 'edit', title: 'Edit Chapter', icon: '&#10000;' },
        { action: 'format', title: 'Format Text', icon: '&#127912;' },
        { action: 'image', title: 'Generate Images', icon: '&#128247;' },
        { action: 'sources', title: 'Add Sources & Links', icon: '&#128279;' }, // New feature (link icon)
        { action: 'ai', title: 'AI Prompt', icon: '&#129299;' },
        { action: 'bookmark', title: 'Set/Unset Bookmark', icon: '&#128278;' }, // Real bookmark symbol
        { action: 'toc', title: 'Scroll to Top / TOC', icon: '&#8593;' }
    ];

    toolActions.forEach(tool => {
        const button = document.createElement('button');
        button.classList.add('chapter-tool-button');
        button.dataset.action = tool.action;
        button.title = tool.title;
        button.innerHTML = tool.icon;
        // -------- Mouseover Info Popup for Each Tool Button --------
        attachInfoTooltip(button, TOOL_INFOS[tool.action] || tool.title || tool.action);
        button.addEventListener('click', async (event) => { // Make listener async
            event.stopPropagation();
            const currentSettings = await getCurrentSettings(); // Await the settings
            // Fetch the current title dynamically in case it was edited
            const currentTitleElement = chapterElement.querySelector('.chapter-content h2');
            const currentChapterTitle = currentTitleElement ? currentTitleElement.textContent.replace(/^\d+\.\s*/, '').trim() : chapterTitle;

            await dependencies.handleChapterToolAction(
                tool.action, userInput, currentChapterTitle, chapterElement, language, chapterNumber,
                currentSettings, state, dependencies, uiElements
            );
        });
        toolOptionsContainer.appendChild(button);
    });

    chapterTools.appendChild(toolOptionsContainer);
    return chapterTools;
}

export async function initializeGenerateButtonListener(
    generateButton,
    uiElements,
    state,
    dependencies
) {
    const fullDependencies = { ...dependencies, reAttachImageControls };

    generateButton.addEventListener('click', async () => {
        if (state.generating) return;
        state.generating = true;
        generateButton.disabled = true;
        generateButton.textContent = 'Generating...';
        dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 'Starting book generation...');
        state.bookmarkedChapterId = null; // Reset bookmark on new generation
        updateBookmarkUI(uiElements.gotoBookmarkButton, uiElements.chaptersContainer, null); // Update UI
        // Stop any ongoing speech
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            state.currentlyReadingChapter = null;
            document.querySelectorAll('.chapter-tool-button[data-action="readAloud"]').forEach(btn => btn.innerHTML = '&#x1F50A;');
        }

        const userInput = uiElements.inputText.value;
        if (userInput.trim() === '') {
            alert('Please enter some text!');
            state.generating = false;
            generateButton.disabled = false;
            generateButton.textContent = 'Generate Chapters';
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 'Generation cancelled: No input text.');
            return;
        }

        let language = uiElements.languageSelect.value;
        if (language === 'auto') {
            language = await dependencies.detectLanguage(userInput) || navigator.language || 'en';
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Auto-detected language: ${language}`);
        }

        const { genre, style, chapterSize, chapterCount } = await getCurrentSettings(); // Await settings
        dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Using Settings - Genre: ${genre}, Style: ${style}, Size: ${chapterSize}, Count: ${chapterCount}`);

        try {
            // 1. Generate Metadata (Titles, Book Title, Image URL)
            const { chapterTitles, bookTitle, imageUrl } = await dependencies.generateChapterData(userInput, language, genre, style, chapterCount);
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Generated ${chapterTitles.length} chapter titles and book title: "${bookTitle}".`);

            uiElements.title.textContent = bookTitle;
            dependencies.setBodyBackground(imageUrl);

            // 2. Clear existing content
            uiElements.chaptersContainer.innerHTML = ''; // Clear TOC
            uiElements.bookContent.innerHTML = ''; // Clear main content

            // 3. Create Structure (TOC and Chapter Placeholders)
            const chapterElements = []; // Store references to chapter divs for content generation
            for (let index = 0; index < chapterTitles.length; index++) {
                const titleOfChapter = chapterTitles[index];
                const chapterNumber = index + 1;
                const chapterId = `chapter-${chapterNumber}`;
                const chapterTitleText = `${chapterNumber}. ${titleOfChapter}`;

                // Create TOC Entry
                const chapterBox = document.createElement('a');
                chapterBox.classList.add('chapter-box');
                chapterBox.textContent = chapterTitleText;
                chapterBox.href = `#${chapterId}`;
                uiElements.chaptersContainer.appendChild(chapterBox);

                // Create Chapter Structure in Main Content
                const chapterElement = document.createElement('div');
                chapterElement.classList.add('chapter');
                chapterElement.id = chapterId;

                const chapterContentDiv = document.createElement('div');
                chapterContentDiv.classList.add('chapter-content');
                chapterElement.appendChild(chapterContentDiv);

                const h2Title = document.createElement('h2');
                h2Title.textContent = chapterTitleText;
                h2Title.style.cursor = 'pointer';
                h2Title.title = 'Click to edit title';
                h2Title.dataset.chapterNumber = chapterNumber;
                h2Title.dataset.chapterId = chapterId;
                h2Title.addEventListener('click', () => replaceTitleWithInput(h2Title, chapterNumber, chapterId, uiElements), { once: true });
                chapterContentDiv.appendChild(h2Title);

                 // Add loading placeholder inside content div
                const loadingMsg = document.createElement('p');
                loadingMsg.innerHTML = '<i>Generating content...</i>';
                loadingMsg.id = `loading-${chapterId}`; // ID for removal later
                chapterContentDiv.appendChild(loadingMsg);

                const chapterTools = createChapterToolsMenu(chapterNumber, titleOfChapter, chapterElement, userInput, language, state, fullDependencies, uiElements);
                chapterElement.appendChild(chapterTools);

                const collapseCheckbox = document.createElement('input');
                collapseCheckbox.type = 'checkbox';
                collapseCheckbox.id = `chapter-collapse-${chapterNumber}`;
                collapseCheckbox.classList.add('chapter-collapse-checkbox');
                chapterElement.appendChild(collapseCheckbox);

                const collapseLabel = document.createElement('label');
                collapseLabel.htmlFor = `chapter-collapse-${chapterNumber}`;
                collapseLabel.dataset.chapterTitle = chapterTitleText;
                collapseLabel.classList.add('chapter-collapse-label');
                chapterElement.appendChild(collapseLabel);

                dependencies.setupChapterCollapse(chapterElement, collapseCheckbox, collapseLabel);

                uiElements.bookContent.appendChild(chapterElement);
                chapterElements.push(chapterElement); // Store for content generation phase
            }
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 'Book structure and TOC created.');


            // 4. Generate Content for Each Chapter
            // Can be done sequentially or in parallel (using Promise.all)
            // Using sequential for potentially better stability:
            for (let index = 0; index < chapterElements.length; index++) {
                 const chapterElement = chapterElements[index];
                 const titleOfChapter = chapterTitles[index];
                 const chapterNumber = index + 1;

                 await dependencies.generateChapterContent(userInput, titleOfChapter, chapterElement, language, chapterNumber, genre, style, chapterSize);
                 dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Generated content for Chapter ${chapterNumber}`);

                 // Remove loading message after content is generated (or error handled within generateChapterContent)
                 const loadingMsg = chapterElement.querySelector(`#loading-chapter-${chapterNumber}`);
                 if (loadingMsg) {
                     loadingMsg.remove();
                 }
            }

            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 'All chapters generated successfully.');

        } catch (error) {
            console.error("Error during book generation:", error);
            alert("An error occurred during book generation. Check the console for details.");
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Error during generation: ${error.message}`);
             // Clear potentially partial structure on error
             uiElements.chaptersContainer.innerHTML = '';
             uiElements.bookContent.innerHTML = '';
             uiElements.title.textContent = 'AI Book Generator'; // Reset title
        } finally {
            state.generating = false;
            generateButton.disabled = false;
            generateButton.textContent = 'Generate Chapters';
        }
    });
}

export function initializeGlobalAICommandListener(
    globalAiCommandInput,
    uiElements,
    state,
    dependencies
) {
    globalAiCommandInput.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            if (state.generating) {
                alert('A generation process is already running. Please wait.');
                return;
            }

            const globalCommand = globalAiCommandInput.value.trim();
            const userInput = uiElements.inputText.value.trim();

            if (globalCommand === '') {
                alert('Please enter a global command.');
                return;
            }
            if (userInput === '') {
                alert('Please enter the initial book topic first before applying a global command.');
                return;
            }
             if (uiElements.bookContent.children.length === 0) {
                alert('Please generate chapters first before applying a global command.');
                return;
            }

            let language = uiElements.languageSelect.value;
            if (language === 'auto') {
                language = await dependencies.detectLanguage(userInput) || navigator.language || 'en';
            }

            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Applying global command to all chapters: "${globalCommand}"`);
            state.generating = true;
            globalAiCommandInput.disabled = true;
            const originalButtonText = uiElements.generateButton.textContent;
            uiElements.generateButton.textContent = 'Applying Command...';
            uiElements.generateButton.disabled = true;

            try {
                 const chapterElements = Array.from(uiElements.bookContent.querySelectorAll('.chapter'));
                 const { genre, style, chapterSize } = await getCurrentSettings();

                 const regenerationPromises = chapterElements.map((chapterElement) => {
                     const chapterNumber = chapterElement.id.split('-').pop();
                     const titleElement = chapterElement.querySelector('.chapter-content h2');
                     const chapterTitle = titleElement ? titleElement.textContent.replace(/^\d+\.\s*/, '').trim() : `Chapter ${chapterNumber}`;

                     // Call generateChapterContent with the global command
                     return dependencies.generateChapterContent(
                         userInput, chapterTitle, chapterElement, language, chapterNumber,
                         genre, style, chapterSize,
                         globalCommand
                     );
                 });

                await Promise.all(regenerationPromises);
                dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 'Global command applied successfully to all chapters.');
                globalAiCommandInput.value = '';

            } catch (error) {
                console.error("Error applying global command:", error);
                alert(`An error occurred while applying the global command: ${error.message}`);
                dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Error applying global command: ${error.message}`);
            } finally {
                state.generating = false;
                globalAiCommandInput.disabled = false;
                uiElements.generateButton.textContent = originalButtonText;
                uiElements.generateButton.disabled = false;
            }
        }
    });
}

export function initializeResetButtonListener(
    resetButton,
    uiElements,
    dependencies
) {
     resetButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset the entire page? This will clear all input, generated content, and settings.')) {
            dependencies.logToAIConsole([], uiElements.aiCommandConsole, 'Resetting page...');

            // Reset inputs and content
            uiElements.inputText.value = '';
            uiElements.title.textContent = 'AI Book Generator';
            uiElements.chaptersContainer.innerHTML = '';
            uiElements.bookContent.innerHTML = '';
            uiElements.globalAiCommandInput.value = '';
            uiElements.aiCommandConsole.innerHTML = '';

            // Reset settings UI elements to defaults
            uiElements.languageSelect.value = 'auto';
             if (uiElements.genreSelect) uiElements.genreSelect.value = 'Auto Detect';
             if (uiElements.styleSelect) uiElements.styleSelect.value = 'Chosen by AI';
             if (uiElements.chapterSizeSlider) uiElements.chapterSizeSlider.value = '4';
             if (uiElements.chapterCountInput) uiElements.chapterCountInput.value = '28';
             if (uiElements.chapterSizeSlider && uiElements.chapterSizeSublabel) {
                dependencies.updateChapterSizeSublabel(uiElements.chapterSizeSlider, uiElements.chapterSizeSublabel);
             }
             // Reset custom genre/author/etc inputs if they exist
             const customInputs = document.querySelectorAll('.settings-content .custom-input');
             customInputs.forEach(input => {
                 input.value = '';
                 input.style.display = 'none';
             });
             // Reset other story detail dropdowns
             const storyDetailSelects = document.querySelectorAll('#story-details-settings select');
             storyDetailSelects.forEach(select => {
                 select.selectedIndex = 0; // Select the default disabled option
             });

             // Reset TTS select
             const ttsSelect = document.getElementById('tts-voice-select');
             if (ttsSelect) ttsSelect.value = 'default';
             localStorage.removeItem('selectedTTSVoiceURI');

             // Reset UI Style select and body class
             const uiStyleSelect = document.getElementById('ui-style-select');
             if (uiStyleSelect) uiStyleSelect.value = 'default';
             localStorage.removeItem('selectedUIStyle');
             // Apply default style (removes other style classes)
             const body = document.body;
             body.className = ''; // Remove all classes potentially added by styles

            // Reset background
            dependencies.setBodyBackground(null);

             // Reset bookmark UI
             updateBookmarkUI(uiElements.gotoBookmarkButton, uiElements.chaptersContainer, null);

             alert("Page has been reset.");
        }
    });
}

export function initializeLoadSaveListeners(
    loadButton, saveButton, fileInput,
    uiElements,
    state,
    dependencies
) {
    const fullDependencies = { ...dependencies, reAttachImageControls };

    loadButton.addEventListener('click', () => {
        if (state.generating) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', async (event) => {
        if (state.generating) return;
        const file = event.target.files[0];
        if (!file) return;

        state.generating = true;
        loadButton.disabled = true;
        loadButton.textContent = 'Loading...';
        dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Loading book from ${file.name}...`);

        try {
            const { inputText: loadedInputText, language: loadedLanguage, bookTitle, imageUrl, chapters, settings, bookmarkedChapterId: loadedBookmarkId } = await dependencies.loadBookData(
                file, uiElements.chaptersContainer, uiElements.bookContent, uiElements.title, uiElements.languageSelect,
                uiElements.genreSelect, uiElements.styleSelect, uiElements.chapterSizeSlider, uiElements.chapterSizeSublabel, uiElements.chapterCountInput
            );

            // Update main input and language select
            uiElements.inputText.value = loadedInputText || '';
            if (!Array.from(uiElements.languageSelect.options).some(opt => opt.value === loadedLanguage) && loadedLanguage !== 'auto') {
                let customLanguages = JSON.parse(localStorage.getItem('customLanguages') || '[]');
                let langData = customLanguages.find(lang => lang.code === loadedLanguage);
                let langName = langData ? langData.name : loadedLanguage;
                dependencies.addLanguageOption(uiElements.languageSelect, loadedLanguage, langName);
            }
            uiElements.languageSelect.value = loadedLanguage || 'auto';

            dependencies.setBodyBackground(imageUrl);
            uiElements.title.textContent = bookTitle;

            const loadedGenreLog = settings?.genre ?? 'Auto Detect';
            const loadedStyleLog = settings?.style ?? 'Chosen by AI';
            const loadedSizeLog = settings?.chapterSize ?? '4';
            const loadedCountLog = settings?.chapterCount ?? '28';
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Loaded Settings - Genre: ${loadedGenreLog}, Style: ${loadedStyleLog}, Size: ${loadedSizeLog}, Count: ${loadedCountLog}`);

            uiElements.chaptersContainer.innerHTML = '';
            uiElements.bookContent.innerHTML = '';
            state.bookmarkedChapterId = loadedBookmarkId;

            for (const [index, chapter] of chapters.entries()) {
                 const chapterNumber = index + 1;
                 const chapterId = `chapter-${chapterNumber}`;
                 const chapterTitleText = `${chapterNumber}. ${chapter.title}`;

                 const chapterBox = document.createElement('a');
                 chapterBox.classList.add('chapter-box');
                 chapterBox.textContent = chapterTitleText;
                 chapterBox.href = `#${chapterId}`;
                 uiElements.chaptersContainer.appendChild(chapterBox);

                 const chapterElement = document.createElement('div');
                 chapterElement.classList.add('chapter');
                 if (chapter.collapsed) {
                     chapterElement.classList.add('collapsed');
                 }
                 chapterElement.id = chapterId;

                 const chapterContentDiv = document.createElement('div');
                 chapterContentDiv.classList.add('chapter-content');
                 chapterElement.appendChild(chapterContentDiv);

                 const h2Title = document.createElement('h2');
                 h2Title.textContent = chapterTitleText;
                 h2Title.style.cursor = 'pointer';
                 h2Title.title = 'Click to edit title';
                 h2Title.dataset.chapterNumber = chapterNumber;
                 h2Title.dataset.chapterId = chapterId;
                 h2Title.addEventListener('click', () => replaceTitleWithInput(h2Title, chapterNumber, chapterId, uiElements), { once: true });
                 chapterContentDiv.appendChild(h2Title);

                 if (chapter.content && Array.isArray(chapter.content)) {
                     chapter.content.forEach(item => {
                         if (item.imageUrl) {
                             // Assume isRound is false unless explicitly saved/loaded differently
                             const isRound = item.isRound ?? false;
                             const imageContainer = createImageContainer(item.imageUrl, isRound, chapterContentDiv);
                             chapterContentDiv.appendChild(imageContainer);
                         } else if (item.text !== null && item.text !== undefined) {
                            const p = document.createElement('p');
                            const lines = String(item.text).split('\n');
                            lines.forEach((line, idx) => {
                                p.appendChild(document.createTextNode(line));
                                if (idx < lines.length - 1) {
                                    p.appendChild(document.createElement('br'));
                                }
                            });
                            if (p.textContent.trim()) {
                                chapterContentDiv.appendChild(p);
                            }
                         }
                     });
                      // Re-attach and update all controls after loading content for the chapter
                      chapterContentDiv.querySelectorAll('.image-container').forEach(container => {
                          reAttachImageControls(container); // Re-attach listeners here
                          updateMoveButtonStates(container); // Update states
                      });
                 } else {
                    const pError = document.createElement('p');
                    pError.innerHTML = `<i>Chapter ${chapterNumber} loaded with empty content.</i>`;
                    chapterContentDiv.appendChild(pError);
                    console.warn(`Chapter ${chapterNumber} loaded with empty/invalid content array.`);
                    dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Warning: Chapter ${chapterNumber} content empty.`);
                 }

                 const currentLanguage = uiElements.languageSelect.value; // Get potentially loaded language
                 const currentInputText = uiElements.inputText.value; // Get potentially loaded input text
                 const chapterTools = createChapterToolsMenu(chapterNumber, chapter.title, chapterElement, currentInputText, currentLanguage, state, fullDependencies, uiElements);
                 chapterElement.appendChild(chapterTools);

                 const collapseCheckbox = document.createElement('input');
                 collapseCheckbox.type = 'checkbox';
                 collapseCheckbox.id = `chapter-collapse-${chapterNumber}`;
                 collapseCheckbox.classList.add('chapter-collapse-checkbox');
                 collapseCheckbox.checked = chapter.collapsed;
                 chapterElement.appendChild(collapseCheckbox);

                 const collapseLabel = document.createElement('label');
                 collapseLabel.htmlFor = `chapter-collapse-${chapterNumber}`;
                 collapseLabel.dataset.chapterTitle = chapterTitleText;
                 collapseLabel.classList.add('chapter-collapse-label');
                 chapterElement.appendChild(collapseLabel);

                 dependencies.setupChapterCollapse(chapterElement, collapseCheckbox, collapseLabel);

                 uiElements.bookContent.appendChild(chapterElement);

                 if (chapterId === loadedBookmarkId) {
                     chapterElement.classList.add('bookmarked-chapter');
                }
            }

            updateBookmarkUI(uiElements.gotoBookmarkButton, uiElements.chaptersContainer, loadedBookmarkId);
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Book "${bookTitle}" loaded successfully.`);

        } catch (error) {
            console.error("Error loading book data:", error);
            alert(`Failed to load book data: ${error.message}. Check console for details.`);
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Error loading file: ${error.message}`);
            uiElements.chaptersContainer.innerHTML = '';
            uiElements.bookContent.innerHTML = '';
            uiElements.title.textContent = 'AI Book Generator';
            state.bookmarkedChapterId = null;
            updateBookmarkUI(uiElements.gotoBookmarkButton, uiElements.chaptersContainer, null);
        } finally {
            state.generating = false;
            loadButton.disabled = false;
            loadButton.textContent = 'Load';
            fileInput.value = '';
        }
    });

    saveButton.addEventListener('click', async () => {
        if (state.generating) return;
        if (!uiElements.inputText.value && uiElements.bookContent.children.length === 0) {
            alert("Nothing to save. Please enter a topic or generate/load a book first.");
            return;
        }

        state.generating = true;
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 'Saving book data...');

        try {
            const dataToSave = dependencies.saveBookData(
                uiElements.inputText, uiElements.languageSelect, uiElements.title, uiElements.bookContent,
                uiElements.chapterCountInput,
                uiElements.genreSelect, uiElements.styleSelect, uiElements.chapterSizeSlider,
                state.bookmarkedChapterId
            );
            const jsonString = JSON.stringify(dataToSave, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            const safeFileName = (uiElements.title.textContent || 'ai-book').replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
            a.download = `${safeFileName}.json`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Book saved as ${safeFileName}.json`);
        } catch (error) {
            console.error("Error saving book data:", error);
            alert('Failed to save book data. Check console for details.');
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Error saving book: ${error.message}`);
        } finally {
            state.generating = false;
            saveButton.disabled = false;
            saveButton.textContent = 'Save';
        }
    });
}

export function initializeGenreSelectListener(genreSelect, uiElements, state, dependencies) {
    if (!genreSelect) return;
    genreSelect.addEventListener('change', async (event) => {
        const selectedGenre = genreSelect.value;
        const isUserAction = event.isTrusted; // Check if the event was triggered by the user

        // Log manual selections (excluding Auto Detect and Own Genre placeholder)
        if (isUserAction && selectedGenre !== "Auto Detect" && selectedGenre !== "_custom_genre") {
             dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Genre manually set to: ${selectedGenre}`);
        }

        // Handle custom genre input display (user action or not)
        const customGenreInput = document.getElementById('custom-genre-input');
        if (selectedGenre === "_custom_genre") {
             if (customGenreInput) {
                 customGenreInput.style.display = 'block';
                 if (isUserAction) { // Only focus/log if user initiated
                     customGenreInput.value = '';
                     customGenreInput.focus();
                     dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Genre set to: Own Genre (input required)`);
                 }
             }
        } else {
             if (customGenreInput) customGenreInput.style.display = 'none';
        }

        // --- Auto-detect logic ---
        // Only run if the user explicitly selected "Auto Detect"
        if (selectedGenre === "Auto Detect" && isUserAction) {
            const userInput = uiElements.inputText.value.trim();
            const bookContentExists = uiElements.bookContent.children.length > 0;

            // Check if there's *any* text context to use
            if (userInput === '' && !bookContentExists && !uiElements.title.textContent.includes('Generator')) {
                 dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 'Auto-detect skipped: No text input or generated content available.');
                 // No alert, just log and return
                 return;
             }

            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Attempting to auto-detect genre...`);
            genreSelect.disabled = true;
            try {
                // Prioritize user input, then book title (if not default), then first paragraph if available
                let textToDetect = userInput;
                if (!textToDetect && uiElements.title.textContent && !uiElements.title.textContent.includes('Generator')) {
                    textToDetect = uiElements.title.textContent;
                }
                if (!textToDetect && bookContentExists) {
                     const firstParagraph = uiElements.bookContent.querySelector('.chapter .chapter-content p');
                     if (firstParagraph) textToDetect = firstParagraph.textContent.substring(0, 500); // Limit length
                }
                if (!textToDetect) {
                     textToDetect = 'general fiction'; // Fallback if absolutely nothing else
                     dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 'Using default "general fiction" for detection due to lack of specific text.');
                }

                const detectedGenre = await dependencies.detectGenre(textToDetect);

                if (detectedGenre) {
                    let existingOption = Array.from(genreSelect.options).find(opt => opt.value.toLowerCase() === detectedGenre.toLowerCase());

                    if (existingOption) {
                        genreSelect.value = existingOption.value;
                        dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Genre automatically detected and set to existing option: "${existingOption.value}".`);
                    } else {
                        dependencies.addCustomGenreOption(genreSelect, detectedGenre);
                        dependencies.saveCustomGenre(detectedGenre);
                        genreSelect.value = detectedGenre;
                        dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Genre automatically detected, added as custom option, and set to: "${detectedGenre}".`);
                    }
                     // If a custom input was open, hide it again after detection succeeds
                     if (customGenreInput) customGenreInput.style.display = 'none';
                } else {
                     // Detection failed, stay on "Auto Detect", log it. NO POPUP.
                     dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Could not detect genre. Please select manually or try again.`);
                     genreSelect.value = "Auto Detect"; // Explicitly reset if detection returns null/empty
                }
            } catch (error) {
                 // Log error, stay on "Auto Detect". NO POPUP.
                 console.error("Genre detection error:", error);
                 dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Error during genre detection: ${error.message}. Please select manually.`);
                 genreSelect.value = "Auto Detect"; // Reset to Auto Detect on error
            } finally {
                genreSelect.disabled = false;
            }
        } // End auto-detect logic
    });
}

export function initializeStyleSelectListener(styleSelect, uiElements, state) {
    if (!styleSelect) return;
    styleSelect.addEventListener('change', () => {
        logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Style set to: ${styleSelect.value}`);
    });
}

export function initializeChapterSizeSliderListener(slider, sublabel, uiElements, state, dependencies) {
    if (!slider || !sublabel) return;
    dependencies.updateChapterSizeSublabel(slider, sublabel);
    slider.addEventListener('input', () => {
        dependencies.updateChapterSizeSublabel(slider, sublabel);
        logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Chapter Size setting changed to: ${slider.value} (${sublabel.textContent})`);
    });
    slider.addEventListener('change', () => {
        logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Chapter Size setting finalized at: ${slider.value} (${sublabel.textContent})`);
    });
}

export function initializeChapterCountInputListener(input, uiElements, state) {
    if (!input) return;
    input.addEventListener('change', () => {
        const count = parseInt(input.value) || 28;
        const min = parseInt(input.min) || 1;
        const max = parseInt(input.max) || 50;
        let validatedCount = Math.max(min, Math.min(max, count));
        if (validatedCount !== count) {
            console.warn(`Chapter count adjusted from ${count} to ${validatedCount} (min: ${min}, max: ${max})`);
            input.value = validatedCount;
        }
        logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Number of Chapters setting changed to: ${validatedCount}`);
    });
}

export function initializeLanguageSelectListener(languageSelect, dependencies) {
    languageSelect.addEventListener('change', () => {
        if (languageSelect.value === 'custom') {
            showCustomLanguagePopup(languageSelect, dependencies.addLanguageOption, dependencies.saveCustomLanguage);
        }
    });
}

function showCustomLanguagePopup(languageSelect, addOptionFunc, saveFunc) {
    if (document.querySelector('.custom-language-popup')) return;

    const popup = document.createElement('div');
    popup.className = 'custom-language-popup';
    popup.innerHTML = `
        <div class="custom-language-content">
            <h2>Enter Custom Language</h2>
            <input type="text" id="custom-language-name" placeholder="Language Name (e.g., Klingon)">
            <input type="text" id="custom-language-code" placeholder="Language Code (e.g., tlh)">
            <div>
                <button id="add-custom-language">Add</button>
                <button id="cancel-custom-language">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    const nameInput = document.getElementById('custom-language-name');
    const codeInput = document.getElementById('custom-language-code');
    const addButton = document.getElementById('add-custom-language');
    const cancelButton = document.getElementById('cancel-custom-language');

    const closePopup = () => {
        popup.remove();
        if (languageSelect.value === 'custom') {
            languageSelect.value = 'auto';
        }
    };

    addButton.addEventListener('click', () => {
        const name = nameInput.value.trim();
        const code = codeInput.value.trim().toLowerCase();

        if (name === '' || code === '') {
            alert('Please enter both language name and code.');
            return;
        }
        if (/\s/.test(code)) {
            alert('Language code cannot contain spaces.');
            return;
        }
        if (code === 'auto' || code === 'custom') {
            alert('Cannot use reserved code "auto" or "custom".');
            return;
        }

        let existingOption = Array.from(languageSelect.options).find(opt => opt.value === code);

        if (existingOption) {
            languageSelect.value = existingOption.value;
            closePopup();
        } else {
            addOptionFunc(languageSelect, code, name);
            saveFunc(code, name);
            languageSelect.value = code;
            closePopup();
        }
    });

    cancelButton.addEventListener('click', closePopup);

    nameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            addButton.click();
        }
    });
    codeInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            addButton.click();
        }
    });

    nameInput.focus();
}