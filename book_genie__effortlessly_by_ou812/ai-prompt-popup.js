// ai-prompt-popup.js
import { formatChapterContent } from './format-chapter.js';

/**
 * Opens a popup for entering an AI command specific to a chapter.
 * @param {string} userInput - The main book topic/input.
 * @param {string} chapterTitle - The title of the current chapter.
 * @param {HTMLElement} chapterElement - The main element containing the chapter's content and tools.
 * @param {string} language - The selected language code.
 * @param {number|string} chapterNumber - The number of the chapter.
 * @param {object} settings - The current generation settings { genre, style, chapterSize, ... }. // Pass full settings
 * @param {object} state - Global state { generating, commandHistory }
 * @param {object} dependencies - Full dependencies object from script.js.
 * @param {object} uiElements - Object containing references to key UI elements.
 */
export function openAiPromptPopup(userInput, chapterTitle, chapterElement, language, chapterNumber, settings, state, dependencies, uiElements) {
    // Prevent opening multiple popups
    if (document.querySelector('.ai-prompt-popup')) {
        return;
    }

    const chapterContent = chapterElement.querySelector('.chapter-content');
    if (!chapterContent) {
        console.error("Chapter content element not found for AI prompt popup.");
        return;
    }

    const popupContainer = document.createElement('div');
    popupContainer.classList.add('ai-prompt-popup');

    // Use textarea instead of input
    popupContainer.innerHTML = `
        <div class="ai-prompt-content">
            <button class="ai-prompt-close-button" title="Close Popup">&times;</button>
            <textarea class="ai-prompt-command-input" placeholder="Enter AI command for Chapter ${chapterNumber}..."></textarea>
            <button class="ai-prompt-enter-button">Apply</button>
        </div>
    `;

    document.body.appendChild(popupContainer);
    
    // CRITICAL FIX: Make popup visible after creation
    popupContainer.style.display = 'flex';

    const closeButton = popupContainer.querySelector('.ai-prompt-close-button');
    const commandInput = popupContainer.querySelector('.ai-prompt-command-input'); // Now a textarea
    const enterButton = popupContainer.querySelector('.ai-prompt-enter-button');

    closeButton.addEventListener('click', () => {
        popupContainer.remove();
    });

    // Close on Escape key
    const escapeHandler = (event) => {
        // Don't close if Escape is pressed inside the textarea
        if (event.key === 'Escape' && event.target !== commandInput) {
            popupContainer.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);

    // Close if clicking outside the content
    popupContainer.addEventListener('click', (event) => {
        if (event.target === popupContainer) {
            popupContainer.remove();
             document.removeEventListener('keydown', escapeHandler);
        }
    });

    enterButton.addEventListener('click', () => generateAndDisplayAIResponse());

    // Handle Enter key slightly differently for textarea (e.g., Ctrl+Enter or rely on button)
    commandInput.addEventListener('keydown', async (event) => {
        // Use Ctrl+Enter or Shift+Enter to submit, allow regular Enter for newlines
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey || event.shiftKey)) {
            event.preventDefault();
            await generateAndDisplayAIResponse();
        }
    });

    commandInput.focus(); // Focus the textarea when popup opens

    async function generateAndDisplayAIResponse() {
        const command = commandInput.value.trim();
        if (command === '') {
            alert("Please enter a command.");
            return;
        }
         if (state.generating) {
             alert("Generation is already in progress. Please wait.");
             return;
         }

        state.generating = true;
        enterButton.disabled = true;
        enterButton.textContent = 'Applying...';
        commandInput.disabled = true;
        closeButton.disabled = true;

         // Log to console
         dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Applying command to Chapter ${chapterNumber}: "${command}"`);

        try {
            // Pass the *full current settings* to the generation function
            const aiResponse = await generateAiResponse(userInput, chapterTitle, command, language, chapterNumber, settings, chapterContent, uiElements);

            // Update the chapter content with the AI response
            // Find H2, clear everything else, then append new content
            const h2Title = chapterContent.querySelector('h2');
            while (chapterContent.lastChild && chapterContent.lastChild !== h2Title) {
                 chapterContent.removeChild(chapterContent.lastChild);
             }

             // Process response similar to chapter-generator
            const paragraphs = aiResponse.split(/\n\s*\n/).filter(p => p.trim() !== '');
             if (paragraphs.length === 0 && aiResponse.trim() !== '') {
                paragraphs.push(aiResponse); // Handle single block response
             }

             paragraphs.forEach(paragraphText => {
                 const p = document.createElement('p');
                 const lines = paragraphText.split('\n');
                 lines.forEach((line, index) => {
                     p.appendChild(document.createTextNode(line));
                     if (index < lines.length - 1) {
                         p.appendChild(document.createElement('br'));
                     }
                 });
                 chapterContent.appendChild(p); // Append after H2
             });


            formatChapterContent(chapterElement); // Apply formatting after AI response
            popupContainer.remove(); // Close popup on success
            document.removeEventListener('keydown', escapeHandler);
             dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Command applied successfully to Chapter ${chapterNumber}.`);


        } catch (error) {
            console.error("Error generating AI response for chapter command:", error);
            alert(`Error applying AI command: ${error.message}. Please try again.`);
             dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Error applying command to Chapter ${chapterNumber}: ${error.message}.`);

        } finally {
            state.generating = false;
            // Re-enable buttons even on error, leave popup open for retry
            if (enterButton) enterButton.disabled = false;
            if (enterButton) enterButton.textContent = 'Apply';
            if (commandInput) commandInput.disabled = false;
            if (closeButton) closeButton.disabled = false;
            // Don't remove popup on error, allow user to close or retry
        }
    }
}

/**
 * Generates AI response based on chapter context and command, considering current settings.
 * @param {string} userInput
 * @param {string} chapterTitle
 * @param {string} command
 * @param {string} language
 * @param {number|string} chapterNumber
 * @param {object} settings - The full settings object { genre, style, chapterSize, ... }.
 * @param {HTMLElement} chapterContentElement - The element containing the current chapter text.
 * @param {object} uiElements - Object containing references to key UI elements (not used here but kept for consistency).
 * @returns {Promise<string>} The generated/revised chapter content.
 */
async function generateAiResponse(userInput, chapterTitle, command, language, chapterNumber, settings, chapterContentElement, uiElements) {

     // Get existing content to provide context
    let existingContent = '';
    chapterContentElement.querySelectorAll('p').forEach(p => {
        existingContent += p.textContent + '\n\n';
    });
    existingContent = existingContent.trim().substring(0, 1500); // Limit context size

     // Construct prompt incorporating settings and command
    let systemPrompt = `You are an AI assistant revising chapter ${chapterNumber} ("${chapterTitle}") of a book based on a user command. Use the ${language} language. The revision should maintain the chapter's context within the book and adhere to the specified generation settings. Respond ONLY with the revised full chapter content in plain text, using appropriate paragraph breaks (\n\n).`;

    // Add Generation Settings context
    const { genre, style, chapterSize } = settings;
    const wordCountTarget = chapterSize ? getWordCountTarget(chapterSize) : 1000; // Use helper function

    if (genre && genre !== 'Auto Detect') {
        systemPrompt += `\n*   The chapter's genre is "${genre}".`;
    }
    if (style && style !== 'Chosen by AI') {
        systemPrompt += `\n*   The writing style is "${style}".`;
    }
     systemPrompt += `\n*   The target length should be roughly consistent with the previous content or appropriate for the command, aiming for a general size category related to ${wordCountTarget} words.`;

    // Add Story Details context if available in settings
    if (settings.writeLikeAuthor) systemPrompt += `\n*   Attempt to emulate the style of: ${settings.writeLikeAuthor}.`;
    if (settings.storyGenre) systemPrompt += `\n*   Specific Story Genre: ${settings.storyGenre}.`;
    if (settings.storyConflict && settings.storyConflict !== 'none') systemPrompt += `\n*   Main Conflict Type: ${settings.storyConflict}.`;
    if (settings.storyBeginning) systemPrompt += `\n*   Beginning Style: ${settings.storyBeginning}.`;
    if (settings.storyMidpart) systemPrompt += `\n*   Midpart Focus: ${settings.storyMidpart}.`;
    if (settings.storyEnding) systemPrompt += `\n*   Ending Type: ${settings.storyEnding}.`;
    if (settings.storyCoreConflict) systemPrompt += `\n*   Core Theme: ${settings.storyCoreConflict}.`;


    systemPrompt += `\n\nUSER COMMAND TO APPLY TO CHAPTER ${chapterNumber}: "${command}"`;
    systemPrompt += `\n\nApply this command to the chapter, considering the following existing content (or generate appropriate content if empty and the command implies creation):`;


    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: `Book Topic Context: ${userInput}\n\nExisting Chapter Content (for context):\n${existingContent || '(No existing content provided, generate based on title, context and command)'}`,
                },
            ],
        });

        return completion.content;

    } catch (error) {
        console.error("Error in generateAiResponse:", error);
        throw new Error(`AI generation failed: ${error.message}`); // Re-throw for handling in caller
    }
}

/**
 * Helper function to map chapter size slider value to word count.
 * (Copied from chapter-generator.js for use here)
 * @param {string|number} sizeValue - The value from the chapter size slider ('1' to '8').
 * @returns {number} Approximate word count target.
 */
function getWordCountTarget(sizeValue) {
    const size = parseInt(sizeValue);
    switch (size) {
        case 1: return 250;  // Tiny
        case 2: return 500;  // Small
        case 3: return 1000; // Default
        case 4: return 1500; // Large
        case 5: return 2000; // Huge
        case 6: return 4000; // Massive
        case 7: return 6000; // Epic
        case 8: return 8000; // Colossal
        default: return 1000; // Fallback to Default
    }
}