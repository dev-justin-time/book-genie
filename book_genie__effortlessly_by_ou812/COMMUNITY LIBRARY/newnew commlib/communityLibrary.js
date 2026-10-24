const authorShowcaseTemplates = [
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Clean, sleek design with bold typography and muted colors.",
    css: `
      .modern-minimal {
        background: linear-gradient(135deg, #f5f7fa, #c3cfe2);
        font-family: 'Roboto', sans-serif;
        padding: 20px;
        border-radius: 10px;
      }
      .modern-minimal .author-card {
        display: flex;
        gap: 15px;
        background: white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        border-radius: 8px;
        padding: 15px;
      }
      .modern-minimal .author-img {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        object-fit: cover;
      }
      .modern-minimal .author-bio {
        font-size: 0.9em;
        color: #333;
      }
      .modern-minimal .marketplace-btn {
        background: #6200ea;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        text-transform: uppercase;
      }
    `,
    html: `
      <div class="author-card">
        <img class="author-img" src="{authorImg}" alt="{authorName}">
        <div>
          <h2>{authorName}</h2>
          <p class="author-bio">{authorBio}</p>
          <button class="marketplace-btn">View Books</button>
        </div>
      </div>
    `
  },
  {
    id: "retro-vibes",
    name: "Retro Vibes",
    description: "Nostalgic 80s/90s aesthetic with neon colors and pixel fonts.",
    css: `
      .retro-vibes {
        background: #ff6ec7;
        font-family: 'Press Start 2P', cursive;
        padding: 20px;
        border: 4px solid #00f;
      }
      .retro-vibes .author-card {
        display: grid;
        grid-template-columns: 120px 1fr;
        background: #000;
        color: #0ff;
        padding: 10px;
        border: 2px solid #fff;
      }
      .retro-vibes .author-img {
        width: 100px;
        height: 100px;
        border: 3px solid #f0f;
      }
      .retro-vibes .author-bio {
        font-size: 0.8em;
        text-shadow: 0 0 5px #0ff;
      }
      .retro-vibes .marketplace-btn {
        background: #f0f;
        color: #000;
        padding: 8px 16px;
        border: 2px solid #fff;
      }
    `,
    html: `
      <div class="author-card">
        <img class="author-img" src="{authorImg}" alt="{authorName}">
        <div>
          <h2>{authorName}</h2>
          <p class="author-bio">{authorBio}</p>
          <button class="marketplace-btn">Shop Now</button>
        </div>
      </div>
    `
  },
  {
    id: "cozy-bookstore",
    name: "Cozy Bookstore",
    description: "Warm, inviting design with earthy tones and wooden textures.",
    css: `
      .cozy-bookstore {
        background: url('wood-texture.jpg');
        font-family: 'Lora', serif;
        padding: 25px;
        border-radius: 12px;
      }
      .cozy-bookstore .author-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #f5e8c7;
        padding: 20px;
        border: 2px solid #8b4513;
      }
      .cozy-bookstore .author-img {
        width: 120px;
        height: 120px;
        border-radius: 10px;
        border: 3px solid #deb887;
      }
      .cozy-bookstore .author-bio {
        font-size: 1em;
        color: #4b2e2e;
        text-align: center;
      }
      .cozy-bookstore .marketplace-btn {
        background: #8b4513;
        color: #fff;
        padding: 12px 24px;
        border-radius: 8px;
      }
    `,
    html: `
      <div class="author-card">
        <img class="author-img" src="{authorImg}" alt="{authorName}">
        <h2>{authorName}</h2>
        <p class="author-bio">{authorBio}</p>
        <button class="marketplace-btn">Browse Collection</button>
      </div>
    `
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    description: 'Futuristic design with neon accents and glitch effects.',
    css: `
      .cyberpunk {
        background: #0f0f23;
        font-family: 'Orbitron', sans-serif;
        padding: 20px;
        border: 2px solid #00ffcc;
        box-shadow: 0 0 10px #00ffcc;
      }
      .cyberpunk .author-card {
        display: flex;
        gap: 10px;
        background: #1a1a3d;
        padding: 15px;
        border-radius: 5px;
      }
      .cyberpunk .author-img {
        width: 100px;
        height: 100px;
        border: 2px solid #ff00ff;
        filter: drop-shadow(0 0 5px #ff00ff);
      }
      .cyberpunk .author-bio {
        font-size: 0.85em;
        color: #00ffcc;
      }
      .cyberpunk .marketplace-btn {
        background: #ff00ff;
        color: #fff;
        padding: 10px 20px;
        border-radius: 3px;
        text-transform: uppercase;
      }
    `,
    html: `
      <div class="author-card">
        <img class="author-img" src="{authorImg}" alt="{authorName}">
        <div>
          <h2>{authorName}</h2>
          <p class="author-bio">{authorBio}</p>
          <button class="marketplace-btn">Buy Now</button>
        </div>
      </div>
    `
  },
  {
    id: 'vintage-library',
    name: 'Vintage Library',
    description: 'Classic library aesthetic with parchment and gold accents.',
    css: `
      .vintage-library {
        background: url('parchment-texture.jpg');
        font-family: 'Garamond', serif;
        padding: 25px;
        border: 3px solid #b8860b;
      }
      .vintage-library .author-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #fff8dc;
        padding: 20px;
        border: 2px solid #8b0000;
      }
      .vintage-library .author-img {
        width: 120px;
        height: 120px;
        border-radius: 10px;
        border: 3px solid #b8860b;
      }
      .vintage-library .author-bio {
        font-size: 1em;
        color: #8b0000;
        text-align: center;
      }
      .vintage-library .marketplace-btn {
        background: #8b0000;
        color: #fff;
        padding: 12px 24px;
        border-radius: 5px;
      }
    `,
    html: `
      <div class="author-card">
        <img class="author-img" src="{authorImg}" alt="{authorName}">
        <h2>{authorName}</h2>
        <p class="author-bio">{authorBio}</p>
        <button class="marketplace-btn">Purchase Book</button>
      </div>
    `
  }
];

// Render a template
function renderAuthorShowcase(author, templateId) {
  const template = authorShowcaseTemplates.find(t => t.id === templateId);
  const html = template.html
    .replace("{authorName}", author.name)
    .replace("{authorImg}", author.imgUrl || "default-author.jpg")
    .replace("{authorBio}", author.bio);
  const container = document.createElement("div");
  container.className = template.id;
  container.innerHTML = html;
  document.querySelector(".marketplace").appendChild(container);
}

// NOTE: The feature flags below are already declared at the top of this module.
// To avoid "Identifier has already been declared" runtime errors, do not redeclare them here.
// You can tweak their values near the top:
//   enableHighContrastUI, enableGamification, enableTTSPreview, ttsPreviewVoice, preferIPFSUploads, ipfsGateway

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