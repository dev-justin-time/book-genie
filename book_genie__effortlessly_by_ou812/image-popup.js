/**
 * Helper function to create the image container with controls.
 * @param {string} imageUrl - The URL of the image.
 * @param {boolean} isRound - Whether the image should be round.
 * @param {HTMLElement} contentDiv - The chapter content div to insert into.
 * @returns {HTMLElement} The created image container element.
 */
export function createImageContainer(imageUrl, isRound, contentDiv) {
    const container = document.createElement('div');
    container.classList.add('image-container');

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = `Illustration`;
    img.loading = 'lazy';
    if (isRound) {
        img.classList.add('round-cutout');
    }
    container.appendChild(img);

    const controls = document.createElement('div');
    controls.classList.add('image-controls');

    // Delete Button
    const deleteButton = document.createElement('button');
    deleteButton.classList.add('image-control-button', 'delete');
    deleteButton.innerHTML = '&#x1F5D1;'; // Trash can icon
    deleteButton.title = 'Delete Image';
    deleteButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this image?')) {
            const parent = container.parentElement;
            container.remove();
            if(parent) {
                const prev = container.previousElementSibling;
                const next = container.nextElementSibling;
                if (prev && prev.classList?.contains('image-container')) updateMoveButtonStates(prev);
                if (next && next.classList?.contains('image-container')) updateMoveButtonStates(next);
            }
        }
    });

    // Move Up Button
    const moveUpButton = document.createElement('button');
    moveUpButton.classList.add('image-control-button');
    moveUpButton.innerHTML = '&#x25B2;'; // Up arrow
    moveUpButton.title = 'Move Image Up';
    moveUpButton.addEventListener('click', () => moveImage(container, 'up'));

    // Move Down Button
    const moveDownButton = document.createElement('button');
    moveDownButton.classList.add('image-control-button');
    moveDownButton.innerHTML = '&#x25BC;'; // Down arrow
    moveDownButton.title = 'Move Image Down';
    moveDownButton.addEventListener('click', () => moveImage(container, 'down'));

    controls.appendChild(moveUpButton);
    controls.appendChild(moveDownButton);
    controls.appendChild(deleteButton);
    container.appendChild(controls);

    // Update button states initially
    updateMoveButtonStates(container);

    return container;
}

/**
 * Updates the enabled/disabled state of move buttons based on position.
 * @param {HTMLElement} container - The image container element.
 */
export function updateMoveButtonStates(container) {
    // Add null check to prevent undefined errors
    if (!container || !container.parentElement) return;
    
    const contentDiv = container.parentElement;
    
    const upButton = container.querySelector('.image-control-button[title="Move Image Up"]');
    const downButton = container.querySelector('.image-control-button[title="Move Image Down"]');

    if (!upButton || !downButton) return; // Safety check

    let prevElement = container.previousElementSibling;
    upButton.disabled = !prevElement || prevElement.tagName === 'H2';

    let nextElement = container.nextElementSibling;
    downButton.disabled = !nextElement;
}

/**
 * Moves the image container up or down within its parent.
 * @param {HTMLElement} container - The image container element to move.
 * @param {'up' | 'down'} direction - The direction to move.
 */
export function moveImage(container, direction) {
    // Add null check to prevent undefined errors
    if (!container || !container.parentElement) return;
    
    const parent = container.parentElement;

    if (direction === 'up') {
        let prevElement = container.previousElementSibling;
        if (prevElement && prevElement.tagName !== 'H2') {
            parent.insertBefore(container, prevElement);
        }
    } else if (direction === 'down') {
        let nextElement = container.nextElementSibling;
        if (nextElement) {
            parent.insertBefore(container, nextElement.nextElementSibling);
        }
    }

    // Safely update button states with explicit null checks
    if (typeof updateMoveButtonStates === 'function') {
        updateMoveButtonStates(container);
        
        const newPrev = container.previousElementSibling;
        if (newPrev && newPrev.classList && newPrev.classList.contains('image-container')) {
            updateMoveButtonStates(newPrev);
        }
        
        const newNext = container.nextElementSibling;
        if (newNext && newNext.classList && newNext.classList.contains('image-container')) {
            updateMoveButtonStates(newNext);
        }
    }
}

// Templates/presets for commonly used image types with detailed prompts
const imageTemplates = [
    {
        name: "Character Portrait",
        description: "Detailed portrait of a character",
        prompt: "Professional portrait of a [character] with detailed facial features, [emotion] expression, [age] years old, [clothing], [background] background, high detail",
        settings: {
            aspectRatio: "1:1",
            style: "photorealistic",
            diverse: false,
            round: true
        }
    },
    {
        name: "Action Scene",
        description: "Dynamic scene with movement and tension",
        prompt: "Action scene with [character] [action], dramatic lighting, motion blur, dynamic pose, intense atmosphere, wide shot",
        settings: {
            aspectRatio: "16:9",
            style: "cinematic",
            diverse: false,
            round: false
        }
    },
    {
        name: "Serene Landscape",
        description: "Beautiful natural setting",
        prompt: "Breathtaking landscape of [location], [time of day] lighting, [weather], panoramic view, vibrant colors, detailed vegetation",
        settings: {
            aspectRatio: "16:9",
            style: "photorealistic",
            diverse: false,
            round: false
        }
    },
    {
        name: "Fantasy Illustration",
        description: "Magical fantasy-themed artwork",
        prompt: "Fantasy illustration of [subject], magical atmosphere, [color] color scheme, mystical elements, detailed fantasy world, glowing effects",
        settings: {
            aspectRatio: "16:9",
            style: "fantasy art",
            diverse: true,
            round: false
        }
    },
    {
        name: "Conceptual Abstract",
        description: "Abstract representation of an idea",
        prompt: "Abstract conceptual representation of [concept], symbolic imagery, metaphorical elements, artistic composition, [primary color] dominant palette",
        settings: {
            aspectRatio: "1:1",
            style: "oil painting",
            diverse: true,
            round: false
        }
    },
    {
        name: "Historic Scene",
        description: "Historical setting with period details",
        prompt: "Historical scene set in [time period], authentic period clothing and architecture, [location], historically accurate details, [activity] in progress",
        settings: {
            aspectRatio: "16:9",
            style: "oil painting",
            diverse: false,
            round: false
        }
    },
    {
        name: "Futuristic Tech",
        description: "Scene with advanced technology",
        prompt: "Futuristic technology scene with [tech element], neon lighting, holographic displays, advanced machinery, sci-fi atmosphere, [color] accents",
        settings: {
            aspectRatio: "16:9",
            style: "sci-fi art",
            diverse: true,
            round: false
        }
    },
    {
        name: "Emotional Moment",
        description: "Scene capturing deep emotion",
        prompt: "Emotional moment showing [character] experiencing [emotion], intimate framing, expressive body language, atmospheric lighting, [setting]",
        settings: {
            aspectRatio: "9:16",
            style: "photorealistic",
            diverse: false,
            round: false
        }
    },
    {
        name: "Illustrated Book Cover",
        description: "Classic book cover design",
        prompt: "Illustrated book cover for [title], featuring [key element], professional typography, genre-appropriate style, eye-catching composition, [color scheme]",
        settings: {
            aspectRatio: "9:16",
            style: "illustration",
            diverse: false,
            round: false
        }
    },
    {
        name: "Stylized Character",
        description: "Artistic character in distinctive style",
        prompt: "Stylized character design of [character type], distinctive features, expressive pose, characteristic accessories, stylized proportions, [style] influence",
        settings: {
            aspectRatio: "1:1",
            style: "anime",
            diverse: true,
            round: false
        }
    }
];

// Style presets with more detailed options
const stylePresets = [
    { value: "", text: "AI Best Choice" },
    { value: "photorealistic", text: "Photorealistic" },
    { value: "cinematic", text: "Cinematic" },
    { value: "illustration", text: "Illustration" },
    { value: "anime", text: "Anime / Manga" },
    { value: "fantasy art", text: "Fantasy Art" },
    { value: "sci-fi art", text: "Sci-Fi Art" },
    { value: "pixel art", text: "Pixel Art" },
    { value: "watercolor painting", text: "Watercolor Painting" },
    { value: "oil painting", text: "Oil Painting" },
    { value: "charcoal sketch", text: "Charcoal Sketch" },
    { value: "line art", text: "Line Art" },
    { value: "3D render", text: "3D Render" },
    { value: "pop art", text: "Pop Art" },
    { value: "impressionist", text: "Impressionist" },
    { value: "surrealist", text: "Surrealist" },
    { value: "low poly", text: "Low Poly" },
    { value: "isometric", text: "Isometric View" },
    { value: "comic book style", text: "Comic Book" },
    { value: "noir style", text: "Film Noir" },
    { value: "vaporwave", text: "Vaporwave" },
    { value: "retro 80s", text: "Retro 80s" },
    { value: "cyberpunk", text: "Cyberpunk" },
    { value: "steampunk", text: "Steampunk" },
    { value: "gothic", text: "Gothic" },
    { value: "minimalist", text: "Minimalist" }
];

// Lighting presets
const lightingPresets = [
    { value: "", text: "Default Lighting" },
    { value: "natural daylight", text: "Natural Daylight" },
    { value: "golden hour", text: "Golden Hour" },
    { value: "blue hour", text: "Blue Hour" },
    { value: "dramatic side lighting", text: "Dramatic Side Light" },
    { value: "soft diffused lighting", text: "Soft Diffused" },
    { value: "harsh direct light", text: "Harsh Direct" },
    { value: "neon lighting", text: "Neon" },
    { value: "candlelight", text: "Candlelight" },
    { value: "moonlight", text: "Moonlight" },
    { value: "silhouette lighting", text: "Silhouette" },
    { value: "rim lighting", text: "Rim Lighting" },
    { value: "volumetric lighting", text: "Volumetric" },
    { value: "high key lighting", text: "High Key" },
    { value: "low key lighting", text: "Low Key" }
];

// Color schemes
const colorSchemes = [
    { value: "", text: "Natural Colors" },
    { value: "vibrant", text: "Vibrant" },
    { value: "monochromatic", text: "Monochromatic" },
    { value: "sepia", text: "Sepia" },
    { value: "pastel", text: "Pastel" },
    { value: "high contrast", text: "High Contrast" },
    { value: "muted", text: "Muted" },
    { value: "warm", text: "Warm" },
    { value: "cool", text: "Cool" },
    { value: "complementary", text: "Complementary" },
    { value: "black and white", text: "Black & White" },
    { value: "duotone blue and orange", text: "Duotone (Blue/Orange)" },
    { value: "duotone purple and yellow", text: "Duotone (Purple/Yellow)" },
    { value: "duotone green and red", text: "Duotone (Green/Red)" }
];

// Weather/environment conditions
const weatherSettings = [
    { value: "", text: "Clear" },
    { value: "foggy", text: "Foggy" },
    { value: "snowy", text: "Snowy" },
    { value: "rainy", text: "Rainy" },
    { value: "stormy", text: "Stormy" },
    { value: "sunny", text: "Sunny" },
    { value: "cloudy", text: "Cloudy" },
    { value: "misty", text: "Misty" },
    { value: "dusty", text: "Dusty" },
    { value: "windy", text: "Windy" },
    { value: "aurora borealis", text: "Aurora" }
];

/**
 * Opens a fresh, feature-filled image generator popup for the chapter.
 * @param {string} userInput - The main book topic/input.
 * @param {string} chapterTitle - The title of the current chapter.
 * @param {HTMLElement} chapterElement - The main element containing the chapter's content and tools.
 * @param {object} settings - The current generation settings { genre, style, chapterSize }.
 * @param {object} state - Global state { generating, commandHistory }.
 * @param {object} dependencies - Full dependencies object from script.js.
 * @param {object} uiElements - Object containing references to key UI elements.
 */
export function openImagePopup(userInput, chapterTitle, chapterElement, settings, state, dependencies, uiElements) {
    if (document.querySelector('.image-popup')) return;

    const contentDiv = chapterElement.querySelector('.chapter-content');
    if (!contentDiv) {
        console.error("Chapter content element not found for image popup.");
        return;
    }
    const chapterNumber = chapterElement.id.split('-').pop();

    // --- Popup Structure ---
    const popupContainer = document.createElement('div');
    popupContainer.classList.add('image-popup');
    popupContainer.innerHTML = `
        <div class="image-popup-content" style="display:flex;flex-direction:column;gap:16px;max-width:1100px;max-height:90vh;overflow-y:auto;">
            <button class="popup-close-button" title="Close Popup" style="position:absolute;top:8px;right:12px;font-size:26px;">&times;</button>
            <h3 style="text-align:center;">Enhanced Image Generator for Chapter ${chapterNumber}</h3>
            <p class="image-popup-instruction" style="text-align:center;font-style:italic;color:var(--text-secondary)">Choose a template or customize your image generation settings</p>
            
            <!-- Template Selection Panel -->
            <div style="border:1px solid #ddd;border-radius:6px;padding:12px;background:#f9f9f9;">
                <h4 style="margin-top:0;margin-bottom:10px;">Quick Templates</h4>
                <div class="template-container" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">
                    <!-- Template buttons will be inserted here via JS -->
                </div>
            </div>
            
            <div style="display:flex;gap:24px;flex-wrap:wrap;">
                <!-- Left Column: Input & Settings -->
                <div style="flex-basis:340px;min-width:300px;flex-grow:1;">
                    <!-- IMPROVED PROMPT AREA -->
                    <div style="position:relative;margin-bottom:12px;">
                        <label for="img-prompt-main" style="font-weight:bold;display:block;margin-bottom:8px;color:var(--text-heading);">
                            Image Description:
                            <span style="font-weight:normal;font-style:italic;color:var(--text-secondary);font-size:0.9em;margin-left:5px;">
                                (What to visualize?)
                            </span>
                        </label>
                        
                        <div class="prompt-textarea-container" style="position:relative;border:1px solid var(--border-secondary);border-radius:8px;padding:2px;background:var(--input-bg);transition:all 0.2s ease;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                            <textarea id="img-prompt-main" rows="4" 
                                placeholder="Describe scene/character/mood or choose a template above" 
                                style="width:100%;padding:10px 12px;border:none;outline:none;resize:vertical;font-family:inherit;background:transparent;color:var(--text-primary);border-radius:7px;line-height:1.4;">
                            </textarea>
                            
                            <div class="prompt-actions" style="display:flex;gap:5px;padding:0 8px 8px;justify-content:flex-end;">
                                <button id="clear-prompt-btn" class="small-btn" title="Clear prompt" 
                                    style="background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:4px 8px;font-size:0.85em;border-radius:4px;">
                                    Clear
                                </button>
                                <button id="analyze-chapter-btn" class="small-btn" title="Analyze chapter to create diorama description" 
                                    style="display:flex;align-items:center;gap:4px;background:var(--chapter-box-hover-bg);border:none;color:var(--text-link);cursor:pointer;padding:4px 8px;font-size:0.85em;border-radius:4px;transition:all 0.2s;">
                                    <span style="font-size:1.1em;">✨</span> Auto-Generate Diorama
                                </button>
                            </div>
                        </div>
                        
                        <!-- Analysis progress indicator (hidden by default) -->
                        <div id="analysis-progress" style="display:none;font-size:0.9em;color:var(--text-secondary);margin-top:5px;padding:5px;background:var(--chapter-box-bg);border-radius:4px;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <div class="loading-spinner" style="width:16px;height:16px;"></div>
                                <span>Analyzing chapter content...</span>
                            </div>
                        </div>
                    </div>
                    <!-- END IMPROVED PROMPT AREA -->
                    
                    <!-- Basic Configuration -->
                    <div style="display:flex;gap:10px;margin-top:10px;">
                        <div style="flex:1;">
                            <label for="image-count-input"># Images:</label>
                            <input type="number" id="image-count-input" min="1" max="12" value="3" style="width:48px;">
                        </div>
                        <div style="flex:2;">
                            <label for="image-aspect-ratio-select">Aspect Ratio:</label>
                            <select id="image-aspect-ratio-select">
                                <option value="16:9">Landscape (16:9)</option>
                                <option value="1:1">Square (1:1)</option>
                                <option value="9:16">Portrait (9:16)</option>
                                <option value="4:3">Standard (4:3)</option>
                                <option value="21:9">Ultrawide (21:9)</option>
                                <option value="3:2">Photo (3:2)</option>
                                <option value="4:5">Instagram (4:5)</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Advanced Configuration Tabs -->
                    <div style="margin-top:15px;">
                        <div class="img-settings-tabs" style="display:flex;border-bottom:1px solid #ddd;">
                            <button class="img-tab-btn active" data-tab="style">Style</button>
                            <button class="img-tab-btn" data-tab="lighting">Lighting</button>
                            <button class="img-tab-btn" data-tab="color">Color</button>
                            <button class="img-tab-btn" data-tab="effects">Effects</button>
                        </div>
                        
                        <!-- Style Tab -->
                        <div class="img-tab-content" id="tab-style" style="padding:10px 0;">
                            <label for="image-style-preset-select">Visual Style:</label>
                            <select id="image-style-preset-select" style="width:100%;margin-bottom:10px;">
                                <!-- Populated via JS from stylePresets -->
                            </select>
                            
                            <label for="image-quality-select">Quality Level:</label>
                            <select id="image-quality-select" style="width:100%;">
                                <option value="">Standard Quality</option>
                                <option value="highly detailed, 8k resolution">High Definition (8K)</option>
                                <option value="professional quality, detailed, sharp focus">Professional</option>
                                <option value="studio quality, masterpiece, perfect composition">Studio Masterpiece</option>
                                <option value="artstation contest winner, trending on artstation">Award-Winning</option>
                                <option value="shallow depth of field, detailed textures">Photographic Detail</option>
                            </select>
                        </div>
                        
                        <!-- Lighting Tab -->
                        <div class="img-tab-content" id="tab-lighting" style="padding:10px 0;display:none;">
                            <label for="image-lighting-select">Lighting Type:</label>
                            <select id="image-lighting-select" style="width:100%;margin-bottom:10px;">
                                <!-- Populated via JS from lightingPresets -->
                            </select>
                            
                            <label for="image-time-select">Time of Day:</label>
                            <select id="image-time-select" style="width:100%;">
                                <option value="">Default Time</option>
                                <option value="dawn">Dawn</option>
                                <option value="morning">Morning</option>
                                <option value="noon">Noon</option>
                                <option value="afternoon">Afternoon</option>
                                <option value="sunset">Sunset</option>
                                <option value="dusk">Dusk</option>
                                <option value="night">Night</option>
                                <option value="midnight">Midnight</option>
                            </select>
                            
                            <div style="margin-top:10px;">
                                <label for="image-weather-select">Weather/Environment:</label>
                                <select id="image-weather-select" style="width:100%;">
                                    <!-- Populated via JS from weatherSettings -->
                                </select>
                            </div>
                        </div>
                        
                        <!-- Color Tab -->
                        <div class="img-tab-content" id="tab-color" style="padding:10px 0;display:none;">
                            <label for="image-color-scheme-select">Color Scheme:</label>
                            <select id="image-color-scheme-select" style="width:100%;margin-bottom:10px;">
                                <!-- Populated via JS from colorSchemes -->
                            </select>
                            
                            <div style="display:flex;gap:10px;margin-top:10px;">
                                <div style="flex:1;">
                                    <label for="image-primary-color">Primary Color:</label>
                                    <input type="text" id="image-primary-color" placeholder="e.g. red, blue" style="width:100%;">
                                </div>
                                <div style="flex:1;">
                                    <label for="image-accent-color">Accent Color:</label>
                                    <input type="text" id="image-accent-color" placeholder="e.g. gold, silver" style="width:100%;">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Effects Tab -->
                        <div class="img-tab-content" id="tab-effects" style="padding:10px 0;display:none;">
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                <label style="display:flex;align-items:center;gap:4px;">
                                    <input type="checkbox" id="image-round-cutout-checkbox"> Circular Crop
                                </label>
                                <label style="display:flex;align-items:center;gap:4px;">
                                    <input type="checkbox" id="image-soft-vignette-checkbox"> Soft Vignette
                                </label>
                                <label style="display:flex;align-items:center;gap:4px;">
                                    <input type="checkbox" id="image-allow-variation"> Generate Variations
                                </label>
                                <label style="display:flex;align-items:center;gap:4px;">
                                    <input type="checkbox" id="image-dramatic-checkbox"> Dramatic Lighting
                                </label>
                                <label style="display:flex;align-items:center;gap:4px;">
                                    <input type="checkbox" id="image-bokeh-checkbox"> Bokeh Background
                                </label>
                                <label style="display:flex;align-items:center;gap:4px;">
                                    <input type="checkbox" id="image-gradient-checkbox"> Color Gradient
                                </label>
                                <label style="display:flex;align-items:center;gap:4px;">
                                    <input type="checkbox" id="image-textured-checkbox"> Textured Background
                                </label>
                                <label style="display:flex;align-items:center;gap:4px;">
                                    <input type="checkbox" id="image-symmetrical-checkbox"> Symmetrical Composition
                                </label>
                            </div>
                            
                            <div style="margin-top:10px;">
                                <label for="image-composition-select">Composition:</label>
                                <select id="image-composition-select" style="width:100%;">
                                    <option value="">Natural Composition</option>
                                    <option value="rule of thirds">Rule of Thirds</option>
                                    <option value="center composition">Centered Subject</option>
                                    <option value="golden ratio composition">Golden Ratio</option>
                                    <option value="diagonal composition">Diagonal Composition</option>
                                    <option value="foreground middle background">Fore/Mid/Background</option>
                                    <option value="frame within a frame">Frame Within Frame</option>
                                    <option value="bird's eye view">Bird's Eye View</option>
                                    <option value="worm's eye view">Worm's Eye View</option>
                                    <option value="dutch angle">Dutch Angle</option>
                                </select>
                            </div>
                            
                            <div style="margin-top:10px;">
                                <label for="image-lens-select">Camera Lens:</label>
                                <select id="image-lens-select" style="width:100%;">
                                    <option value="">Default Lens</option>
                                    <option value="wide angle lens">Wide Angle</option>
                                    <option value="telephoto lens">Telephoto</option>
                                    <option value="macro lens">Macro</option>
                                    <option value="fish-eye lens">Fish-Eye</option>
                                    <option value="tilt-shift lens">Tilt-Shift</option>
                                    <option value="35mm lens">35mm Prime</option>
                                    <option value="85mm portrait lens">85mm Portrait</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top:15px;">
                        <button id="generate-images-button" style="width:100%;font-weight:bold;font-size:1.15em;padding:10px 0;">Generate Images</button>
                    </div>
                    
                    <hr>
                    
                    <div>
                        <label for="img-upload-input" style="font-weight:600;">Or upload your own:</label>
                        <input type="file" id="img-upload-input" accept="image/*" style="margin-top:4px;" multiple>
                        <span style="font-size:0.9em;color:var(--text-secondary)">PNG, JPG, GIF (max 12 files)</span>
                    </div>
                </div>
                
                <!-- Right Column: Preview Area -->
                <div style="flex:2;min-width:300px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                        <span style="font-weight:bold;">Preview & Select</span>
                        <span id="image-progress-info" style="font-size:0.92em;color:var(--text-secondary)"></span>
                    </div>
                    <div id="image-preview-area" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;min-height:300px;"></div>
                    <div style="margin-top:12px;">
                        <button id="insert-selected-images-button" style="display:none;width:100%;font-weight:bold;">Insert Selected</button>
                        <button id="download-selected-images-button" style="display:none;width:100%;margin-top:4px;">Download Selected</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(popupContainer);

    // CRITICAL FIX: Make popup visible after creation
    popupContainer.style.display = 'flex';

    // --- Element References ---
    const closeButton = popupContainer.querySelector('.popup-close-button');
    const generateButton = popupContainer.querySelector('#generate-images-button');
    const previewArea = popupContainer.querySelector('#image-preview-area');
    const countInput = popupContainer.querySelector('#image-count-input');
    const ratioSelect = popupContainer.querySelector('#image-aspect-ratio-select');
    const mainPromptInput = popupContainer.querySelector('#img-prompt-main');
    const analyzeChapterBtn = popupContainer.querySelector('#analyze-chapter-btn');
    const clearPromptBtn = popupContainer.querySelector('#clear-prompt-btn');
    const analysisProgress = popupContainer.querySelector('#analysis-progress');
    const progressInfo = popupContainer.querySelector('#image-progress-info');
    
    // Add hover effect for the textarea container
    const promptContainer = popupContainer.querySelector('.prompt-textarea-container');
    mainPromptInput.addEventListener('focus', () => {
        promptContainer.style.borderColor = 'var(--text-link)';
        promptContainer.style.boxShadow = '0 0 0 2px rgba(92, 107, 192, 0.2)';
    });
    
    mainPromptInput.addEventListener('blur', () => {
        promptContainer.style.borderColor = 'var(--border-secondary)';
        promptContainer.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
    });
    
    // Clear button functionality
    clearPromptBtn.addEventListener('click', () => {
        mainPromptInput.value = '';
        mainPromptInput.focus();
    });
    
    // Hover effect for buttons
    const smallButtons = popupContainer.querySelectorAll('.small-btn');
    smallButtons.forEach(btn => {
        btn.addEventListener('mouseover', () => {
            if (btn.id === 'analyze-chapter-btn') {
                btn.style.backgroundColor = 'rgba(92, 107, 192, 0.1)';
            } else {
                btn.style.backgroundColor = 'var(--chapter-box-hover-bg)';
            }
        });
        
        btn.addEventListener('mouseout', () => {
            if (btn.id !== 'analyze-chapter-btn') {
                btn.style.backgroundColor = 'transparent';
            } else {
                btn.style.backgroundColor = 'var(--chapter-box-hover-bg)';
            }
        });
    });
    
    // Analyze Chapter Button functionality
    analyzeChapterBtn.addEventListener('click', async () => {
        if (state.generating) {
            alert("A generation process is already running. Please wait.");
            return;
        }
        
        state.generating = true;
        analyzeChapterBtn.disabled = true;
        analysisProgress.style.display = 'block';
        mainPromptInput.disabled = true;
        
        try {
            const chapterText = extractChapterContent(contentDiv);
            if (!chapterText || chapterText.trim().length < 50) {
                throw new Error("Not enough chapter content to analyze. Please add more text to the chapter first.");
            }
            
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                `Analyzing Chapter ${chapterNumber} content for image prompt generation...`);
            
            const dioramaDescription = await generateDioramaPrompt(chapterText, chapterTitle, userInput, settings);
            
            mainPromptInput.value = dioramaDescription;
            progressInfo.textContent = "Diorama description generated successfully";
            setTimeout(() => { progressInfo.textContent = ''; }, 3000);
            
            // Highlight the prompt container to show success
            promptContainer.style.borderColor = '#4caf50';
            promptContainer.style.boxShadow = '0 0 0 2px rgba(76, 175, 80, 0.2)';
            setTimeout(() => {
                promptContainer.style.borderColor = 'var(--border-secondary)';
                promptContainer.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
            }, 2000);
            
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                `Generated diorama image description for Chapter ${chapterNumber}.`);
                
        } catch (error) {
            console.error("Error analyzing chapter:", error);
            progressInfo.textContent = `Error: ${error.message}`;
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                `Error analyzing chapter: ${error.message}`);
            alert(`Could not generate diorama description: ${error.message}`);
        } finally {
            state.generating = false;
            analyzeChapterBtn.disabled = false;
            analysisProgress.style.display = 'none';
            mainPromptInput.disabled = false;
            mainPromptInput.focus();
        }
    });

    // --- Generate Template Buttons ---
    imageTemplates.forEach(template => {
        const templateButton = document.createElement('button');
        templateButton.classList.add('template-button');
        templateButton.style.padding = '10px';
        templateButton.style.border = '1px solid #ddd';
        templateButton.style.borderRadius = '4px';
        templateButton.style.backgroundColor = '#fff';
        templateButton.style.cursor = 'pointer';
        templateButton.style.textAlign = 'left';
        templateButton.style.transition = 'all 0.2s';
        
        templateButton.innerHTML = `
            <strong>${template.name}</strong>
            <div style="font-size:0.85em;color:#666;margin-top:3px;">${template.description}</div>
        `;
        
        templateButton.addEventListener('mouseover', () => {
            templateButton.style.backgroundColor = '#f0f0f0';
            templateButton.style.borderColor = '#bbb';
        });
        
        templateButton.addEventListener('mouseout', () => {
            templateButton.style.backgroundColor = '#fff';
            templateButton.style.borderColor = '#ddd';
        });
        
        // Apply template settings when clicked
        templateButton.addEventListener('click', () => {
            mainPromptInput.value = template.prompt;
            
            // Apply template specific settings
            if (template.settings.aspectRatio) {
                ratioSelect.value = template.settings.aspectRatio;
            }
            
            if (template.settings.style) {
                document.querySelector('#image-style-preset-select').value = template.settings.style;
            }
            
            document.querySelector('#image-round-cutout-checkbox').checked = template.settings.round || false;
            document.querySelector('#image-allow-variation').checked = template.settings.diverse || false;
            
            // Highlight the selected template
            document.querySelectorAll('.template-button').forEach(btn => {
                btn.style.backgroundColor = '#fff';
                btn.style.borderColor = '#ddd';
            });
            templateButton.style.backgroundColor = '#e6f7ff';
            templateButton.style.borderColor = '#1890ff';
            
            progressInfo.textContent = `Template "${template.name}" applied`;
            setTimeout(() => { progressInfo.textContent = ''; }, 3000);
        });
        
        popupContainer.querySelector('.template-container').appendChild(templateButton);
    });
    
    // --- Populate Dropdowns ---
    // Populate style presets
    stylePresets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.value;
        option.textContent = preset.text;
        document.querySelector('#image-style-preset-select').appendChild(option);
    });
    
    // Populate lighting presets
    lightingPresets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.value;
        option.textContent = preset.text;
        document.querySelector('#image-lighting-select').appendChild(option);
    });
    
    // Populate color schemes
    colorSchemes.forEach(scheme => {
        const option = document.createElement('option');
        option.value = scheme.value;
        option.textContent = scheme.text;
        document.querySelector('#image-color-scheme-select').appendChild(option);
    });
    
    // Populate weather options
    weatherSettings.forEach(weather => {
        const option = document.createElement('option');
        option.value = weather.value;
        option.textContent = weather.text;
        document.querySelector('#image-weather-select').appendChild(option);
    });
    
    // --- Settings Tabs ---
    const tabButtons = popupContainer.querySelectorAll('.img-tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Deactivate all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            popupContainer.querySelectorAll('.img-tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            // Activate selected tab
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            popupContainer.querySelector(`#tab-${tabId}`).style.display = 'block';
        });
    });

    // --- Close Logic ---
    function closePopup() {
        popupContainer.remove();
        document.removeEventListener('keydown', escapeHandler);
    }
    closeButton.addEventListener('click', closePopup);
    popupContainer.addEventListener('click', (evt) => {
        if (evt.target === popupContainer) closePopup();
    });
    const escapeHandler = (event) => { if (event.key === 'Escape') closePopup(); };
    document.addEventListener('keydown', escapeHandler);

    // --- Upload (user image) ---
    document.querySelector('#img-upload-input').addEventListener('change', (event) => {
        previewArea.innerHTML = '';
        document.querySelector('#insert-selected-images-button').style.display = 'none';
        document.querySelector('#download-selected-images-button').style.display = 'none';
        const files = Array.from(event.target.files || []);
        
        // Limit to 12 files
        const filesToProcess = files.slice(0, 12);
        if (files.length > 12) {
            progressInfo.textContent = 'Maximum 12 files allowed. Only first 12 will be processed.';
            setTimeout(() => { progressInfo.textContent = ''; }, 5000);
        }
        
        // Process selected files
        filesToProcess.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const url = e.target.result;
                const previewItem = document.createElement('div');
                previewItem.classList.add('image-preview-item');
                previewItem.style.position = 'relative';
                const img = document.createElement('img');
                img.src = url;
                img.alt = "User Upload";
                img.draggable = false;
                previewItem.appendChild(img);
                previewItem.dataset.imageUrl = url;
                previewArea.appendChild(previewItem);
                previewItem.addEventListener('click', () => {
                    previewItem.classList.toggle('selected');
                    updateSelectionButtons();
                });
            };
            reader.readAsDataURL(file);
        });
    });

    // --- Generate Images ---
    generateButton.addEventListener('click', async () => {
        if (state.generating) {
            alert("Another generation process is running. Please wait.");
            return;
        }
        let imageCount = parseInt(countInput.value) || 3;
        if (imageCount < 1) imageCount = 1;
        if (imageCount > 12) {
            imageCount = 12;
            countInput.value = 12;
            progressInfo.textContent = 'Maximum 12 images allowed.';
            setTimeout(() => { progressInfo.textContent = ''; }, 3000);
        }
        
        const aspectRatio = ratioSelect.value;
        const isRound = document.querySelector('#image-round-cutout-checkbox').checked;
        const addVignette = document.querySelector('#image-soft-vignette-checkbox').checked;
        const isDiverse = document.querySelector('#image-allow-variation').checked;
        const isDramatic = document.querySelector('#image-dramatic-checkbox').checked;
        const hasBokeh = document.querySelector('#image-bokeh-checkbox').checked;
        const hasGradient = document.querySelector('#image-gradient-checkbox').checked;
        const isTextured = document.querySelector('#image-textured-checkbox').checked;
        const isSymmetrical = document.querySelector('#image-symmetrical-checkbox').checked;
        const stylePreset = document.querySelector('#image-style-preset-select').value;
        const qualityPreset = document.querySelector('#image-quality-select').value;
        const lightingType = document.querySelector('#image-lighting-select').value;
        const timeOfDay = document.querySelector('#image-time-select').value;
        const weatherType = document.querySelector('#image-weather-select').value;
        const colorScheme = document.querySelector('#image-color-scheme-select').value;
        const primaryColor = document.querySelector('#image-primary-color').value.trim();
        const accentColor = document.querySelector('#image-accent-color').value.trim();
        const composition = document.querySelector('#image-composition-select').value;
        const lensType = document.querySelector('#image-lens-select').value;
        const userPrompt = mainPromptInput.value.trim();
        
        if (!userPrompt) {
            alert("Please enter an image description or choose a template.");
            mainPromptInput.focus();
            return;
        }
        
        previewArea.innerHTML = '';
        document.querySelector('#insert-selected-images-button').style.display = 'none';
        document.querySelector('#download-selected-images-button').style.display = 'none';

        // Build the complete prompt with all settings
        let basePrompt = userPrompt;
        
        // Add selected style preferences
        if (stylePreset) basePrompt += `, ${stylePreset} style`;
        if (qualityPreset) basePrompt += `, ${qualityPreset}`;
        
        // Add lighting and environment settings
        if (lightingType) basePrompt += `, ${lightingType}`;
        if (timeOfDay) basePrompt += `, ${timeOfDay}`;
        if (weatherType) basePrompt += `, ${weatherType}`;
        
        // Add color settings
        if (colorScheme) basePrompt += `, ${colorScheme} color scheme`;
        if (primaryColor) basePrompt += `, ${primaryColor} as primary color`;
        if (accentColor) basePrompt += `, ${accentColor} accent color`;
        
        // Add composition and lens settings
        if (composition) basePrompt += `, ${composition}`;
        if (lensType) basePrompt += `, ${lensType}`;
        
        // Add effect checkboxes
        if (addVignette) basePrompt += `, soft vignette`;
        if (isDramatic) basePrompt += `, dramatic lighting`;
        if (hasBokeh) basePrompt += `, bokeh background, shallow depth of field`;
        if (hasGradient) basePrompt += `, color gradient`;
        if (isTextured) basePrompt += `, textured background`;
        if (isSymmetrical) basePrompt += `, symmetrical composition`;
        
        // Add book context if not directly specified
        if (!userPrompt.includes("book") && !userPrompt.includes("chapter") && !userPrompt.includes("story")) {
            basePrompt += `, for chapter "${chapterTitle}" from a book about "${userInput.substring(0, 80)}..."`;
        }
        
        // Add genre and style from book settings if applicable
        if (settings.genre && settings.genre !== 'Auto Detect' && !basePrompt.toLowerCase().includes(settings.genre.toLowerCase())) {
            basePrompt += `, ${settings.genre} genre`;
        }
        if (settings.style && settings.style !== 'Chosen by AI' && !basePrompt.toLowerCase().includes(settings.style.toLowerCase())) {
            basePrompt += `, ${settings.style} writing style`;
        }

        state.generating = true;
        generateButton.disabled = true;
        progressInfo.textContent = `Generating ${imageCount} images...`;
        dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Generating ${imageCount} images for Chapter ${chapterNumber}...`);
        
        const promises = [];
        for (let i = 0; i < imageCount; i++) {
            const previewItem = document.createElement('div');
            previewItem.classList.add('image-preview-item');
            previewItem.innerHTML = `<div class="loading-spinner"></div>`;
            previewItem.style.minHeight = '120px';
            previewArea.appendChild(previewItem);

            let promptVariant = basePrompt;
            if (isDiverse) promptVariant += ` [Variant ${i+1}]`;
            
            // Add seed for variation if requested
            const seedValue = isDiverse ? Math.floor(Math.random() * 10000) : undefined;
            
            promises.push(
                websim.imageGen({
                    prompt: promptVariant,
                    aspect_ratio: aspectRatio,
                    seed: seedValue
                }).then(result => {
                    previewItem.innerHTML = '';
                    const img = document.createElement('img');
                    img.src = result.url;
                    img.alt = `Generated image for ${chapterTitle}`;
                    if (isRound) img.classList.add('round-cutout');
                    img.loading = 'lazy';
                    previewItem.appendChild(img);
                    previewItem.dataset.imageUrl = result.url;
                    previewItem.dataset.isRound = isRound;
                    previewItem.addEventListener('click', () => {
                        previewItem.classList.toggle('selected');
                        updateSelectionButtons();
                    });
                    return previewItem;
                }).catch(error => {
                    console.error(`Error generating image ${i+1}:`, error);
                    previewItem.innerHTML = `<div style="color:#c00;background:#fee;padding:8px;border-radius:4px;">Error: ${error.message || 'Generation failed'}</div>`;
                    dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Error generating image: ${error.message}`);
                    return null;
                })
            );
        }

        try {
            const results = await Promise.all(promises);
            const imagesLoaded = results.filter(x => x !== null).length;
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                `Image generation complete for Chapter ${chapterNumber}. (${imagesLoaded} successful / ${imageCount} total)`);
            progressInfo.textContent = `Generation complete: ${imagesLoaded} images created`;
        } catch (error) {
            dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, 
                `Error during batch image generation: ${error.message}`);
            progressInfo.textContent = `Error during generation: ${error.message}`;
        } finally {
            state.generating = false;
            generateButton.disabled = false;
            
            // Show selection/insert buttons if at least one image was generated or uploaded
            updateSelectionButtons();
        }
    });

    // Insert handler (add to chapter-content)
    document.querySelector('#insert-selected-images-button').addEventListener('click', () => {
        const selected = Array.from(previewArea.querySelectorAll('.image-preview-item.selected'));
        if (!selected.length) {
            alert("No images selected.");
            return;
        }
        selected.forEach(item => {
            const imageUrl = item.dataset.imageUrl;
            const isRound = item.dataset.isRound === 'true' || document.querySelector('#image-round-cutout-checkbox').checked; // For upload, use checkbox
            if (imageUrl) {
                insertImageIntoChapter(imageUrl, isRound, contentDiv);
            }
        });
        dependencies.logToAIConsole(state.commandHistory, uiElements.aiCommandConsole, `Inserted ${selected.length} image(s) into Chapter ${chapterNumber}.`);
        closePopup();
    });

    // Download handler - download selected images
    document.querySelector('#download-selected-images-button').addEventListener('click', async () => {
        const selected = Array.from(previewArea.querySelectorAll('.image-preview-item.selected'));
        if (!selected.length) {
            alert("Select at least one image to download.");
            return;
        }
        
        progressInfo.textContent = `Downloading ${selected.length} images...`;
        const downloadButton = document.querySelector('#download-selected-images-button');
        downloadButton.disabled = true;
        
        try {
            for (let i = 0; i < selected.length; i++) {
                const item = selected[i];
                const imageUrl = item.dataset.imageUrl;
                progressInfo.textContent = `Downloading image ${i+1} of ${selected.length}...`;
                
                try {
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    let filename = `chapter${chapterNumber}-image`;
                    if (/^data:/i.test(imageUrl)) filename += '-upload';
                    else {
                        const parts = imageUrl.split('/');
                        filename += '-' + (parts[parts.length-1] || 'img');
                    }
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    // Slight delay between downloads to prevent browser issues
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                } catch (error) {
                    progressInfo.textContent = `Error downloading image ${i+1}: ${error.message}`;
                    console.error("Download error:", error);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            progressInfo.textContent = `Downloaded ${selected.length} images`;
            setTimeout(() => { progressInfo.textContent = ''; }, 3000);
        } catch (error) {
            progressInfo.textContent = `Download error: ${error.message}`;
        } finally {
            downloadButton.disabled = false;
        }
    });

    function insertImageIntoChapter(imageUrl, isRound, contentDiv) {
        const imageContainer = createImageContainer(imageUrl, isRound, contentDiv);
        contentDiv.appendChild(imageContainer);
        updateMoveButtonStates(imageContainer);
        const prevElement = imageContainer.previousElementSibling;
        if (prevElement && prevElement.classList.contains('image-container')) {
            updateMoveButtonStates(prevElement);
        }
    }

    // Helper: update insert/download buttons visibility
    function updateSelectionButtons() {
        const selected = previewArea.querySelectorAll('.image-preview-item.selected').length;
        if (selected > 0) {
            document.querySelector('#insert-selected-images-button').style.display = 'block';
            document.querySelector('#download-selected-images-button').style.display = 'block';
            document.querySelector('#insert-selected-images-button').textContent = `Insert ${selected} Selected ${selected === 1 ? 'Image' : 'Images'}`;
            document.querySelector('#download-selected-images-button').textContent = `Download ${selected} Selected ${selected === 1 ? 'Image' : 'Images'}`;
        } else {
            document.querySelector('#insert-selected-images-button').style.display = 'none';
            document.querySelector('#download-selected-images-button').style.display = 'none';
        }
    }
    
    // Add tab styling
    const style = document.createElement('style');
    style.textContent = `
        .img-tab-btn {
            padding: 8px 15px;
            border: none;
            background: transparent;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }
        .img-tab-btn:hover {
            background-color: #f0f0f0;
        }
        .img-tab-btn.active {
            border-bottom-color: #1890ff;
            color: #1890ff;
            font-weight: bold;
        }
        .template-button:hover {
            transform: translateY(-2px);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Extracts relevant text content from the chapter for analysis.
 * @param {HTMLElement} contentDiv - The chapter content container
 * @returns {string} Extracted chapter text content
 */
function extractChapterContent(contentDiv) {
    if (!contentDiv) return '';
    
    // Get all paragraphs, excluding any that might contain styling/scripting
    const paragraphs = Array.from(contentDiv.querySelectorAll('p'))
        .filter(p => !p.querySelector('script'))
        .map(p => p.textContent.trim())
        .filter(text => text.length > 0);
        
    // Get chapter title
    const titleElement = contentDiv.querySelector('h2');
    const title = titleElement ? titleElement.textContent.trim() : '';
    
    // Combine content with title first, then paragraphs
    let content = title ? `${title}\n\n` : '';
    content += paragraphs.join('\n\n');
    
    // Limit to ~2000 characters to avoid token limits
    if (content.length > 2000) {
        const shortenedContent = content.substring(0, 2000);
        // Try to end at a period or paragraph break
        const lastPeriodIndex = shortenedContent.lastIndexOf('.');
        const lastNewlineIndex = shortenedContent.lastIndexOf('\n');
        const cutPoint = Math.max(
            lastPeriodIndex > 1800 ? lastPeriodIndex + 1 : 2000,
            lastNewlineIndex > 1800 ? lastNewlineIndex + 2 : 0
        );
        content = shortenedContent.substring(0, cutPoint) + '...';
    }
    
    return content;
}

/**
 * Generates a diorama image description based on chapter content.
 * @param {string} chapterText - The extracted chapter text
 * @param {string} chapterTitle - The title of the chapter
 * @param {string} bookTopic - The overall book topic
 * @param {object} settings - Generation settings including genre, style
 * @returns {Promise<string>} The generated diorama description
 */
async function generateDioramaPrompt(chapterText, chapterTitle, bookTopic, settings) {
    try {
        const systemPrompt = `You are a visual artist specializing in diorama-style scene descriptions for image generation. 
Based on the provided chapter text, create a detailed visual scene description that captures the essence of this chapter 
in a single powerful image. Focus on the most visually striking or emotionally resonant moment. 

Your description should:
- Be 1-3 sentences, totaling 40-70 words maximum
- Focus on visually descriptive elements (setting, characters, mood, lighting, colors)
- Include specific details that capture the essence of the scene
- Create a diorama-like staging of the most important scene or moment
- Be suitable for an AI image generator to create a compelling visualization

DO NOT include any explanations, just provide the diorama scene description.`;

        // Get genre and style context from settings
        const genreContext = settings.genre && settings.genre !== 'Auto Detect' 
            ? `The book's genre is ${settings.genre}.` : '';
        const styleContext = settings.style && settings.style !== 'Chosen by AI'
            ? `The writing style is ${settings.style}.` : '';

        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: `Book topic: "${bookTopic}"
Chapter title: "${chapterTitle}"
${genreContext}
${styleContext}

Chapter content:
${chapterText}`,
                },
            ],
        });

        return completion.content.trim();
    } catch (error) {
        console.error("Error generating diorama prompt:", error);
        throw new Error(`AI generation failed: ${error.message}`);
    }
}