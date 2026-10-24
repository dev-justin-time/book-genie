window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    // Optionally report to analytics or show user-friendly message
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled Promise rejection:', event.reason);
    // Optionally report to analytics or show user-friendly message
});

import { WebsimSocket } from '@websim/websim-socket';
import config from './config.js';
import { generateChapterContent } from './chapter-generator.js';
import { handleChapterToolAction } from './chapter-tools.js';
import { detectLanguage, generateChapterData, loadBookData, saveBookData } from './book-manager.js';
import { showWelcomePopup } from './welcome-popup.js';
import { setBodyBackground } from './background-manager.js';
import * as settingsManager from './settings-manager.js';
import { initializeLanguageSelect as initLangSelectModule } from './language-select.js';
import { initializeExportButton } from './export-manager.js';
import * as listeners from './event-listeners.js';
import { detectGenre } from './genre-manager.js';
import { setupChapterCollapse, addLanguageOption, saveCustomLanguage, updateChapterSizeSublabel } from './ui-helpers.js';
import { openImagePopup } from './image-popup.js';
import { createTTSSettingsContent } from './tts-settings.js';
import { runDependencyDiagnostics } from 'dependency-diagnostics';
import { initSupportUI } from './support-popup.js';

/**
 * @tweakable maxLoadUrlSize Maximum characters allowed in loadUrl query parameter
 */
const maxLoadUrlSize = 2048;

/**
 * @tweakable allowedLoadUrlDomains List of allowed URL prefixes for loadUrl to prevent open redirect/SSRF
 */
const allowedLoadUrlDomains = [window.location.origin, 'https://websim.com/'];

function isValidLoadUrl(url) {
    return allowedLoadUrlDomains.some(prefix => url.startsWith(prefix)) && url.length <= maxLoadUrlSize;
}

// --- User Account Management ---
const loginRedirectUrl = 'https://websim.com/login?redirect=' + encodeURIComponent(window.location.href);
const signupRedirectUrl = 'https://websim.com/signup?redirect=' + encodeURIComponent(window.location.href);
/**
 * @tweakable showUserGreeting Whether to show a 'Welcome back!' message for logged-in users.
 */
const showUserGreeting = true;

/**
 * Initializes user account functionality and UI
 * @tweakable userAccountUIEnabled Enable user account UI in the main application
 */
async function initializeUserAccount() {
    const userAccountUIEnabled = true;
    if (!userAccountUIEnabled) return;

    const userAccountSection = document.getElementById('user-account-section');
    if (!userAccountSection) return;

    let currentUser = null;
    try {
        currentUser = await window.websim.getCurrentUser();
    } catch (e) {
        console.warn('No user session detected.');
    }

    if (currentUser && currentUser.username) {
        // User is logged in - show avatar, username, and logout
        userAccountSection.innerHTML = `
            <img src="https://images.websim.com/avatar/${currentUser.username}" 
                 alt="Avatar" width="32" height="32" 
                 style="border-radius: 50%; border: 2px solid var(--primary-accent);">
            <div style="display: flex; flex-direction: column; align-items: flex-start;">
                <a href="https://websim.com/@${currentUser.username}" target="_blank" 
                   style="font-weight: 500; text-decoration: none; font-size: 14px;">
                   @${currentUser.username}
                </a>
                ${showUserGreeting ? `<span style="font-size: 12px; color: var(--text-secondary);">Welcome back!</span>` : ''}
            </div>
            <button id="logout-button" style="padding: 6px 12px; font-size: 12px; background: var(--chapter-tool-bg); color: var(--chapter-tool-text); border: 1px solid var(--border-secondary); border-radius: 6px; cursor: pointer;">
                Logout
            </button>
        `;

        // Add logout functionality
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                                const logoutRedirectUrl = 'https://websim.com/logout?redirect=' + encodeURIComponent(window.location.href);
                window.location.href = logoutRedirectUrl;
            });
        }

        // Log user login for analytics/debugging - use direct import instead of dependencies
        const aiCommandConsole = document.getElementById('ai-command-console');
        if (aiCommandConsole) {
            // Simple logging without dependencies - will be enhanced after dependencies are loaded
            console.log(`User @${currentUser.username} logged in.`);
        }
    } else {
        // User is not logged in - show login/signup options
                /**
                 * @tweakable showSignupOption Whether to display the 'Sign Up' button for guests.
                 */
                const showSignupOption = true;
        
        userAccountSection.innerHTML = `
            <div style="display: flex; gap: 8px; align-items: center;">
                <button id="login-button" style="padding: 6px 12px; font-size: 12px; background: var(--button-bg); color: var(--button-text); border: none; border-radius: 6px; cursor: pointer;">
                    Login
                </button>
                ${showSignupOption ? `
                <button id="signup-button" style="padding: 6px 12px; font-size: 12px; background: var(--chapter-tool-bg); color: var(--chapter-tool-text); border: 1px solid var(--border-secondary); border-radius: 6px; cursor: pointer;">
                    Sign Up
                </button>
                ` : ''}
            </div>
        `;

        // Add login functionality
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            loginButton.addEventListener('click', () => {
                window.location.href = loginRedirectUrl;
            });
        }

        // Add signup functionality
        if (showSignupOption) {
            const signupButton = document.getElementById('signup-button');
            if (signupButton) {
                signupButton.addEventListener('click', () => {
                    window.location.href = signupRedirectUrl;
                });
            }
        }
    }
}

// --- Multiplayer Collaboration ---
/**
 * @tweakable multiplayerDebounceTime Time in ms to wait before sending text updates.
 */
const multiplayerDebounceTime = 200;

async function initializeMultiplayer(room, uiElements) {
    const { inputText, aiCommandConsole } = uiElements;
    const collaboratorsDiv = document.getElementById('collaborators');
    const cursorsDiv = document.getElementById('multiplayer-cursors');
    let currentUser = await window.websim.getCurrentUser();

    if (!inputText || !collaboratorsDiv || !cursorsDiv) {
        console.error("Multiplayer UI elements not found.");
        return;
    }

    let textUpdateTimeout;

    // 1. Send local changes to others
    const handleLocalInput = () => {
        // Send cursor/selection changes immediately
        room.updatePresence({
            cursor: {
                start: inputText.selectionStart,
                end: inputText.selectionEnd,
            }
        });

        // Debounce text updates
        clearTimeout(textUpdateTimeout);
        textUpdateTimeout = setTimeout(() => {
            room.updateRoomState({ text: inputText.value });
        }, multiplayerDebounceTime);
    };

    inputText.addEventListener('input', handleLocalInput);
    inputText.addEventListener('keyup', handleLocalInput);
    document.addEventListener('selectionchange', () => {
        if (document.activeElement === inputText) {
            handleLocalInput();
        }
    });

    // 2. Handle remote changes
    room.subscribeRoomState(roomState => {
        if (roomState && typeof roomState.text === 'string' && roomState.text !== inputText.value) {
            // Preserve cursor position while updating
            const { selectionStart, selectionEnd } = inputText;
            inputText.value = roomState.text;
            try {
                inputText.setSelectionRange(selectionStart, selectionEnd);
            } catch(e) { /* ignore errors if selection is out of bounds */ }
        }
    });

    // 3. Render collaborators and their cursors
    room.subscribePresence(presence => {
        // Render avatars
        collaboratorsDiv.innerHTML = '';
        Object.values(room.peers).forEach(peer => {
            if (peer.id !== room.clientId) { // Don't show self
                const img = document.createElement('img');
                img.src = peer.avatarUrl;
                img.title = peer.username;
                collaboratorsDiv.appendChild(img);
            }
        });

        // Render cursors
        cursorsDiv.innerHTML = '';
        Object.entries(presence).forEach(([clientId, clientPresence]) => {
            if (clientId !== room.clientId && clientPresence?.cursor) {
                const peer = room.peers[clientId];
                if (peer) {
                    renderCursor(peer, clientPresence.cursor);
                }
            }
        });
    });

    // Helper to render a single cursor
    function renderCursor(peer, cursorState) {
        // Create a mirror textarea to calculate cursor position
        const mirror = document.createElement('div');
        mirror.textContent = inputText.value.substring(0, cursorState.start);
        const span = document.createElement('span');
        span.textContent = inputText.value.substring(cursorState.start);
        mirror.appendChild(span);

        // Apply same styles as textarea
        const styles = window.getComputedStyle(inputText);
        [...styles].forEach(key => mirror.style.setProperty(key, styles.getPropertyValue(key), 'important'));
        mirror.style.position = 'absolute';
        mirror.style.top = '-9999px'; // Hide it
        mirror.style.left = '-9999px';
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.wordWrap = 'break-word';
        
        document.body.appendChild(mirror);
        
        const cursorX = span.offsetLeft;
        const cursorY = span.offsetTop;
        
        document.body.removeChild(mirror);

        // Create cursor element
        const cursorEl = document.createElement('div');
        cursorEl.className = 'cursor';
        cursorEl.style.left = `${cursorX}px`;
        cursorEl.style.top = `${cursorY}px`;
        
        const labelEl = document.createElement('div');
        labelEl.className = 'cursor-label';
        labelEl.textContent = peer.username;
        cursorEl.appendChild(labelEl);
        
        cursorsDiv.appendChild(cursorEl);
    }

    // Initialize with current state
    if (room.roomState.text) {
        inputText.value = room.roomState.text;
    } else {
        // If no text in room state, initialize it with local content
        room.updateRoomState({ text: inputText.value });
    }
}

/**
 * @tweakable enableDuplicateWarnings Turn on console warnings for detected duplicate files/modules
 */
const enableDuplicateWarnings = true;

/**
 * @tweakable duplicateResolutionPolicy Strategy to resolve duplicates (report-only | preferPrimary)
 * - report-only: only logs the duplicates
 * - preferPrimary: exposes a canonical map window.BG_PRIMARY_MODULES to prefer at runtime
 */
const duplicateResolutionPolicy = 'preferPrimary';

/**
 * @tweakable duplicateGroups List of known duplicate logic groups to monitor
 * Each group has a primary file that should be preferred by loaders/imports.
 */
const duplicateGroups = [
  {
    name: 'UI Style Settings',
    primary: 'ui-style-settings.js',
    alternates: ['ui-style-settings (1).js']
  },
  {
    name: 'Book Manager',
    primary: 'book-manager.js',
    alternates: ['book-manager (1).js']
  },
  {
    name: 'JSON Settings Tab',
    primary: 'json-settings.js',
    alternates: ['json-settings (1).js']
  },
  {
    name: 'Welcome Popup',
    primary: 'welcome-popup.js',
    alternates: ['welcome-popup (1).js']
  },
  {
    name: 'Book Generator',
    primary: 'chapter-generator.js',
    alternates: ['book-generator (1).js']
  },
  {
    name: 'Index HTML',
    primary: 'index.html',
    alternates: ['index (1).html']
  },
  {
    name: 'Legacy Demo Pages',
    primary: 'A.HTML',
    alternates: ['library-Browser.html','TEST2.HTML','TEST12.HTML']
  },
  {
    name: 'PageFlip CSS',
    primary: 'style.css',
    alternates: ['pageflip library.css','STYLES.CSS']
  },
  {
    name: 'Security/Wallet (disabled)',
    primary: 'SEC.MD',
    alternates: ['SEC.JS']
  }
];

/**
 * @tweakable enableUnusedLogicScan When true, runs a lightweight runtime scan for unused files/features.
 */
const enableUnusedLogicScan = true;

/**
 * @tweakable unusedReportMode Where to send the unused-logic report ('console' | 'overlay' | 'both')
 */
const unusedReportMode = 'both';

/**
 * @tweakable unusedScanCandidates Groups of files/features that may be present but not actively used.
 * Each entry can include an optional `isUsed` function for custom detection logic.
 */
const unusedScanCandidates = [
  {
    group: 'Duplicate Alternates',
    files: [
      'ui-style-settings (1).js',
      'book-manager (1).js',
      'json-settings (1).js',
      'welcome-popup (1).js',
      'book-generator (1).js',
      'index (1).html'
    ],
    isUsed: () => false // explicit alternates, not used by import map
  },
  {
    group: 'Legacy/Standalone Demo Pages',
    files: ['library-Browser.html', 'TEST2.HTML', 'TEST12.HTML', 'A.HTML'],
    isUsed: () => false
  },
  {
    group: 'Community Library (experimental extras)',
    files: [
      'COMMUNITY LIBRARY/newnew commlib/logic.js',
      'COMMUNITY LIBRARY/newnew commlib/localization.js',
      'COMMUNITY LIBRARY/newnew commlib/access.css',
      'COMMUNITY LIBRARY/newnew commlib/access.js',
      'COMMUNITY LIBRARY/newnew commlib/gamification.js',
      'COMMUNITY LIBRARY/newnew commlib/storeOnIpfs.js',
      'COMMUNITY LIBRARY/newnew commlib/optimized.css',
      'COMMUNITY LIBRARY/newnew commlib/ttsConfig.js',
      'COMMUNITY LIBRARY/styles.css',
      'COMMUNITY LIBRARY/styles/styles.css'
    ],
    // Heuristic: not imported by community-library.html; only community-library.js is loaded
    isUsed: () => {
      const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src'));
      const links = Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(l => l.getAttribute('href'));
      // If any of these files are actually linked/loaded, treat as used
      return (path) => scripts.includes(path) || links.includes(path);
    }
  },
  {
    group: 'Security/Wallet (disabled)',
    files: ['SEC.JS'],
    isUsed: () => false
  },
  {
    group: 'PageFlip CSS (not wired)',
    files: ['pageflip library.css', 'STYLES.CSS'],
    // Flip UI (flip.html) uses inline styles, not these sheets
    isUsed: () => false
  }
];

/* @tweakable enableStartupDiagnostics Enable running diagnostics early in startup */
const enableStartupDiagnostics = true;

/* @tweakable diagnosticsStrictMode If true, halt on missing export (throws) */
const diagnosticsStrictMode = false;

/* @tweakable diagnosticsLogLevel Log level for diagnostics: "info" | "warn" | "error" */
const diagnosticsLogLevel = "warn";

/* @tweakable diagnosticsSelectors Additional DOM selectors to verify exist on boot */
const diagnosticsSelectors = [
  '#upper-menu', '#table-of-contents', '#below-footer-zone'
];

if (enableStartupDiagnostics) {
  runDependencyDiagnostics({
    diagHaltOnMissingExport: diagnosticsStrictMode,
    diagLogLevel: diagnosticsLogLevel,
    diagDomSelectorsToValidate: [...new Set([...(diagnosticsSelectors || []), '#input-text', '#book-content'])]
  }).catch((e) => console.warn('[BG] Diagnostics failed (non-fatal):', e));
}

/**
 * Scans for duplicate logic files present in the project and logs a concise report.
 * If duplicateResolutionPolicy is 'preferPrimary', exposes a canonical map on window.BG_PRIMARY_MODULES.
 */
function scanForDuplicateLogic() {
  try {
    const present = new Set(
      Array.from(document.querySelectorAll('script[type="importmap"]')).flatMap((s) => {
        try {
          const json = JSON.parse(s.textContent || '{}');
          return Object.values(json.imports || {});
        } catch {
          return [];
        }
      })
    );
    // Also include some known local paths from the app (best-effort)
    const knownLocal = [
      'ui-style-settings.js', 'ui-style-settings (1).js',
      'book-manager.js', 'book-manager (1).js',
      'json-settings.js', 'json-settings (1).js',
      'welcome-popup.js', 'welcome-popup (1).js',
      'chapter-generator.js', 'book-generator (1).js',
      'index.html', 'index (1).html'
    ];
    knownLocal.forEach(p => present.add(p));

    const findings = [];
    duplicateGroups.forEach(group => {
      const hits = [group.primary, ...group.alternates].filter(p => present.has(p));
      if (hits.length > 1) {
        findings.push({ group: group.name, files: hits, primary: group.primary });
      }
    });

    if (enableDuplicateWarnings && findings.length) {
      console.groupCollapsed('Duplicate Logic Detected');
      findings.forEach(f => {
        console.warn(`Group: ${f.group}`, { primary: f.primary, duplicates: f.files });
      });
      console.groupEnd();
    }

    if (duplicateResolutionPolicy === 'preferPrimary') {
      window.BG_PRIMARY_MODULES = Object.fromEntries(
        duplicateGroups.map(g => [g.name, g.primary])
      );
    }
  } catch (e) {
    console.warn('Duplicate logic scan failed:', e);
  }
}

/**
 * Scans for unused logic based on candidates and simple runtime checks.
 * Produces a report object and logs/overlays as configured.
 */
function scanForUnusedLogic() {
  if (!enableUnusedLogicScan) return;
  const report = { timestamp: new Date().toISOString(), notes: 'Heuristic scan based on known candidate files and current runtime import/links.', unused: [], maybeUsed: [] };
  // Build a quick set of currently referenced paths from the DOM
  const currentScripts = new Set(Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src') || ''));
  const currentStyles = new Set(Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(l => l.getAttribute('href') || ''));

  // Resolve "isUsed" checker for each candidate file
  for (const group of unusedScanCandidates) {
    const groupResults = { group: group.group, files: [] };

    for (const file of group.files) {
      let used = false;

      if (typeof group.isUsed === 'function') {
        // If isUsed returns a function, pass the path for per-file checks
        const res = group.isUsed();
        if (typeof res === 'function') {
          try {
            used = !!res(file);
          } catch { used = false; }
        } else {
          used = !!res;
        }
      } else {
        // Fallback: check if explicitly present in the document as <script> or <link>
        used = currentScripts.has(file) || currentStyles.has(file);
      }

      groupResults.files.push({ file, used });
    }

    // Push into report lists
    const groupUnused = groupResults.files.filter(f => !f.used).map(f => f.file);
    const groupMaybe = groupResults.files.filter(f => f.used).map(f => f.file);

    if (groupUnused.length) {
      report.unused.push({ group: group.group, files: groupUnused });
    }
    if (groupMaybe.length) {
      report.maybeUsed.push({ group: group.group, files: groupMaybe });
    }
  }

  // Expose for external tools
  window.BG_UNUSED_REPORT = report;
  // Add actionable suggestions
  if (usefulUnusedSuggestionsEnabled) {
    const suggestions = [];
    (report.unused || []).forEach(g => {
      if (g.group.includes('Duplicate')) suggestions.push(`Duplicate "${g.group}" → prefer primary and move alternates to ${archiveFolderName}`);
      if (g.group.includes('Legacy') || g.group.toLowerCase().includes('demo')) suggestions.push(`Legacy demos → archive under ${archiveFolderName} or remove if confirmed`);
      if (g.group.includes('Community Library')) suggestions.push(`CL extras → disable via @tweakable flags (loadLocalizationJsFlag, loadAccessibilityJsFlag, loadGamificationJsFlag) to reduce load`);
      g.files.filter(f=>/\.(png|jpg|jpeg|gif|webp|css|js|html)$/i.test(f)).forEach(f=>{ suggestions.push(`Consider archiving ${f} if unused (>${largeAssetThresholdKB}KB threshold heuristic)`); });
    });
    report.suggestions = Array.from(new Set(suggestions));
  }

  // Output report
  if (unusedReportMode === 'console' || unusedReportMode === 'both') {
    console.groupCollapsed('Unused Logic Scan');
    console.info('Heuristic report (tunable). See window.BG_UNUSED_REPORT for details.');
    console.table((report.unused || []).flatMap(g => g.files.map(f => ({ group: g.group, file: f, status: 'unused' }))));
    if (report.maybeUsed?.length) {
      console.table((report.maybeUsed || []).flatMap(g => g.files.map(f => ({ group: g.group, file: f, status: 'referenced (maybe used)' }))));
    }
    console.groupEnd();
  }

  if (unusedReportMode === 'overlay' || unusedReportMode === 'both') {
    renderUnusedOverlay(report);
  }

  // Also try to persist a minimal summary to localStorage for offline inspection
  try {
    localStorage.setItem('bg_unused_logic_report', JSON.stringify(report));
  } catch {}
}

/**
 * @tweakable unusedOverlayAutoHideMs Auto-hide the overlay after N ms (0 = don't auto-hide)
 */
const unusedOverlayAutoHideMs = 10000;

function renderUnusedOverlay(report) {
  const existing = document.getElementById('unused-logic-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'unused-logic-overlay';
  overlay.style.position = 'fixed';
  overlay.style.bottom = '24px';
  overlay.style.right = '24px';
  overlay.style.background = 'rgba(20,20,20,0.92)';
  overlay.style.color = '#fff';
  overlay.style.border = '1px solid #444';
  overlay.style.borderRadius = '10px';
  overlay.style.padding = '14px 16px';
  overlay.style.maxWidth = '420px';
  overlay.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
  overlay.style.zIndex = 10050;
  overlay.style.fontSize = '13px';
  overlay.style.lineHeight = '1.5';

  const unusedCount = report.unused.reduce((acc, g) => acc + g.files.length, 0);

  overlay.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div style="font-weight:600;">Unused Logic Report</div>
      <button aria-label="Close" style="background:none;border:none;color:#aaa;font-size:16px;cursor:pointer;">×</button>
    </div>
    <div style="opacity:0.9;">Detected <strong>${unusedCount}</strong> unused file(s) in ${report.unused.length} group(s).</div>
    <div style="margin-top:8px;max-height:180px;overflow:auto;border-top:1px solid #333;padding-top:6px;">
      ${report.unused.map(g => `
        <div style="margin:8px 0;">
          <div style="color:#8ab4f8;font-weight:600;">${g.group}</div>
          <ul style="margin:5px 0 0 16px;">
            ${g.files.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
    ${Array.isArray(report.suggestions) && report.suggestions.length ? `
    <div style="margin-top:10px;border-top:1px solid #333;padding-top:6px;">
      <div style="color:#34d399;font-weight:600;margin-bottom:4px;">Suggestions</div>
      <ul style="margin:0 0 0 16px;">${report.suggestions.map(s=>`<li>${s}</li>`).join('')}</ul>
    </div>` : ``}
    <div style="margin-top:10px;opacity:0.8;">Full JSON at <code>window.BG_UNUSED_REPORT</code>.</div>
  `;

  overlay.querySelector('button')?.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);

  if (unusedOverlayAutoHideMs > 0) {
    setTimeout(() => overlay.remove(), unusedOverlayAutoHideMs);
  }
}

/**
 * Initializes and applies the site's UI language at startup.
 * - Reads saved preference from localStorage ('preferredLanguage')
 * - Optionally respects the browser's language if no saved preference exists
 * - Falls back to a default language (en) if nothing else is available
 * - Sets document.documentElement.lang and updates the main language select if present
 *
 * @param {object} uiElements - References to UI elements (may be partial/undefined on early calls)
 * @returns {string} The language code applied (e.g., 'en', 'de', 'fr')
 */

/* @tweakable defaultUILanguage Fallback UI language code if nothing is detected/saved */
const defaultUILanguage = 'en';

/* @tweakable respectBrowserLanguage Prefer the browser's language if no saved preference is set */
const respectBrowserLanguage = true;

/* @tweakable syncLanguageSelect Whether to sync the main language dropdown to the applied language */
const syncLanguageSelect = true;

function setSiteLanguageOnStartup(uiElements = {}) {
    try {
        // Determine desired language
        let saved = localStorage.getItem('preferredLanguage');
        let browser = (respectBrowserLanguage && navigator.language) ? navigator.language.split('-')[0].toLowerCase() : null;
        let applied = (saved || browser || defaultUILanguage || 'en').toLowerCase();

        // If the configured languages list is available, ensure 'applied' is at least in a sane format
        // (do not enforce membership; the app can still operate with custom codes)
        document.documentElement.setAttribute('lang', applied);

        // Optionally sync the main language select
        if (syncLanguageSelect && uiElements.languageSelect instanceof HTMLSelectElement) {
            const select = uiElements.languageSelect;

            // Ensure an option for the language exists without triggering "custom" flows
            if (!select.querySelector(`option[value="${applied}"]`)) {
                const opt = document.createElement('option');
                opt.value = applied;
                opt.textContent = applied.toUpperCase();
                // insert before "custom" if present, otherwise append
                const customOpt = select.querySelector('option[value="custom"]');
                if (customOpt) {
                    select.insertBefore(opt, customOpt);
                } else {
                    select.appendChild(opt);
                }
            }
            // Avoid auto-opening any custom popups; just set value if present
            if (select.querySelector(`option[value="${applied}"]`)) {
                select.value = applied;
            }
        }

        return applied;
    } catch (e) {
        console.warn('setSiteLanguageOnStartup failed:', e);
        // As a safe fallback, ensure lang is set
        document.documentElement.setAttribute('lang', 'en');
        return 'en';
    }
}

// React to runtime language changes coming from the UI Style Settings tab
// (that module dispatches 'ui-language-changed' with { detail: { lang } })
window.addEventListener('ui-language-changed', (evt) => {
    const lang = (evt && evt.detail && evt.detail.lang) ? evt.detail.lang : null;
    if (lang) {
        document.documentElement.setAttribute('lang', lang);
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    /* @tweakable initialBackgroundImageURL The URL for the default background image of the page. */
    const initialBackgroundImageURL = 'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1974&auto=format&fit=crop';
    setBodyBackground(initialBackgroundImageURL);
    
    // --- Auto-Load From LocalStorage (Browser Cache) on Pageload ---
    try {
        const savedBookRaw = localStorage.getItem('autosave-book-data');
        if (savedBookRaw) {
            const savedBook = JSON.parse(savedBookRaw);
            // Find UI elements (defer until DOM is ready so we don't need to repeat)
            const chaptersContainer = document.getElementById('chapters-container');
            const bookContent = document.getElementById('book-content');
            const title = document.querySelector('h1');
            const inputText = document.getElementById('input-text');
            const languageSelect = document.getElementById('language-select');
            // Optional: main settings (if present)
            let genreSelect = document.getElementById('genre-select');
            let styleSelect = document.getElementById('style-select');
            let chapterSizeSlider = document.getElementById('chapter-size-slider');
            let chapterSizeSublabel = document.getElementById('chapter-size-sublabel');
            let chapterCountInput = document.getElementById('chapter-count-input');

            // Dynamically load book-manager if needed
            const { loadBookData } = await import('./book-manager.js');
            await loadBookData(
                // Simulate file reading via Blob as File
                new File([JSON.stringify(savedBook)], "autosave.json", { type: "application/json" }),
                chaptersContainer, bookContent, title, languageSelect,
                genreSelect, styleSelect, chapterSizeSlider, chapterSizeSublabel, chapterCountInput
            );
        }
    } catch (err) {
        console.warn("Could not auto-load book data from browser cache:", err);
    }

    // --- Initialize User Account (add this before other initializations) ---
    await initializeUserAccount();
    
    // --- Initialize Multiplayer ---
    const room = new WebsimSocket();
    await room.initialize();
    
    const loadParamKey = 'loadUrl';
    const loadUrl = new URLSearchParams(window.location.search).get(loadParamKey);
    if (loadUrl) {
        if (isValidLoadUrl(loadUrl)) {
            try {
                const response = await fetch(loadUrl);
                const bookData = await response.json();
                const fakeFile = new File(
                    [JSON.stringify(bookData)],
                    'library-book.json',
                    { type: 'application/json' }
                );
                const { loadBookData } = await import('./book-manager.js');
                await loadBookData(
                    fakeFile,
                    document.getElementById('chapters-container'),
                    document.getElementById('book-content'),
                    document.querySelector('h1'),
                    document.getElementById('language-select'),
                    document.getElementById('genre-select'),
                    document.getElementById('style-select'),
                    document.getElementById('chapter-size-slider'),
                    document.getElementById('chapter-size-sublabel'),
                    document.getElementById('chapter-count-input')
                );
                // Remove the query param so refreshing doesn't reload again
                window.history.replaceState({}, '', window.location.pathname);
            } catch (err) {
                console.error('Failed to load library book:', err);
            }
        } else {
            console.warn('Invalid or disallowed loadUrl parameter:', loadUrl);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }

    // --- Get DOM Elements ---
    const uiElements = {
        inputText: document.getElementById('input-text'),
        generateButton: document.getElementById('generate-button'),
        chaptersContainer: document.getElementById('chapters-container'),
        inputArea: document.getElementById('input-area'),
        menuButton: document.getElementById('menu-button'),
        bookContent: document.getElementById('book-content'),
        title: document.querySelector('h1'),
        languageSelect: document.getElementById('language-select'),
        loadButton: document.getElementById('load-button'),
        saveButton: document.getElementById('save-button'),
        fileInput: document.getElementById('file-input'),
        resetButton: document.getElementById('reset-button'),
        settingsButton: document.getElementById('settings-button'),
        settingsPopup: document.getElementById('settings-popup'),
        closeSettingsButton: null,
        globalAiCommandInput: document.getElementById('global-ai-command'),
        aiCommandConsole: document.getElementById('ai-command-console'),
        genreSelect: null,
        styleSelect: null,
        chapterSizeSlider: null,
        chapterSizeSublabel: null,
        chapterCountInput: null,
        gotoBookmarkButton: document.getElementById('goto-bookmark-button')
    };

    // --- Insert generic language options and custom languages ---
    config.languages.forEach(lang => {
        if (!uiElements.languageSelect.querySelector(`option[value="${lang.code}"]`)) {
            const opt = document.createElement('option');
            opt.value = lang.code;
            opt.textContent = lang.name;
            uiElements.languageSelect.appendChild(opt);
        }
    });
    const customOption = uiElements.languageSelect.querySelector('option[value="custom"]');
    if (!customOption) {
        let customOpt = document.createElement('option');
        customOpt.value = 'custom';
        customOpt.textContent = 'Custom';
        uiElements.languageSelect.appendChild(customOpt);
    }
    let customLanguages = JSON.parse(localStorage.getItem('customLanguages') || '[]');
    customLanguages.forEach(lang => {
        if (!uiElements.languageSelect.querySelector(`option[value="${lang.code}"]`)) {
            const opt = document.createElement('option');
            opt.value = lang.code;
            opt.textContent = lang.name;
            uiElements.languageSelect.insertBefore(opt, uiElements.languageSelect.querySelector('option[value="custom"]'));
        }
    });

    // --- Detect and apply system/browser language everywhere ---
    setSiteLanguageOnStartup(uiElements);

    // --- Only now show welcome popup, so it uses correct language and propagates button captions as well ---
    showWelcomePopup();

    // --- Ensure all main UI/landing page labels reflect detected language at runtime ---
    (function localizeLandingPage() {
        // Available translations for visible landing page UI
        const LOCALIZED_TITLES = {
            en: {
                                h1: "Book Genie",
                menuButtonShow: "Show Input",
                menuButtonHide: "Hide Input",
                inputPlaceholder: "Enter your word, idea, topic, or story here...",
                load: "Load",
                save: "Save",
                settings: "Settings",
                export: "Export",
                gotoBookmark: "Go to Bookmark",
                reset: "Reset",
                generate: "Generate Chapters",
                inputAria: "Book idea input",
                globalAiCmd: "Enter global AI command and press Enter to apply to all chapters...",
                toc: "Table of Contents",
                bookContent: "Generated Book Content",
                extraTools: "Additional Tools and Information"
            },
            de: {
                h1: "KI-Buchgenerator",
                menuButtonShow: "Eingabe zeigen",
                menuButtonHide: "Eingabe ausblenden",
                inputPlaceholder: "Geben Sie Ihr Wort, Ihre Idee, Ihr Thema oder Ihre Geschichte ein...",
                load: "Laden",
                save: "Speichern",
                settings: "Einstellungen",
                export: "Exportieren",
                gotoBookmark: "Zum Lesezeichen springen",
                reset: "Zurücksetzen",
                generate: "Kapitel generieren",
                inputAria: "Buchideen-Eingabe",
                globalAiCmd: "Geben Sie einen globalen KI-Befehl ein und drücken Sie Enter, um auf alle Kapitel anzuwenden...",
                toc: "Inhaltsverzeichnis",
                bookContent: "Generierter Buchinhalt",
                extraTools: "Zusätzliche Werkzeuge und Informationen"
            },
            fr: {
                h1: "Générateur de Livres IA",
                menuButtonShow: "Afficher la saisie",
                menuButtonHide: "Masquer la saisie",
                inputPlaceholder: "Entrez votre mot, idée, sujet ou histoire ici...",
                load: "Charger",
                save: "Enregistrer",
                settings: "Paramètres",
                export: "Exporter",
                gotoBookmark: "Aller au signet",
                reset: "Réinitialiser",
                generate: "Générer les chapitres",
                inputAria: "Saisie de l'idée du livre",
                globalAiCmd: "Entrez une commande IA globale et appuyez sur Entrée pour l'appliquer à tous les chapitres...",
                toc: "Table des matières",
                bookContent: "Contenu du livre généré",
                extraTools: "Outils et informations supplémentaires"
            }
            // ...add more as needed
        };

        // Detect language (same logic as welcome/settings)
        let lang = document.documentElement.getAttribute('lang') || localStorage.getItem('preferredLanguage') || navigator.language || 'en';
        if (lang && lang.length > 2) lang = lang.split('-')[0].toLowerCase();
        if (!LOCALIZED_TITLES[lang]) lang = 'en';

        const t = k => LOCALIZED_TITLES[lang][k] || LOCALIZED_TITLES['en'][k] || k;

        // Set main title
        const h1 = document.querySelector('h1');
        if (h1) h1.textContent = t('h1');

        // Menu button (hide/show input)
        const menuBtn = document.getElementById('menu-button');
        if (menuBtn && uiElements.inputArea) {
            // Set correct label and fix the toggle feature to always update text correctly
            function updateMenuButtonText() {
                menuBtn.textContent = uiElements.inputArea.classList.contains('collapsed') ? t('menuButtonShow') : t('menuButtonHide');
            }

            // Set label on startup
            updateMenuButtonText();

            // Remove pre-existing click listeners by replacing node (optional, but prevents event stacking if script hot reloaded)
            menuBtn.replaceWith(menuBtn.cloneNode(true));
            const menuBtnFixed = document.getElementById('menu-button');
            menuBtnFixed.addEventListener('click', () => {
                uiElements.inputArea.classList.toggle('collapsed');
                updateMenuButtonText();
            });
        }

        // Upper menu buttons
        const btns = {
            'load-button': 'load',
            'save-button': 'save',
            'settings-button': 'settings',
            'export-button': 'export',
            'goto-bookmark-button': 'gotoBookmark',
            'reset-button': 'reset',
            'generate-button': 'generate'
        };
        Object.entries(btns).forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = t(key);
        });

        // Input placeholder
        if (uiElements.inputText) {
            uiElements.inputText.placeholder = t('inputPlaceholder');
            uiElements.inputText.setAttribute('aria-label', t('inputAria'));
        }
        // Global AI command area/label
        const globalAiCmd = document.getElementById('global-ai-command');
        if (globalAiCmd) {
            globalAiCmd.placeholder = t('globalAiCmd');
        }
        // TOC/Content labels
        const tocHeading = document.getElementById('toc-heading');
        if (tocHeading) tocHeading.textContent = t('toc');
        const bookContentHeading = document.getElementById('book-content-heading');
        if (bookContentHeading) bookContentHeading.textContent = t('bookContent');
        const extraToolsHeading = document.getElementById('extra-tools-heading');
        if (extraToolsHeading) extraToolsHeading.textContent = t('extraTools');
    })();

    // Initialize Support (Ko-fi) Popup UI
    initSupportUI();

    // --- Initialize Modules & UI ---
    const state = {
        generating: false,
        commandHistory: [],
        bookmarkedChapterId: null,
        currentlyReadingChapter: null
    };

    const dependencies = {
        detectLanguage,
        generateChapterData,
        loadBookData,
        saveBookData,
        generateChapterContent,
        handleChapterToolAction,
        setBodyBackground,
        detectGenre,
        setupChapterCollapse,
        addLanguageOption,
        saveCustomLanguage,
        updateChapterSizeSublabel,
        logToAIConsole: listeners.logToAIConsole,
        replaceTitleWithInput: listeners.replaceTitleWithInput,
        openImagePopup,
        reAttachImageControls: listeners.reAttachImageControls
    };

    // --- Initialize settings manager popup, passing detected language so all settings (tabs) pick it up ---
    settingsManager.init(state, uiElements.aiCommandConsole, dependencies.logToAIConsole, uiElements.settingsPopup);

    // Now that settingsManager created the settings UI, update selects for language across UI and settings menus
    uiElements.genreSelect = document.getElementById('genre-select');
    uiElements.styleSelect = document.getElementById('style-select');
    uiElements.chapterSizeSlider = document.getElementById('chapter-size-slider');
    uiElements.chapterSizeSublabel = document.getElementById('chapter-size-sublabel');
    uiElements.chapterCountInput = document.getElementById('chapter-count-input');
    uiElements.closeSettingsButton = document.getElementById('close-settings-button');

    // Set language in settings popup selects after popup is initialized
    setSiteLanguageOnStartup(uiElements);

    // Initialize export button
    initializeExportButton();

    // Use language-select.js to ensure popup also gets the same detected language on custom dropdowns (and that further custom languages sync)
    initLangSelectModule(uiElements.languageSelect);

    // --- New: Attach prompt analysis icon to input ---
    let mainInputText = uiElements.inputText;
    let mainInputContainer = mainInputText?.parentElement;
    // Try to ensure it's the main field with .prompt-textarea-container, else use current parent
    if (!mainInputContainer.classList.contains('prompt-textarea-container')) {
        // Wrap with .prompt-textarea-container for consistent style if not already
        const wrapper = document.createElement('div');
        wrapper.className = 'prompt-textarea-container';
        mainInputText.parentElement.insertBefore(wrapper, mainInputText);
        wrapper.appendChild(mainInputText);
        mainInputContainer = wrapper;
    }
    import('./ui-helpers.js').then((uiHelpers) => {
        if (mainInputText && mainInputContainer && uiElements.aiCommandConsole) {
            const getSettings = settingsManager.getSettings;
            let settings = {};
            try {
                settings = getSettings ? getSettings() : {};
            } catch {}
            const prevAnalyzeBtn = mainInputContainer.querySelector('.input-analyze-btn');
            if (prevAnalyzeBtn) prevAnalyzeBtn.remove();
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'input-analyze-btn';
            btn.title = 'Analyze & Improve Book Prompt';
            btn.setAttribute('aria-label', 'Analyze & Improve Book Prompt');
            let iconHtml = '';
            // Prefer book icon (Font Awesome if available, else Unicode book)
            if (window.FontAwesomeConfig || document.querySelector('link[href*="font-awesome"]') || document.querySelector('style').textContent.includes('fa-book')) {
                iconHtml = '<i class="fas fa-book"></i>';
            } else {
                iconHtml = '<span style="font-size:15px;pointer-events:none;">&#128214;</span>'; // Unicode "Open Book"
            }
            btn.innerHTML = iconHtml;

            btn.style.position = 'absolute';
            btn.style.right = '12px';
            btn.style.top = '11px';
            btn.style.background = 'rgba(255,255,255,0.97)';
            btn.style.border = '1px solid #bbb';
            btn.style.borderRadius = '50%';
            btn.style.width = '28px';
            btn.style.height = '28px';
            btn.style.display = 'flex';
            btn.style.justifyContent = 'center';
            btn.style.alignItems = 'center';
            btn.style.fontSize = '17px';
            btn.style.zIndex = 30;
            btn.style.padding = '0';
            btn.style.margin = '0';
            btn.style.cursor = 'pointer';
            btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.07)';
            btn.style.transition = 'background 0.15s';

            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#eef4ff';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'rgba(255,255,255,0.97)';
            });

            if (typeof uiHelpers.attachPromptAnalysisIcon === 'function') {
                uiHelpers.attachPromptAnalysisIcon(
                    mainInputText,
                    uiElements.aiCommandConsole,
                    state,
                    dependencies.logToAIConsole,
                    settings
                );
            } else if (typeof uiHelpers.openPromptAnalysisPopup === 'function') {
                btn.addEventListener('click', () => {
                    uiHelpers.openPromptAnalysisPopup(
                        mainInputText,
                        uiElements.aiCommandConsole,
                        state,
                        dependencies.logToAIConsole,
                        settings
                    );
                });
                mainInputContainer.appendChild(btn);
            }
        }
    });

    // --- Initialize Event Listeners for all interactions ---
    if (uiElements.menuButton && uiElements.inputArea) {
        listeners.initializeMenuButtonListener(uiElements.menuButton, uiElements.inputArea);
    }
    if (uiElements.generateButton) {
        listeners.initializeGenerateButtonListener(uiElements.generateButton, uiElements, state, dependencies);
    }
    if (uiElements.globalAiCommandInput) {
        listeners.initializeGlobalAICommandListener(uiElements.globalAiCommandInput, uiElements, state, dependencies);
    }
    if (uiElements.resetButton) {
        listeners.initializeResetButtonListener(uiElements.resetButton, uiElements, dependencies);
    }
    if (uiElements.loadButton && uiElements.saveButton && uiElements.fileInput) {
        listeners.initializeLoadSaveListeners(uiElements.loadButton, uiElements.saveButton, uiElements.fileInput, uiElements, state, dependencies);
    }

    // --- Settings Popup Listeners ---
    if (uiElements.settingsButton && uiElements.settingsPopup) {
         uiElements.settingsButton.addEventListener('click', () => {
             uiElements.settingsPopup.style.display = 'flex';
         });
         window.addEventListener('click', (event) => {
            if (event.target === uiElements.settingsPopup) {
                uiElements.settingsPopup.style.display = 'none';
            }
         });
    }

    if (uiElements.genreSelect) {
        listeners.initializeGenreSelectListener(uiElements.genreSelect, uiElements, state, dependencies);
    }
    if (uiElements.languageSelect) {
        listeners.initializeLanguageSelectListener(uiElements.languageSelect, dependencies);
    }

    // --- Initialize New GUI Features ---
    initializeProgressIndicator();
    initializeEnhancedTooltips();
    initializeLiveStats();
    initializeFloatingActionMenu();
    initializeReadingProgress();
    initializeChapterMinimap();
    initializeWordCountDisplay();

    // After initialization:
    
    dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, "Book Genie initialized with enhanced GUI features.");

    if (uiElements.gotoBookmarkButton) {
        uiElements.gotoBookmarkButton.addEventListener('click', () => {
            if (state.bookmarkedChapterId) {
                const targetElement = document.getElementById(state.bookmarkedChapterId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    targetElement.style.transition = 'outline 0.1s ease-in-out';
                    targetElement.style.outline = '3px solid gold';
                    setTimeout(() => {
                        targetElement.style.outline = '';
                    }, 1500);
                } else {
                    console.warn(`Bookmarked element #${state.bookmarkedChapterId} not found.`);
                }
            }
        });
    }

    // --- AUTOSAVE --- (see at the end of this block)
    // Patch all actions that mutate the book to save current state

    const saveToLocalCache = () => {
        try {
            const inputTextEl = document.getElementById('input-text');
            const languageSelectEl = document.getElementById('language-select');
            const titleEl = document.querySelector('h1');
            const bookContentEl = document.getElementById('book-content');
            const chapterCountInput = document.getElementById('chapter-count-input');
            const genreSelect = document.getElementById('genre-select');
            const styleSelect = document.getElementById('style-select');
            const chapterSizeSlider = document.getElementById('chapter-size-slider');
            let bookmarkedChapterId = null;
            const bookmarked = document.querySelector('.bookmarked-chapter');
            if (bookmarked) {
                bookmarkedChapterId = bookmarked.id;
            }
            const { saveBookData } = window;
            // If 'saveBookData' not global, import and call
            if (!saveBookData) {
                import('./book-manager.js').then(({ saveBookData }) => {
                    const data = saveBookData(
                        inputTextEl, languageSelectEl, titleEl, bookContentEl,
                        chapterCountInput, genreSelect, styleSelect, chapterSizeSlider, bookmarkedChapterId
                    );
                    localStorage.setItem('autosave-book-data', JSON.stringify(data));
                });
            } else {
                const data = saveBookData(
                    inputTextEl, languageSelectEl, titleEl, bookContentEl,
                    chapterCountInput, genreSelect, styleSelect, chapterSizeSlider, bookmarkedChapterId
                );
                localStorage.setItem('autosave-book-data', JSON.stringify(data));
            }
        } catch (e) {
            console.warn("Autosave failed", e);
        }
    };

    // Save on every change to the input, language, or chapter content
    // (1) Book input
    document.getElementById('input-text')?.addEventListener('input', saveToLocalCache);
    // (2) Language
    document.getElementById('language-select')?.addEventListener('change', saveToLocalCache);
    // (3) Re-hook all key UI changes for main editing controls
    ['chapters-container','book-content'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', saveToLocalCache, { capture: true, passive: true });
        if (el) el.addEventListener('blur', saveToLocalCache, { capture: true, passive: true });
        if (el) el.addEventListener('change', saveToLocalCache, { capture: true, passive: true });
    });
    // (4) Add hooks to any Save, Generate, Load, Reset actions to autosave
    ['save-button','generate-button','reset-button','load-button'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => setTimeout(saveToLocalCache, 430));
    });
    // (5) Periodic autosave as fallback (every 60s)
    setInterval(saveToLocalCache, 60000);

    // Update footer version (updated to 8.00)
    const versionElement = document.getElementById('project-version');
    if (versionElement) {
        versionElement.textContent = '8.00';
    }
    const allFooters = document.querySelectorAll('footer, .footer');
    allFooters.forEach(footer => {
        if (footer && footer.textContent && footer.textContent.match(/Version\s*[0-9.]+/g)) {
            footer.innerHTML = footer.innerHTML.replace(/Version\s*[0-9.]+/g, 'Version 8.00');
        }
    });

    // add navigation to the new flip.html GUI
    document.getElementById('flip-ui-button')?.addEventListener('click', () => {
        window.location.href = 'flip.html';
    });

    // Navigation to Community Library page
    document.getElementById('community-library-button')?.addEventListener('click', () => {
        window.location.href = 'community-library.html';
    });

    // MetaMask Wallet Integration
    /** @tweakable enableWalletIntegration Turn on/off MetaMask wallet integration (experimental) */
    const enableWalletIntegration = false;
    /** @tweakable requireWalletConsent Require an explicit consent prompt before connecting wallet */
    const requireWalletConsent = true;
    /** @tweakable walletConsentMessage Text shown in the consent dialog before wallet connect */
    const walletConsentMessage = 'This will connect to your MetaMask wallet and may reveal your wallet address. Do you want to continue?';
    /** @tweakable walletStatusNoMetaMask Message shown when MetaMask is not detected */
    const NO_METAMASK_MSG = 'MetaMask not detected';
    /** @tweakable walletStatusConnectedPrefix Prefix for the connected wallet address */
    const CONNECTED_PREFIX = 'Connected: ';
    /** @tweakable walletStatusConnectionFailed Message for failed wallet connection */
    const CONNECTION_FAILED_MSG = 'Connection failed';
    /** @tweakable walletStatusConsentDenied Message when the user cancels consent */
    const CONSENT_DENIED_MSG = 'Wallet connection cancelled';
    
    const connectWalletBtn = document.getElementById('connect-wallet-button');
    const walletStatus = document.getElementById('wallet-status');
    
    // Only initialize wallet integration if feature is enabled
    if (connectWalletBtn && walletStatus && enableWalletIntegration) {
        // Track whether user has given consent
        let hasGivenConsent = localStorage.getItem('walletConsent') === 'true';
        
        connectWalletBtn.addEventListener('click', async () => {
            // Check for consent before any wallet operations
            if (requireWalletConsent && !hasGivenConsent) {
                const userConsent = confirm(walletConsentMessage);
                if (!userConsent) {
                    walletStatus.textContent = CONSENT_DENIED_MSG;
                    return;
                }
                // Store consent for future sessions
                localStorage.setItem('walletConsent', 'true');
                hasGivenConsent = true;
            }
            
            // Only check for MetaMask after user consent
            if (!window.ethereum) {
                walletStatus.textContent = NO_METAMASK_MSG;
                return;
            }
            
            try {
                // Only request accounts after explicit user click and consent
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const account = accounts[0];
                walletStatus.textContent = CONNECTED_PREFIX + account.slice(0, 6) + '…' + account.slice(-4);
            } catch (error) {
                console.error('Failed to connect to MetaMask', error);
                walletStatus.textContent = error.message || CONNECTION_FAILED_MSG;
            }
        });
    } else if (connectWalletBtn && !enableWalletIntegration) {
        // Hide wallet button if feature is disabled
        connectWalletBtn.style.display = 'none';
        if (walletStatus) walletStatus.style.display = 'none';
    }

    // Run duplicate logic scan at the very end of init so logs are visible but non-blocking
    scanForDuplicateLogic();

    // Run unused logic scan after everything has initialized
    scanForUnusedLogic();
});

// --- New GUI Feature Implementations ---

/**
 * Initialize the visual progress indicator for book generation
 */
function initializeProgressIndicator() {
    const overlay = document.createElement('div');
    overlay.className = 'generation-progress-overlay';
    overlay.id = 'generation-progress-overlay';
    
        overlay.innerHTML = `
        <div class="progress-container">
            <h3 style="margin-top: 0;">Generating Your Book</h3>
            <div class="progress-bar">
                <div class="progress-bar-fill" id="progress-bar-fill"></div>
            </div>
            <div class="progress-text" id="progress-text">Initializing...</div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Hook into existing generation process
    const originalGenerateButton = document.getElementById('generate-button');
    if (originalGenerateButton) {
        originalGenerateButton.addEventListener('click', () => {
            showProgressIndicator();
        });
    }
}

function showProgressIndicator() {
    const overlay = document.getElementById('generation-progress-overlay');
    const fill = document.getElementById('progress-bar-fill');
    const text = document.getElementById('progress-text');
    
    if (overlay) {
        overlay.style.display = 'flex';
        
        // Simulate progress updates
        let progress = 0;
        const steps = [
            'Analyzing your input...',
            'Generating chapter structure...',
            'Creating chapter content...',
            'Formatting and finalizing...'
        ];
        
        const interval = setInterval(() => {
            progress += Math.random() * 15 + 5;
            if (progress > 100) progress = 100;
            
            fill.style.width = `${progress}%`;
            
            const stepIndex = Math.floor((progress / 100) * steps.length);
            if (stepIndex < steps.length) {
                text.textContent = steps[stepIndex];
            }
            
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 1000);
            }
        }, 200);
    }
}

/**
 * Initialize enhanced tooltips system
 */
function initializeEnhancedTooltips() {
    const tooltip = document.createElement('div');
    tooltip.className = 'enhanced-tooltip';
    tooltip.id = 'enhanced-tooltip';
    document.body.appendChild(tooltip);
    
    // Add tooltips to key elements
    const tooltipElements = [
        { selector: '#generate-button', text: 'Generate your book chapters based on your input and settings' },
        { selector: '#settings-button', text: 'Customize generation settings, themes, and advanced options' },
        { selector: '#export-button', text: 'Export your completed book in various formats (PDF, HTML, etc.)' },
        { selector: '#language-select', text: 'Choose the language for your book generation' },
                { selector: '#save-button', text: 'Save your current book progress as a JSON file for later editing' },
        { selector: '#load-button', text: 'Load a previously saved book file to continue editing' }
    ];
    
    tooltipElements.forEach(({ selector, text }) => {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener('mouseenter', (e) => showTooltip(e, text));
            element.addEventListener('mouseleave', hideTooltip);
            element.addEventListener('mousemove', updateTooltipPosition);
        }
    });
}

function showTooltip(event, text) {
    const tooltip = document.getElementById('enhanced-tooltip');
    if (tooltip) {
        tooltip.textContent = text;
        tooltip.classList.add('visible');
        updateTooltipPosition(event);
    }
}

function hideTooltip() {
    const tooltip = document.getElementById('enhanced-tooltip');
    if (tooltip) {
        tooltip.classList.remove('visible');
    }
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('enhanced-tooltip');
    if (tooltip && tooltip.classList.contains('visible')) {
        tooltip.style.left = `${event.pageX - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${event.pageY - tooltip.offsetHeight - 10}px`;
    }
}

/**
 * Initialize live statistics display
 */
function initializeLiveStats() {
    const statsPanel = document.createElement('div');
    statsPanel.className = 'live-stats-panel';
    statsPanel.id = 'live-stats-panel';
    
        statsPanel.innerHTML = `
        <div class="stats-header">
            📊 Book Stats
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Chapters:</span>
            <span class="stat-value" id="stat-chapters">0</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Word Count:</span>
            <span class="stat-value" id="stat-words">0</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Reading Time:</span>
            <span class="stat-value" id="stat-time">0 min</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Completion:</span>
            <span class="stat-value" id="stat-completion">0%</span>
        </div>
    `;
    
    document.body.appendChild(statsPanel);
    
    // Update stats periodically
    setInterval(updateLiveStats, 2000);
    
    // Show/hide stats panel based on content
    const observer = new MutationObserver(() => {
        const hasChapters = document.querySelector('.chapter');
        if (hasChapters) {
            statsPanel.classList.add('visible');
        } else {
            statsPanel.classList.remove('visible');
        }
    });
    
    observer.observe(document.getElementById('book-content'), {
        childList: true,
        subtree: true
    });
}

function updateLiveStats() {
    const chapters = document.querySelectorAll('.chapter');
    const totalChapters = chapters.length;
    
    let totalWords = 0;
    let completedChapters = 0;
    
    chapters.forEach(chapter => {
        const content = chapter.querySelector('.chapter-content');
        if (content) {
            const text = content.textContent || '';
            const words = text.split(/\s+/).filter(word => word.length > 0);
            totalWords += words.length;
            
            if (words.length > 50) { // Consider chapter completed if > 50 words
                completedChapters++;
            }
        }
    });
    
        const readingSpeed = 200; // words per minute
    const readingTime = Math.ceil(totalWords / readingSpeed);
    const completion = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
    
    document.getElementById('stat-chapters').textContent = totalChapters;
    document.getElementById('stat-words').textContent = totalWords.toLocaleString();
    document.getElementById('stat-time').textContent = `${readingTime} min`;
    document.getElementById('stat-completion').textContent = `${completion}%`;
}

/**
 * Initialize floating action menu
 */
function initializeFloatingActionMenu() {
    const fab = document.createElement('div');
    fab.className = 'floating-action-menu';
    fab.id = 'floating-action-menu';
    
    fab.innerHTML = `
        <div class="fab-menu" id="fab-menu">
            <button class="fab-item" title="Jump to Top" onclick="scrollToTop()">↑</button>
            <button class="fab-item" title="Generate Chapter" onclick="quickGenerateChapter()">+</button>
            <button class="fab-item" title="Save Progress" onclick="quickSave()">💾</button>
            <button class="fab-item" title="Toggle Stats" onclick="toggleStats()">📊</button>
        </div>
        <button class="fab-main" onclick="toggleFabMenu()">⚡</button>
    `;
    
    document.body.appendChild(fab);
    
    // Global functions for FAB actions
    window.toggleFabMenu = function() {
        const menu = document.getElementById('fab-menu');
        menu.classList.toggle('open');
    };
    
    window.scrollToTop = function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.toggleFabMenu();
    };
    
    window.quickGenerateChapter = function() {
        const generateBtn = document.getElementById('generate-button');
        if (generateBtn && !generateBtn.disabled) {
            generateBtn.click();
        }
        window.toggleFabMenu();
    };
    
    window.quickSave = function() {
        const saveBtn = document.getElementById('save-button');
        if (saveBtn) {
            saveBtn.click();
        }
        window.toggleFabMenu();
    };
    
    window.toggleStats = function() {
        const statsPanel = document.getElementById('live-stats-panel');
        if (statsPanel) {
            statsPanel.classList.toggle('visible');
        }
        window.toggleFabMenu();
    };
}

/**
 * Initialize reading progress tracker
 */
function initializeReadingProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'reading-progress';
    progressBar.id = 'reading-progress';
    document.body.appendChild(progressBar);
    
    function updateReadingProgress() {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        
        progressBar.style.transform = `scaleX(${Math.min(scrollPercent, 100) / 100})`;
    }
    
    window.addEventListener('scroll', updateReadingProgress);
    updateReadingProgress(); // Initial call
}

/**
 * Initialize chapter minimap navigation
 */
function initializeChapterMinimap() {
    const minimap = document.createElement('div');
    minimap.className = 'chapter-minimap';
    minimap.id = 'chapter-minimap';
    document.body.appendChild(minimap);
    
    function updateMinimap() {
        const chapters = document.querySelectorAll('.chapter');
        minimap.innerHTML = '';
        
        if (chapters.length > 0) {
            chapters.forEach((chapter, index) => {
                const item = document.createElement('div');
                item.className = 'minimap-item';
                item.title = `Chapter ${index + 1}`;
                
                // Determine chapter status
                const content = chapter.querySelector('.chapter-content');
                if (content) {
                    const text = content.textContent || '';
                    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
                    
                    if (wordCount > 100) {
                        item.classList.add('completed');
                    } else if (wordCount > 10) {
                        item.classList.add('in-progress');
                    }
                }
                
                // Check if currently visible
                const rect = chapter.getBoundingClientRect();
                if (rect.top >= 0 && rect.top <= window.innerHeight / 2) {
                    item.classList.add('current');
                }
                
                item.addEventListener('click', () => {
                    chapter.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
                
                minimap.appendChild(item);
            });
            
            minimap.classList.add('visible');
        } else {
            minimap.classList.remove('visible');
        }
    }
    
    // Update minimap when chapters change
    const observer = new MutationObserver(updateMinimap);
    observer.observe(document.getElementById('book-content'), {
        childList: true,
        subtree: true
    });
    
    // Update current chapter indicator on scroll
    window.addEventListener('scroll', updateMinimap);
    
    updateMinimap(); // Initial call
}

/**
 * Initialize word count display
 */
function initializeWordCountDisplay() {
    const wordDisplay = document.createElement('div');
    wordDisplay.className = 'word-count-display';
    wordDisplay.id = 'word-count-display';
    wordDisplay.innerHTML = 'Words: <span id="live-word-count">0</span>';
    document.body.appendChild(wordDisplay);
    
    function updateWordCount() {
        const bookContent = document.getElementById('book-content');
        if (bookContent) {
            const text = bookContent.textContent || '';
            const words = text.split(/\s+/).filter(word => word.length > 0);
            document.getElementById('live-word-count').textContent = words.length.toLocaleString();
        }
    }
    
    // Update word count when content changes
    const observer = new MutationObserver(updateWordCount);
    observer.observe(document.getElementById('book-content'), {
        childList: true,
        subtree: true,
        characterData: true
    });
    
    updateWordCount(); // Initial call
}