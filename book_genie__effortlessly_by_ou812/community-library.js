import { WebsimSocket } from '@websim/websim-socket';

(async () => {
    const room = new WebsimSocket();
    await room.initialize();

    // --- Predeclare feature flags and sizing to avoid TDZ/redeclaration issues ---

    /** @tweakable enableHighContrastUI Enable High Contrast toggle using access.js + CSS (predeclared to avoid TDZ) */
    let enableHighContrastUI = true;

    /** @tweakable enableGamification Enable gamification points/badges from gamification.js (predeclared) */
    let enableGamification = true;

    /** @tweakable enableTTSPreview Adds a TTS preview action in Grid cards via websim.textToSpeech (predeclared) */
    let enableTTSPreview = true;

    /** @tweakable ttsPreviewVoice Default voice code for previews (e.g., 'en-female', 'en-male', 'es-female') */
    let ttsPreviewVoice = 'en-female';

    /** @tweakable preferIPFSUploads Prefer IPFS for uploads (requires separate client and valid CORS); falls back to websim.upload */
    let preferIPFSUploads = false;

    /** @tweakable ipfsGateway Public IPFS gateway base URL */
    let ipfsGateway = 'https://ipfs.io/ipfs/';

    /** @tweakable gridImageHeight_px Height of cover thumbnails in Grid layout (pixels) */
    const GRID_IMG_HEIGHT = 140;

    // Cache UI elements
    const bookFileInput   = document.getElementById('book-file-input');
    const publishButton   = document.getElementById('publish-button');
    const publishStatus   = document.getElementById('publish-status');
    const bookshelfSurface = document.getElementById('bookshelf-surface');
    const bookshelf = document.getElementById('bookshelf');
    const sortSelect = document.getElementById('sort-select');
    const searchInput = document.getElementById('search-input');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageInfoSpan = document.getElementById('page-info');

    // New UI toggles
    const themeSelect = document.getElementById('theme-select');
    const layoutSelect = document.getElementById('layout-select');
    const gridSection = document.getElementById('grid-section');
    const gridContainer = document.getElementById('grid-container');
    const librarySection = document.getElementById('library-section');

    // New: Center CTA → open external 3D bookshelf
    const centerCta = document.getElementById('center-cta');

    // Library language select (used in localization wiring)
    const libLanguageSelect = document.getElementById('lib-language-select');

    // --- AI CHATBOT LIBRARIAN ---
    const chatbotToggleButton = document.getElementById('chatbot-toggle-button');
    const chatbotWindow = document.getElementById('chatbot-window');
    const chatbotCloseButton = document.getElementById('chatbot-close-button');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSendButton = document.getElementById('chatbot-send-button');

    let conversationHistory = [];
    let libraryBooks = [];       // raw records from DB
    let filteredBooks = [];      // filtered/sorted working set
    let currentPage = 1;

    /**
     * @tweakable librarianPersona The system prompt that defines the chatbot's personality.
     */
    const librarianPersona = "You are a friendly and helpful AI librarian managing a digital community bookshelf. Your goal is to help users discover books. You can answer questions about the books available, suggest books based on interests, and provide details like author and chapter count. Keep your responses concise and cheerful. If you don't know the answer, say so politely. You are not a general-purpose assistant, so steer conversations back to the library's books.";

    /**
     * @tweakable generatorPath Relative path to the main generator page (used when loading a book from the Library)
     */
    const generatorPath = 'index.html';

    /**
     * @tweakable SHARE_BTN_LABEL Label for the "copy share link" button
     */
    const SHARE_BTN_LABEL = 'Share Link';

    /**
     * @tweakable maxFileSize Maximum book file size allowed for publish (in bytes)
     */
    const maxFileSize = 10 * 1024 * 1024; // 10MB

    /**
     * @tweakable defaultSort Initial sort mode for the library ("newest" | "chapters_desc" | "title_asc")
     */
    const defaultSort = 'newest';

    function toggleChatbot() {
        chatbotWindow.classList.toggle('hidden');
        if (!chatbotWindow.classList.contains('hidden')) {
            chatbotInput.focus();
            if (conversationHistory.length === 0) {
                 // Add a welcome message on first open
                 addMessageToChat('bot', 'Hello! How can I help you explore our community library today?');
            }
        }
    }

    function addMessageToChat(sender, text) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender);
        messageElement.textContent = text;
        chatbotMessages.appendChild(messageElement);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight; // Auto-scroll
    }

    async function handleSendMessage() {
        const userMessage = chatbotInput.value.trim();
        if (!userMessage) return;

        addMessageToChat('user', userMessage);
        conversationHistory.push({ role: 'user', content: userMessage });
        chatbotInput.value = '';
        chatbotSendButton.disabled = true;

        // Add a thinking indicator
        const thinkingIndicator = document.createElement('div');
        thinkingIndicator.classList.add('chat-message', 'bot');
        thinkingIndicator.textContent = '...';
        chatbotMessages.appendChild(thinkingIndicator);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;

        try {
            // Prepare context with the list of books
            const bookContext = libraryBooks.map(book => `- "${book.bookTitle}" by @${book.username} (${book.chapterCount} chapters)`).join('\n');
            const systemPrompt = `${librarianPersona}\n\nHere are the books currently on the shelf:\n${bookContext}`;

            const completion = await websim.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    ...conversationHistory.slice(-6) // Keep context manageable
                ]
            });
            
            const botResponse = completion.content;
            chatbotMessages.removeChild(thinkingIndicator); // Remove thinking indicator
            addMessageToChat('bot', botResponse);
            conversationHistory.push({ role: 'assistant', content: botResponse });

        } catch (error) {
            console.error('Chatbot error:', error);
            chatbotMessages.removeChild(thinkingIndicator);
            addMessageToChat('bot', 'I seem to be having trouble connecting. Please try again in a moment.');
        } finally {
            chatbotSendButton.disabled = false;
        }
    }

    if (chatbotToggleButton) chatbotToggleButton.addEventListener('click', toggleChatbot);
    if (chatbotCloseButton) chatbotCloseButton.addEventListener('click', () => chatbotWindow.classList.add('hidden'));
    if (chatbotSendButton) chatbotSendButton.addEventListener('click', handleSendMessage);
    if (chatbotInput) chatbotInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });
    // --- END AI CHATBOT LIBRARIAN ---

    // Auth/Account panel setup
    const loginRedirectUrl = 'https://websim.com/login?redirect=community-library.html';
    const signupRedirectUrl = 'https://websim.com/signup?redirect=community-library.html';
    let currentUser = null;
    try {
        currentUser = await window.websim.getCurrentUser();
    } catch (e) {
        console.warn('No user session detected.');
    }
    const authPanel = document.getElementById('auth-panel');
    if (authPanel) {
        if (currentUser && currentUser.username) {
            authPanel.innerHTML = `
                <img src="https://images.websim.com/avatar/${currentUser.username}" 
                     alt="Avatar" width="32" style="vertical-align:middle;border-radius:50%;margin-right:8px;">
                Logged in as <a href="https://websim.com/@${currentUser.username}" target="_blank">@${currentUser.username}</a>
                <button id="logout-button">Logout</button>
            `;
            document.getElementById('logout-button').addEventListener('click', () => {
                window.location.href = 'https://websim.com/logout?redirect=community-library.html';
            });
        } else {
            authPanel.innerHTML = `
                <a href="${loginRedirectUrl}">Login</a> or
                <a href="${signupRedirectUrl}">Create Account</a>
            `;
        }
    }

    // Disable publish if not logged in
    if (!currentUser || !currentUser.username) {
        publishButton.disabled = true;
        publishButton.title = 'Login to publish';
    }

    const parallaxStrength = 0.5;
    window.addEventListener('scroll', () => {
        document.body.style.backgroundPositionY = `${window.scrollY * parallaxStrength}px`;
    });

    /* @tweakable libraryItemsPerPage Number of library items to display per page */
    const ITEMS_PER_PAGE = 12; // Reduced to fit 3D bookshelf

    /* @tweakable gridItemsPerPage Number of items per page in Grid layout */
    const GRID_ITEMS_PER_PAGE = 24;

    /* @tweakable libraryThumbnailWidth Width of book thumbnail images in pixels */
    const THUMBNAIL_WIDTH = 120;

    /* @tweakable fallbackCoverUrl Default cover image when no cover is available */
    const FALLBACK_COVER_URL = 'https://images.websim.com/v1/site/placeholder/600';

    /* @tweakable maxBookDataUrlSize Maximum allowed size for book data URLs to prevent abuse */
    const maxBookDataUrlSize = 1024;

    /**
     * @tweakable allowedDataUrlOrigins Allowed URL origins for downloaded book JSON to prevent SSRF/open redirects
     */
    const allowedDataUrlOrigins = [
        window.location.origin,
        'https://api.websim.com',
        'https://websim.com',
        'https://screenshots.websim.com' // safe-ish assets; adjust as needed
    ];

    /**
     * Validates a dataUrl against origin and length rules
     */
    function isValidDataUrl(url) {
        try {
            if (!url || url.length > maxBookDataUrlSize) return false;
            const u = new URL(url, window.location.href);
            return allowedDataUrlOrigins.some(origin => u.origin === origin);
        } catch {
            return false;
        }
    }

    // Book colors for 3D display
    const bookColors = [
        '#c00000', '#891a21', '#bf3e22', '#0e4326', '#0066cc', 
        '#0f7b7e', '#084e6f', '#0b0823', '#38103d', '#443344', 
        '#666777', '#c00000'
    ];

    // Generate dynamic CSS for book positioning and colors
    function generateBookStyles(bookCount) {
        let styles = '';
        const startPosition = 6; // Starting after shelf blocks
        
        for (let i = 0; i < Math.min(bookCount, 12); i++) {
            const blockNum = startPosition + i;
            const color = bookColors[i % bookColors.length];
            const positions = [
                'translate3d(16px, -208px, 240px)',
                'translate3d(48px, -208px, 256px)',
                'translate3d(80px, -192px, 272px)',
                'translate3d(112px, -192px, 240px)',
                'translate3d(144px, -208px, 256px)',
                'translate3d(176px, -208px, 272px)',
                'translate3d(208px, -192px, 256px)',
                'translate3d(240px, -208px, 272px)',
                'translate3d(272px, -192px, 240px)',
                'translate3d(304px, -192px, 256px)',
                'translate3d(336px, -192px, 272px)',
                'translate3d(16px, -176px, 288px)'
            ];
            
            styles += `
                .b${blockNum} {
                    display: block;
                    transform: ${positions[i] || positions[0]};
                }
                .b${blockNum} .block-inner > div {
                    background-color: ${color};
                }
                .b${blockNum} .block-inner > div.right {
                    background-color: #fff;
                }
                .b${blockNum} .block-inner > div.right::after {
                    background-color: ${color};
                }
                .b${blockNum} .block-inner > div.top, 
                .b${blockNum} .block-inner > div.back, 
                .b${blockNum} .block-inner > div.bottom {
                    background-color: #fff;
                    background-image: repeating-linear-gradient(90deg, transparent, transparent 21%, #aaa 21%, #aaa 25%, transparent 25%, transparent 46%, #aaa 46%, #aaa 50%, transparent 50%);
                    background-size: 16px 16px;
                }
                input[type=radio]:nth-child(${i + 1}):checked ~ .surface {
                    transform: translate(${50 - (i * 8.33)}%, 152px) rotateX(80deg) rotateZ(0deg);
                }
                input[type=radio]:nth-child(${i + 1}):checked ~ .surface label:nth-child(${blockNum}) .block-inner {
                    animation: viewBook 0.25s 0.25s linear forwards;
                }
                input[type=radio]:nth-child(${i + 1}):checked ~ .surface label:nth-child(${blockNum}) .block-inner:hover .right::after,
                input[type=radio]:nth-child(${i + 1}):checked ~ .surface label:nth-child(${blockNum}) .block-inner:hover .cover {
                    transform: rotateY(-135deg);
                }
            `;
        }
        
        // Add the styles to the document
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    // CTA to open external 3D bookshelf by JUSTIN_TIME
    /**
     * @tweakable extBookshelfUrl External 3D shelf URL to open from the center CTA
     */
    const extBookshelfUrl = 'https://websim.com/@JUSTIN_TIME/3d-interactive-bookshelf/70';
    /**
     * @tweakable extBookshelfOpenInNewTab Whether to open the external shelf in a new tab
     */
    const extBookshelfOpenInNewTab = true;

    function openExternalShelf() {
        if (!centerCta) return;
        try {
            if (extBookshelfOpenInNewTab) {
                window.open(extBookshelfUrl, '_blank', 'noopener,noreferrer');
            } else {
                window.location.href = extBookshelfUrl;
            }
        } catch (e) {
            console.warn('Failed to open external shelf:', e);
        }
    }
    if (centerCta) {
        centerCta.addEventListener('click', openExternalShelf);
        centerCta.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openExternalShelf();
            }
        });
    }

    // Generate a shareable link to a specific book record using window.baseUrl
    function makeShareLink(record) {
        const base = (window.baseUrl || (window.location.origin + window.location.pathname)).replace(/\/[^/]*$/, '/');
        const url = new URL(`${base}community-library.html`);
        url.searchParams.set('recordId', record.id);
        return url.toString();
    }

    // Layout switcher
    /** 
     * @tweakable layoutDefault Default layout mode ('3d' | 'grid')
     * Keep '3d' to highlight the bookshelf interaction
     */
    const layoutDefault = localStorage.getItem('libraryLayout') || '3d';
    layoutSelect.value = layoutDefault;

    function applyLayout(mode) {
        if (mode === 'grid') {
            librarySection.style.display = 'none';
            gridSection.style.display = 'block';
            renderGrid(libraryBooks);
        } else {
            gridSection.style.display = 'none';
            librarySection.style.display = 'block';
            renderShelf(libraryBooks);
        }
        localStorage.setItem('libraryLayout', mode);
    }

    layoutSelect.addEventListener('change', () => {
        currentPage = 1;
        applyLayout(layoutSelect.value);
        reapplyAccessibility();
    });

    // Theme switcher
    /** 
     * @tweakable uiThemeDefault Default theme ('light' | 'dark' | 'neon')
     * Set to 'neon' to match Book Genie title styling by default
     */
    const uiThemeDefault = localStorage.getItem('libraryTheme') || 'neon';
    themeSelect.value = uiThemeDefault;

    function applyTheme(theme) {
        document.body.classList.remove('theme-dark', 'theme-neon');
        if (theme === 'dark') {
            document.body.classList.add('theme-dark');
            document.body.style.backgroundColor = '#0b0b0b';
            document.body.style.color = '#eaeaea';
        } else if (theme === 'neon') {
            document.body.classList.add('theme-neon');
            document.body.style.backgroundColor = '#0a0a1a';
            document.body.style.color = '#e0e0ff';
            document.body.style.textShadow = '0 0 6px rgba(124,58,237,0.35)';
        } else {
            document.body.style.backgroundColor = '';
            document.body.style.color = '';
            document.body.style.textShadow = '';
        }
        localStorage.setItem('libraryTheme', theme);
    }

    themeSelect.addEventListener('change', () => applyTheme(themeSelect.value));

    // Apply theme/layout on load
    applyTheme(uiThemeDefault);
    applyLayout(layoutDefault);

    // Toolbar behavior options
    /** @tweakable toolbarSticky_CL Enable sticky toolbar behavior */
    const toolbarSticky_CL = true;
    /** @tweakable toolbarAutoFocusSearch_CL Autofocus the search field on page load */
    const toolbarAutoFocusSearch_CL = false;

    (function finalizeToolbar() {
        try {
            const toolbar = document.getElementById('library-controls');
            if (toolbar && toolbarSticky_CL) {
                toolbar.classList.add('sticky');
            }
            if (toolbarAutoFocusSearch_CL) {
                document.getElementById('search-input')?.focus();
            }
        } catch (e) {}
    })();

    // Enhance High Contrast toggle to keep aria in sync when applying class (if access.js not present)
    const highContrastBtn = document.getElementById('high-contrast-toggle');
    if (highContrastBtn) {
        highContrastBtn.addEventListener('click', () => {
            const pressed = highContrastBtn.getAttribute('aria-pressed') === 'true';
            highContrastBtn.setAttribute('aria-pressed', String(!pressed));
        });
    }

    // Localization defaults
    /**
     * @tweakable defaultLibraryLang Preferred starting language for the Library UI
     */
    const defaultLibraryLang = (localStorage.getItem('cl_lang') || 'en');
    if (libLanguageSelect) {
        libLanguageSelect.value = defaultLibraryLang;
    }

    // Wire Localization UI if available
    /**
     * @tweakable enableLocalization Enable localization UI using experimental localization.js
     */
    const enableLocalization = true;
    if (enableLocalization && libLanguageSelect) {
        const applyLang = (code) => {
            localStorage.setItem('cl_lang', code);
            try {
                // experimental: call community localization setLanguage if present
                if (typeof window.setLanguage === 'function') {
                    window.setLanguage(code);
                } else {
                    // minimal fallback: update placeholders
                    document.querySelector('#search-input')?.setAttribute('placeholder',
                        code === 'es' ? 'Buscar libros...' :
                        code === 'zh' ? '搜索书籍...' :
                        code === 'ar' ? 'البحث عن الكتب...' :
                        'Filter by title or author...');
            } catch (e) {
                console.warn('Localization apply failed:', e);
            }
        };
        applyLang(libLanguageSelect.value);
        libLanguageSelect.addEventListener('change', () => applyLang(libLanguageSelect.value));
    }

    // Gamification: update status UI
    const gamificationPointsEl = document.getElementById('gamification-points');
    const gamificationBadgesEl = document.getElementById('gamification-badges');
    function updateGamificationHud() {
        if (!enableGamification) return;
        if (window.gamification) {
            gamificationPointsEl && (gamificationPointsEl.textContent = String(window.gamification.points || 0));
            if (gamificationBadgesEl) {
                const badges = Array.isArray(window.gamification.badges) ? window.gamification.badges : [];
                gamificationBadgesEl.textContent = badges.length ? `Badges: ${badges.join(', ')}` : '';
            }
        }
    }
    updateGamificationHud();

    // ---- BEGIN: Toggle optional assets loaded by community-library.html ----
    /**
     * @tweakable loadLocalizationJsFlag Load COMMUNITY LIBRARY/newnew commlib/localization.js to localize headings and UI
     */
    const loadLocalizationJsFlag = true;
    /**
     * @tweakable loadAccessibilityJsFlag Load COMMUNITY LIBRARY/newnew commlib/access.js for high-contrast + ARIA helpers
     */
    const loadAccessibilityJsFlag = true;
    /**
     * @tweakable loadGamificationJsFlag Load COMMUNITY LIBRARY/newnew commlib/gamification.js for points/badges HUD
     */
    const loadGamificationJsFlag = true;
    /**
     * @tweakable loadOptimizedCssFlag Load COMMUNITY LIBRARY/newnew commlib/optimized.css (3D shelf tweaks)
     */
    const loadOptimizedCssFlag = true;
    /**
     * @tweakable loadGlobalLibraryCssFlag Load COMMUNITY LIBRARY/styles.css (global CL theme)
     */
    const loadGlobalLibraryCssFlag = true;
    /**
     * @tweakable loadAltGlobalLibraryCssFlag Load COMMUNITY LIBRARY/styles/styles.css (alt global styles)
     */
    const loadAltGlobalLibraryCssFlag = true;

    // Apply toggles (remove tags if disabled)
    try {
      const byId = (id) => document.getElementById(id);
      // CSS
      if (!loadOptimizedCssFlag) byId('cl-optimized-css')?.remove();
      if (!loadGlobalLibraryCssFlag) byId('cl-global-styles-css')?.remove();
      if (!loadAltGlobalLibraryCssFlag) byId('cl-global-styles2-css')?.remove();
      // Access CSS toggled by enableHighContrastUI (predeclared above)
      if (!enableHighContrastUI) byId('cl-access-css')?.remove();

      // JS extras
      if (!loadLocalizationJsFlag) byId('cl-localization-js')?.remove();
      if (!loadAccessibilityJsFlag) byId('cl-access-js')?.remove();
      if (!loadGamificationJsFlag) byId('cl-gamification-js')?.remove();
    } catch (e) {
      console.warn('Optional asset toggles failed:', e);
    }
    // ---- END: Toggle optional assets ----

    /**
     * @tweakable enableHighContrastUI Enable High Contrast toggle using access.js + CSS
     */
    const enableHighContrastUI = true;

    /**
     * @tweakable enableGamification Enable gamification points/badges from gamification.js
     */
    const enableGamification = true;

    /**
     * @tweakable enableTTSPreview Adds a TTS preview action in Grid cards via websim.textToSpeech
     */
    const enableTTSPreview = true;

    /**
     * @tweakable ttsPreviewVoice Default voice code for previews (e.g., 'en-female', 'en-male', 'es-female')
     */
    const ttsPreviewVoice = 'en-female';

    /**
     * @tweakable preferIPFSUploads Prefer IPFS for uploads (requires separate client and valid CORS); falls back to websim.upload
     */
    const preferIPFSUploads = false;

    /**
     * @tweakable ipfsGateway Public IPFS gateway to use for resolving content if IPFS is enabled
     */
    const ipfsGateway = 'https://ipfs.io/ipfs/';

    // Wire High Contrast Toggle + Accessibility helpers if available
    if (enableHighContrastUI && highContrastBtn) {
        try {
            if (typeof window.initializeAccessibility === 'function') {
                // Initialize once, also sets ARIA and keyboard nav on dynamic blocks later
                window.initializeAccessibility();
            }
        } catch (e) {
            console.warn('Accessibility init failed:', e);
        }
    } else if (highContrastBtn) {
        highContrastBtn.style.display = 'none';
    }

    // Subscribe to real-time updates and load initial data
    try {
        room.collection('community_book').subscribe(records => {
            libraryBooks = records || [];
            // Deeplink support: ?recordId=<id>
            const params = new URLSearchParams(window.location.search);
            const recordId = params.get('recordId');
            if (recordId) {
                // Move the record to the front to show on first page
                const idx = libraryBooks.findIndex(b => b.id === recordId);
                if (idx >= 0) {
                    const [selected] = libraryBooks.splice(idx, 1);
                    libraryBooks.unshift(selected);
                }
            }
            if ((layoutSelect.value || '3d') === 'grid') {
                renderGrid(libraryBooks);
            } else {
                renderShelf(libraryBooks);
                // If deeplink, select the first radio (the chosen one)
                if (recordId) {
                    const firstRadio = bookshelf.querySelector('input[type="radio"]');
                    if (firstRadio) firstRadio.checked = true;
                }
            }
            reapplyAccessibility();
        });
        const initialBooks = await room.collection('community_book').getList();
        libraryBooks = initialBooks || [];
        if ((layoutSelect.value || '3d') === 'grid') renderGrid(libraryBooks); else renderShelf(libraryBooks);
    } catch (error) {
        console.error('Failed to load library:', error);
        const libraryList = document.getElementById('bookshelf-surface');
        if (libraryList) libraryList.innerHTML = '<p style="color:red;">Failed to load library. Please refresh the page.</p>';
    }

    // Publish logic - Enhanced JSON file handling
    /** 
     * @tweakable publishCooldownMs Minimum time (ms) between publish actions to reduce spam 
     */
    const publishCooldownMs = 15000;
    let lastPublishAt = 0;

    publishButton.addEventListener('click', async () => {
        if (Date.now() - lastPublishAt < publishCooldownMs) {
            publishStatus.textContent = `Please wait ${(Math.ceil((publishCooldownMs - (Date.now() - lastPublishAt))/1000)}s before publishing again.`;
            publishStatus.style.color = 'red';
            return;
        }

        // Require login to publish
        if (!currentUser || !currentUser.username) {
            publishStatus.textContent = 'Please log in to publish your book.';
            publishStatus.style.color = 'red';
            return;
        }

        const file = bookFileInput.files[0];
        if (!file) {
            publishStatus.textContent = 'Please select a JSON file first.';
            publishStatus.style.color = 'red';
            return;
        }

        /* @tweakable allowedFileTypes Array of allowed file extensions for book uploads */
        const allowedTypes = ['.json'];
        const fileName = file.name.toLowerCase();
        const isValidType = allowedTypes.some(type => fileName.endsWith(type));
        
        if (!isValidType) {
            publishStatus.textContent = 'Please select a valid JSON file (.json).';
            publishStatus.style.color = 'red';
            return;
        }

        if (file.size > maxFileSize) {
            publishStatus.textContent = `File too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB.`;
            publishStatus.style.color = 'red';
            return;
        }

        publishStatus.textContent = 'Processing and uploading book...';
        publishStatus.style.color = 'blue';
        publishButton.disabled = true;

        try {
            // Validate JSON content before upload
            const jsonContent = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const parsed = JSON.parse(e.target.result);
                        resolve(parsed);
                    } catch (parseError) {
                        reject(new Error('Invalid JSON format'));
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            });

            // Extract book metadata from JSON
            const bookTitle = jsonContent.bookTitle || file.name.replace(/\.json$/i, '') || 'Untitled';
            const imageUrl = jsonContent.imageUrl || null;
            const chapterCount = jsonContent.chapters ? jsonContent.chapters.length : 0;

            // Upload the file (smart)
            const dataUrl = await uploadFileSmart(file);
            
            // Create record in the library with enhanced metadata
            await room.collection('community_book').create({
                bookTitle: bookTitle,
                dataUrl: dataUrl,
                imageUrl: imageUrl,
                chapterCount: chapterCount,
                fileSize: file.size,
                uploadedAt: new Date().toISOString(),
                originalFilename: file.name
            });

            publishStatus.textContent = `"${bookTitle}" published successfully! ${chapterCount} chapters uploaded.`;
            publishStatus.style.color = 'green';
            bookFileInput.value = '';
            lastPublishAt = Date.now();

            // Gamification credit for upload
            if (enableGamification && typeof window.awardPoints === 'function') {
                try {
                    window.awardPoints('uploadBook');
                    updateGamificationHud();
                } catch (e) {
                    console.warn('Gamification award failed:', e);
                }
            }
            
        } catch (err) {
            console.error('Publish error:', err);
            publishStatus.textContent = 'Publish failed: ' + (err.message || 'Unknown error occurred');
            publishStatus.style.color = 'red';
        } finally {
            publishButton.disabled = false;
        }
    });

    // Navigation back to main page - Fixed URL
    const backButton = document.getElementById('back-button');
    if (backButton) {
        /* @tweakable backToGenieText Text displayed on the back navigation button */
        const backToGenieText = 'Back to Book Genie';
        backButton.textContent = backToGenieText;
        
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            /* @tweakable backToGenieUrl URL to navigate back to the main Book Genie interface */
            const backToGenieUrl = "index.html";
            try {
                window.location.href = backToGenieUrl;
            } catch (error) {
                console.error('Navigation error:', error);
                // Fallback navigation
                window.location.replace(backToGenieUrl);
            }
        });
    }

    // Add drag and drop functionality for JSON files
    const publishSection = document.getElementById('publish-section');
    if (publishSection) {
        publishSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            publishSection.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
            publishSection.style.border = '2px dashed var(--primary-accent)';
        });

        publishSection.addEventListener('dragleave', (e) => {
            e.preventDefault();
            publishSection.style.backgroundColor = '';
            publishSection.style.border = '';
        });

        publishSection.addEventListener('drop', (e) => {
            e.preventDefault();
            publishSection.style.backgroundColor = '';
            publishSection.style.border = '';
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].name.toLowerCase().endsWith('.json')) {
                bookFileInput.files = files;
                publishStatus.textContent = `Selected: ${files[0].name}`;
                publishStatus.style.color = 'blue';
            } else {
                publishStatus.textContent = 'Please drop a valid JSON file.';
                publishStatus.style.color = 'red';
            }
        });
    }

    // Controls: sorting, searching, pagination
    function rerenderFromControls() {
        // Re-apply filter/sort then render in current layout
        if ((layoutSelect.value || '3d') === 'grid') {
            renderGrid(libraryBooks);
        } else {
            renderShelf(libraryBooks);
        }
    }
    sortSelect?.addEventListener('change', () => { currentPage = 1; rerenderFromControls(); });
    searchInput?.addEventListener('input', () => { currentPage = 1; rerenderFromControls(); });
    prevPageBtn?.addEventListener('click', () => { 
        if (currentPage > 1) { 
            currentPage--; 
            rerenderFromControls(); 
        } 
    });
    nextPageBtn?.addEventListener('click', () => { 
        currentPage++; 
        rerenderFromControls(); 
    });

    // After initial render/layout selection, re-run accessibility to attach ARIA/keyboard to new DOM if provided
    function reapplyAccessibility() {
        if (enableHighContrastUI && typeof window.initializeAccessibility === 'function') {
            try { window.initializeAccessibility(); } catch {}
        }
    }
    // Hook reapply on layout/theme changes and subscription updates
    layoutSelect.addEventListener('change', reapplyAccessibility);
    themeSelect.addEventListener('change', reapplyAccessibility);

    async function uploadFileSmart(file) {
        if (!preferIPFSUploads) {
            return await window.websim.upload(file);
        }
        try {
            // Attempt IPFS via a global client if one is available (not provided by default)
            // @tweakable ipfsClientGlobalName Global var name to use as IPFS client (if present)
            const ipfsClientGlobalName = 'ipfs';
            const ipfsClient = window[ipfsClientGlobalName];
            if (ipfsClient && typeof ipfsClient.add === 'function') {
                const added = await ipfsClient.add(file);
                if (added && (added.path || added.cid)) {
                    const cid = added.path || (added.cid && (added.cid.toString ? added.cid.toString() : String(added.cid)));
                    return `${ipfsGateway}${cid}`;
                }
            }
            // fallback to websim
            return await window.websim.upload(file);
        } catch (e) {
            console.warn('IPFS upload failed; falling back to websim.upload()', e);
            return await window.websim.upload(file);
        }
    }

    function renderGrid(records) {
        filteredBooks = applySortAndFilter(records || []);
        updatePaginationControls(filteredBooks.length, GRID_ITEMS_PER_PAGE);

        gridContainer.innerHTML = '';
        const booksToShow = getPaged(filteredBooks, GRID_ITEMS_PER_PAGE);

        if (booksToShow.length === 0) {
            gridContainer.innerHTML = '<p style="text-align:center;color:var(--text-secondary);">No books found.</p>';
            return;
        }

        booksToShow.forEach(book => {
            const coverUrl = book.imageUrl || FALLBACK_COVER_URL;
            const shareUrl = makeShareLink(book);

            const card = document.createElement('div');
            card.className = 'book-card';
            card.style.border = '1px solid var(--border-secondary, #ddd)';
            card.style.borderRadius = '8px';
            card.style.padding = '10px';
            card.style.background = 'rgba(255,255,255,0.9)';
            card.innerHTML = `
                <div style="width:100%; height:${GRID_IMG_HEIGHT}px; background-image:url('${coverUrl}'); background-size:cover; background-position:center; border-radius:6px;"></div>
                <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
                    <img src="https://images.websim.com/avatar/${book.username}" alt="@${book.username}" width="24" height="24" style="border-radius:50%; border:1px solid #fff;">
                    <a href="https://websim.com/@${book.username}" target="_blank" style="font-size:12px;">@${book.username}</a>
                </div>
                <h3 style="margin:8px 0 4px; font-size:16px; line-height:1.2;">${book.bookTitle}</h3>
                <div style="font-size:12px; color:#666; margin-bottom:8px;">${book.chapterCount} chapters</div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="grid-load-btn" data-url="${book.dataUrl}" style="flex:1; padding:6px; font-size:12px; border:none; border-radius:6px; background:var(--button-bg,#6366f1); color:#fff; cursor:pointer;">Load</button>
                    <button class="grid-share-btn" data-share="${shareUrl}" style="padding:6px; font-size:12px; border:1px solid var(--border-secondary,#ccc); border-radius:6px; background:#fff; cursor:pointer;">Share</button>
                    <a class="grid-download-btn" href="${book.dataUrl}" download="${book.bookTitle}.json" style="padding:6px; font-size:12px; border:1px solid var(--border-secondary,#ccc); border-radius:6px; background:#fff; text-decoration:none; text-align:center;">Download</a>
                    ${enableTTSPreview ? `<button class="grid-tts-btn" data-title="${encodeURIComponent(book.bookTitle)}" style="padding:6px; font-size:12px; border:1px solid var(--border-secondary,#ccc); border-radius:6px; background:#fff; cursor:pointer;">🔊 Preview</button>` : ``}
                </div>
            `;
            gridContainer.appendChild(card);
        });

        // Bind grid buttons
        gridContainer.querySelectorAll('.grid-load-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = btn.dataset.url;
                if (!isValidDataUrl(url)) {
                    publishStatus.textContent = 'Invalid book URL detected.';
                    publishStatus.style.color = 'red';
                    return;
                }
                const base = (window.baseUrl || (window.location.origin + window.location.pathname)).replace(/\/[^/]*$/, '/');
                window.location.href = `${base}${generatorPath}?loadUrl=${encodeURIComponent(url)}`;
            });
        });
        gridContainer.querySelectorAll('.grid-share-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const url = btn.dataset.share;
                try {
                    await navigator.clipboard.writeText(url);
                    publishStatus.textContent = 'Share link copied!';
                    publishStatus.style.color = 'green';
                } catch {
                    publishStatus.textContent = 'Copy failed. Link: ' + url;
                    publishStatus.style.color = 'red';
                }
            });
        });

        if (enableTTSPreview) {
            gridContainer.querySelectorAll('.grid-tts-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    try {
                        const title = decodeURIComponent(btn.dataset.title || 'Book');
                        const result = await websim.textToSpeech({
                            text: `Preview of the book titled ${title}.`,
                            voice: ttsPreviewVoice
                        });
                        const audio = new Audio(result.url);
                        audio.play();
                    } catch (e) {
                        console.warn('TTS preview failed:', e);
                    }
                });
            });
        }
    }

    function renderShelf(records) {
        // Update the global list of books for the chatbot
        libraryBooks = records || [];
        filteredBooks = applySortAndFilter(libraryBooks);
        updatePaginationControls(filteredBooks.length, ITEMS_PER_PAGE);

        /* @tweakable loadButtonLabel Text displayed on the load book button */
        const LOAD_BTN_LABEL = 'Load into Generator';
        
        if (!filteredBooks || filteredBooks.length === 0) {
            bookshelfSurface.innerHTML = '<p style="text-align:center;color:var(--text-secondary);position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">No books published yet. Be the first to share your creation!</p>';
            return;
        }
        
        const booksToShow = getPaged(filteredBooks, ITEMS_PER_PAGE);
        
        // Generate radio inputs
        let radioInputs = '';
        booksToShow.forEach((_, index) => {
            radioInputs += `<input type="radio" name="book" id="book${index + 1}"/>`;
        });
        
        // Generate book blocks
        let bookBlocks = '';
        const startPosition = 6;
        
        booksToShow.forEach((book, index) => {
            const blockNum = startPosition + index;
            const truncatedTitle = book.bookTitle.length > 25 ? book.bookTitle.substring(0, 25) + '...' : book.bookTitle;
            const spineTitle = book.bookTitle.length > 30 ? book.bookTitle.substring(0, 30) + '...' : book.bookTitle;
            const coverUrl = book.imageUrl || FALLBACK_COVER_URL;
            const shareUrl = makeShareLink(book);

            bookBlocks += `
                <label class="block b${blockNum}" for="book${index + 1}">
                    <div class="block-inner">
                        <div class="back"></div>
                        <div class="bottom"></div>
                        <div class="front"></div>
                        <div class="left"></div>
                        <div class="right" data-title="${truncatedTitle}">
                            <div class="cover"></div>
                            <div class="contents">
                                <h1>${truncatedTitle}</h1>
                                <p>By <a href="https://websim.com/@${book.username}" target="_blank">@${book.username}</a></p>
                                <p>${book.chapterCount} chapters</p>
                                <div style="margin-top: 10px;">
                                    <button class="load-library-button" data-url="${book.dataUrl}" 
                                            style="padding:4px 8px;font-size:8px;background:var(--button-bg);color:white;border:none;border-radius:2px;cursor:pointer;margin:2px 0;">${LOAD_BTN_LABEL}</button>
                                    <a href="${book.dataUrl}" download="${book.bookTitle}.json"
                                       style="padding:4px 8px;font-size:8px;background:var(--chapter-tool-bg);color:var(--chapter-tool-text);text-decoration:none;border:1px solid var(--border-secondary);border-radius:2px;display:block;text-align:center;margin-top:2px;">Download</a>
                                    <button class="share-library-button" data-share="${shareUrl}"
                                            style="padding:4px 8px;font-size:8px;background:#0ea5e9;color:#fff;border:none;border-radius:2px;cursor:pointer;margin:2px 0;">${SHARE_BTN_LABEL}</button>
                                </div>
                            </div>
                        </div>
                        <div class="top"></div>
                    </div>
                </label>
            `;
        });
        
        // Clear existing content and add new structure
        bookshelf.innerHTML = radioInputs + `
            <div class="surface" id="bookshelf-surface">
                <!-- Shelf structure blocks -->
                <div class="block b1">
                    <div class="block-inner">
                        <div class="back"></div>
                        <div class="bottom"></div>
                        <div class="front"></div>
                        <div class="left"></div>
                        <div class="right"></div>
                        <div class="top"></div>
                    </div>
                </div>
                <div class="block b2">
                    <div class="block-inner">
                        <div class="back"></div>
                        <div class="bottom"></div>
                        <div class="front"></div>
                        <div class="left"></div>
                        <div class="right"></div>
                        <div class="top"></div>
                    </div>
                </div>
                <div class="block b3">
                    <div class="block-inner">
                        <div class="back"></div>
                        <div class="bottom"></div>
                        <div class="front"></div>
                        <div class="left"></div>
                        <div class="right"></div>
                        <div class="top"></div>
                    </div>
                </div>
                <div class="block b4">
                    <div class="block-inner">
                        <div class="back"></div>
                        <div class="bottom"></div>
                        <div class="front"></div>
                        <div class="left"></div>
                        <div class="right"></div>
                        <div class="top"></div>
                    </div>
                </div>
                <div class="block b5">
                    <div class="block-inner">
                        <div class="back"></div>
                        <div class="bottom"></div>
                        <div class="front"></div>
                        <div class="left"></div>
                        <div class="right"></div>
                        <div class="top"></div>
                    </div>
                </div>
                ${bookBlocks}
            </div>
            <input type="reset" value="Return"/>
        `;
        
        // Generate dynamic styles for the books
        generateBookStyles(booksToShow.length);
        
        // Attach click handlers to the dynamic Load buttons
        document.querySelectorAll('.load-library-button').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const url = btn.dataset.url;

                // Experimental: If prefer IPFS and url looks like CID, rewrite to gateway
                if (preferIPFSUploads && url && /^[A-Za-z0-9]{46,}$/.test(url)) {
                    /* @tweakable ipfsCidRewrite Enable rewriting CIDs to the configured gateway */
                    const ipfsCidRewrite = true;
                    if (ipfsCidRewrite) {
                        const gatewayUrl = `${ipfsGateway}${url}`;
                        navigateToGenerator(gatewayUrl);
                        return;
                    }
                }

                if (!isValidDataUrl(url)) {
                    console.warn('Disallowed dataUrl:', url);
                    publishStatus.textContent = 'Invalid book URL detected.';
                    return;
                }
                navigateToGenerator(url);
            });
        });

        function navigateToGenerator(url) {
            /* @tweakable generatorPath Path (relative) to the main generator page for loading books */
            const base = (window.baseUrl || (window.location.origin + window.location.pathname)).replace(/\/[^/]*$/, '/');
            window.location.href = `${base}${generatorPath}?loadUrl=${encodeURIComponent(url)}`;
        }
    }
})();