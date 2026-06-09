/* ============================================================
   CHATBOT APPLICATION — app.js
   Complete client-side chatbot for GitHub Pages portfolio.
   All logic runs in-browser with no backend.
   ============================================================ */

// ============================================================
// CONFIGURATION
// ============================================================
// Determine the base path from the script's own src attribute.
// This ensures profile.json resolves correctly regardless of which page loads the widget.
(function detectBasePath() {
  const scripts = document.querySelectorAll('script[src*="app.js"]');
  if (scripts.length > 0) {
    const src = scripts[0].getAttribute('src') || '';
    const parts = src.split('/');
    parts.pop(); // remove 'app.js'
    window.__CHAT_BASE = parts.length > 0 ? parts.join('/') + '/' : '';
  } else {
    window.__CHAT_BASE = '';
  }
})();

const CONFIG = Object.freeze({
  CONFIDENCE_THRESHOLD: 0.55,
  PROFILE_PATH: window.__CHAT_BASE + 'profile.json',
  STORAGE_KEY: 'portfolio_chat_history',
  MAX_HISTORY: 50,
  TYPING_SPEED_MS: 600,
  BOT_NAME: 'Portfolio Bot',
  SUGGESTIONS: [
    'About Me',
    'Skills',
    'Projects',
    'Experience',
    'Education',
    'Freelance',
    'Teaching',
    'Pricing',
    'Games',
    'GitHub',
    'Contact',
  ],
});

// ============================================================
// LOCALISATION / i18n
// Detect language from the site's global i18n system.
// Falls back to 'en' if localStorage is unavailable.
// ============================================================
(function detectLang() {
  try {
    const lang = localStorage.getItem('lang') || 'en';
    const allLangs = (typeof window._L !== 'undefined' && window._L) ||
      ['en', 'el', 'it', 'tr', 'ro', 'sq', 'bg', 'es', 'fr'];
    const idx = Math.max(0, allLangs.indexOf(lang));
    window.__CHAT_LANG = lang;
    window.__CHAT_LANG_IDX = idx;
  } catch {
    window.__CHAT_LANG = 'en';
    window.__CHAT_LANG_IDX = 0;
  }
})();

/** Translate helper: returns Greek text when site language is Greek, else English. */
function __tr(en, el) {
  return window.__CHAT_LANG_IDX === 1 ? el : en;
}

// ============================================================
// INTENT DEFINITIONS
// Each intent declares:
//   id         — unique key
//   labels     — display labels for suggestion mapping
//   keywords   — tokens that trigger this intent (lowercased)
//   patterns   — regex patterns for phrase-level matching
//   priority   — higher wins on tie (0-10)
//   response   — function(profile, context) => string
// ============================================================
const INTENTS = [];

/**
 * Register a new intent at runtime.
 * @param {Object} spec
 */
function addIntent(spec) {
  if (!spec.id || !spec.response) {
    console.warn('[Chat] Intent must have id and response');
    return;
  }
  INTENTS.push({
    id: spec.id,
    labels: spec.labels || [],
    keywords: (spec.keywords || []).map(k => k.toLowerCase()),
    patterns: spec.patterns || [],
    priority: spec.priority || 0,
    response: spec.response,
  });
}

// ---- Built-in intents ----

addIntent({
  id: 'greeting',
  labels: ['Hello', 'Hi'],
  keywords: ['hi', 'hello', 'hey', 'sup', 'yo', 'greetings', 'good morning', 'good evening', 'good afternoon', 'howdy'],
  patterns: [/^(hi|hello|hey|howdy)(\s|$)/i, /^greetings/i],
  priority: 2,
  response: (profile, ctx) => {
    const name = profile.meta.name.split(' ')[0];
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? (window.__CHAT_LANG_IDX === 1 ? 'Καλημέρα' : 'Good morning') : hour < 18 ? (window.__CHAT_LANG_IDX === 1 ? 'Καλησπέρα' : 'Good afternoon') : (window.__CHAT_LANG_IDX === 1 ? 'Καλησπέρα' : 'Good evening');
    const visited = ctx.getHistory().length > 2;
    if (visited) {
      return __tr(
        `${timeGreeting}! Welcome back! I'm still here to help you learn more about ${name}. What would you like to know? ☕`,
        `${timeGreeting}! Καλώς ήρθες ξανά! Είμαι εδώ για να σε βοηθήσω να μάθεις περισσότερα για τον ${name}. Τι θα ήθελες να μάθεις; ☕`
      );
    }
    return __tr(
      `${timeGreeting}! I'm the ${CONFIG.BOT_NAME}. Ask me anything about ${name}'s skills, projects, experience, or education!`,
      `${timeGreeting}! Είμαι το ${CONFIG.BOT_NAME}. Ρώτα με ό,τι θες για τις δεξιότητες, τα projects, την εμπειρία ή την εκπαίδευση του ${name}!`
    );
  },
});

addIntent({
  id: 'about_me',
  labels: ['About Me'],
  keywords: ['about', 'who', 'yourself', 'tell', 'bio', 'introduction', 'introduce', 'background', 'summary', 'about you', 'who are you', 'tell me about', 'ποιος', 'σχετικά', 'βιογραφικό', 'ποιος είσαι', 'πες μου'],
  patterns: [/^(who|what)\s+(is|are)\s+(you|this)/i, /tell\s+(me\s+)?about/i, /^(about|introduce)\s/i],
  priority: 5,
  response: (profile) => {
    const name = profile.meta.name;
    return __tr(
      `**${name}**\n\n${profile.bio.summary}\n\n📍 ${profile.meta.location}\n💼 ${profile.meta.title}\n📧 ${profile.meta.email}`,
      `**${name}**\n\nΟ ${name.split(' ')[0]} είναι επιστήμονας υπολογιστών και fullstack μηχανικός από την Ελλάδα. Έχει B.Sc. στην Πληροφορική από το Πανεπιστήμιο Πειραιώς και έχει εργαστεί σε startups, εταιρείες και enterprise projects. Διδάσκει προγραμματισμό σε παιδιά στην Algorithmics.\n\n📍 ${profile.meta.location}\n💼 ${profile.meta.title}\n📧 ${profile.meta.email}`
    );
  },
});

addIntent({
  id: 'skills',
  labels: ['Skills'],
  keywords: ['skills', 'technologies', 'languages', 'frameworks', 'tools', 'tech stack', 'stack', 'know', 'proficient', 'expertise', 'capable', 'what can you', 'competencies', 'δεξιότητες', 'γλώσσες', 'τεχνολογίες', 'ξέρεις', 'τι ξέρεις', 'ικανότητες'],
  patterns: [/what\s+(technologies|tools|stacks|skills)/i, /tech\s+stack/i, /what\s+(do\s+)?(you\s+)?know/i],
  priority: 4,
  response: (profile) => {
    const cats = Object.entries(profile.skills);
    const name = profile.meta.name.split(' ')[0];
    const total = cats.reduce((s, [, items]) => s + items.length, 0);
    return __tr(
      `**Technical Skills** — ${name} is proficient across ${cats.length} categories:\n\n${cats.map(([cat, items]) => `▸ **${cat}**: ${items.join(', ')}`).join('\n')}\n\nThat's ${total}+ individual skills!`,
      `**Τεχνικές Δεξιότητες** — Ο ${name} γνωρίζει ${cats.length} κατηγορίες:\n\n${cats.map(([cat, items]) => `▸ **${cat}**: ${items.join(', ')}`).join('\n')}\n\nΣύνολο ${total}+ δεξιότητες!`
    );
  },
});

addIntent({
  id: 'frontend',
  labels: ['Frontend'],
  keywords: ['frontend', 'front-end', 'front end', 'ui', 'react', 'vue', 'angular', 'css', 'html'],
  patterns: [],
  priority: 3,
  response: (profile) => {
    const fe = profile.skills.Frontend || [];
    return __tr(
      `**Frontend Skills**\n\n${fe.join(', ')}\n\nHe's comfortable with modern SPA frameworks, responsive design, and component libraries like Material UI and Tailwind CSS.`,
      `**Frontend Δεξιότητες**\n\n${fe.join(', ')}\n\nΆνετος με σύγχρονα SPA frameworks, responsive design και βιβλιοθήκες components όπως Material UI και Tailwind CSS.`
    );
  },
});

addIntent({
  id: 'backend',
  labels: ['Backend'],
  keywords: ['backend', 'back-end', 'back end', 'server', 'api', 'django', 'express', 'laravel', 'node'],
  patterns: [],
  priority: 3,
  response: (profile) => {
    const be = profile.skills.Backend || [];
    return __tr(
      `**Backend Skills**\n\n${be.join(', ')}\n\nExperience spans Python (Django, Flask, FastAPI), PHP (Laravel), and Node.js (Express) ecosystems.`,
      `**Backend Δεξιότητες**\n\n${be.join(', ')}\n\nΕμπειρία σε Python (Django, Flask, FastAPI), PHP (Laravel) και Node.js (Express).`
    );
  },
});

addIntent({
  id: 'projects',
  labels: ['Projects'],
  keywords: ['projects', 'portfolio', 'built', 'created', 'developed', 'made', 'applications', 'apps', 'work', 'showcase', 'what have you', 'what did you', 'έργα', 'projects', 'εργασίες', 'δημιούργησες', 'έχεις φτιάξει'],
  patterns: [/what\s+(projects|apps|applications|things)\s/i, /show\s+(me\s+)?(your\s+)?(projects|work)/i, /^projects/i],
  priority: 4,
  response: (profile) => {
    const projects = profile.projects || [];
    const reply = __tr(
      `**Projects** (${projects.length} total):\n\n${projects.map(p => `▸ **[${p.title}](${p.link})** — ${p.description.split('.')[0]}.\n  _Tech: ${p.tech.join(', ')}_`).join('\n\n')}`,
      `**Projects** (σύνολο ${projects.length}):\n\n${projects.map(p => `▸ **[${p.title}](${p.link})** — ${p.description.split('.')[0]}.\n  _Τεχνολογίες: ${p.tech.join(', ')}_`).join('\n\n')}`
    );
    return reply.trim();
  },
});

addIntent({
  id: 'project_detail',
  labels: ['Bio Explorer 2D', 'Bio Explorer 3D', 'RePaw', 'UR8', 'Pixel Sprint', 'Rustix', 'Speech Recognition', 'PhotoFavorites', 'Kivy Downloader', 'Tournaments', 'CryptDB', 'Flag Builder', 'PingPong', 'Asteroid', 'Snake', 'Flappy', 'Tetris', 'Quiz', 'Match', 'Base Ops', 'Bug Breaker', 'CareBeat', 'DrakosDesign', 'IslandBookings', 'MariaKostoula', 'AuraLibre'],
  keywords: ['project', 'tell me about', 'detail', 'bio explorer', 'repaw', 'rustix', 'pixelsprint', 'speech', 'photofavorites', 'kivy', 'tournaments', 'snake', 'flappy', 'tetris', 'asteroid', 'cryptdb'],
  patterns: [/^(bio explorer|repaw|ur8|pixelsprint|rustix|speech|snake|photofavorites|kivy|tournaments|cryptdb|flag|pingpong|asteroid|carebeat|drakos|islandbookings|mariakostoula|laralibre)/i],
  priority: 6,
  response: (profile, ctx, raw) => {
    const lower = raw.toLowerCase();
    const projects = [...(profile.projects || []), ...(profile.games || []), ...(profile.freelance || []).map(f => ({ id: f.project.toLowerCase().replace(/[^a-z]/g,'-'), title: f.project, description: f.description, tech: f.tech, link: '', highlights: [`Period: ${f.period}`] }))];
    let best = null;
    let bestScore = 0;
    for (const p of projects) {
      let score = 0;
      if (lower.includes(p.id.replace(/-/g, ' '))) score += 0.8;
      if (lower.includes(p.title.toLowerCase())) score += 1;
      if (p.title.toLowerCase().includes(lower)) score += 0.6;
      if (p.highlights && p.highlights.some(h => lower.includes(h.toLowerCase().slice(0, 10)))) score += 0.4;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (!best || bestScore < 0.3) return null;
    let reply = `**${best.title}**\n\n${best.description}\n\n`;
    if (best.highlights) {
      reply += __tr(`**Key highlights:**\n`, `**Κύρια σημεία:**\n`);
      for (const h of best.highlights) reply += `• ${h}\n`;
    }
    reply += `\n🔗 ${__tr('View on GitHub', 'Προβολή στο GitHub')}`;
    if (best.link) reply += `: [${best.link}](${best.link})`;
    return reply;
  },
});

addIntent({
  id: 'experience',
  labels: ['Experience'],
  keywords: ['experience', 'work', 'job', 'career', 'employment', 'worked', 'professional', 'history', 'background', 'where did you', 'companies', 'εμπειρία', 'εργασία', 'δουλειά', 'επαγγελματική', 'που δούλεψες'],
  patterns: [/where\s+(have|did)\s+(you\s+)?(worked|work)/i, /work\s+(history|experience)/i, /^experience/i],
  priority: 4,
  response: (profile) => {
    const jobs = profile.experience || [];
    const reply = __tr(
      `**Professional Experience** — ${jobs.length} positions:\n\n${jobs.map(j => `▸ **${j.role}** @ ${j.company}\n  ${j.period} · ${j.type}\n${j.highlights.slice(0, 2).map(h => `  • ${h}`).join('\n')}`).join('\n\n')}`,
      `**Επαγγελματική Εμπειρία** — ${jobs.length} θέσεις:\n\n${jobs.map(j => `▸ **${j.role}** @ ${j.company}\n  ${j.period} · ${j.type}\n${j.highlights.slice(0, 2).map(h => `  • ${h}`).join('\n')}`).join('\n\n')}`
    );
    return reply.trim();
  },
});

addIntent({
  id: 'education',
  labels: ['Education'],
  keywords: ['education', 'studied', 'degree', 'university', 'school', 'learned', 'college', 'academic', 'graduated', 'bachelor', 'certification', 'ecdl', 'unipi', 'εκπαίδευση', 'σπουδές', 'πανεπιστήμιο', 'πτυχίο', 'σχολή'],
  patterns: [/where\s+(did\s+)?(you\s+)?(study|go\s+to\s+school)/i, /academic\s+(background|history)/i, /^education/i],
  priority: 4,
  response: (profile) => {
    const edu = profile.education || [];
    const reply = __tr(
      `**Education**\n\n${edu.map(e => `▸ **${e.degree}**\n  ${e.school} · ${e.year}\n  ${e.description}`).join('\n\n')}`,
      `**Εκπαίδευση**\n\n${edu.map(e => `▸ **${e.degree}**\n  ${e.school} · ${e.year}\n  ${e.description}`).join('\n\n')}`
    );
    return reply.trim();
  },
});

addIntent({
  id: 'github',
  labels: ['GitHub'],
  keywords: ['github', 'repository', 'repos', 'code', 'source', 'open source', 'contribution', 'tigerlero', 'git'],
  patterns: [/^(github|git|repos)/i, /where\s+(is|can\s+i\s+find)\s+(your\s+)?code/i],
  priority: 5,
  response: (profile) => {
    const gh = profile.social.github;
    const name = profile.meta.name.split(' ')[0];
    return __tr(
      `**GitHub**\n\nUsername: **${gh.username}**\nURL: [${gh.url}](${gh.url})\n\n${name} has ${profile.projects.length} public repositories covering web apps, game engines, ML models, and tools. Open-source contributions are always welcome! 👨‍💻`,
      `**GitHub**\n\nUsername: **${gh.username}**\nURL: [${gh.url}](${gh.url})\n\nΟ ${name} έχει ${profile.projects.length} δημόσια repositories με web apps, game engines, ML μοντέλα και εργαλεία. Open-source συνεισφορές πάντα ευπρόσδεκτες! 👨‍💻`
    );
  },
});

addIntent({
  id: 'linkedin',
  labels: ['LinkedIn'],
  keywords: ['linkedin', 'linked in', 'professional', 'profile', 'connect', 'network'],
  patterns: [],
  priority: 3,
  response: (profile) => {
    const li = profile.social.linkedin;
    const name = profile.meta.name.split(' ')[0];
    return __tr(
      `**LinkedIn**\n\n[${li.username}](${li.url})\n\nConnect with ${name} on LinkedIn for professional networking and collaboration opportunities.`,
      `**LinkedIn**\n\n[${li.username}](${li.url})\n\nΣυνδεθείτε με τον ${name} στο LinkedIn για επαγγελματική δικτύωση και συνεργασίες.`
    );
  },
});

addIntent({
  id: 'contact',
  labels: ['Contact'],
  keywords: ['contact', 'reach', 'email', 'phone', 'call', 'message', 'get in touch', 'how to', 'hire', 'available', 'επικοινωνία', 'τηλέφωνο', 'email', 'στοιχεία'],
  patterns: [/how\s+(can\s+i|to)\s+(contact|reach|get)/i, /^(email|phone|contact)/i],
  priority: 4,
  response: (profile) => {
    const c = profile.contact;
    const gh = profile.social.github.url;
    const li = profile.social.linkedin.url;
    const wa = profile.social.whatsapp.url;
    return __tr(
      `**Contact Information**\n\n📧 **Email**: [${c.email}](mailto:${c.email})\n📞 **Phone**: ${c.phone}\n📍 **Location**: ${c.location}\n\n💬 ${c.availability}\n\n**Social:**\n▸ [GitHub](${gh})\n▸ [LinkedIn](${li})\n▸ [WhatsApp](${wa})`,
      `**Στοιχεία Επικοινωνίας**\n\n📧 **Email**: [${c.email}](mailto:${c.email})\n📞 **Τηλέφωνο**: ${c.phone}\n📍 **Τοποθεσία**: ${c.location}\n\n💬 ${c.availability}\n\n**Social:**\n▸ [GitHub](${gh})\n▸ [LinkedIn](${li})\n▸ [WhatsApp](${wa})`
    );
  },
});

addIntent({
  id: 'interests',
  labels: ['Interests'],
  keywords: ['interests', 'hobbies', 'passionate', 'free time', 'fun', 'like to', 'enjoy', 'ενδιαφέροντα', 'χόμπι', 'ελεύθερος χρόνος'],
  patterns: [/what\s+(are\s+)?(your\s+)?(interests|hobbies)/i, /what\s+(do\s+)?(you\s+)?(do\s+)?(for\s+)?fun/i],
  priority: 3,
  response: (profile) => {
    const interests = profile.interests || [];
    const body = interests.map(i => `▸ ${i}`).join('\n');
    return __tr(
      `**Interests & Hobbies**\n\n${body}`,
      `**Ενδιαφέροντα & Χόμπι**\n\n${body}`
    );
  },
});

addIntent({
  id: 'help',
  labels: ['Help'],
  keywords: ['help', 'what can you do', 'commands', 'options', 'menu', 'capabilities', 'can you', 'what do you', 'βοήθεια', 'τι μπορείς', 'βοήθ', 'επιλογές'],
  patterns: [/^(help|menu|options|commands)/i, /what\s+(can|do)\s+(you|i)\s+(do|ask)/i],
  priority: 1,
  response: () => {
    const suggestions = CONFIG.SUGGESTIONS.map(s => `▸ *"${s}"*`).join('\n');
    return __tr(
      `**I can help you learn about the portfolio!** Try asking:\n\n${suggestions}\n\nOr ask about specific projects (e.g., "Tell me about RePaw"), skills (e.g., "What frontend frameworks?"), freelance work, teaching, pricing, or games!`,
      `**Μπορώ να σε βοηθήσω να μάθεις για το portfolio!** Δοκίμασε να ρωτήσεις:\n\n${suggestions}\n\nΉ ρώτα για συγκεκριμένα projects (π.χ. "Πες μου για το RePaw"), δεξιότητες, freelance εργασία, διδασκαλία, τιμές ή παιχνίδια!`
    );
  },
});

addIntent({
  id: 'thanks',
  labels: [],
  keywords: ['thanks', 'thank', 'thx', 'ty', 'appreciate', 'cool', 'nice', 'awesome', 'great', 'ευχαριστώ', 'σε ευχαριστώ'],
  patterns: [],
  priority: 1,
  response: () => {
    if (window.__CHAT_LANG_IDX === 1) {
      const greekReplies = ["Παρακαλώ! 😊 Ρώτα με ό,τι άλλο θες!", "Χαρά μου! 🙌 Πες μου αν θες κι άλλες πληροφορίες.", "Όποτε θες! 😄 Θέλεις να εξερευνήσεις κι άλλο το portfolio;", "Χάρηκα που βοήθησα! 🚀"];
      return greekReplies[Math.floor(Math.random() * greekReplies.length)];
    }
    const enReplies = ["You're welcome! 😊 Feel free to ask anything else!", "Happy to help! 🙌 Let me know if you need more info.", "Anytime! 😄 Want to explore more about the portfolio?", "Glad I could help! 🚀"];
    return enReplies[Math.floor(Math.random() * enReplies.length)];
  },
});

addIntent({
  id: 'bye',
  labels: [],
  keywords: ['bye', 'goodbye', 'see you', 'later', 'cya', 'farewell', 'take care', 'peace', 'αντίο', 'γεια', 'τα λέμε'],
  patterns: [],
  priority: 1,
  response: () => {
    return __tr(
      "Goodbye! Thanks for visiting the portfolio. Feel free to come back anytime! 👋",
      "Αντίο! Ευχαριστώ για την επίσκεψη στο portfolio. Μπορείς να επιστρέψεις όποτε θες! 👋"
    );
  },
});

addIntent({
  id: 'freelance',
  labels: ['Freelance'],
  keywords: ['freelance', 'freelancer', 'independent', 'client', 'contract', 'gig', 'side project', 'consulting', 'carebeat', 'drakosdesign', 'islandbookings', 'mariakostoula', 'laralibre', 'enosi', 'ελεύθερος επαγγελματίας', 'freelance projects', 'συνεργάτες'],
  patterns: [/freelance/i, /what\s+(freelance|client|contract)\s+(work|projects)/i],
  priority: 4,
  response: (profile) => {
    const fl = profile.freelance || [];
    const body = fl.map(p => `▸ **[${p.project}]** — ${p.period}\n  ${p.description.split('.')[0]}.\n  _${p.tech.join(', ')}_`).join('\n\n');
    const footer = __tr('\n\nWant pricing details? Ask about "Pricing"!', '\n\nΘέλεις λεπτομέρειες τιμολόγησης; Ρώτα "Pricing"!');
    return __tr(
      `**Freelance Projects** (${fl.length} total):\n\n${body}${footer}`,
      `**Freelance Projects** (σύνολο ${fl.length}):\n\n${body}${footer}`
    );
  },
});

addIntent({
  id: 'teaching',
  labels: ['Teaching'],
  keywords: ['teaching', 'tutoring', 'tutor', 'teacher', 'instructor', 'lesson', 'course', 'class', 'student', 'educate', 'algorithmics', 'ecdl', 'workshop', 'διδασκαλία', 'μάθημα', 'φροντιστήριο', 'δάσκαλος', 'μαθητής', 'μαθήματα'],
  patterns: [/teaching|tutoring/i, /what\s+(do\s+)?(you\s+)?teach/i, /can\s+(you\s+)?teach/i],
  priority: 4,
  response: (profile) => {
    const teach = profile.teaching || [];
    const body = teach.map(t => `▸ **${t.role}**${t.location ? ` @ ${t.location}` : ''}${t.period ? ` (${t.period})` : ''}\n  ${t.description}\n  _${__tr('Subjects', 'Μαθήματα')}: ${t.subjects.join(', ')}_`).join('\n\n');
    const footer = __tr('\n\n💡 Ask about "Pricing" for tutoring rates!', '\n\n💡 Ρώτα "Pricing" για τιμές μαθημάτων!');
    return __tr(
      `**Teaching & Tutoring Experience**\n\n${body}${footer}`,
      `**Διδασκαλία & Φροντιστήριο**\n\n${body}${footer}`
    );
  },
});

addIntent({
  id: 'pricing',
  labels: ['Pricing'],
  keywords: ['pricing', 'price', 'cost', 'rate', 'fee', 'how much', 'charge', 'budget', '€', 'eur', 'euro', 'dollar', 'hire', 'services', 'offer', 'τιμές', 'τιμολόγηση', 'κόστος', 'πόσο', 'χρεώνεις', 'πακέτα'],
  patterns: [/how\s+much\s+(do\s+)?(you\s+)?(charge|cost)/i, /what\s+(are\s+)?(your\s+)?(rates|prices)/i, /^(pricing|rates|cost)/i],
  priority: 4,
  response: (profile) => {
    const svc = profile.pricing.services || [];
    const body = svc.map(s => {
      const basic = s.tiers.find(t => t.name === 'Basic');
      return `▸ **${s.category}** — ${__tr('from', 'από')} €${basic ? basic.priceEUR : 'varies'}`;
    }).join('\n');
    return __tr(
      `**Service Pricing** (EUR — starting prices):\n\n${body}\n\n**Tutoring** (per 1-1.5h session):\n▸ Coding & Programming: €20 remote / €25 in-person\n▸ MS Office, Windows/Linux: €10 remote / €15 in-person\n▸ Video, Image, Sound Editing: €15 remote / €20 in-person\n\n💡 Each service has Basic, Standard, and Premium tiers. Ask about a specific category for details!`,
      `**Τιμολόγηση Υπηρεσιών** (EUR — αρχικές τιμές):\n\n${body}\n\n**Φροντιστήριο** (ανά 1-1.5 ώρα):\n▸ Coding & Programming: €20 εξ αποστάσεως / €25 δια ζώσης\n▸ MS Office, Windows/Linux: €10 εξ αποστάσεως / €15 δια ζώσης\n▸ Video, Image, Sound Editing: €15 εξ αποστάσεως / €20 δια ζώσης\n\n💡 Κάθε υπηρεσία έχει Basic, Standard και Premium πακέτα. Ρώτα για συγκεκριμένη κατηγορία!`
    );
  },
});

addIntent({
  id: 'pricing_detail',
  labels: [],
  keywords: ['website pricing', 'landing page', 'desktop app', 'web app', 'game dev', 'game development'],
  patterns: [],
  priority: 5,
  response: (profile, ctx, raw) => {
    const lower = raw.toLowerCase();
    const svc = profile.pricing.services || [];
    let matched = null;
    if (lower.includes('website') || lower.includes('web app') || lower.includes('e-commerc') || lower.includes('online store')) {
      matched = svc.find(s => s.category === 'Websites');
    } else if (lower.includes('landing') || lower.includes('portfolio page')) {
      matched = svc.find(s => s.category === 'Landing Page / Portfolio');
    } else if (lower.includes('desktop') || lower.includes('cross-platform') || lower.includes('kivy') || lower.includes('electron')) {
      matched = svc.find(s => s.category === 'Desktop Application');
    } else if (lower.includes('web application') || lower.includes('saas') || lower.includes('dashboard')) {
      matched = svc.find(s => s.category === 'Web Application');
    } else if (lower.includes('game') || lower.includes('unity') || lower.includes('unreal')) {
      matched = svc.find(s => s.category === 'Game Development');
    }
    if (!matched) return null;
    const title = __tr(`${matched.category} — Pricing Details`, `${matched.category} — Λεπτομέρειες Τιμολόγησης`);
    let reply = `**${title}**\n\n${matched.description}\n\n`;
    for (const tier of matched.tiers) {
      reply += `▸ **${tier.name}** — **€${tier.priceEUR}** / \$${tier.priceUSD} / £${tier.priceGBP}\n`;
      for (const f of tier.features) reply += `  • ${f}\n`;
      reply += '\n';
    }
    return reply.trim();
  },
});

addIntent({
  id: 'games',
  labels: ['Games'],
  keywords: ['games', 'minigames', 'mini games', 'game dev', 'snake', 'flappy', 'tetris', 'breakout', 'quiz', 'match', 'base ops', 'bug breaker', 'bio explorer', 'play', 'game project', 'παιχνίδια', 'παιχνίδι', 'minigames'],
  patterns: [/what\s+games/i, /what\s+(minigames|mini-games)/i, /^(games|minigames)/i],
  priority: 4,
  response: (profile) => {
    const games = profile.games || [];
    const body = games.map(g => {
      const url = g.playUrl ? ` — [${__tr('Play', 'Παίξε')}](${g.playUrl})` : g.link ? ` — [GitHub](${g.link})` : '';
      return `▸ **${g.title}**${url}\n  ${g.description.split('.')[0]}.\n  _${g.tech.join(', ')}_`;
    }).join('\n\n');
    const minigamesCount = games.filter(g => g.playUrl).length;
    const standaloneCount = games.length - minigamesCount;
    return __tr(
      `**🎮 Game Projects** (${games.length} total — ${minigamesCount} minigames + ${standaloneCount} standalone games)\n\n${body}\n\nAll minigames are playable from the Bio Explorer 2D overworld or directly via URL.`,
      `**🎮 Game Projects** (σύνολο ${games.length} — ${minigamesCount} minigames + ${standaloneCount} standalone games)\n\n${body}\n\nΌλα τα minigames παίζονται από τον Bio Explorer 2D overworld ή απευθείας από URL.`
    );
  },
});

// ============================================================
// FUZZY MATCHER (Levenshtein-based ratio)
// ============================================================
class FuzzyMatcher {
  /**
   * Compute Levenshtein distance between two strings.
   */
  static levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  /**
   * Return similarity ratio 0-1 between two strings.
   */
  static ratio(a, b) {
    if (!a || !b) return 0;
    const dist = FuzzyMatcher.levenshtein(a.toLowerCase(), b.toLowerCase());
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1 : 1 - dist / maxLen;
  }

  /**
   * Check if the query contains a fuzzy match for any keyword.
   * Returns best ratio found (0-1).
   */
  static matchKeywords(query, keywords) {
    const words = query.toLowerCase().split(/\s+/);
    let best = 0;
    for (const kw of keywords) {
      const kwWords = kw.split(/\s+/);
      for (const w of words) {
        const r = FuzzyMatcher.ratio(w, kwWords[0]);
        if (r > best) best = r;
      }
      // Multi-word keyword as phrase
      if (kwWords.length > 1) {
        const r = FuzzyMatcher.ratio(query.toLowerCase(), kw);
        if (r > best) best = r;
      }
    }
    return best;
  }
}

// ============================================================
// INTENT CLASSIFIER
// Analyzes user input to determine the best intent match.
// ============================================================
class IntentClassifier {
  /**
   * Classify a user message against all registered intents.
   * @param {string} message - raw user input
   * @param {ContextManager} ctx
   * @returns {{ intent: Object|null, confidence: number, scores: Object }}
   */
  classify(message, ctx) {
    let effectiveMsg = message;
    let isSuggestion = false;
    if (message.startsWith('__suggestion__:')) {
      effectiveMsg = message.replace('__suggestion__:', '').trim();
      isSuggestion = true;
    }
    const lower = effectiveMsg.toLowerCase().trim();
    if (!lower) return { intent: null, confidence: 0, scores: {} };

    const results = [];
    const contextHistory = ctx.getHistory();

    for (const intent of INTENTS) {
      let keywordScore = 0;
      let patternScore = 0;
      let contextScore = 0;

      // Keyword matching (exact + fuzzy)
      if (intent.keywords.length > 0) {
        let exactHits = 0;
        for (const kw of intent.keywords) {
          if (lower.includes(kw)) {
            exactHits++;
          }
        }
        keywordScore = Math.min(1, exactHits / Math.max(1, intent.keywords.length) * 2.5);
        // Fuzzy boost for partial matches
        const fuzzyBest = FuzzyMatcher.matchKeywords(lower, intent.keywords);
        keywordScore = Math.max(keywordScore, fuzzyBest * 0.7);
      }

      // Pattern matching (use effectiveMsg for suggestions, raw lower otherwise)
      if (intent.patterns.length > 0) {
        for (const pat of intent.patterns) {
          if (pat.test(lower)) {
            patternScore = 0.9;
            break;
          }
        }
      }

      // Context score: if last bot response mentioned this topic
      if (contextHistory.length > 0) {
        const lastBotMsg = [...contextHistory].reverse().find(m => m.role === 'bot');
        if (lastBotMsg) {
          const botText = lastBotMsg.content.toLowerCase();
          for (const kw of intent.keywords) {
            if (botText.includes(kw)) {
              contextScore += 0.1;
            }
          }
          // Suggestion click matching
          if (isSuggestion) {
            if (intent.labels.some(l => l.toLowerCase() === lower)) {
              keywordScore = 1;
              patternScore = 1;
            }
          }
        }
      }
      contextScore = Math.min(1, contextScore);

      // Combined score
      const combined = keywordScore * 0.5 + patternScore * 0.3 + contextScore * 0.2;
      const priorityBoost = intent.priority * 0.04;
      const finalScore = Math.min(1, combined + priorityBoost);

      if (finalScore > 0.05) {
        results.push({
          intent,
          confidence: finalScore,
          scores: { keyword: keywordScore, pattern: patternScore, context: contextScore },
        });
      }
    }

    // Sort by confidence descending, then priority
    results.sort((a, b) => {
      const diff = b.confidence - a.confidence;
      if (Math.abs(diff) > 0.01) return diff;
      return b.intent.priority - a.intent.priority;
    });

    if (results.length === 0) {
      return { intent: null, confidence: 0, scores: {} };
    }

    return results[0];
  }
}

// ============================================================
// CONTEXT MANAGER
// Maintains conversation history in memory + localStorage.
// ============================================================
class ContextManager {
  constructor() {
    this.history = [];
    this.load();
  }

  /**
   * Add a message to the history.
   * @param {'user'|'bot'} role
   * @param {string} content
   */
  addMessage(role, content) {
    this.history.push({
      role,
      content,
      timestamp: Date.now(),
    });
    if (this.history.length > CONFIG.MAX_HISTORY) {
      this.history = this.history.slice(-CONFIG.MAX_HISTORY);
    }
    this.save();
  }

  /** Return the full history array. */
  getHistory() {
    return this.history;
  }

  /** Clear all history. */
  clear() {
    this.history = [];
    this.save();
  }

  /** Persist to localStorage. */
  save() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.history));
    } catch (e) {
      // localStorage unavailable or full — fail silently
    }
  }

  /** Load from localStorage. */
  load() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.history = parsed;
        }
      }
    } catch (e) {
      // Corrupt data — reset
      this.history = [];
    }
  }
}

// ============================================================
// RESPONSE GENERATOR
// Produces the final answer string from the matched intent.
// ============================================================
class ResponseGenerator {
  /**
   * Generate a response for the given intent.
   * @param {Object} intent - matched intent
   * @param {Object} profile - loaded profile data
   * @param {ContextManager} ctx
   * @param {string} rawMessage - original user message
   * @returns {string|null} response text, or null if intent declined
   */
  generate(intent, profile, ctx, rawMessage) {
    try {
      const result = intent.response(profile, ctx, rawMessage);
      return result || null;
    } catch (err) {
      console.warn('[Chat] Response generation error:', err);
      return null;
    }
  }
}

// ============================================================
// SUGGESTION ENGINE
// Decides which suggestion buttons to show.
// ============================================================
class SuggestionEngine {
  /**
   * Get suggestions based on current context.
   * @param {ContextManager} ctx
   * @returns {string[]}
   */
  getSuggestions(ctx) {
    const history = ctx.getHistory();
    // If conversation is fresh, show general suggestions
    if (history.length <= 2) {
      return CONFIG.SUGGESTIONS;
    }
    // If user just asked about something, suggest related topics
    const lastBotMsg = [...history].reverse().find(m => m.role === 'bot');
    const lastUserMsg = [...history].reverse().find(m => m.role === 'user');

    if (lastBotMsg && lastUserMsg) {
      const botText = lastBotMsg.content.toLowerCase();
      const userText = lastUserMsg.content.toLowerCase();

      // Suggest projects after experience/education discussion
      if (botText.includes('experience') || botText.includes('education')) {
        return ['Projects', 'Skills', 'Contact'];
      }
      // Suggest related after project discussion
      if (botText.includes('project') || userText.includes('project')) {
        return ['Experience', 'GitHub', 'Skills'];
      }
      // Suggest contact after skills
      if (botText.includes('skill') || userText.includes('skill')) {
        return ['Projects', 'Experience', 'Contact'];
      }
      // Suggest pricing/games after freelance
      if (botText.includes('freelance') || userText.includes('freelance')) {
        return ['Pricing', 'Skills', 'Contact'];
      }
      // Suggest games/teaching after games query
      if (botText.includes('game') || userText.includes('minigame')) {
        return ['Bio Explorer 2D', 'Bio Explorer 3D', 'Skills'];
      }
      // Suggest related after pricing
      if (botText.includes('pricing') || userText.includes('price') || userText.includes('cost')) {
        return ['Websites', 'Game Development', 'Teaching'];
      }
    }

    // Default: show top suggestions
    return CONFIG.SUGGESTIONS.slice(0, 5);
  }
}

// ============================================================
// UI CONTROLLER
// Manages the chat widget DOM, animations, and user interaction.
// ============================================================
class ChatUI {
  constructor() {
    this.widget = null;
    this.isOpen = false;
    this.isLoading = false;
    this.unreadCount = 0;
    this.messageCallbacks = [];
  }

  /** Inject the chat widget DOM into the page. */
  createWidget() {
    if (this.widget) return;

    // Build the widget container
    const wrapper = document.createElement('div');
    wrapper.id = 'chatbot-widget';
    wrapper.innerHTML = `
      <button class="chat-toggle" id="chat-toggle" aria-label="Open chat">
        <span class="chat-toggle-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </span>
        <span class="chat-toggle-badge" id="chat-badge">0</span>
      </button>

      <div class="chat-window" id="chat-window">
        <div class="chat-header">
          <div class="chat-header-info">
            <div class="chat-header-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            </div>
            <div class="chat-header-text">
              <h3>Portfolio Bot</h3>
              <span>Online</span>
            </div>
          </div>
          <div class="chat-header-actions">
            <button class="chat-header-btn" id="chat-theme-toggle" aria-label="Toggle theme" title="Toggle theme">
              <span class="icon-moon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              </span>
              <span class="icon-sun">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              </span>
            </button>
            <button class="chat-header-btn" id="chat-clear-btn" aria-label="Clear chat" title="Clear chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
            <button class="chat-header-btn" id="chat-close-btn" aria-label="Close chat" title="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="chat-messages" id="chat-messages"></div>

        <div class="chat-suggestions" id="chat-suggestions"></div>

        <div class="chat-input-area">
          <div class="chat-input-row">
            <textarea class="chat-input" id="chat-input" rows="1" placeholder="Ask me anything..." aria-label="Chat message input"></textarea>
            <button class="chat-send-btn" id="chat-send-btn" aria-label="Send message">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);
    this.widget = wrapper;

    // Cache DOM refs
    this.toggle = wrapper.querySelector('#chat-toggle');
    this.window = wrapper.querySelector('#chat-window');
    this.messages = wrapper.querySelector('#chat-messages');
    this.suggestionsEl = wrapper.querySelector('#chat-suggestions');
    this.input = wrapper.querySelector('#chat-input');
    this.sendBtn = wrapper.querySelector('#chat-send-btn');
    this.badge = wrapper.querySelector('#chat-badge');
    this.themeBtn = wrapper.querySelector('#chat-theme-toggle');
    this.clearBtn = wrapper.querySelector('#chat-clear-btn');
    this.closeBtn = wrapper.querySelector('#chat-close-btn');

    // Bind events
    this.bindEvents();
  }

  /** Bind DOM events. */
  bindEvents() {
    // Toggle open/close
    this.toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleOpen();
    });

    // Send on button click
    this.sendBtn.addEventListener('click', () => this.send());

    // Send on Enter (Shift+Enter for newline)
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });

    // Auto-resize textarea
    this.input.addEventListener('input', () => {
      this.input.style.height = 'auto';
      this.input.style.height = Math.min(this.input.scrollHeight, 100) + 'px';
    });

    // Close button
    this.closeBtn.addEventListener('click', () => this.close());

    // Clear button
    this.clearBtn.addEventListener('click', () => {
      if (this.onClear) this.onClear();
    });

    // Theme toggle
    this.themeBtn.addEventListener('click', () => this.toggleTheme());

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.widget.contains(e.target)) {
        this.close();
      }
    });
  }

  /** Open the chat window. */
  open() {
    this.isOpen = true;
    this.toggle.classList.add('open');
    this.window.classList.add('open');
    this.badge.classList.remove('visible');
    this.unreadCount = 0;
    this.input.focus();
    if (this.onOpen) this.onOpen();
  }

  /** Close the chat window. */
  close() {
    this.isOpen = false;
    this.toggle.classList.remove('open');
    this.window.classList.remove('open');
  }

  /** Toggle open/close. */
  toggleOpen() {
    this.isOpen ? this.close() : this.open();
  }

  /** Increment unread badge (only when closed). */
  incrementUnread() {
    if (this.isOpen) return;
    this.unreadCount++;
    this.badge.textContent = this.unreadCount;
    this.badge.classList.add('visible');
  }

  /** Send the current input text. */
  send() {
    const text = this.input.value.trim();
    if (!text || this.isLoading) return;
    this.input.value = '';
    this.input.style.height = 'auto';
    if (this.onMessage) this.onMessage(text);
  }

  /** Add a user message bubble. */
  addUserMessage(text) {
    this.addMessage(text, 'user');
  }

  /** Add a bot message bubble (with optional typing simulation). */
  addBotMessage(text, simulateTyping = true) {
    if (simulateTyping) {
      this.showTyping();
      const delay = Math.min(300 + text.length * 3, CONFIG.TYPING_SPEED_MS);
      setTimeout(() => {
        this.hideTyping();
        this.addMessage(text, 'bot');
        this.incrementUnread();
      }, delay);
    } else {
      this.addMessage(text, 'bot');
    }
  }

  /** Add a raw message bubble. */
  addMessage(text, role) {
    // Remove typing indicator if present
    this.hideTyping();

    // Render with basic markdown
    const html = this.renderMarkdown(text);

    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'chat-msg-avatar';
    avatar.innerHTML = role === 'bot'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';

    const content = document.createElement('div');
    content.className = 'chat-msg-content';
    content.innerHTML = html;

    const time = document.createElement('span');
    time.className = 'chat-msg-time';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    content.appendChild(time);
    div.appendChild(avatar);
    div.appendChild(content);
    this.messages.appendChild(div);

    // Auto-scroll
    this.scrollToBottom();
  }

  /** Show the typing indicator. */
  showTyping() {
    this.hideTyping();
    const div = document.createElement('div');
    div.className = 'chat-typing';
    div.id = 'chat-typing-indicator';
    div.innerHTML = `
      <div class="chat-typing-dots">
        <span></span><span></span><span></span>
      </div>
    `;
    this.messages.appendChild(div);
    this.scrollToBottom();
    this.isLoading = true;
  }

  /** Hide the typing indicator. */
  hideTyping() {
    const el = this.messages.querySelector('#chat-typing-indicator');
    if (el) el.remove();
    this.isLoading = false;
  }

  /** Show suggestion buttons. */
  showSuggestions(labels) {
    this.suggestionsEl.innerHTML = '';
    for (const label of labels) {
      const btn = document.createElement('button');
      btn.className = 'chat-suggestion-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        if (this.onSuggestion) this.onSuggestion(label);
      });
      this.suggestionsEl.appendChild(btn);
    }
  }

  /** Clear suggestion buttons. */
  clearSuggestions() {
    this.suggestionsEl.innerHTML = '';
  }

  /** Scroll messages to the bottom. */
  scrollToBottom() {
    requestAnimationFrame(() => {
      this.messages.scrollTop = this.messages.scrollHeight;
    });
  }

  /** Toggle between dark and light themes. */
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-chat-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-chat-theme', next);
    try {
      localStorage.setItem('chat_theme', next);
    } catch (e) { /* ignore */ }
  }

  /** Load saved theme. */
  loadTheme() {
    try {
      const saved = localStorage.getItem('chat_theme');
      if (saved) {
        document.documentElement.setAttribute('data-chat-theme', saved);
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * Simple markdown renderer.
   * Supports: **bold**, *italic*, `code`, [links](url), and \n newlines.
   */
  renderMarkdown(text) {
    if (!text) return '';
    let html = this.escapeHtml(text);
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Code inline
    html = html.replace(/`(.+?)`/g, '<code style="background:rgba(124,58,237,0.1);padding:1px 5px;border-radius:3px;font-size:0.9em;">$1</code>');
    // Links
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // Bullet lines
    html = html.replace(/^▸ /gm, '• ');
    // Newlines to <br>
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /** Clear all messages from the UI. */
  clearMessages() {
    this.messages.innerHTML = '';
    this.clearSuggestions();
  }
}

// ============================================================
// PROFILE LOADER
// Fetches and caches the profile.json data.
// ============================================================
class ProfileLoader {
  constructor() {
    this.cached = null;
  }

  /**
   * Load profile data from the JSON file.
   * @returns {Promise<Object>}
   */
  async load() {
    if (this.cached) return this.cached;
    try {
      const res = await fetch(CONFIG.PROFILE_PATH);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.cached = await res.json();
      return this.cached;
    } catch (err) {
      console.error('[Chat] Failed to load profile:', err);
      // Return a minimal fallback profile
      this.cached = {
        meta: { name: 'Portfolio Owner', title: 'Developer', email: '', location: '' },
        bio: { summary: 'Profile data could not be loaded. Please check the console for details.' },
        skills: {},
        projects: [],
        experience: [],
        education: [],
        social: {},
        interests: [],
      };
      return this.cached;
    }
  }
}

// ============================================================
// MAIN CHATBOT CONTROLLER
// Orchestrates all subsystems.
// ============================================================
class PortfolioChatbot {
  constructor() {
    this.profile = null;
    this.classifier = new IntentClassifier();
    this.context = new ContextManager();
    this.responseGen = new ResponseGenerator();
    this.suggestionEngine = new SuggestionEngine();
    this.profileLoader = new ProfileLoader();
    this.ui = new ChatUI();
    this.initialized = false;
  }

  /** Initialize the chatbot: load profile, create UI, wire events. */
  async init() {
    if (this.initialized) return;

    // Load profile data
    this.profile = await this.profileLoader.load();

    // Create the widget
    this.ui.createWidget();
    this.ui.loadTheme();

    // Wire UI callbacks
    this.ui.onMessage = (text) => this.handleUserMessage(text);
    this.ui.onSuggestion = (label) => {
      this.ui.addUserMessage(label);
      this.handleUserMessage(`__suggestion__:${label}`);
    };
    this.ui.onClear = () => {
      this.context.clear();
      this.ui.clearMessages();
      this.ui.clearSuggestions();
      this.showWelcome();
    };
    this.ui.onOpen = () => {
      if (this.context.getHistory().length === 0) {
        this.showWelcome();
      }
    };

    // Load conversation history into UI
    this.restoreHistory();

    this.initialized = true;
    console.log('[Chat] Portfolio Chatbot initialized');
  }

  /** Show the welcome message (first visit). */
  showWelcome() {
    const profile = this.profile;
    const name = profile.meta.name.split(' ')[0];
    const welcome = `Hello! 👋 I'm the ${CONFIG.BOT_NAME}. Ask me anything about **${name}** — their skills, projects, experience, education, or contact info.`;
    this.context.addMessage('bot', welcome);
    this.ui.addBotMessage(welcome, false);
    this.ui.showSuggestions(CONFIG.SUGGESTIONS);
    this.ui.incrementUnread();
  }

  /** Restore previous conversation from history. */
  restoreHistory() {
    const history = this.context.getHistory();
    if (history.length === 0) return;

    this.ui.clearMessages();
    for (const msg of history) {
      if (msg.role === 'user') {
        this.ui.addMessage(msg.content, 'user');
      } else {
        this.ui.addMessage(msg.content, 'bot');
      }
    }
    // Show suggestions based on last context
    const suggestions = this.suggestionEngine.getSuggestions(this.context);
    this.ui.showSuggestions(suggestions);
  }

  /**
   * Handle a user message.
   * @param {string} message
   */
  handleUserMessage(message) {
    // Don't store the internal suggestion prefix
    const displayMessage = message.startsWith('__suggestion__:')
      ? message.split(':').slice(1).join(':').trim()
      : message;

    // Store user message in context
    this.context.addMessage('user', displayMessage);

    // Show typing indicator
    this.ui.showTyping();

    // Process after short delay (natural feel)
    setTimeout(() => {
      // Classify the intent
      const { intent, confidence } = this.classifier.classify(message, this.context);

      let response = null;

      if (intent && confidence >= CONFIG.CONFIDENCE_THRESHOLD) {
        // Generate response from matched intent
        response = this.responseGen.generate(intent, this.profile, this.context, displayMessage);
      }

      if (response) {
        // Store bot response in context
        this.context.addMessage('bot', response);

        // Display response
        this.ui.hideTyping();
        this.ui.addBotMessage(response, false);
        this.ui.incrementUnread();

        // Show relevant suggestions
        const suggestions = this.suggestionEngine.getSuggestions(this.context);
        this.ui.clearSuggestions();
        this.ui.showSuggestions(suggestions);
      } else {
        // Low confidence — show fallback with suggestions
        this.handleLowConfidence(displayMessage);
      }
    }, 400 + Math.random() * 300);
  }

  /**
   * Handle low-confidence queries with fallback + suggestions.
   * @param {string} message
   */
  handleLowConfidence(message) {
    const fallbacks = [
      "Hmm, I'm not sure I understand. Could you try rephrasing? Here are some things you can ask about:",
      "I don't have information about that in the portfolio. Here's what I *can* help with:",
      "That's outside my knowledge base. Try one of these topics:",
      "I'm not confident about that one. Maybe try asking something like:",
    ];

    const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    this.context.addMessage('bot', fallback);

    this.ui.hideTyping();
    this.ui.addBotMessage(fallback, false);
    this.ui.showSuggestions(CONFIG.SUGGESTIONS);
    this.ui.incrementUnread();
  }
}

// ============================================================
// BOOTSTRAP
// Auto-initialize when the DOM is ready.
// ============================================================
(function bootstrap() {
  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const bot = new PortfolioChatbot();
      bot.init();
    });
  } else {
    const bot = new PortfolioChatbot();
    bot.init();
  }
})();
