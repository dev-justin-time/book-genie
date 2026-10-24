/**
 * Formats chapter content by applying consistent styling and structure.
 * @param {HTMLElement} chapterElement - The main chapter element to format.
 */
export function formatChapterContent(chapterElement) {
    if (!chapterElement) {
        console.error("No chapter element provided for formatting");
        return;
    }

    const contentDiv = chapterElement.querySelector('.chapter-content');
    if (!contentDiv) {
        console.error("Chapter content div not found");
        return;
    }

    // --- Basic Paragraph Formatting ---
    contentDiv.querySelectorAll('p').forEach(p => {
        // Ensure consistent spacing
        p.style.lineHeight = '1.7';
        p.style.marginBottom = '1.2em';
        p.style.textAlign = 'justify';

        // Handle any empty paragraphs
        if (p.textContent.trim() === '') {
            p.remove();
        }
    });

    // --- Image Container Formatting ---
    contentDiv.querySelectorAll('img:not(.round-cutout)').forEach(img => {
        // If the image is not already in a container, wrap it
        if (!img.parentElement.classList.contains('image-container')) {
            const container = document.createElement('div');
            container.classList.add('image-container');
            img.parentNode.insertBefore(container, img);
            container.appendChild(img);
            
            // Add image controls
            const controls = document.createElement('div');
            controls.classList.add('image-controls');
            
            // Move Up Button
            const moveUpButton = document.createElement('button');
            moveUpButton.classList.add('image-control-button');
            moveUpButton.innerHTML = '&#x25B2;'; // Up arrow
            moveUpButton.title = 'Move Image Up';
            controls.appendChild(moveUpButton);
            
            // Move Down Button
            const moveDownButton = document.createElement('button');
            moveDownButton.classList.add('image-control-button');
            moveDownButton.innerHTML = '&#x25BC;'; // Down arrow
            moveDownButton.title = 'Move Image Down';
            controls.appendChild(moveDownButton);
            
            // Delete Button
            const deleteButton = document.createElement('button');
            deleteButton.classList.add('image-control-button', 'delete');
            deleteButton.innerHTML = '&#x1F5D1;'; // Trash can icon
            deleteButton.title = 'Delete Image';
            controls.appendChild(deleteButton);
            
            container.appendChild(controls);
            
            // Add event listeners via reAttachImageControls (will be handled elsewhere)
        }
    });
    
    // --- Round Images (Special Case) ---
    contentDiv.querySelectorAll('img.round-cutout').forEach(img => {
        if (!img.parentElement.classList.contains('image-container')) {
            const container = document.createElement('div');
            container.classList.add('image-container');
            img.parentNode.insertBefore(container, img);
            container.appendChild(img);
            
            // Same controls as above
            const controls = document.createElement('div');
            controls.classList.add('image-controls');
            
            const moveUpButton = document.createElement('button');
            moveUpButton.classList.add('image-control-button');
            moveUpButton.innerHTML = '&#x25B2;';
            moveUpButton.title = 'Move Image Up';
            controls.appendChild(moveUpButton);
            
            const moveDownButton = document.createElement('button');
            moveDownButton.classList.add('image-control-button');
            moveDownButton.innerHTML = '&#x25BC;';
            moveDownButton.title = 'Move Image Down';
            controls.appendChild(moveDownButton);
            
            const deleteButton = document.createElement('button');
            deleteButton.classList.add('image-control-button', 'delete');
            deleteButton.innerHTML = '&#x1F5D1;';
            deleteButton.title = 'Delete Image';
            controls.appendChild(deleteButton);
            
            container.appendChild(controls);
        }
    });
    
    // --- Heading Formatting ---
    const h2Element = contentDiv.querySelector('h2');
    if (h2Element) {
        h2Element.style.marginTop = '0';
        h2Element.style.marginBottom = '15px';
        h2Element.style.borderBottom = '1px solid var(--border-primary)';
        h2Element.style.paddingBottom = '8px';
    }
    
    // --- Ensure Line Break Tags are Preserved ---
    contentDiv.querySelectorAll('br').forEach(br => {
        if (br.parentNode.nodeName === 'P') {
            // Check if <br> tag is surrounded by text nodes
            const prev = br.previousSibling;
            const next = br.nextSibling;
            
            if ((prev && prev.nodeType === Node.TEXT_NODE) || 
                (next && next.nodeType === Node.TEXT_NODE)) {
                // Preserve valid line breaks
            } else {
                // Remove orphaned <br> tags
                br.remove();
            }
        }
    });
}

/**
 * Opens a popup for advanced paragraph editing and formatting
 * @param {string} userInput - The main book topic/input
 * @param {string} chapterTitle - The title of the current chapter
 * @param {HTMLElement} chapterElement - The main element containing the chapter's content
 * @param {string} language - The selected language for the chapter
 * @param {number|string} chapterNumber - The number of the chapter
 * @param {object} settings - Current generation settings
 * @param {object} state - Global state object
 * @param {object} dependencies - Helper functions and utilities
 * @param {object} uiElements - Global UI elements
 */
export function openFormatPopup(userInput, chapterTitle, chapterElement, language, chapterNumber, settings, state, dependencies, uiElements) {
    if (document.querySelector('.format-popup')) return;
    
    // Add null checks for required parameters
    if (!chapterElement) {
        console.error("Chapter element is required for format popup");
        return;
    }
    
    const contentDiv = chapterElement.querySelector('.chapter-content');
    if (!contentDiv) {
        console.error("Chapter content element not found for format popup");
        return;
    }
    
    // Initialize default values if parameters are undefined
    userInput = userInput || '';
    chapterTitle = chapterTitle || `Chapter ${chapterNumber}`;
    language = language || 'en';
    chapterNumber = chapterNumber || '1';
    settings = settings || {};
    state = state || {};
    dependencies = dependencies || {};
    uiElements = uiElements || {};
    
    // Safe access to dependencies with fallbacks
    const logToAIConsole = dependencies.logToAIConsole || ((hist, console, msg) => { 
        if (console) console.innerHTML += `<div>${msg}</div>`;
    });
    
    // Create popup container
    const popupContainer = document.createElement('div');
    popupContainer.classList.add('format-popup');
    popupContainer.style.position = 'fixed';
    popupContainer.style.top = '0';
    popupContainer.style.left = '0';
    popupContainer.style.width = '100%';
    popupContainer.style.height = '100%';
    popupContainer.style.backgroundColor = 'var(--popup-bg)';
    popupContainer.style.display = 'flex';
    popupContainer.style.justifyContent = 'center';
    popupContainer.style.alignItems = 'center';
    popupContainer.style.zIndex = '10000';
    
    // Create popup content
    const popupContent = document.createElement('div');
    popupContent.classList.add('format-popup-content');
    popupContent.style.backgroundColor = 'var(--popup-content-bg)';
    popupContent.style.padding = '20px 30px';
    popupContent.style.borderRadius = '8px';
    popupContent.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    popupContent.style.position = 'relative';
    popupContent.style.width = '90%';
    popupContent.style.maxWidth = '900px';
    popupContent.style.maxHeight = '90vh';
    popupContent.style.overflowY = 'auto';
    popupContent.style.display = 'flex';
    popupContent.style.flexDirection = 'column';
    popupContent.style.gap = '15px';
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.classList.add('popup-close-button');
    closeButton.innerHTML = '&times;';
    closeButton.title = 'Close Popup';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.background = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = 'var(--text-secondary)';
    closeButton.style.zIndex = '1';
    closeButton.style.padding = '0';
    closeButton.style.lineHeight = '1';
    popupContent.appendChild(closeButton);
    
    // Popup header
    const title = document.createElement('h3');
    title.textContent = `Paragraph Editor - Chapter ${chapterNumber}`;
    title.style.marginTop = '0';
    title.style.textAlign = 'center';
    popupContent.appendChild(title);
    
    // Instruction text
    const instruction = document.createElement('p');
    instruction.textContent = 'Edit, resize, or regenerate individual paragraphs';
    instruction.style.textAlign = 'center';
    instruction.style.fontStyle = 'italic';
    instruction.style.color = 'var(--text-secondary)';
    instruction.style.marginTop = '0';
    popupContent.appendChild(instruction);
    
    // --- SETTINGS SECTION (NEW) ---
    const settingsPanel = document.createElement('div');
    settingsPanel.style.padding = '12px';
    settingsPanel.style.backgroundColor = 'var(--chapter-box-bg)';
    settingsPanel.style.borderRadius = '8px';
    settingsPanel.style.marginBottom = '10px';
    
    const settingsTitle = document.createElement('h4');
    settingsTitle.textContent = 'Generation Settings';
    settingsTitle.style.margin = '0 0 10px 0';
    settingsTitle.style.fontSize = '1.1em';
    settingsPanel.appendChild(settingsTitle);
    
    // Current settings display and controls
    const settingsGrid = document.createElement('div');
    settingsGrid.style.display = 'grid';
    settingsGrid.style.gridTemplateColumns = 'auto 1fr';
    settingsGrid.style.gap = '10px';
    settingsGrid.style.alignItems = 'center';
    
    // Helper function to add setting row (label + control)
    const addSettingRow = (labelText, control) => {
        const label = document.createElement('label');
        label.textContent = labelText + ':';
        label.style.fontWeight = 'bold';
        settingsGrid.appendChild(label);
        settingsGrid.appendChild(control);
    };
    
    // Language setting
    const languageSelect = document.createElement('select');
    languageSelect.id = 'format-language-select';
    
    // Add auto option
    const autoOption = document.createElement('option');
    autoOption.value = 'auto';
    autoOption.textContent = 'Auto Detect';
    languageSelect.appendChild(autoOption);
    
    // Add current language as selected
    const currentLangOption = document.createElement('option');
    currentLangOption.value = language;
    currentLangOption.textContent = language;
    currentLangOption.selected = true;
    languageSelect.appendChild(currentLangOption);
    
    // Try to get all options from main language select
    const mainLangSelect = document.getElementById('language-select');
    if (mainLangSelect) {
        Array.from(mainLangSelect.options).forEach(opt => {
            if (opt.value !== 'auto' && opt.value !== 'custom' && opt.value !== language) {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.textContent;
                languageSelect.appendChild(option);
            }
        });
    }
    addSettingRow('Language', languageSelect);
    
    // Genre setting
    const genreSelect = document.createElement('select');
    genreSelect.id = 'format-genre-select';
    
    // Add current genre as selected
    const currentGenreOption = document.createElement('option');
    currentGenreOption.value = settings.genre || 'Auto Detect';
    currentGenreOption.textContent = settings.genre || 'Auto Detect';
    currentGenreOption.selected = true;
    genreSelect.appendChild(currentGenreOption);
    
    // Try to get options from main genre select
    const mainGenreSelect = document.getElementById('genre-select');
    if (mainGenreSelect) {
        Array.from(mainGenreSelect.options).forEach(opt => {
            if (opt.value !== '_custom_genre' && opt.value !== settings.genre) {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.textContent;
                genreSelect.appendChild(option);
            }
        });
    } else {
        // Fallback options if main select not found
        ['Auto Detect', 'Fiction', 'Non-Fiction', 'Fantasy', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller'].forEach(genre => {
            if (genre !== settings.genre) {
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                genreSelect.appendChild(option);
            }
        });
    }
    addSettingRow('Genre', genreSelect);
    
    // Style setting
    const styleSelect = document.createElement('select');
    styleSelect.id = 'format-style-select';
    
    // Add current style as selected
    const currentStyleOption = document.createElement('option');
    currentStyleOption.value = settings.style || 'Chosen by AI';
    currentStyleOption.textContent = settings.style || 'Chosen by AI';
    currentStyleOption.selected = true;
    styleSelect.appendChild(currentStyleOption);
    
    // Try to get options from main style select
    const mainStyleSelect = document.getElementById('style-select');
    if (mainStyleSelect) {
        Array.from(mainStyleSelect.options).forEach(opt => {
            if (opt.value !== settings.style) {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.textContent;
                styleSelect.appendChild(option);
            }
        });
    } else {
        // Fallback options if main select not found
        ['Chosen by AI', 'Formal', 'Informal', 'Descriptive', 'Narrative', 'Poetic', 'Technical'].forEach(style => {
            if (style !== settings.style) {
                const option = document.createElement('option');
                option.value = style;
                option.textContent = style;
                styleSelect.appendChild(option);
            }
        });
    }
    addSettingRow('Style', styleSelect);
    
    // Chapter size for new paragraphs
    const sizeSelect = document.createElement('select');
    sizeSelect.id = 'format-size-select';
    
    const sizeOptions = [
        { value: '1', text: 'Tiny (~250 words)' },
        { value: '2', text: 'Small (~500 words)' },
        { value: '3', text: 'Default (~1000 words)' },
        { value: '4', text: 'Large (~1500 words)' },
        { value: '5', text: 'Huge (~2000 words)' },
        { value: '6', text: 'Massive (~4000 words)' },
        { value: '7', text: 'Epic (~6000 words)' },
        { value: '8', text: 'Colossal (~8000 words)' }
    ];
    
    sizeOptions.forEach(size => {
        const option = document.createElement('option');
        option.value = size.value;
        option.textContent = size.text;
        if (size.value === (settings.chapterSize || '4')) {
            option.selected = true;
        }
        sizeSelect.appendChild(option);
    });
    addSettingRow('Paragraph Size', sizeSelect);
    
    // "Open Settings" button
    const openSettingsBtn = document.createElement('button');
    openSettingsBtn.textContent = 'Open Full Settings';
    openSettingsBtn.style.gridColumn = '1 / span 2';
    openSettingsBtn.style.justifySelf = 'center';
    openSettingsBtn.style.marginTop = '10px';
    openSettingsBtn.style.padding = '6px 12px';
    openSettingsBtn.style.backgroundColor = 'var(--button-bg)';
    openSettingsBtn.style.color = 'var(--button-text)';
    openSettingsBtn.style.border = 'none';
    openSettingsBtn.style.borderRadius = '4px';
    openSettingsBtn.style.cursor = 'pointer';
    
    openSettingsBtn.addEventListener('click', () => {
        const settingsPopup = document.getElementById('settings-popup');
        if (settingsPopup) {
            // If format popup is visible, temporarily hide it
            const formatPopup = document.querySelector('.format-popup');
            if (formatPopup) {
                formatPopup.style.display = 'none';
                
                // Show settings
                settingsPopup.style.display = 'flex';
                
                // Set up listener to restore format popup when settings is closed
                const settingsCloseBtn = document.getElementById('close-settings-button');
                const restoreFormatPopup = () => {
                    settingsPopup.style.display = 'none';
                    formatPopup.style.display = 'flex';
                    settingsCloseBtn.removeEventListener('click', restoreFormatPopup);
                    document.removeEventListener('click', settingsClickOutside);
                };
                
                // Listen for clicks on the close button or outside the settings popup
                settingsCloseBtn.addEventListener('click', restoreFormatPopup);
                
                // Handle clicking outside the settings popup
                const settingsClickOutside = (event) => {
                    if (event.target === settingsPopup) {
                        restoreFormatPopup();
                    }
                };
                document.addEventListener('click', settingsClickOutside);
                
                logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                    `Opened Settings panel from Paragraph Editor`);
            }
        } else {
            alert('Settings panel not found. Please use the Settings button in the main menu.');
        }
    });
    
    settingsGrid.appendChild(openSettingsBtn);
    settingsPanel.appendChild(settingsGrid);
    popupContent.appendChild(settingsPanel);
    // --- END SETTINGS SECTION ---
    
    // Controls for the whole chapter
    const chapterControls = document.createElement('div');
    chapterControls.style.display = 'flex';
    chapterControls.style.justifyContent = 'space-between';
    chapterControls.style.alignItems = 'center';
    chapterControls.style.marginBottom = '10px';
    chapterControls.style.padding = '10px';
    chapterControls.style.backgroundColor = 'var(--chapter-box-bg)';
    chapterControls.style.borderRadius = '8px';
    
    const chapterTitle_h4 = document.createElement('h4');
    chapterTitle_h4.textContent = chapterTitle;
    chapterTitle_h4.style.margin = '0';
    chapterControls.appendChild(chapterTitle_h4);
    
    const chapterButtonsContainer = document.createElement('div');
    chapterButtonsContainer.style.display = 'flex';
    chapterButtonsContainer.style.gap = '10px';
    
    const regenerateAllBtn = document.createElement('button');
    regenerateAllBtn.textContent = 'Regenerate All Paragraphs';
    regenerateAllBtn.classList.add('format-control-button');
    regenerateAllBtn.style.padding = '8px 12px';
    regenerateAllBtn.style.backgroundColor = 'var(--button-bg)';
    regenerateAllBtn.style.color = 'var(--button-text)';
    regenerateAllBtn.style.border = 'none';
    regenerateAllBtn.style.borderRadius = '4px';
    regenerateAllBtn.style.cursor = 'pointer';
    chapterButtonsContainer.appendChild(regenerateAllBtn);
    
    const formatAllBtn = document.createElement('button');
    formatAllBtn.textContent = 'Apply Basic Formatting';
    formatAllBtn.classList.add('format-control-button');
    formatAllBtn.style.padding = '8px 12px';
    formatAllBtn.style.backgroundColor = 'var(--chapter-tool-bg)';
    formatAllBtn.style.color = 'var(--chapter-tool-text)';
    formatAllBtn.style.border = '1px solid var(--border-secondary)';
    formatAllBtn.style.borderRadius = '4px';
    formatAllBtn.style.cursor = 'pointer';
    chapterButtonsContainer.appendChild(formatAllBtn);
    
    chapterControls.appendChild(chapterButtonsContainer);
    popupContent.appendChild(chapterControls);
    
    // Container for paragraphs
    const paragraphsContainer = document.createElement('div');
    paragraphsContainer.classList.add('paragraphs-container');
    paragraphsContainer.style.display = 'flex';
    paragraphsContainer.style.flexDirection = 'column';
    paragraphsContainer.style.gap = '15px';
    
    // Get all paragraphs from the chapter
    const paragraphs = Array.from(contentDiv.querySelectorAll('p'));
    
    paragraphs.forEach((paragraph, index) => {
        // Create paragraph container
        const paragraphContainer = document.createElement('div');
        paragraphContainer.classList.add('paragraph-editor');
        paragraphContainer.dataset.paragraphIndex = index;
        paragraphContainer.style.border = '1px solid var(--border-secondary)';
        paragraphContainer.style.borderRadius = '6px';
        paragraphContainer.style.padding = '15px';
        paragraphContainer.style.backgroundColor = 'var(--chapter-box-bg)';
        paragraphContainer.style.position = 'relative';
        
        // Paragraph index indicator
        const indexIndicator = document.createElement('span');
        indexIndicator.textContent = `¶${index + 1}`;
        indexIndicator.style.position = 'absolute';
        indexIndicator.style.top = '8px';
        indexIndicator.style.left = '8px';
        indexIndicator.style.fontSize = '0.9em';
        indexIndicator.style.padding = '3px 6px';
        indexIndicator.style.backgroundColor = 'var(--button-bg)';
        indexIndicator.style.color = 'var(--button-text)';
        indexIndicator.style.borderRadius = '12px';
        indexIndicator.style.fontWeight = 'bold';
        paragraphContainer.appendChild(indexIndicator);
        
        // Paragraph text area
        const textArea = document.createElement('textarea');
        textArea.classList.add('paragraph-text');
        textArea.value = paragraph.textContent;
        textArea.style.width = '100%';
        textArea.style.minHeight = '100px';
        textArea.style.marginTop = '15px';
        textArea.style.padding = '10px';
        textArea.style.boxSizing = 'border-box';
        textArea.style.border = '1px solid var(--border-secondary)';
        textArea.style.borderRadius = '4px';
        textArea.style.fontFamily = 'inherit';
        textArea.style.fontSize = '1em';
        textArea.style.lineHeight = '1.5';
        textArea.style.backgroundColor = 'var(--input-bg)';
        textArea.style.color = 'var(--input-text)';
        textArea.style.resize = 'vertical';
        paragraphContainer.appendChild(textArea);
        
        // Character/word count
        const wordCount = document.createElement('div');
        wordCount.classList.add('word-count');
        wordCount.style.fontSize = '0.85em';
        wordCount.style.color = 'var(--text-secondary)';
        wordCount.style.marginTop = '5px';
        wordCount.style.textAlign = 'right';
        
        // Initial count
        const words = paragraph.textContent.trim().split(/\s+/).filter(w => w.length > 0).length;
        const chars = paragraph.textContent.trim().length;
        wordCount.textContent = `${words} words, ${chars} characters`;
        paragraphContainer.appendChild(wordCount);
        
        // Update word count on input
        textArea.addEventListener('input', () => {
            const words = textArea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
            const chars = textArea.value.trim().length;
            wordCount.textContent = `${words} words, ${chars} characters`;
        });
        
        // Paragraph controls
        const controlsContainer = document.createElement('div');
        controlsContainer.classList.add('paragraph-controls');
        controlsContainer.style.display = 'flex';
        controlsContainer.style.justifyContent = 'space-between';
        controlsContainer.style.marginTop = '10px';
        controlsContainer.style.gap = '10px';
        
        // Size controls
        const sizeControls = document.createElement('div');
        sizeControls.style.display = 'flex';
        sizeControls.style.alignItems = 'center';
        sizeControls.style.gap = '5px';
        
        const decreaseBtn = document.createElement('button');
        decreaseBtn.classList.add('size-btn', 'decrease');
        decreaseBtn.innerHTML = '📉 Shorter';
        decreaseBtn.title = 'Make paragraph shorter';
        decreaseBtn.style.padding = '6px 10px';
        decreaseBtn.style.backgroundColor = 'var(--chapter-tool-bg)';
        decreaseBtn.style.color = 'var(--chapter-tool-text)';
        decreaseBtn.style.border = '1px solid var(--border-secondary)';
        decreaseBtn.style.borderRadius = '4px';
        decreaseBtn.style.cursor = 'pointer';
        decreaseBtn.dataset.action = 'decrease';
        sizeControls.appendChild(decreaseBtn);
        
        const increaseBtn = document.createElement('button');
        increaseBtn.classList.add('size-btn', 'increase');
        increaseBtn.innerHTML = '📈 Longer';
        increaseBtn.title = 'Make paragraph longer';
        increaseBtn.style.padding = '6px 10px';
        increaseBtn.style.backgroundColor = 'var(--chapter-tool-bg)';
        increaseBtn.style.color = 'var(--chapter-tool-text)';
        increaseBtn.style.border = '1px solid var(--border-secondary)';
        increaseBtn.style.borderRadius = '4px';
        increaseBtn.style.cursor = 'pointer';
        increaseBtn.dataset.action = 'increase';
        sizeControls.appendChild(increaseBtn);
        
        controlsContainer.appendChild(sizeControls);
        
        // Action controls
        const actionControls = document.createElement('div');
        actionControls.style.display = 'flex';
        actionControls.style.alignItems = 'center';
        actionControls.style.gap = '5px';
        
        const regenerateBtn = document.createElement('button');
        regenerateBtn.classList.add('action-btn', 'regenerate');
        regenerateBtn.innerHTML = '🔄 Regenerate';
        regenerateBtn.title = 'Regenerate this paragraph';
        regenerateBtn.style.padding = '6px 10px';
        regenerateBtn.style.backgroundColor = 'var(--button-bg)';
        regenerateBtn.style.color = 'var(--button-text)';
        regenerateBtn.style.border = 'none';
        regenerateBtn.style.borderRadius = '4px';
        regenerateBtn.style.cursor = 'pointer';
        actionControls.appendChild(regenerateBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('action-btn', 'delete');
        deleteBtn.innerHTML = '🗑️ Delete';
        deleteBtn.title = 'Delete this paragraph';
        deleteBtn.style.padding = '6px 10px';
        deleteBtn.style.backgroundColor = '#d32f2f';
        deleteBtn.style.color = 'white';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '4px';
        deleteBtn.style.cursor = 'pointer';
        actionControls.appendChild(deleteBtn);
        
        controlsContainer.appendChild(actionControls);
        paragraphContainer.appendChild(controlsContainer);
        
        // Event listeners for paragraph controls
        decreaseBtn.addEventListener('click', async () => {
            decreaseBtn.disabled = true;
            decreaseBtn.textContent = 'Processing...';
            
            // Get current settings from the format popup
            const updatedSettings = getFormatPopupSettings();
            
            try {
                const result = await resizeParagraph(textArea.value, 'shorter', userInput, chapterTitle, 
                    updatedSettings.language, updatedSettings);
                textArea.value = result;
                // Trigger input event to update word count
                textArea.dispatchEvent(new Event('input'));
                
                logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                    `Shortened paragraph ${index + 1} in Chapter ${chapterNumber}`);
            } catch (error) {
                alert(`Error shortening paragraph: ${error.message}`);
                logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                    `Error shortening paragraph ${index + 1}: ${error.message}`);
            } finally {
                decreaseBtn.disabled = false;
                decreaseBtn.innerHTML = '📉 Shorter';
            }
        });
        
        increaseBtn.addEventListener('click', async () => {
            increaseBtn.disabled = true;
            increaseBtn.textContent = 'Processing...';
            
            // Get current settings from the format popup
            const updatedSettings = getFormatPopupSettings();
            
            try {
                const result = await resizeParagraph(textArea.value, 'longer', userInput, chapterTitle, 
                    updatedSettings.language, updatedSettings);
                textArea.value = result;
                // Trigger input event to update word count
                textArea.dispatchEvent(new Event('input'));
                
                logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                    `Expanded paragraph ${index + 1} in Chapter ${chapterNumber}`);
            } catch (error) {
                alert(`Error expanding paragraph: ${error.message}`);
                logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                    `Error expanding paragraph ${index + 1}: ${error.message}`);
            } finally {
                increaseBtn.disabled = false;
                increaseBtn.innerHTML = '📈 Longer';
            }
        });
        
        regenerateBtn.addEventListener('click', async () => {
            regenerateBtn.disabled = true;
            regenerateBtn.textContent = 'Regenerating...';
            
            // Get current settings from the format popup
            const updatedSettings = getFormatPopupSettings();
            
            try {
                const result = await regenerateParagraph(textArea.value, userInput, chapterTitle, 
                    updatedSettings.language, updatedSettings);
                textArea.value = result;
                // Trigger input event to update word count
                textArea.dispatchEvent(new Event('input'));
                
                logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                    `Regenerated paragraph ${index + 1} in Chapter ${chapterNumber}`);
            } catch (error) {
                alert(`Error regenerating paragraph: ${error.message}`);
                logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                    `Error regenerating paragraph ${index + 1}: ${error.message}`);
            } finally {
                regenerateBtn.disabled = false;
                regenerateBtn.innerHTML = '🔄 Regenerate';
            }
        });
        
        deleteBtn.addEventListener('click', () => {
            if (paragraphs.length <= 1) {
                alert("Cannot delete the only paragraph in this chapter. Try regenerating it instead.");
                return;
            }
            
            if (confirm('Are you sure you want to delete this paragraph?')) {
                paragraphContainer.remove();
                logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                    `Deleted paragraph ${index + 1} in Chapter ${chapterNumber}`);
            }
        });
        
        paragraphsContainer.appendChild(paragraphContainer);
    });
    
    popupContent.appendChild(paragraphsContainer);
    
    // Add button to insert a new paragraph
    const addParagraphBtn = document.createElement('button');
    addParagraphBtn.classList.add('add-paragraph');
    addParagraphBtn.textContent = '➕ Add New Paragraph';
    addParagraphBtn.style.padding = '10px';
    addParagraphBtn.style.marginTop = '15px';
    addParagraphBtn.style.backgroundColor = 'var(--button-bg)';
    addParagraphBtn.style.color = 'var(--button-text)';
    addParagraphBtn.style.border = 'none';
    addParagraphBtn.style.borderRadius = '4px';
    addParagraphBtn.style.cursor = 'pointer';
    addParagraphBtn.style.fontWeight = 'bold';
    addParagraphBtn.style.alignSelf = 'center';
    
    addParagraphBtn.addEventListener('click', async () => {
        addParagraphBtn.disabled = true;
        addParagraphBtn.textContent = 'Creating new paragraph...';
        
        // Get current settings from the format popup
        const updatedSettings = getFormatPopupSettings();
        
        try {
            const newContent = await generateNewParagraph(userInput, chapterTitle, 
                updatedSettings.language, updatedSettings);
            
            // Create new paragraph container
            const index = paragraphsContainer.children.length;
            
            // Create paragraph container (similar to above)
            const paragraphContainer = document.createElement('div');
            paragraphContainer.classList.add('paragraph-editor');
            paragraphContainer.dataset.paragraphIndex = index;
            paragraphContainer.style.border = '1px solid var(--border-secondary)';
            paragraphContainer.style.borderRadius = '6px';
            paragraphContainer.style.padding = '15px';
            paragraphContainer.style.backgroundColor = 'var(--chapter-box-bg)';
            paragraphContainer.style.position = 'relative';
            
            // Add paragraph index indicator
            const indexIndicator = document.createElement('span');
            indexIndicator.textContent = `¶${index + 1}`;
            indexIndicator.style.position = 'absolute';
            indexIndicator.style.top = '8px';
            indexIndicator.style.left = '8px';
            indexIndicator.style.fontSize = '0.9em';
            indexIndicator.style.padding = '3px 6px';
            indexIndicator.style.backgroundColor = 'var(--button-bg)';
            indexIndicator.style.color = 'var(--button-text)';
            indexIndicator.style.borderRadius = '12px';
            indexIndicator.style.fontWeight = 'bold';
            paragraphContainer.appendChild(indexIndicator);
            
            // Add textarea with generated content
            const textArea = document.createElement('textarea');
            textArea.classList.add('paragraph-text');
            textArea.value = newContent;
            textArea.style.width = '100%';
            textArea.style.minHeight = '100px';
            textArea.style.marginTop = '15px';
            textArea.style.padding = '10px';
            textArea.style.boxSizing = 'border-box';
            textArea.style.border = '1px solid var(--border-secondary)';
            textArea.style.borderRadius = '4px';
            textArea.style.fontFamily = 'inherit';
            textArea.style.fontSize = '1em';
            textArea.style.lineHeight = '1.5';
            textArea.style.backgroundColor = 'var(--input-bg)';
            textArea.style.color = 'var(--input-text)';
            textArea.style.resize = 'vertical';
            paragraphContainer.appendChild(textArea);
            
            // Character/word count
            const wordCount = document.createElement('div');
            wordCount.classList.add('word-count');
            wordCount.style.fontSize = '0.85em';
            wordCount.style.color = 'var(--text-secondary)';
            wordCount.style.marginTop = '5px';
            wordCount.style.textAlign = 'right';
            
            // Initial count
            const words = newContent.trim().split(/\s+/).filter(w => w.length > 0).length;
            const chars = newContent.trim().length;
            wordCount.textContent = `${words} words, ${chars} characters`;
            paragraphContainer.appendChild(wordCount);
            
            // Update word count on input
            textArea.addEventListener('input', () => {
                const words = textArea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
                const chars = textArea.value.trim().length;
                wordCount.textContent = `${words} words, ${chars} characters`;
            });
            
            // Add similar controls as above
            const controlsContainer = document.createElement('div');
            controlsContainer.classList.add('paragraph-controls');
            controlsContainer.style.display = 'flex';
            controlsContainer.style.justifyContent = 'space-between';
            controlsContainer.style.marginTop = '10px';
            controlsContainer.style.gap = '10px';
            
            // Size controls
            const sizeControls = document.createElement('div');
            sizeControls.style.display = 'flex';
            sizeControls.style.alignItems = 'center';
            sizeControls.style.gap = '5px';
            
            const decreaseBtn = document.createElement('button');
            decreaseBtn.classList.add('size-btn', 'decrease');
            decreaseBtn.innerHTML = '📉 Shorter';
            decreaseBtn.title = 'Make paragraph shorter';
            decreaseBtn.style.padding = '6px 10px';
            decreaseBtn.style.backgroundColor = 'var(--chapter-tool-bg)';
            decreaseBtn.style.color = 'var(--chapter-tool-text)';
            decreaseBtn.style.border = '1px solid var(--border-secondary)';
            decreaseBtn.style.borderRadius = '4px';
            decreaseBtn.style.cursor = 'pointer';
            decreaseBtn.dataset.action = 'decrease';
            sizeControls.appendChild(decreaseBtn);
            
            const increaseBtn = document.createElement('button');
            increaseBtn.classList.add('size-btn', 'increase');
            increaseBtn.innerHTML = '📈 Longer';
            increaseBtn.title = 'Make paragraph longer';
            increaseBtn.style.padding = '6px 10px';
            increaseBtn.style.backgroundColor = 'var(--chapter-tool-bg)';
            increaseBtn.style.color = 'var(--chapter-tool-text)';
            increaseBtn.style.border = '1px solid var(--border-secondary)';
            increaseBtn.style.borderRadius = '4px';
            increaseBtn.style.cursor = 'pointer';
            increaseBtn.dataset.action = 'increase';
            sizeControls.appendChild(increaseBtn);
            
            controlsContainer.appendChild(sizeControls);
            
            // Action controls
            const actionControls = document.createElement('div');
            actionControls.style.display = 'flex';
            actionControls.style.alignItems = 'center';
            actionControls.style.gap = '5px';
            
            const regenerateBtn = document.createElement('button');
            regenerateBtn.classList.add('action-btn', 'regenerate');
            regenerateBtn.innerHTML = '🔄 Regenerate';
            regenerateBtn.title = 'Regenerate this paragraph';
            regenerateBtn.style.padding = '6px 10px';
            regenerateBtn.style.backgroundColor = 'var(--button-bg)';
            regenerateBtn.style.color = 'var(--button-text)';
            regenerateBtn.style.border = 'none';
            regenerateBtn.style.borderRadius = '4px';
            regenerateBtn.style.cursor = 'pointer';
            actionControls.appendChild(regenerateBtn);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('action-btn', 'delete');
            deleteBtn.innerHTML = '🗑️ Delete';
            deleteBtn.title = 'Delete this paragraph';
            deleteBtn.style.padding = '6px 10px';
            deleteBtn.style.backgroundColor = '#d32f2f';
            deleteBtn.style.color = 'white';
            deleteBtn.style.border = 'none';
            deleteBtn.style.borderRadius = '4px';
            deleteBtn.style.cursor = 'pointer';
            actionControls.appendChild(deleteBtn);
            
            controlsContainer.appendChild(actionControls);
            paragraphContainer.appendChild(controlsContainer);
            
            // Add event listeners (same as above with updated settings)
            decreaseBtn.addEventListener('click', async () => {
                decreaseBtn.disabled = true;
                decreaseBtn.textContent = 'Processing...';
                
                // Get current settings from the format popup
                const updatedSettings = getFormatPopupSettings();
                
                try {
                    const result = await resizeParagraph(textArea.value, 'shorter', userInput, chapterTitle, 
                        updatedSettings.language, updatedSettings);
                    textArea.value = result;
                    // Trigger input event to update word count
                    textArea.dispatchEvent(new Event('input'));
                    
                    logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                        `Shortened paragraph ${index + 1} in Chapter ${chapterNumber}`);
                } catch (error) {
                    alert(`Error shortening paragraph: ${error.message}`);
                    logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                        `Error shortening paragraph ${index + 1}: ${error.message}`);
                } finally {
                    decreaseBtn.disabled = false;
                    decreaseBtn.innerHTML = '📉 Shorter';
                }
            });
            
            increaseBtn.addEventListener('click', async () => {
                increaseBtn.disabled = true;
                increaseBtn.textContent = 'Processing...';
                
                // Get current settings from the format popup
                const updatedSettings = getFormatPopupSettings();
                
                try {
                    const result = await resizeParagraph(textArea.value, 'longer', userInput, chapterTitle, 
                        updatedSettings.language, updatedSettings);
                    textArea.value = result;
                    // Trigger input event to update word count
                    textArea.dispatchEvent(new Event('input'));
                    
                    logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                        `Expanded paragraph ${index + 1} in Chapter ${chapterNumber}`);
                } catch (error) {
                    alert(`Error expanding paragraph: ${error.message}`);
                    logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                        `Error expanding paragraph ${index + 1}: ${error.message}`);
                } finally {
                    increaseBtn.disabled = false;
                    increaseBtn.innerHTML = '📈 Longer';
                }
            });
            
            regenerateBtn.addEventListener('click', async () => {
                regenerateBtn.disabled = true;
                regenerateBtn.textContent = 'Regenerating...';
                
                // Get current settings from the format popup
                const updatedSettings = getFormatPopupSettings();
                
                try {
                    const result = await regenerateParagraph(textArea.value, userInput, chapterTitle, 
                        updatedSettings.language, updatedSettings);
                    textArea.value = result;
                    // Trigger input event to update word count
                    textArea.dispatchEvent(new Event('input'));
                    
                    logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                        `Regenerated paragraph ${index + 1} in Chapter ${chapterNumber}`);
                } catch (error) {
                    alert(`Error regenerating paragraph: ${error.message}`);
                    logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                        `Error regenerating paragraph ${index + 1}: ${error.message}`);
                } finally {
                    regenerateBtn.disabled = false;
                    regenerateBtn.innerHTML = '🔄 Regenerate';
                }
            });
            
            deleteBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this paragraph?')) {
                    paragraphContainer.remove();
                    logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                        `Deleted paragraph ${index + 1} in Chapter ${chapterNumber}`);
                }
            });
            
            paragraphsContainer.appendChild(paragraphContainer);
            paragraphContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                `Added new paragraph to Chapter ${chapterNumber}`);
        } catch (error) {
            alert(`Error creating new paragraph: ${error.message}`);
            logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                `Error creating new paragraph: ${error.message}`);
        } finally {
            addParagraphBtn.disabled = false;
            addParagraphBtn.textContent = '➕ Add New Paragraph';
        }
    });
    
    popupContent.appendChild(addParagraphBtn);
    
    // Save/Cancel buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.justifyContent = 'space-between';
    buttonsContainer.style.marginTop = '20px';
    
    // Apply changes button
    const applyButton = document.createElement('button');
    applyButton.textContent = 'Apply Changes';
    applyButton.style.padding = '10px 20px';
    applyButton.style.backgroundColor = 'var(--button-bg)';
    applyButton.style.color = 'var(--button-text)';
    applyButton.style.border = 'none';
    applyButton.style.borderRadius = '4px';
    applyButton.style.cursor = 'pointer';
    applyButton.style.fontWeight = 'bold';
    
    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.padding = '10px 20px';
    cancelButton.style.backgroundColor = '#777';
    cancelButton.style.color = 'white';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.cursor = 'pointer';
    
    buttonsContainer.appendChild(cancelButton);
    buttonsContainer.appendChild(applyButton);
    popupContent.appendChild(buttonsContainer);
    
    // Format All button event listener
    formatAllBtn.addEventListener('click', () => {
        formatChapterContent(chapterElement);
        logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
            `Applied basic formatting to Chapter ${chapterNumber}`);
        alert('Basic formatting applied to chapter. Apply changes to save.');
    });
    
    // Regenerate All Paragraphs event listener
    regenerateAllBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to regenerate ALL paragraphs in this chapter? This may take some time.')) {
            regenerateAllBtn.disabled = true;
            regenerateAllBtn.textContent = 'Regenerating All...';
            
            try {
                logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                    `Regenerating all paragraphs in Chapter ${chapterNumber}...`);
                
                // Get current settings from the format popup
                const updatedSettings = getFormatPopupSettings();
                
                const paragraphElements = paragraphsContainer.querySelectorAll('.paragraph-editor');
                let completedCount = 0;
                
                for (let i = 0; i < paragraphElements.length; i++) {
                    const paragraphElement = paragraphElements[i];
                    const textArea = paragraphElement.querySelector('.paragraph-text');
                    const regenerateBtn = paragraphElement.querySelector('.action-btn.regenerate');
                    
                    regenerateBtn.disabled = true;
                    regenerateBtn.textContent = 'Processing...';
                    
                    try {
                        const result = await regenerateParagraph(textArea.value, userInput, chapterTitle, 
                            updatedSettings.language, updatedSettings);
                        textArea.value = result;
                        textArea.dispatchEvent(new Event('input')); // Update word count
                        completedCount++;
                    } catch (error) {
                        console.error(`Error regenerating paragraph ${i+1}:`, error);
                        // Continue with next paragraph on error
                    } finally {
                        regenerateBtn.disabled = false;
                        regenerateBtn.innerHTML = '🔄 Regenerate';
                    }
                }
                
                logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                    `Completed regenerating ${completedCount}/${paragraphElements.length} paragraphs in Chapter ${chapterNumber}`);
                
                alert(`Regenerated ${completedCount} out of ${paragraphElements.length} paragraphs. Apply changes to save.`);
            } catch (error) {
                alert(`Error during batch regeneration: ${error.message}`);
            } finally {
                regenerateAllBtn.disabled = false;
                regenerateAllBtn.textContent = 'Regenerate All Paragraphs';
            }
        }
    });
    
    // Apply changes button event listener
    applyButton.addEventListener('click', () => {
        applyChangesToChapter();
    });
    
    // Cancel button event listener
    cancelButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
            popupContainer.remove();
        }
    });
    
    // Close button event listener
    closeButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to close? All changes will be lost.')) {
            popupContainer.remove();
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function escHandler(event) {
        if (event.key === 'Escape') {
            if (confirm('Are you sure you want to close? All changes will be lost.')) {
                popupContainer.remove();
                document.removeEventListener('keydown', escHandler);
            }
        }
    });
    
    // Helper function to get current settings from the format popup inputs
    function getFormatPopupSettings() {
        const languageSelect = document.getElementById('format-language-select');
        const genreSelect = document.getElementById('format-genre-select');
        const styleSelect = document.getElementById('format-style-select');
        const sizeSelect = document.getElementById('format-size-select');
        
        return {
            language: languageSelect ? languageSelect.value : language,
            genre: genreSelect ? genreSelect.value : (settings.genre || 'Auto Detect'),
            style: styleSelect ? styleSelect.value : (settings.style || 'Chosen by AI'),
            chapterSize: sizeSelect ? sizeSelect.value : (settings.chapterSize || '4'),
            // Preserve other settings
            ...settings
        };
    }
    
    // Apply changes function
    function applyChangesToChapter() {
        // Get all edited paragraphs
        const paragraphEditors = paragraphsContainer.querySelectorAll('.paragraph-editor');
        
        // Get the H2 title element from the chapter
        const h2Element = contentDiv.querySelector('h2');
        
        // Clear existing content except H2
        contentDiv.innerHTML = '';
        if (h2Element) {
            contentDiv.appendChild(h2Element);
        }
        
        // Recreate paragraphs from edited content
        paragraphEditors.forEach((editor) => {
            const textArea = editor.querySelector('.paragraph-text');
            const paragraphText = textArea.value.trim();
            
            if (paragraphText) {
                const p = document.createElement('p');
                
                // Handle line breaks
                const lines = paragraphText.split('\n');
                lines.forEach((line, index) => {
                    p.appendChild(document.createTextNode(line));
                    if (index < lines.length - 1) {
                        p.appendChild(document.createElement('br'));
                    }
                });
                
                contentDiv.appendChild(p);
            }
        });
        
        // Apply formatting to ensure consistent styling
        formatChapterContent(chapterElement);
        
        logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
            `Applied paragraph edits to Chapter ${chapterNumber}`);
        
        // Close the popup
        popupContainer.remove();
    }
    
    popupContainer.appendChild(popupContent);
    document.body.appendChild(popupContainer);
}

/**
 * Regenerates a paragraph using AI while maintaining the core concepts.
 * @param {string} paragraphText - The current paragraph text
 * @param {string} userInput - Context for the book topic
 * @param {string} chapterTitle - Title of the chapter
 * @param {string} language - Language code
 * @param {object} settings - Generation settings (genre, style, etc.)
 * @returns {Promise<string>} New paragraph text
 */
async function regenerateParagraph(paragraphText, userInput, chapterTitle, language, settings) {
    if (!paragraphText.trim()) {
        return generateNewParagraph(userInput, chapterTitle, language, settings);
    }
    
    const prompt = `Rewrite the following paragraph with fresh language and perspective while maintaining the same basic information, themes, and tone. Create a new version that feels different but conveys the same key points. IMPORTANT: You MUST use the "${language}" language for your response - do not translate to any other language.`;
    
    let styleContext = "";
    if (settings.genre && settings.genre !== 'Auto Detect') {
        styleContext += ` Maintain the "${settings.genre}" genre style.`;
    }
    if (settings.style && settings.style !== 'Chosen by AI') {
        styleContext += ` Keep the "${settings.style}" writing style.`;
    }
    
    if (settings.writeLikeAuthor) {
        styleContext += ` Write in the style of ${settings.writeLikeAuthor}.`;
    }
    if (settings.storyGenre && settings.storyGenre !== settings.genre) {
        styleContext += ` Consider the specific story genre: ${settings.storyGenre}.`;
    }
    if (settings.storyConflict && settings.storyConflict !== 'none') {
        styleContext += ` Keep in mind the story's conflict type: ${settings.storyConflict}.`;
    }
    
    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: prompt + styleContext,
                },
                {
                    role: "user",
                    content: `Book Topic: ${userInput}\nChapter Title: ${chapterTitle}\nREQUIRED LANGUAGE: ${language}\n\nParagraph to rewrite (in ${language}):\n${paragraphText}`,
                },
            ],
        });
        
        return completion.content.trim();
    } catch (error) {
        console.error("Error regenerating paragraph:", error);
        throw new Error(`AI processing failed: ${error.message}`);
    }
}

/**
 * Generates a new paragraph that fits into the chapter context.
 * @param {string} userInput - Context for the book topic
 * @param {string} chapterTitle - Title of the chapter
 * @param {string} language - Language code
 * @param {object} settings - Generation settings (genre, style, etc.)
 * @returns {Promise<string>} New paragraph text
 */
async function generateNewParagraph(userInput, chapterTitle, language, settings) {
    const { chapterSize } = settings;
    let targetLength = "medium";
    
    switch(chapterSize) {
        case '1': 
        case '2': 
            targetLength = "short (about 3-4 sentences)"; 
            break;
        case '3': 
        case '4': 
            targetLength = "medium (about 5-7 sentences)"; 
            break;
        case '5': 
        case '6': 
            targetLength = "substantial (about 8-10 sentences)"; 
            break;
        case '7': 
        case '8': 
            targetLength = "long (about 12-15 sentences)"; 
            break;
        default: 
            targetLength = "medium (about 5-7 sentences)";
    }
    
    const prompt = `Generate a new paragraph of ${targetLength} length that would fit well within a chapter titled "${chapterTitle}" for a book about "${userInput}". This paragraph should be well-written, engaging, and coherent. IMPORTANT: You MUST write in the "${language}" language - do not use any other language.`;
    
    let styleContext = "";
    if (settings.genre && settings.genre !== 'Auto Detect') {
        styleContext += ` Write in the "${settings.genre}" genre style.`;
    }
    if (settings.style && settings.style !== 'Chosen by AI') {
        styleContext += ` Use a "${settings.style}" writing style.`;
    }
    
    if (settings.writeLikeAuthor) {
        styleContext += ` Write in the style of ${settings.writeLikeAuthor}.`;
    }
    if (settings.storyGenre && settings.storyGenre !== settings.genre) {
        styleContext += ` Consider the specific story genre: ${settings.storyGenre}.`;
    }
    if (settings.storyConflict && settings.storyConflict !== 'none') {
        styleContext += ` Keep in mind the story's conflict type: ${settings.storyConflict}.`;
    }
    if (settings.storyCoreConflict) {
        styleContext += ` Incorporate elements of the core theme: ${settings.storyCoreConflict}.`;
    }
    
    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: prompt + styleContext,
                },
                {
                    role: "user",
                    content: `Book Topic: ${userInput}\nChapter Title: ${chapterTitle}\nREQUIRED LANGUAGE: ${language}\n\nGenerate a new paragraph in ${language} that fits this context.`,
                },
            ],
        });
        
        return completion.content.trim();
    } catch (error) {
        console.error("Error generating new paragraph:", error);
        throw new Error(`AI processing failed: ${error.message}`);
    }
}

/**
 * Resizes a paragraph to be shorter or longer using AI.
 * @param {string} paragraphText - The current paragraph text
 * @param {string} direction - Either 'shorter' or 'longer'
 * @param {string} userInput - Context for the book topic
 * @param {string} chapterTitle - Title of the chapter
 * @param {string} language - Language code
 * @param {object} settings - Generation settings (genre, style, etc.)
 * @returns {Promise<string>} Resized paragraph text
 */
async function resizeParagraph(paragraphText, direction, userInput, chapterTitle, language, settings) {
    if (!paragraphText.trim()) {
        throw new Error("Paragraph is empty");
    }
    
    let prompt;
    if (direction === 'shorter') {
        prompt = `Condense and shorten the following paragraph while preserving key information. Make it more concise and about 30-50% shorter. IMPORTANT: You MUST use the "${language}" language for your response - do not translate to any other language.`;
    } else {
        prompt = `Expand and enhance the following paragraph with more detail, description, or elaboration. Make it more comprehensive and about 30-50% longer. IMPORTANT: You MUST use the "${language}" language for your response - do not translate to any other language.`;
    }
    
    if (settings.genre && settings.genre !== 'Auto Detect') {
        prompt += ` Maintain the "${settings.genre}" genre style.`;
    }
    if (settings.style && settings.style !== 'Chosen by AI') {
        prompt += ` Keep the "${settings.style}" writing style.`;
    }
    
    if (settings.writeLikeAuthor) {
        prompt += ` Write in the style of ${settings.writeLikeAuthor}.`;
    }
    if (settings.storyGenre && settings.storyGenre !== settings.genre) {
        prompt += ` Consider the specific story genre: ${settings.storyGenre}.`;
    }
    if (settings.storyConflict && settings.storyConflict !== 'none') {
        prompt += ` Keep in mind the story's conflict type: ${settings.storyConflict}.`;
    }
    
    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: prompt,
                },
                {
                    role: "user",
                    content: `Book Topic: ${userInput}\nChapter Title: ${chapterTitle}\nREQUIRED LANGUAGE: ${language}\n\nParagraph to ${direction === 'shorter' ? 'shorten' : 'expand'} (in ${language}):\n${paragraphText}`,
                },
            ],
        });
        
        return completion.content.trim();
    } catch (error) {
        console.error(`Error ${direction === 'shorter' ? 'shortening' : 'expanding'} paragraph:`, error);
        throw new Error(`AI processing failed: ${error.message}`);
    }
}