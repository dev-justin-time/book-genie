// language-select.js
import config from './config.js';

export function initializeLanguageSelect(languageSelect) {
    config.languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = lang.name;
        languageSelect.appendChild(option);
    });

    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom';
    languageSelect.appendChild(customOption);

    let customLanguages = JSON.parse(localStorage.getItem('customLanguages') || '[]');
    customLanguages.forEach(lang => {
        addLanguageOption(lang.code, lang.name);
    });

    languageSelect.addEventListener('change', () => {
        if (languageSelect.value === 'custom') {
            showCustomLanguagePopup(languageSelect);
        }
    });

    function addLanguageOption(code, name) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        languageSelect.insertBefore(option, customOption);
    }

    function showCustomLanguagePopup(languageSelect) {
        const popup = document.createElement('div');
        popup.className = 'custom-language-popup';
        popup.innerHTML = `
            <div class="custom-language-content">
                <h2>Enter Custom Language</h2>
                <input type="text" id="custom-language-name" placeholder="Language Name">
                <input type="text" id="custom-language-code" placeholder="Language Code (e.g., my-lang)">
                <button id="add-custom-language">Add Language</button>
                <button id="cancel-custom-language">Cancel</button>
            </div>
        `;
        document.body.appendChild(popup);

        document.getElementById('add-custom-language').addEventListener('click', () => {
            const name = document.getElementById('custom-language-name').value.trim();
            const code = document.getElementById('custom-language-code').value.trim();
            if (name !== '' && code !== '') {
                addLanguageOption(code, name);
                saveCustomLanguage(code, name);
                popup.remove();
                languageSelect.value = code;
            } else {
                alert('Please enter both language name and code.');
            }
        });

        document.getElementById('cancel-custom-language').addEventListener('click', () => {
            popup.remove();
            languageSelect.value = 'auto';
        });
    }

    function saveCustomLanguage(code, name) {
        let customLanguages = JSON.parse(localStorage.getItem('customLanguages') || '[]');
        if (!customLanguages.some(lang => lang.code === code)) {
          customLanguages.push({ code: code, name: name });
          localStorage.setItem('customLanguages', JSON.stringify(customLanguages));
        }
    }
}