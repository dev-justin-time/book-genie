// Settings menu initialization
export function initializeSettingsMenu() {
    const settingsButton = document.getElementById('settings-button');
    const settingsPopup = document.getElementById('settings-popup');
    const closeSettingsButton = document.getElementById('close-settings-button');

    if (settingsButton && settingsPopup && closeSettingsButton) {
        settingsButton.addEventListener('click', () => {
            settingsPopup.style.display = 'flex';
        });

        closeSettingsButton.addEventListener('click', () => {
            settingsPopup.style.display = 'none';
        });

        // Close the settings popup if the user clicks outside of it
        window.addEventListener('click', (event) => {
            if (event.target === settingsPopup) {
                settingsPopup.style.display = 'none';
            }
        });

        // Add settings content
        const settingsContent = settingsPopup.querySelector('.settings-content');
        settingsContent.innerHTML = ''; // Clear existing content to prevent duplicates
        // settingsContent.appendChild(createGenerationSettingsContent(config));
        // settingsContent.appendChild(createJsonSettingsContent()); // Removed image settings feature
    } else {
        console.error('Settings elements not found in the DOM.');
    }
}

// Genre detection handler
export function setupGenreDetection(genreSelect, inputText, commandHistory, aiCommandConsole) {
    genreSelect.addEventListener('change', async () => {
        if (genreSelect.value === "Auto Detect") {
            const userInput = inputText.value;
            if (userInput.trim() === '') {
                alert('Please enter some text to detect genre!');
                genreSelect.value = "Auto Detect";
                return;
            }

            const detectedGenre = await detectGenre(userInput);
            if (detectedGenre) {
                genreSelect.value = detectedGenre;
                const acknowledgement = `Genre automatically detected: "${detectedGenre}".`;
                commandHistory.push(acknowledgement);
                if (commandHistory.length > 5) {
                    commandHistory.shift();
                }
                aiCommandConsole.innerHTML = commandHistory.map(msg => `<div>${msg}</div>`).join('');

            } else {
                alert('Could not detect genre. Please select manually.');
                genreSelect.value = "Auto Detect";
                const acknowledgement = `Could not detect genre`;
                commandHistory.push(acknowledgement);
                if (commandHistory.length > 5) {
                    commandHistory.shift();
                }
                aiCommandConsole.innerHTML = commandHistory.map(msg => `<div>${msg}</div>`).join('');
            }
        }
    });
}