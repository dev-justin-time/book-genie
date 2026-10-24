export function createJsonSettingsContent() {
    const container = document.createElement('div');
    container.classList.add('settings-section');
    container.id = 'json-settings';

    const title = document.createElement('h3');
    title.textContent = 'JSON File Settings';
    container.appendChild(title);

    return container;
}