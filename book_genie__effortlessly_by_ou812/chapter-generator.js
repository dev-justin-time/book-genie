import { formatChapterContent } from './format-chapter.js'; // Import the new function

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

/**
 * Generates all chapters in strict sequence, one after another, tracking progress and errors.
 * @param {string} userInput 
 * @param {Array} chapterTitles - List of chapter titles (array of strings)
 * @param {Array} chapterElements - Array of chapter DOM element containers corresponding to each chapter
 * @param {string} language
 * @param {object} settings - { genre, style, chapterSize, chapterGenMode }
 * @param {function} [onStatus] - Optional. Receives status messages for progress (used for console/status bar).
 * @returns {Promise<void>}
 */
export async function generateAllChaptersSequentially(
    userInput, 
    chapterTitles,
    chapterElements,
    language,
    settings = {},
    onStatus = (msg) => { if (window && window.console) window.console.log(msg); },
    globalCommand = '' // Optionally pass a global AI command
) {
    if (!Array.isArray(chapterTitles) || !Array.isArray(chapterElements) || chapterTitles.length !== chapterElements.length) {
        throw new Error('chapterTitles and chapterElements must be arrays of the same length');
    }
    const { genre, style, chapterSize, chapterGenMode = 'continuous' } = settings;

    onStatus(`Starting sequential generation of ${chapterTitles.length} chapters...`);
    
    // Update progress indicator
    updateGenerationProgress(0, 'Initializing chapter generation...');

    // --- CONTINUOUS STORY CONTEXT MEMORY ---
    let priorChaptersFullText = ''; // Holds text from all previous chapters
    for (let i = 0; i < chapterTitles.length; i++) {
        const chapterTitle = chapterTitles[i];
        const chapterElement = chapterElements[i];
        const chapterNumber = i + 1;
        
        const progress = ((i + 1) / chapterTitles.length) * 100;
        updateGenerationProgress(progress, `Generating Chapter ${chapterNumber}: "${chapterTitle}"`);
        
        onStatus(`Generating Chapter ${chapterNumber} of ${chapterTitles.length}: "${chapterTitle}"...`);

        // Determine prompt context for this generation step
        let chapterContext = '';
        if (chapterGenMode === 'continuous') {
            chapterContext = priorChaptersFullText; // Use all previous text so far for context
        } else {
            chapterContext = ''; // Standalone: no prior context
        }

        try {
            // Add chapter status indicator
            addChapterStatusIndicator(chapterElement, 'in-progress');
            
            // Pass prior chapters' text as 'previousChapterContext'
            const content = await generateChapterContent(
                userInput,
                chapterTitle,
                chapterElement,
                language,
                chapterNumber,
                genre,
                style,
                chapterSize,
                globalCommand,
                onStatus,
                {
                    previousChapterContext: chapterContext
                }
            );
            
            // Update chapter status
            addChapterStatusIndicator(chapterElement, 'completed');
            
            // Add current chapter's content to priorChaptersFullText for chaining next round
            if (chapterGenMode === 'continuous' && content) {
                // Use only real text (ignore images/elements)
                if (typeof content === 'string') {
                    priorChaptersFullText += '\n\n' + content;
                } else if (Array.isArray(content)) {
                    priorChaptersFullText += '\n\n' + content.join('\n\n');
                }
            }
            onStatus(`✓ Chapter ${chapterNumber} generated successfully.`);
        } catch (error) {
            addChapterStatusIndicator(chapterElement, 'error');
            onStatus(`✗ Error generating Chapter ${chapterNumber}: ${error && error.message ? error.message : error}`);
        }
    }
    
    updateGenerationProgress(100, 'All chapters generated successfully!');
    setTimeout(() => {
        const overlay = document.getElementById('generation-progress-overlay');
        if (overlay) overlay.style.display = 'none';
    }, 2000);
    
    onStatus('All chapters generated sequentially.');
}

/**
 * Updates the visual progress indicator
 * @param {number} progress - Progress percentage (0-100)  
 * @param {string} message - Status message to display
 */
function updateGenerationProgress(progress, message) {
    const fill = document.getElementById('progress-bar-fill');
    const text = document.getElementById('progress-text');
    
    if (fill) fill.style.width = `${Math.min(progress, 100)}%`;
    if (text) text.textContent = message;
}

/**
 * Adds a visual status indicator to a chapter
 * @param {HTMLElement} chapterElement - The chapter container element
 * @param {string} status - Status: 'in-progress', 'completed', 'error'
 */
function addChapterStatusIndicator(chapterElement, status) {
    let indicator = chapterElement.querySelector('.chapter-status-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'chapter-status-indicator';
        chapterElement.appendChild(indicator);
    }
    
    indicator.classList.remove('in-progress', 'completed', 'error');
    indicator.classList.add(status);
    
    const statusIcons = {
        'in-progress': '⏳',
        'completed': '✅', 
        'error': '❌'
    };
    
    indicator.textContent = statusIcons[status] || '○';
}

/**
 * Generates the content for a single chapter, applying all current settings and logging status.
 * Optionally accepts an options object for context chaining.
 */
export async function generateChapterContent(
    userInput,
    chapterTitle,
    chapterElement,
    language,
    chapterNumber,
    genre,
    style,
    chapterSize,
    globalCommand = '',
    onStatus = (msg) => { if (window && window.console) window.console.log(msg); },
    options = {}
) {
    const contentDiv = chapterElement.querySelector('.chapter-content');
    if (!contentDiv) {
        console.error(`Chapter content div not found for chapter ${chapterNumber}`);
        onStatus && onStatus(`Error: Chapter content div not found for #${chapterNumber}`);
        return;
    }
    // Always ensure the H2 title is at the top of the chapter content
    let h2Title = contentDiv.querySelector('h2');
    if (!h2Title) {
        h2Title = document.createElement('h2');
        h2Title.textContent = `${chapterNumber}. ${chapterTitle}`;
        contentDiv.insertBefore(h2Title, contentDiv.firstChild);
    } else {
        h2Title.textContent = `${chapterNumber}. ${chapterTitle}`;
    }

    // Remove everything except the h2 title
    Array.from(contentDiv.childNodes).forEach(node => {
        if (node !== h2Title) contentDiv.removeChild(node);
    });

    // Add generating message after h2
    const generatingMsg = document.createElement('p');
    generatingMsg.innerHTML = '<i>Generating content...</i>';
    contentDiv.appendChild(generatingMsg);

    const wordCountTarget = getWordCountTarget(chapterSize);

    // Construct the system prompt, with CONTEXT CHAINING if any
    let systemPrompt = `You are a helpful assistant that generates the content for Chapter ${chapterNumber} of a book. Use the ${language} language.
The chapter should be engaging and relevant to the overall book topic, the user's input, and the provided chapter title.
Respond with the full chapter content in plain text, suitable for direct display. Ensure proper paragraph breaks (\n\n) are used.

IMPORTANT: The target length for this chapter is approximately ${wordCountTarget} words. Adhere closely to this requested length.`;

    if (genre && genre !== 'Auto Detect') {
        systemPrompt += `\nEnsure the content fits the "${genre}" genre.`;
    } else {
        systemPrompt += `\nInfer the appropriate genre from the book topic and chapter title, and write accordingly.`;
    }

    if (style && style !== 'Chosen by AI') {
        systemPrompt += `\nAdopt a "${style}" writing style.`;
    } else {
         systemPrompt += `\nAdopt a writing style appropriate for the inferred genre and topic.`;
    }

    systemPrompt += `\nFocus on developing the narrative or information related to the chapter title: "${chapterTitle}".`;

    // Context chaining: insert previous chapter(s) (for "continuous" mode)
    if (options && options.previousChapterContext && options.previousChapterContext.trim()) {
        systemPrompt += `\n\nHere is the full content of all previous chapters for context, to continue the story:\n"""${options.previousChapterContext.trim().slice(0, 6200)}"""\nContinue the narrative logically from this point. Do not repeat previous scenes/events.`;
    } else {
        // Standalone or first chapter: just main story context
    }

    // Add global command if provided
    if (globalCommand) {
        systemPrompt += `\n\nADDITIONAL INSTRUCTION: Apply the following user command to the generated chapter content: "${globalCommand}"`;
    }

    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: `Book Topic Context: ${userInput}\nChapter Number: ${chapterNumber}\nChapter Title: ${chapterTitle}`,
                },
            ],
        });

        // Remove generating message
        if (contentDiv.lastChild === generatingMsg) {
            contentDiv.removeChild(generatingMsg);
        }

        if (!contentDiv.firstChild || contentDiv.firstChild !== h2Title) {
            contentDiv.insertBefore(h2Title, contentDiv.firstChild);
        }

        // Split content by paragraphs, insert after h2
        const paragraphs = completion.content.split(/\n\s*\n/).filter(p => p.trim() !== '');

        paragraphs.forEach(paragraphText => {
            const p = document.createElement('p');
            const lines = paragraphText.split('\n');
            lines.forEach((line, index) => {
                p.appendChild(document.createTextNode(line));
                if (index < lines.length - 1) {
                    p.appendChild(document.createElement('br'));
                }
            });
            contentDiv.appendChild(p);
        });

        formatChapterContent(chapterElement);

        onStatus && onStatus(`Chapter ${chapterNumber}: generation complete.`);

        // --- Return result text (for context chaining with "continuous" mode) ---
        // Concatenate all paragraphs for next iteration
        return paragraphs.join('\n\n');
    } catch (error) {
        console.error(`Error generating chapter ${chapterNumber} content:`, error);
        if (contentDiv.lastChild === generatingMsg) {
            contentDiv.removeChild(generatingMsg);
        }
        const errorMsg = document.createElement('p');
        errorMsg.style.color = 'red';
        errorMsg.innerHTML = `Failed to generate chapter content. Please try again. <a href="#" class="regenerate-chapter-link" data-chapter-number="${chapterNumber}">Retry</a>`;
        contentDiv.appendChild(errorMsg);

        const retryLink = contentDiv.querySelector('.regenerate-chapter-link');
        if (retryLink) {
            retryLink.addEventListener('click', (event) => {
                event.preventDefault();
                alert("Please use the main regenerate button (🔄 in the tool menu) to retry generation.");
            }, { once: true });
        }

        onStatus && onStatus(`✗ Error in Chapter ${chapterNumber}: ${error && error.message ? error.message : error}`);
    }
}