# Unused Logic Scan Report

This report lists files and feature blocks detected as likely unused at runtime. The scan is heuristic and tunable via the in-app settings (script.js JSDoc @tweakable flags). No files were deleted.

Last scan: {auto-filled at runtime in console/localStorage}

How this scan works:
- It compares a curated list of candidate files against what is actually referenced by the current page’s import map, <script src>, and <link rel="stylesheet"> tags.
- Some groups are treated as alternates or demos and are assumed unused unless explicitly loaded.
- A JSON copy of the last scan is exposed at window.BG_UNUSED_REPORT and stored in localStorage under bg_unused_logic_report.

Key @tweakable switches (in script.js):
- enableUnusedLogicScan: enable/disable the scan.
- unusedReportMode: 'console' | 'overlay' | 'both'
- unusedScanCandidates: control the candidate groups/files.
- unusedOverlayAutoHideMs: auto-hide the overlay panel.

Findings (heuristic):
1) Duplicate Alternates (unused by import map):
   - ui-style-settings (1).js
   - book-manager (1).js
   - json-settings (1).js
   - welcome-popup (1).js
   - book-generator (1).js
   - index (1).html

2) Legacy/Standalone Demo Pages (not part of current UX flow):
   - library-Browser.html
   - TEST2.HTML
   - TEST12.HTML
   - A.HTML

3) Community Library – experimental extras (not loaded by community-library.html):
   - COMMUNITY LIBRARY/newnew commlib/logic.js
   - COMMUNITY LIBRARY/newnew commlib/localization.js
   - COMMUNITY LIBRARY/newnew commlib/access.css
   - COMMUNITY LIBRARY/newnew commlib/access.js
   - COMMUNITY LIBRARY/newnew commlib/gamification.js
   - COMMUNITY LIBRARY/newnew commlib/storeOnIpfs.js
   - COMMUNITY LIBRARY/newnew commlib/optimized.css
   - COMMUNITY LIBRARY/newnew commlib/ttsConfig.js
   - COMMUNITY LIBRARY/styles.css
   - COMMUNITY LIBRARY/styles/styles.css

4) Security/Wallet (disabled in app, not wired on page):
   - SEC.JS

5) PageFlip CSS (not wired to flip.html):
   - pageflip library.css
   - STYLES.CSS

Recommendations:
- Keep alternates checked into version control if you rely on them for experimentation, but consider moving them to a /sandbox or /archive folder.
- For community-library extras, consider a lazy loader wiring to explicitly include only the pieces you need.
- If you decide to fully remove any asset, search usage across pages and import maps, and remove dead references first.

Note: This is a runtime page-level scan; other entry points (like community-library.html, flip.html) may legitimately load some files. Re-run the scan from those pages to get a page-specific report.

