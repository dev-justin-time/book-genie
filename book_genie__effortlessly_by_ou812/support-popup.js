// support-popup.js
// Lightweight Ko‑fi support popup with a close (×) button and a footer trigger.
// Exports initSupportUI() to wire everything up on the main page.

/* @tweakable kofiUsername Ko-fi page username to support */
const kofiUsername = 'BOOK GENIE';

/* @tweakable kofiEmbedHeight Height of the embedded Ko-fi widget (px) */
const kofiEmbedHeight = 720;

/* @tweakable supportButtonSelector CSS selector for the trigger button in the footer */
const supportButtonSelector = '#support-button';

/* @tweakable showOnLoad Automatically show the support popup on page load */
const showOnLoad = false;

/* @tweakable escToClose Allow closing the popup with the Escape key */
const escToClose = true;

/* @tweakable clickBackdropToClose Allow closing by clicking on the dark backdrop */
const clickBackdropToClose = true;

/* @tweakable supportPopupTitle Title displayed at the top of the support popup */
const supportPopupTitle = 'Support BOOK GENIE';

/* @tweakable allowMonthlyTips Show the Ko-fi monthly toggle via embed (if supported by Ko-fi) */
// Note: Ko-fi controls are rendered by Ko-fi; this flag is here if you later swap the URL to a custom page.
const allowMonthlyTips = true;

/* @tweakable kofiEmbedUrlOverride Override full Ko-fi URL (leave empty to build it from username) */
const kofiEmbedUrlOverride = '';

function ensureContainer() {
  let popup = document.querySelector('.support-popup');
  if (!popup) {
    popup = document.createElement('div');
    popup.className = 'support-popup';
    popup.style.display = 'none';
    popup.innerHTML = `
      <div class="support-content" role="dialog" aria-modal="true" aria-label="${supportPopupTitle}">
        <button class="popup-close-button" aria-label="Close">&times;</button>
        <h2 style="margin:0 0 10px 0;">${supportPopupTitle}</h2>
        <div id="support-embed" style="min-height: 120px;">
          <!-- Ko-fi iframe will be injected here -->
        </div>
      </div>
    `;
    document.body.appendChild(popup);
  }
  return popup;
}

function openSupportPopup() {
  const popup = ensureContainer();
  const content = popup.querySelector('.support-content');
  const iframeHost = popup.querySelector('#support-embed');

  // Build Ko-fi URL
  const url = kofiEmbedUrlOverride || `https://ko-fi.com/${encodeURIComponent(kofiUsername)}/?hidefeed=true&widget=true&embed=true&preview=true${allowMonthlyTips ? '' : ''}`;

  // Inject iframe (recreate to ensure fresh render)
  iframeHost.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.border = 'none';
  iframe.style.width = '100%';
  iframe.height = String(kofiEmbedHeight);
  iframe.title = kofiUsername;
  iframe.loading = 'lazy';
  iframeHost.appendChild(iframe);

  // Reveal popup
  popup.style.display = 'flex';

  // Wire close events
  const closeBtn = popup.querySelector('.popup-close-button');
  closeBtn.onclick = () => closeSupportPopup();

  if (clickBackdropToClose) {
    popup.addEventListener('click', (e) => {
      if (e.target === popup) closeSupportPopup();
    }, { once: true });
  }

  if (escToClose) {
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeSupportPopup();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // Simple accessibility focus management
  setTimeout(() => {
    content.querySelector('.popup-close-button')?.focus();
  }, 0);
}

function closeSupportPopup() {
  const popup = document.querySelector('.support-popup');
  if (!popup) return;
  popup.style.display = 'none';
}

/**
 * Initialize the Support UI by wiring the footer button and optional auto-open.
 */
export function initSupportUI() {
  const trigger = document.querySelector(supportButtonSelector);
  if (trigger) {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openSupportPopup();
    });
  } else {
    // If missing, log once for diagnostics but don't throw
    console.warn('[support-popup] Trigger button not found at', supportButtonSelector);
  }

  if (showOnLoad) {
    // Slight delay to avoid competing with other modals
    setTimeout(() => openSupportPopup(), 600);
  }
}

export default { initSupportUI };