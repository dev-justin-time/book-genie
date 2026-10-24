import { logToAIConsole } from "./event-listeners.js"; // Import logger

// --- NEW WELCOME POPUP STYLES ---
const welcomePopupStyles = `
  /* Base Dark Mode */
  :root {
    /** @tweakable neonBlue The primary neon color for the welcome popup */
    --neon-blue: #00f3ff;
    /** @tweakable darkBg The dark background color for the welcome popup */
    --dark-bg: #0a0a1a;
    --text-primary-dark: #e0e0ff;
  }
  .welcome-popup {
    box-shadow: 0 0 25px var(--neon-blue);
    border: 2px solid var(--neon-blue);
    background: linear-gradient(45deg, var(--dark-bg) 60%, #001119);
    color: var(--text-primary-dark);
  }
  .welcome-content {
    text-shadow: 0 0 10px rgba(0, 243, 255, 0.4);
    background: transparent; /* Override default background */
    color: var(--text-primary-dark);
    border: none;
    box-shadow: none;
  }
  .welcome-content h2, .welcome-content p, .stat-item {
    color: var(--text-primary-dark);
  }
  .welcome-content a {
    color: var(--neon-blue);
    text-decoration: none;
  }
  .welcome-content a:hover {
    text-decoration: underline;
  }
  /* RTL/CJK/Indic Support */
  .welcome-popup[dir="rtl"] .welcome-content {
    font-family: 'Noto Sans Arabic', sans-serif;
    text-align: right;
  }
  .welcome-popup.cjk .welcome-content {
    font-family: 'Noto Sans CJK', sans-serif;
    line-height: 1.8;
  }
  .welcome-popup.indic .welcome-content {
    font-family: 'Noto Sans Devanagari', sans-serif;
  }
  /* Loading States */
  .loading-pulse {
    animation: pulse 1.5s infinite;
    background: #002233;
    border-radius: 4px;
    display: inline-block;
    min-width: 100px;
    height: 1.2em;
  }
  @keyframes pulse {
    0% { opacity: 0.4; }
    50% { opacity: 1; }
    100% { opacity: 0.4; }
  }
  /* Confetti Canvas */
  #confetti-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10;
  }
  /* Error Boundaries */
  .error-fallback {
    border: 3px solid #ff0044;
    padding: 1rem;
    background: #220000;
  }
`;

// Utility for translations (minimal, for demo - extend as needed)
const LOCALIZED_STRINGS = {
  en: {
    welcome: "Welcome to Book Genie, your creative writing assistant!",
    p1: "Unleash your creativity and generate captivating books with AI! Enter a word, idea, or topic, and let AI build the rest.",
    p2: "Create structured chapters, logical flow, and detailed content with minimal input. Feel free to share your generated books!",
    site: "This site:",
    share: "Share & discover books at <a href='https://websim.com/@JUSTIN_TIME/3d-interactive-bookshelf/70' target='_blank' rel='noopener noreferrer' style='font-weight: bold; color: var(--text-link);'>The Community Library</a>!",
    tip: "Tip: Be patient; creation and loading might take some time.",
    day: "Day:",
    projectCommences: "Project commences on July 1st, 2025.",
    getStarted: "Get Started!",
    views: "Views:",
    likes: "Likes:",
    calculatingDay: "Calculating project day...",
    loadingViews: "Loading views...",
    loadingLikes: "Loading likes...",
    error: "Error",
    ariaClose: "Close welcome popup",
  },
  de: {
    welcome: "Willkommen bei Book Genei, Ihrem kreativen Schreib-Assistenten!",
    p1: "Entfesseln Sie Ihre Kreativität und generieren Sie fesselnde Bücher mit KI! Geben Sie ein Wort, eine Idee oder ein Thema ein und lassen Sie die KI den Rest erstellen.",
    p2: "Erstellen Sie strukturierte Kapitel, einen logischen Ablauf und detaillierte Inhalte mit minimalem Input. Sie können generierte Bücher gerne teilen!",
    site: "Diese Seite:",
    share: "Teilen Sie & entdecken Sie Bücher in der <a href='https://websim.com/@JUSTIN_TIME/3d-interactive-bookshelf/70' target='_blank' rel='noopener noreferrer' style='font-weight: bold; color: var(--text-link);'>Community Library</a>!",
    tip: "Tipp: Seien Sie geduldig; das Erstellen und Laden kann etwas dauern.",
    day: "Tag:",
    projectCommences: "Das Projekt beginnt am 1. Juli 2025.",
    getStarted: "Loslegen!",
    views: "Aufrufe:",
    likes: "Gefällt mir:",
    calculatingDay: "Projekttag wird berechnet...",
    loadingViews: "Aufrufe werden geladen...",
    loadingLikes: "Likes werden geladen...",
    error: "Fehler",
    ariaClose: "Willkommens-Popup schließen",
  },
  fr: {
    "welcome": "Bienvenue sur Book Genei, votre assistant de rédaction créatif !",
    "p1": "Libérez votre créativité et générez des livres captivants avec l'IA ! Saisissez un mot, une idée ou un sujet, et l'IA fera le reste.",
    "p2": "Créez des chapitres structurés, un déroulement logique et un contenu détaillé avec un minimum d'entrée. Partagez librement vos livres générés !",
    "site": "Ce site :",
    "share": "Partagez & découvrez des livres sur <a href='https://websim.com/@JUSTIN_TIME/3d-interactive-bookshelf/70' target='_blank' rel='noopener noreferrer' style='font-weight: bold; color: var(--text-link);'>Community Library</a> !",
    "tip": "Astuce : Soyez patient, la création et le chargement peuvent prendre du temps.",
    "day": "Jour :",
    "projectCommences": "Le projet commence le 1er juillet 2025.",
    "getStarted": "Commencer!",
    "views": "Vues :",
    "likes": "J'aime :",
    "calculatingDay": "Calcul du jour du projet...",
    "loadingViews": "Chargement des vues...",
    "loadingLikes": "Chargement des likes...",
    "error": "Erreur",
    "ariaClose": "Fermer la popup de bienvenue"
  },
  zh_CN: { // Changed zh_CH to zh_CN
    "welcome": "欢迎来到 Book Genei，您的创意写作助手！",
    "p1": "释放您的创造力，使用 AI 生成引人入胜的书籍！输入一个单词、想法或主题，让 AI 完成其余部分。",
    "p2": "使用最少的输入生成结构化的章节、逻辑流畅和详细的内容。请随意分享生成的书籍！",
    "site": "此网站：",
    "share": "分享 & 发现书籍在 <a href='https://websim.com/@JUSTIN_TIME/3d-interactive-bookshelf/70' target='_blank' rel='noopener noreferrer' style='font-weight: bold; color: var(--text-link);'>社区图书馆</a>！",
    "tip": "提示：请耐心等待；创作和加载可能需要一些时间。",
    "day": "天：",
    "projectCommences": "项目于 2025 年 7 月 1 日开始。",
    "getStarted": "开始！",
    "views": "查看次数：",
    "likes": "点赞：",
    "calculatingDay": "正在计算项目天数...",
    "loadingViews": "正在加载查看次数...",
    "loadingLikes": "正在加载点赞...",
    "error": "错误",
    "ariaClose": "关闭欢迎弹窗"
  }
  // Add additional translations as needed...
};

// Detect site/app language. Fallback to English. Looks at lang attr and localStorage.
function getWelcomeLang() {
  let lang = document.documentElement.getAttribute("lang") || localStorage.getItem("preferredLanguage") || navigator.language || "en";
  if (lang && lang.length > 2) lang = lang.split("-")[0].toLowerCase();
  if (LOCALIZED_STRINGS[lang]) return lang;
  return "en";
}

// Lookup localized string, fallback to English if not found
function t(key) {
  const lang = getWelcomeLang();
  return (LOCALIZED_STRINGS[lang] && LOCALIZED_STRINGS[lang][key]) || LOCALIZED_STRINGS["en"][key] || key;
}

/** @tweakable confettiParticleCount Number of particles in the confetti effect. */
const confettiParticleCount = 100;

/** @tweakable confettiColors Array of colors for the confetti particles. */
const confettiColors = ['#00f3ff', '#ff4da6', '#ffc400', '#4dff4d'];

function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
  const particles = [];
  for (let i = 0; i < confettiParticleCount; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height * 0.8,
      radius: Math.random() * 3 + 2,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      vx: Math.random() * 10 - 5,
      vy: Math.random() * -20 - 5,
      alpha: 1,
    });
  }
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, index) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // Gravity
      p.alpha -= 0.02;
      if (p.alpha <= 0) {
        particles.splice(index, 1);
      } else {
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
    });
    if (particles.length > 0) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  animate();
}

export async function showWelcomePopup() {
  // --- State for logging (can be passed in if needed, but using a simple local one here) ---
  let commandHistory = [];
  const aiCommandConsole = document.getElementById("ai-command-console");
  const logger = (message) => {
    if (aiCommandConsole) {
      logToAIConsole(commandHistory, aiCommandConsole, message);
    } else {
      console.log("Popup Log:", message); // Fallback log
    }
  };
  // --- End State ---

  // Inject styles into head
  if (!document.getElementById('welcome-popup-styles')) {
    const styleSheet = document.createElement("style");
    styleSheet.id = 'welcome-popup-styles';
    styleSheet.textContent = welcomePopupStyles;
    document.head.appendChild(styleSheet);
  }

  // Detect correct language
  let lang = getWelcomeLang();
  const popup = document.createElement("div");
  popup.className = "welcome-popup";
  popup.setAttribute("lang", lang);

  // Add language-specific classes
  if (['zh', 'ja', 'ko'].includes(lang)) popup.classList.add('cjk');
  if (['hi', 'bn', 'ta'].includes(lang)) popup.classList.add('indic');
  if (['ar', 'he', 'fa'].includes(lang)) popup.dir = 'rtl';

  popup.innerHTML = `
    <div class="welcome-content">
      <canvas id="confetti-canvas"></canvas>
      <h2>${t("welcome")}</h2>
      <p>${t("p1")}</p>
      <p>${t("p2")}</p>
      <p style="font-weight: bold; color: var(--text-link);">${t("site")} <a href="https://websim.com/@JUSTIN_TIME/3d-interactive-bookshelf/70" target="_blank">https://websim.com/@JUSTIN_TIME/3d-interactive-bookshelf/70</a></p>
      <p>${t("share")}</p>
      <p style="font-weight: bold; color: navy;">${t("tip")}</p>
      <div class="stats-container">
        <span id="day-count" class="stat-item loading-pulse">${t("calculatingDay")}</span>
        <span id="view-count" class="stat-item loading-pulse">${t("loadingViews")}</span>
        <span id="like-count" class="stat-item loading-pulse">${t("loadingLikes")}</span>
      </div>
      <button id="get-started-button" class="welcome-action-button">${t("getStarted")}</button>
    </div>
  `;

  document.body.appendChild(popup);

  // --- Get references after appending ---
  const getStartedButton = document.getElementById("get-started-button");
  const dayCountElement = document.getElementById("day-count");
  const viewCountElement = document.getElementById("view-count");
  const likeCountElement = document.getElementById("like-count");

  // --- Event Listeners ---
  const closePopupAction = () => {
    triggerConfetti();
    setTimeout(() => popup.remove(), 500);
  };

  getStartedButton.addEventListener("click", closePopupAction);
  popup.addEventListener("click", (event) => {
    if (event.target === popup) closePopupAction();
  });

  // --- Calculate Day Count - language sensitive ---
  try {
    const startDate = new Date(2025, 3, 1); // April 1st, 2025
    const today = new Date();
    const startUtc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    if (startUtc > todayUtc) {
      dayCountElement.textContent = t("projectCommences");
    } else {
      const differenceInTime = todayUtc - startUtc;
      const differenceInDays = Math.floor(differenceInTime / (1000 * 3600 * 24)) + 1;
      const dayCountString = differenceInDays.toString().padStart(5, "0");
      dayCountElement.textContent = `${t("day")} ${dayCountString}`;
    }
    dayCountElement.classList.remove('loading-pulse');
  } catch (error) {
    console.error("Error calculating day count:", error);
    dayCountElement.textContent = `${t("day")} ${t("error")}`;
    logger(`Error calculating day count: ${error.message}`);
  }

  // --- Fetch Visitor and Like Counts ---
  try {
    const project = await window.websim.getCurrentProject();
    if (project && project.id) {
      const response = await fetch(`/api/v1/projects/${project.id}`);
      if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
      const projectData = await response.json();
      const views = projectData?.project?.stats?.views ?? 0;
      const likes = projectData?.project?.stats?.likes ?? 0;
      viewCountElement.textContent = `${t("views")} ${views.toLocaleString()}`;
      likeCountElement.textContent = `${t("likes")} ${likes.toLocaleString()}`;
      viewCountElement.classList.remove('loading-pulse');
      likeCountElement.classList.remove('loading-pulse');
      logger(`Project stats loaded: Views=${views}, Likes=${likes}`);
    } else {
      throw new Error("Could not get current project ID.");
    }
  } catch (error) {
    console.error("Error fetching project stats:", error);
    viewCountElement.textContent = `${t("views")} ${t("error")}`;
    likeCountElement.textContent = `${t("likes")} ${t("error")}`;
    viewCountElement.classList.remove('loading-pulse');
    likeCountElement.classList.remove('loading-pulse');
    logger(`Error fetching project stats: ${error.message}`);
  }

  popup.style.display = "flex";
}