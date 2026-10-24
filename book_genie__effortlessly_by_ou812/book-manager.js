import config from './config.js';
import { updateChapterSizeSublabel } from './ui-helpers.js'; // Import the helper
import { createImageContainer, updateMoveButtonStates } from './image-popup.js';

// Detect Language (no changes needed)
export async function detectLanguage(text) {
    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Detect the language of the following text. Respond directly with JSON, following this JSON schema, and no other text.
                        {
                            "language": string
                        }`,
                },
                {
                    role: "user",
                    content: text,
                },
            ],
            json: true,
        });

        const result = JSON.parse(completion.content);
        return result.language;

    } catch (error) {
        console.warn("Error detecting language:", error);
        return null;
    }
}

// Generate Chapter Data (no changes needed)
export async function generateChapterData(userInput, language, genre, style, chapterCount) {
    // Use genre and style in the prompt
    let systemPrompt = `You are a helpful assistant that generates a list of exactly ${chapterCount} chapter titles for a book, based on the user's input. Also generate a relevant title for the book itself. Use the ${language} language. Respond directly with JSON, following this JSON schema, and no other text.
                        {
                            "chapterTitles": [string, ...],
                            "bookTitle": string
                        }`;

    // Add genre/style instructions if not default
    if (genre && genre !== 'Auto Detect') {
        systemPrompt += `\nThe book should be in the "${genre}" genre.`;
    } else {
         systemPrompt += `\nChoose an appropriate genre for the book based on the user input.`;
    }
    if (style && style !== 'Chosen by AI') {
        systemPrompt += `\nThe writing style should be "${style}".`;
    } else {
         systemPrompt += `\nChoose an appropriate writing style for the book based on the user input and chosen genre.`;
    }
     systemPrompt += `\nChapter titles should be creative and engaging, fitting the overall theme, genre, and style.`;


    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: userInput,
                },
            ],
            json: true,
        });

        const result = JSON.parse(completion.content);
        let imageUrl = null;
        try {
             // Generate image based on title, genre, style for better relevance
            const imagePrompt = `Cover image for a book titled "${result.bookTitle}" in the ${genre === 'Auto Detect' ? 'appropriate' : genre} genre, with a ${style === 'Chosen by AI' ? 'fitting' : style} style. Focus on the core theme derived from: ${userInput.substring(0, 150)}`;
            const imageGenResult = await websim.imageGen({
                prompt: imagePrompt,
                aspect_ratio: "16:9", // Changed aspect ratio slightly
            });
            imageUrl = imageGenResult.url;
        } catch (imageError) {
            console.error("Error generating cover image:", imageError);
            // Consider a generic fallback or no image URL
            // imageUrl = 'initial-background.jpg'; // Fallback image URL (if you have one)
        }

        // Ensure chapterTitles is an array
        const chapterTitles = Array.isArray(result.chapterTitles) ? result.chapterTitles : [];

        return { chapterTitles: chapterTitles, bookTitle: result.bookTitle || "Untitled Book", imageUrl: imageUrl };

    } catch (error) {
        console.error("Error generating chapter titles:", error);
         // Provide a more informative error return
        return { chapterTitles: ["Chapter 1: Error Occurred"], bookTitle: 'Generation Error', imageUrl: null };
    }
}

// Load Functionality
/**
 * Loads book data from a file, updates UI elements, and restores chapter/settings states.
 * Handles both old (string content) and new (array content) chapter formats.
 * Now also loads sources and links for each chapter.
 * @param {File} file - The JSON file to load.
 * @param {HTMLElement} chaptersContainer - The TOC container.
 * @param {HTMLElement} bookContent - The main content area for chapters.
 * @param {HTMLElement} title - The H1 title element.
 * @param {HTMLSelectElement} languageSelect - The language dropdown.
 * @param {HTMLSelectElement} genreSelect - The genre dropdown.
 * @param {HTMLSelectElement} styleSelect - The style dropdown.
 * @param {HTMLInputElement} chapterSizeSlider - The chapter size slider.
 * @param {HTMLElement} chapterSizeSublabel - The sublabel for the slider.
 * @param {HTMLInputElement} chapterCountInput - The chapter count input.
 * @returns {Promise<object>} A promise resolving with the loaded data object including chapters, settings, and bookmark ID.
 */
export async function loadBookData(
    file, chaptersContainer, bookContent, title, languageSelect,
    genreSelect, styleSelect, chapterSizeSlider, chapterSizeSublabel, chapterCountInput // Receive settings UI elements
) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error("No file provided for loading."));
        }

        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const loadedData = JSON.parse(e.target.result);

                if (typeof loadedData !== 'object' || loadedData === null) {
                    throw new Error("Loaded data is not a valid JSON object.");
                }

                const inputText = loadedData.inputText || '';
                const language = loadedData.language || 'auto';
                const bookTitle = loadedData.bookTitle || 'AI Book Generator';
                const imageUrl = loadedData.imageUrl || null;

                // --- Normalize Chapter Content Structure ---
                const chapters = (loadedData.chapters || []).map((ch, index) => { // Added index for logging
                    let normalizedContent = [];
                    let isCollapsed = ch.collapsed ?? false;

                    if (Array.isArray(ch.content)) {
                        normalizedContent = ch.content.map(item => ({
                            text: item.text ?? null,
                            imageUrl: item.imageUrl ?? null,
                            isRound: item.isRound ?? false
                        })).filter(item => item.text !== null || item.imageUrl !== null);
                    } else if (typeof ch.content === 'string') {
                        console.log(`Chapter ${index + 1} (${ch.title}): Converting old string content format.`);
                        const paragraphs = ch.content.split(/\n\s*\n/).filter(p => p.trim() !== '');
                        normalizedContent = paragraphs.map(pText => ({
                            text: pText,
                            imageUrl: null,
                            isRound: false
                        }));
                    } else if (ch.paragraphs && Array.isArray(ch.paragraphs)) {
                         console.warn(`Chapter ${index + 1} (${ch.title}): Found legacy 'paragraphs' key. Converting...`);
                         normalizedContent = ch.paragraphs.map(item => ({
                            text: item.text ?? null,
                            imageUrl: item.imageUrl ?? null,
                            isRound: item.isRound ?? false
                         })).filter(item => item.text !== null || item.imageUrl !== null);
                    } else {
                         console.warn(`Chapter ${index + 1} ("${ch.title}") has unexpected or missing content structure. Content will be empty.`);
                         normalizedContent = [];
                    }

                    return {
                        title: ch.title || `Untitled Chapter ${index + 1}`,
                        content: normalizedContent,
                        collapsed: isCollapsed,
                        ...(Array.isArray(ch.sources) ? { sources: ch.sources } : {})
                    };
                });
                // --- End Normalize Chapter Content ---

                const settings = (typeof loadedData.settings === 'object' && loadedData.settings !== null) ? loadedData.settings : {};
                const bookmarkedChapterId = loadedData.bookmarkedChapterId || null;

                // --- Update Settings UI ---
                const loadedGenre = settings.genre !== undefined ? settings.genre : 'Auto Detect';
                const loadedStyle = settings.style !== undefined ? settings.style : 'Chosen by AI';
                const loadedChapterSize = settings.chapterSize !== undefined ? settings.chapterSize : '4';
                const loadedChapterCount = settings.chapterCount !== undefined ? settings.chapterCount : 28;

                if (genreSelect) {
                    if (Array.from(genreSelect.options).some(opt => opt.value === loadedGenre)) {
                        genreSelect.value = loadedGenre;
                    } else {
                         if (settings.isCustomGenre && loadedGenre !== 'Auto Detect') {
                             // Add the custom genre if it doesn't exist
                             const { addCustomGenreOption } = await import('./ui-helpers.js'); // Dynamic import
                             addCustomGenreOption(genreSelect, loadedGenre);
                             genreSelect.value = loadedGenre;
                         } else {
                            console.warn(`Loaded genre "${loadedGenre}" not found in options. Resetting to "Auto Detect".`);
                            genreSelect.value = 'Auto Detect';
                         }
                    }
                    // REMOVED: genreSelect.dispatchEvent(new Event('change'));
                    // Hide/show custom input based on loaded value without triggering change event
                    const customGenreInput = document.getElementById('custom-genre-input');
                    if (customGenreInput) {
                         customGenreInput.style.display = (genreSelect.value === '_custom_genre' || settings.isCustomGenre) ? 'block' : 'none';
                         if (settings.isCustomGenre && loadedGenre !== '_custom_genre') {
                             customGenreInput.value = loadedGenre; // Pre-fill if it was a saved custom one
                         }
                    }
                }
                if (styleSelect) {
                    if (Array.from(styleSelect.options).some(opt => opt.value === loadedStyle)) {
                        styleSelect.value = loadedStyle;
                    } else {
                        console.warn(`Loaded style "${loadedStyle}" not found in options. Resetting to "Chosen by AI".`);
                        styleSelect.value = 'Chosen by AI';
                    }
                }

                if (chapterSizeSlider) {
                    const sizeValue = parseInt(loadedChapterSize);
                     if (!isNaN(sizeValue) && sizeValue >= parseInt(chapterSizeSlider.min) && sizeValue <= parseInt(chapterSizeSlider.max)) {
                        chapterSizeSlider.value = loadedChapterSize;
                     } else {
                         console.warn(`Loaded chapter size "${loadedChapterSize}" is invalid or out of range [${chapterSizeSlider.min}-${chapterSizeSlider.max}]. Resetting to default.`);
                         chapterSizeSlider.value = '4';
                     }
                     if(chapterSizeSublabel) {
                          updateChapterSizeSublabel(chapterSizeSlider, chapterSizeSublabel);
                     }
                }

                if (chapterCountInput) {
                    const countValue = parseInt(loadedChapterCount);
                     if (!isNaN(countValue) && countValue >= parseInt(chapterCountInput.min) && countValue <= parseInt(chapterCountInput.max)) {
                        chapterCountInput.value = loadedChapterCount;
                     } else {
                        console.warn(`Loaded chapter count "${loadedChapterCount}" is invalid or out of range [${chapterCountInput.min}-${chapterCountInput.max}]. Resetting to default.`);
                        chapterCountInput.value = '28';
                     }
                }

                resolve({ inputText, language, bookTitle, imageUrl, chapters, settings, bookmarkedChapterId });

            } catch (parseError) {
                console.error("Error parsing loaded JSON:", parseError);
                reject(new Error(`Invalid JSON format: ${parseError.message}`));
            }
        };
        reader.onerror = (error) => {
             console.error("Error reading file:", error);
             reject(new Error("Could not read the file."));
         };
        reader.readAsText(file);
    });
}

// Save Functionality
/**
 * Gathers data from the UI to be saved as a JSON file.
 * Saves chapter content in the new structured format (array of text/image objects).
 * @param {HTMLTextAreaElement} inputText - The main text input element.
 * @param {HTMLSelectElement} languageSelect - The language select element.
 * @param {HTMLElement} title - The H1 title element.
 * @param {HTMLElement} bookContent - The container for chapter elements.
 * @param {HTMLInputElement} chapterCountInput - The input for number of chapters.
 * @param {HTMLSelectElement} genreSelect - The genre select element.
 * @param {HTMLSelectElement} styleSelect - The style select element.
 * @param {HTMLInputElement} chapterSizeSlider - The chapter size slider.
 * @param {string|null} bookmarkedChapterId - The ID of the currently bookmarked chapter.
 * @returns {object} The data object ready to be stringified.
 */
export function saveBookData(
    inputText, languageSelect, title, bookContent,
    chapterCountInput, // Add chapter count input
    genreSelect, styleSelect, chapterSizeSlider, // Other settings UI elements
    bookmarkedChapterId // Add bookmarked chapter ID
) {
    // Get Current Settings (using a separate function or inline)
    const currentSettings = {
        genre: genreSelect ? genreSelect.value : 'Auto Detect',
        isCustomGenre: false, // Determine if it's custom based on value or a dedicated input
        style: styleSelect ? styleSelect.value : 'Chosen by AI',
        chapterSize: chapterSizeSlider ? chapterSizeSlider.value : '4',
        chapterCount: chapterCountInput ? parseInt(chapterCountInput.value) || 28 : 28
        // Add other relevant settings like story details if they exist
    };
    // Check if genre is custom (example, might need refinement based on actual implementation)
    const customGenreInput = document.getElementById('custom-genre-input');
    if (genreSelect && genreSelect.value === '_custom_genre' && customGenreInput) {
        currentSettings.genre = customGenreInput.value.trim() || 'Auto Detect'; // Save the custom value
        currentSettings.isCustomGenre = true;
    } else if (genreSelect) {
        const predefinedGenres = ["Auto Detect", "_custom_genre", ...config.genres];
        currentSettings.isCustomGenre = !predefinedGenres.includes(genreSelect.value);
        // If it's a saved custom one (not _custom_genre but not predefined), isCustomGenre is true
    }

    const dataToSave = {
        inputText: inputText.value,
        language: languageSelect.value,
        bookTitle: title.textContent,
        imageUrl: document.body.style.backgroundImage ? document.body.style.backgroundImage.slice(5, -2).replace(/"/g, "") : null,
        settings: currentSettings, // Save the settings object
        bookmarkedChapterId: bookmarkedChapterId,
        chapters: Array.from(bookContent.children).filter(el => el.classList.contains('chapter')).map((chapterDiv, index) => {
            const chapterContentDiv = chapterDiv.querySelector('.chapter-content');
            const chapterNumber = chapterDiv.id.split('-').pop() || (index + 1);
            const collapseCheckbox = chapterDiv.querySelector(`#chapter-collapse-${chapterNumber}`);
            const isCollapsed = collapseCheckbox ? collapseCheckbox.checked : false;

            if (!chapterContentDiv) {
                 console.warn(`Chapter content div not found during save for chapter ${chapterNumber}`);
                 return { title: `Error: Content Missing (Chapter ${chapterNumber})`, content: [], collapsed: isCollapsed };
            }

            // --- Get Chapter Title (no changes needed) ---
            let chapterTitle = `Untitled Chapter ${chapterNumber}`;
            const titleElement = chapterContentDiv.querySelector('h2');
            const titleInput = chapterContentDiv.querySelector('.chapter-title-edit-input');
            if (titleInput) {
                 chapterTitle = titleInput.value.trim() || `Chapter ${chapterNumber}`;
            } else if (titleElement && titleElement.textContent) {
                 chapterTitle = titleElement.textContent.replace(/^\d+\.\s*/, '').trim();
            } else {
                 const collapseLabel = chapterDiv.querySelector(`label[for="chapter-collapse-${chapterNumber}"]`);
                 if (collapseLabel && collapseLabel.dataset.chapterTitle) {
                     chapterTitle = collapseLabel.dataset.chapterTitle.replace(/^\d+\.\s*/, '').trim();
                     console.warn(`Chapter ${chapterNumber} title retrieved from collapse label as fallback.`);
                 } else {
                     console.warn(`Could not determine title for Chapter ${chapterNumber}.`);
                 }
            }

            // --- Extract Structured Content (Paragraphs and Images) ---
            const content = [];
            // Iterate through direct children of chapterContentDiv, excluding the H2
            chapterContentDiv.childNodes.forEach(node => {
                if (node === titleElement || node === titleInput) { // Skip title element/input
                    return;
                }

                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.tagName === 'P') {
                        let pText = '';
                        // Rebuild text content, preserving <br> as newlines
                        node.childNodes.forEach((childNode) => {
                            if (childNode.nodeType === Node.TEXT_NODE) {
                                pText += childNode.textContent;
                            } else if (childNode.tagName === 'BR') {
                                pText += '\n';
                            }
                        });
                         // Only add paragraph if it has non-whitespace content
                         if (pText.trim()) {
                             content.push({ text: pText, imageUrl: null, isRound: false });
                         }
                    } else if (node.classList.contains('image-container')) {
                         // Find the image URL and round state within the container
                         const imgElement = node.querySelector('img');
                         if (imgElement && imgElement.src) {
                            const isRound = imgElement.classList.contains('round-cutout');
                            content.push({ text: null, imageUrl: imgElement.src, isRound: isRound });
                         }
                    } else if (node.tagName === 'IMG') {
                        // Handle potential standalone images (e.g., from old format or direct edit)
                         console.warn(`Found standalone image in chapter ${chapterNumber}, saving.`);
                         const isRound = node.classList.contains('round-cutout'); // Check if it has the class
                         content.push({ text: null, imageUrl: node.src, isRound: isRound });
                    }
                } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                     // Handle potential stray text nodes (unlikely but possible)
                     console.warn(`Found stray text node in chapter ${chapterNumber}: "${node.textContent.trim()}"`);
                     content.push({ text: node.textContent.trim(), imageUrl: null, isRound: false });
                 }
            });

            // --- Extract sources and links if present ---
            const sources = [];
            const sourcesContainer = chapterContentDiv.querySelector('.chapter-sources-container');
            if (sourcesContainer) {
                sourcesContainer.querySelectorAll('.chapter-source-link').forEach(linkDiv => {
                    const a = linkDiv.querySelector('a');
                    const title = a ? a.textContent : '';
                    const url = a ? a.href : '';
                    const type = linkDiv.querySelector('span')?.textContent || '';
                    const desc = linkDiv.querySelector('span + span')?.textContent || '';
                    sources.push({
                        title,
                        url,
                        type,
                        description: desc
                    });
                });
            }

            return {
                title: chapterTitle,
                content: content, // Save the structured content array
                collapsed: isCollapsed,
                ...(sources.length ? { sources } : {})
            };
        }),
    };
    return dataToSave;
}