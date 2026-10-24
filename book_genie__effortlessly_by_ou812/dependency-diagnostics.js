// dependency-diagnostics.js
// Lightweight runtime diagnostics for module exports, import map coverage, and DOM preflight checks.

/* @tweakable diagEnabled Turn diagnostics on/off */
export let diagEnabled = true;

/* @tweakable diagLogLevel console log level: "info" | "warn" | "error" */
export let diagLogLevel = "warn";

/* @tweakable diagHaltOnMissingExport Throw (and stop) on first missing export */
export let diagHaltOnMissingExport = false;

/* @tweakable diagRunOnDomReady Run diagnostics after DOMContentLoaded */
export let diagRunOnDomReady = true;

/* @tweakable diagModules List of modules and their expected exports for verification */
export let diagModules = [
  { spec: './chapter-generator.js', expected: ['generateAllChaptersSequentially','generateChapterContent'] },
  { spec: './settings-manager.js', expected: ['init','getSettings'] },
  { spec: './ui-helpers.js', expected: ['setupChapterCollapse','addLanguageOption','saveCustomLanguage','addCustomGenreOption','saveCustomGenre','updateChapterSizeSublabel'] },
  { spec: './book-manager.js', expected: ['detectLanguage','generateChapterData','loadBookData','saveBookData'] },
  { spec: './genre-manager.js', expected: ['detectGenre'] },
  { spec: './ai-prompt-popup.js', expected: ['openAiPromptPopup'] },
  { spec: './background-manager.js', expected: ['setBodyBackground'] },
  { spec: './export-manager.js', expected: ['initializeExportButton'] },
  { spec: './language-select.js', expected: ['initializeLanguageSelect'] },
  { spec: './story-details-settings.js', expected: ['createStoryDetailsContent'] },
  { spec: './generation-settings.js', expected: ['createGenerationSettingsContent'] },
  { spec: './tts-settings.js', expected: ['createTTSSettingsContent'] },
  { spec: './ui-style-settings.js', expected: ['createUIStyleSettingsContent'] },
  { spec: '@websim/websim-socket', expected: [] }
];

/* @tweakable diagDomSelectorsToValidate Ensure these selectors exist before features run */
export let diagDomSelectorsToValidate = [
  '#input-text', '#chapters-container', '#book-content', '#language-select',
  '#generate-button', '#settings-popup', '#ai-command-console'
];

/* @tweakable diagDuplicateIdAllowlist IDs allowed to appear multiple times (if any) */
export let diagDuplicateIdAllowlist = [];

/* @tweakable diagCheckImportMap Verify import map contains required bare specifiers used by the app */
export let diagCheckImportMap = true;

/* @tweakable diagCustomMessagePrefix Prefix for all diagnostic messages */
export let diagCustomMessagePrefix = '[BG-DIAG]';

function log(level, msg, data) {
  const m = `${diagCustomMessagePrefix} ${msg}`;
  if (level === 'error') console.error(m, data || '');
  else if (level === 'warn') console.warn(m, data || '');
  else console.info(m, data || '');
}

async function verifyModuleExports(entry) {
  try {
    const mod = await import(entry.spec);
    const missing = (entry.expected || []).filter(name => !(name in mod));
    if (missing.length) {
      const message = `Missing exports in ${entry.spec}: ${missing.join(', ')}`;
      log(diagLogLevel, message, { present: Object.keys(mod) });
      if (diagHaltOnMissingExport) throw new Error(message);
    } else {
      log('info', `OK: ${entry.spec} exports verified`);
    }
  } catch (e) {
    log('error', `Failed to import ${entry.spec}`, e);
    if (diagHaltOnMissingExport) throw e;
  }
}

function verifyImportMapCoverage() {
  try {
    const node = document.querySelector('script[type="importmap"]');
    if (!node) {
      log(diagLogLevel, 'No import map found in document.');
      return;
    }
    const map = JSON.parse(node.textContent || '{}');
    const imports = map.imports || {};
    const missing = [];

    // Verify that common bare specifiers exist
    const required = [
      'config','chapter-generator','settings-manager','ui-helpers','book-manager',
      'genre-manager','ai-prompt-popup','background-manager','export-manager',
      'language-select','story-details-settings','generation-settings','tts-settings',
      'ui-style-settings','@websim/websim-socket'
    ];

    for (const r of required) {
      if (!imports[r]) missing.push(r);
    }
    if (missing.length) {
      log(diagLogLevel, `Import map missing entries: ${missing.join(', ')}`);
    } else {
      log('info', 'OK: Import map coverage');
    }
  } catch (e) {
    log('warn', 'Failed to parse or verify import map.', e);
  }
}

function verifyDomSelectors() {
  let errors = 0;
  for (const sel of diagDomSelectorsToValidate) {
    const el = document.querySelector(sel);
    if (!el) {
      errors++;
      log(diagLogLevel, `Missing DOM element: ${sel}`);
    }
  }
  if (!errors) log('info', 'OK: DOM selectors present');
}

function verifyDuplicateIds() {
  const all = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
    const seen = new Set();
    const dups = new Set();
    for (const id of all) {
        if (seen.has(id) && !diagDuplicateIdAllowlist.includes(id)) dups.add(id);
        seen.add(id);
    }
    if (dups.size) {
        log(diagLogLevel, `Duplicate IDs detected: ${Array.from(dups).join(', ')}`);
    } else {
      log('info', 'OK: No duplicate IDs detected (beyond allowlist)');
    }
}

export async function runDependencyDiagnostics(custom = {}) {
    if (!diagEnabled) return;
    // Allow runtime overrides
    Object.assign(
    { diagEnabled, diagLogLevel, diagHaltOnMissingExport, diagRunOnDomReady, diagModules, diagDomSelectorsToValidate, diagDuplicateIdAllowlist, diagCheckImportMap, diagCustomMessagePrefix },
    custom
  );

  try {
    log('info', 'Starting dependency diagnostics...');
    if (diagCheckImportMap) verifyImportMapCoverage();
    verifyDomSelectors();
    verifyDuplicateIds();
    for (const entry of diagModules) {
      // Sanity: skip obviously bad specs
      if (!entry || !entry.spec || !entry.expected) continue;
      await verifyModuleExports(entry);
    }
    log('info', 'Diagnostics completed.');
  } catch (e) {
    log('error', 'Diagnostics aborted due to an error.', e);
  }
}

// Optionally run on DOMContentLoaded for safer DOM checks
if (diagRunOnDomReady) {
    // Fixed missing parenthesis that caused "Unexpected token '}'" at runtime.
    // @tweakable diagInitHook Which hook to initialize diagnostics on ("DOMContentLoaded" | "load")
    const diagInitHook = 'DOMContentLoaded';
    if (diagInitHook === 'load') {
      window.addEventListener('load', () => runDependencyDiagnostics().catch(() => {}));
    } else {
      document.addEventListener('DOMContentLoaded', () => runDependencyDiagnostics().catch(() => {}));
    }
}

// Still, for security, prefer to use window.addEventListener('load', runDependencyDiagnostics) to ensure diagnostics run after loading and setup.
// A tweak to consider setting this to window.addEventListener('load', runDependencyDiagnostics) for increased security against unauthorized manipulation.