# Logic Scan Report

This document outlines identified logical issues and inconsistencies within the Book Genie codebase.

## 1. Unsolicited Web3 Wallet Integration

- **Issue:** The application includes a "Connect Wallet" feature that was added without explicit user consent or a clear opt-in mechanism, as detailed in `SEC.MD`. This poses a potential security and privacy risk by prompting for wallet connections unexpectedly.
- **Analysis:** This functionality appears to be an unauthorized addition. Standard security practices dictate that features with security implications, like wallet integration, should be disabled by default and only enabled after explicit user consent.
- **Resolution:** The wallet integration button has been removed from `index.html`, and the corresponding JavaScript logic has been removed from `script.js` to mitigate this risk.

## 2. Redundant and Flawed Background Image Script

- **Issue:** `index.html` contains an inline script attempting to set the page's background image by calling `setBodyBackground()`. This script fails because `setBodyBackground` is an ES module function and is not available in the global scope of a non-module script tag.
- **Analysis:** This inline script is both non-functional and redundant. The main application script, `script.js`, already correctly imports and calls `setBodyBackground` to set an initial background image when the DOM is loaded. The URL used in the broken script also incorrectly points to an HTML file instead of an image.
- **Resolution:** The broken inline `<script>` block has been removed from `index.html`. The application will now correctly rely on `script.js` to manage the background image, resolving the `ReferenceError` and eliminating the conflicting logic.

---

## 3. Duplicate Logic Scan (New)

A scan detected multiple duplicate files that contain overlapping logic. These duplicates can cause confusion or accidental double-maintenance. The runtime now reports duplicates and exposes a canonical preference map.

- Detected groups and canonical primaries:
  - UI Style Settings: primary = `ui-style-settings.js`, duplicates: [`ui-style-settings (1).js`]
  - Book Manager: primary = `book-manager.js`, duplicates: [`book-manager (1).js`]
  - JSON Settings Tab: primary = `json-settings.js`, duplicates: [`json-settings (1).js`]
  - Welcome Popup: primary = `welcome-popup.js`, duplicates: [`welcome-popup (1).js`]
  - Book Generator: primary = `book-generator.js`, duplicates: [`book-generator (1).js`]
  - Index HTML: primary = `index.html`, duplicates: [`index (1).html`]

Notes:
- The import map and main entry point already reference the primaries. The alternates remain unused but present in the repository.
- A lightweight duplicate detector has been added to `script.js`:
  - @tweakable enableDuplicateWarnings (default: true)
  - @tweakable duplicateResolutionPolicy (default: `preferPrimary`)
  - @tweakable duplicateGroups (list of groups shown above)

Behavior:
- When duplicates are detected, a collapsed console group “Duplicate Logic Detected” summarizes the conflicts.
- With `duplicateResolutionPolicy: "preferPrimary"`, a canonical map is exposed at `window.BG_PRIMARY_MODULES` for optional runtime consumers.

Recommendation:
- Migrate any references to alternates back to the canonical primary modules.
- Once verified, consider removing alternates to reduce repo noise.

---
This report is based on an automated scan and logical analysis of the provided codebase.