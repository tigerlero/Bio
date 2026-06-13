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

/**
 * Translate helper: returns text matching current site language.
 * Supports all 9 languages: en, el, it, tr, ro, sq, bg, es, fr.
 * Falls back to English for any missing slot.
 */
function __tr(en, el, it, tr, ro, sq, bg, es, fr) {
  const idx = window.__CHAT_LANG_IDX || 0;
  const texts = [en, el, it, tr, ro, sq, bg, es, fr];
  return texts[idx] != null ? texts[idx] : (texts[0] || '');
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
  keywords: ['hi', 'hello', 'hey', 'sup', 'yo', 'greetings', 'good morning', 'good evening', 'good afternoon', 'howdy', 'καλημέρα', 'καλησπέρα', 'γεια σου', 'γεια', 'χαίρετε', 'γεια χαρά'],
  patterns: [/^(hi|hello|hey|howdy)(\s|$)/i, /^greetings/i, /^(γεια|καλημέρα|καλησπέρα|χαίρετε)/i],
  priority: 2,
  response: (profile, ctx) => {
    const name = profile.meta.name.split(' ')[0];
    const hour = new Date().getHours();
    const idx = window.__CHAT_LANG_IDX || 0;
    const morning = ['Good morning', 'Καλημέρα', 'Buongiorno', 'Günaydın', 'Bună dimineața', 'Mirëmëngjes', 'Добро утро', 'Buenos días', 'Bonjour'];
    const afternoon = ['Good afternoon', 'Καλησπέρα', 'Buon pomeriggio', 'Tünaydın', 'Bună după-amiaza', 'Mirëdita', 'Добър ден', 'Buenas tardes', 'Bon après-midi'];
    const evening = ['Good evening', 'Καλησπέρα', 'Buonasera', 'İyi akşamlar', 'Bună seara', 'Mirëmbrëma', 'Добър вечер', 'Buenas noches', 'Bonsoir'];
    const tg = hour < 12 ? morning : hour < 18 ? afternoon : evening;
    const timeGreeting = tg[idx] || tg[0];
    const visited = ctx.getHistory().length > 2;
    if (visited) {
      return __tr(
        `${timeGreeting}! Welcome back! I'm still here to help you learn more about ${name}. What would you like to know? ☕`,
        `${timeGreeting}! Καλώς ήρθες ξανά! Είμαι εδώ για να σε βοηθήσω να μάθεις περισσότερα για τον ${name}. Τι θα ήθελες να μάθεις; ☕`,
        `${timeGreeting}! Bentornato! Sono ancora qui per aiutarti a saperne di più su ${name}. Cosa vorresti sapere? ☕`,
        `${timeGreeting}! Tekrar hoş geldin! ${name} hakkında daha fazla bilgi edinmene yardımcı olmak için hâlâ buradayım. Ne öğrenmek istersin? ☕`,
        `${timeGreeting}! Bun venit înapoi! Sunt încă aici să te ajut să afli mai multe despre ${name}. Ce ai vrea să știi? ☕`,
        `${timeGreeting}! Mirë se vini përsëri! Ende jam këtu për t'ju ndihmuar të mësoni më shumë rreth ${name}. Çfarë dëshironi të dini? ☕`,
        `${timeGreeting}! Добре дошли отново! Все още съм тук, за да ви помогна да научите повече за ${name}. Какво бихте искали да знаете? ☕`,
        `${timeGreeting}! ¡Bienvenido de nuevo! Sigo aquí para ayudarte a conocer más sobre ${name}. ¿Qué te gustaría saber? ☕`,
        `${timeGreeting}! Bon retour! Je suis toujours là pour vous en dire plus sur ${name}. Que souhaitez-vous savoir? ☕`
      );
    }
    return __tr(
      `${timeGreeting}! I'm the ${CONFIG.BOT_NAME}. Ask me anything about ${name}'s skills, projects, experience, or education!`,
      `${timeGreeting}! Είμαι το ${CONFIG.BOT_NAME}. Ρώτα με ό,τι θες για τις δεξιότητες, τα projects, την εμπειρία ή την εκπαίδευση του ${name}!`,
      `${timeGreeting}! Sono ${CONFIG.BOT_NAME}. Chiedimi tutto su competenze, progetti, esperienza o formazione di ${name}!`,
      `${timeGreeting}! Ben ${CONFIG.BOT_NAME}. ${name}'in becerileri, projeleri, deneyimi veya eğitimi hakkında bana her şeyi sor!`,
      `${timeGreeting}! Sunt ${CONFIG.BOT_NAME}. Întreabă-mă orice despre abilitățile, proiectele, experiența sau educația lui ${name}!`,
      `${timeGreeting}! Jam ${CONFIG.BOT_NAME}. Më pyet çfarëdo për aftësitë, projektet, përvojën ose arsimin e ${name}!`,
      `${timeGreeting}! Аз съм ${CONFIG.BOT_NAME}. Питайте ме за уменията, проектите, опита или образованието на ${name}!`,
      `${timeGreeting}! Soy ${CONFIG.BOT_NAME}. ¡Pregúntame cualquier cosa sobre las habilidades, proyectos, experiencia o educación de ${name}!`,
      `${timeGreeting}! Je suis ${CONFIG.BOT_NAME}. Demandez-moi tout sur les compétences, projets, expérience ou formation de ${name}!`
    );
  },
});

addIntent({
  id: 'about_me',
  labels: ['About Me'],
  keywords: ['about', 'who', 'yourself', 'tell', 'bio', 'introduction', 'introduce', 'background', 'summary', 'about you', 'who are you', 'tell me about', 'describe yourself', 'overview', 'profile', 'ποιος', 'σχετικά', 'βιογραφικό', 'ποιος είσαι', 'πες μου', 'παρουσίαση', 'αυτοβιογραφία', 'περίγραψε'],
  patterns: [/^(who|what)\s+(is|are)\s+(you|this)/i, /tell\s+(me\s+)?about/i, /^(about|introduce|describe)\s/i],
  priority: 5,
  response: (profile) => {
    const name = profile.meta.name;
    return __tr(
      `**${name}**\n\n${profile.bio.summary}\n\n📍 ${profile.meta.location}\n💼 ${profile.meta.title}\n📧 ${profile.meta.email}`,
      `**${name}**\n\nΟ ${name.split(' ')[0]} είναι επιστήμονας υπολογιστών και fullstack μηχανικός από την Ελλάδα. Έχει B.Sc. στην Πληροφορική από το Πανεπιστήμιο Πειραιώς και έχει εργαστεί σε startups, εταιρείες και enterprise projects. Διδάσκει προγραμματισμό σε παιδιά στην Algorithmics.\n\n📍 ${profile.meta.location}\n💼 ${profile.meta.title}\n📧 ${profile.meta.email}`,
      `**${name}**\n\n${name.split(' ')[0]} è un informatico e ingegnere fullstack dalla Grecia. Ha una laurea in Informatica all'Università del Pireo e ha lavorato in startup, aziende e progetti enterprise. Insegna programmazione ai bambini presso Algorithmics.\n\n📍 ${profile.meta.location}\n💼 ${profile.meta.title}\n📧 ${profile.meta.email}`,
      `**${name}**\n\n${name.split(' ')[0]} Yunanistan'dan bir bilgisayar bilimci ve fullstack mühendisidir. Pire Üniversitesi'nde Bilgisayar Bilimi lisansı yapmış, startup'larda, şirketlerde ve kurumsal projelerde çalışmıştır. Algorithmics'te çocuklara programlama öğretmektedir.\n\n📍 ${profile.meta.location}\n💼 ${profile.meta.title}\n📧 ${profile.meta.email}`,
      `**${name}**\n\n${name.split(' ')[0]} este un informatician și inginer fullstack din Grecia. Are o licență în Informatică la Universitatea din Pireu și a lucrat în startup-uri, companii și proiecte enterprise. Predă programare copiilor la Algorithmics.\n\n📍 ${profile.meta.location}\n💼 ${profile.meta.title}\n📧 ${profile.meta.email}`,
      `**${name}**\n\n${name.split(' ')[0]} është një shkencëtar kompjuteri dhe inxhinier fullstack nga Greqia. Ka B.Sc. në Shkenca Kompjuterike në Universitetin e Pireut dhe ka punuar në startup, kompani dhe projekte enterprise. Mëson programim fëmijëve në Algorithmics.\n\n📍 ${profile.meta.location}\n💼 ${profile.meta.title}\n📧 ${profile.meta.email}`,
      `**${name}**\n\n${name.split(' ')[0]} е компютърен учен и fullstack инженер от Гърция. Има бакалавърска степен по компютърни науки от Университета на Пирея и е работил в стартъпи, компании и корпоративни проекти. Преподава програмиране на деца в Algorithmics.\n\n📍 ${profile.meta.location}\n💼 ${profile.meta.title}\n📧 ${profile.meta.email}`,
      `**${name}**\n\n${name.split(' ')[0]} es un científico de la computación e ingeniero fullstack de Grecia. Tiene una licenciatura en Informática en la Universidad del Pireo y ha trabajado en startups, empresas y proyectos empresariales. Enseña programación a niños en Algorithmics.\n\n📍 ${profile.meta.location}\n💼 ${profile.meta.title}\n📧 ${profile.meta.email}`,
      `**${name}**\n\n${name.split(' ')[0]} est un informaticien et ingénieur fullstack de Grèce. Il est titulaire d'une licence en Informatique à l'Université du Pirée et a travaillé dans des startups, des entreprises et des projets d'envergure. Il enseigne la programmation aux enfants chez Algorithmics.\n\n📍 ${profile.meta.location}\n💼 ${profile.meta.title}\n📧 ${profile.meta.email}`
    );
  },
});

addIntent({
  id: 'skills',
  labels: ['Skills'],
  keywords: ['skills', 'technologies', 'languages', 'frameworks', 'tools', 'tech stack', 'stack', 'know', 'proficient', 'expertise', 'capable', 'what can you', 'competencies', 'programming languages', 'skillset', 'tech', 'what languages', 'expert in', 'δεξιότητες', 'γλώσσες', 'τεχνολογίες', 'ξέρεις', 'τι ξέρεις', 'ικανότητες', 'γνώσεις', 'προγραμματισμός', 'ικανός', 'κατέχω'],
  patterns: [/what\s+(technologies|tools|stacks|skills|programming\s+languages)/i, /tech\s+stack/i, /what\s+(do\s+)?(you\s+)?know/i, /^(skills|technologies|tech\s+stack)/i],
  priority: 4,
  response: (profile) => {
    const cats = Object.entries(profile.skills);
    const name = profile.meta.name.split(' ')[0];
    const total = cats.reduce((s, [, items]) => s + items.length, 0);
    return __tr(
      `**Technical Skills** — ${name} is proficient across ${cats.length} categories:\n\n${cats.map(([cat, items]) => `▸ **${cat}**: ${items.join(', ')}`).join('\n')}\n\nThat's ${total}+ individual skills!`,
      `**Τεχνικές Δεξιότητες** — Ο ${name} γνωρίζει ${cats.length} κατηγορίες:\n\n${cats.map(([cat, items]) => `▸ **${cat}**: ${items.join(', ')}`).join('\n')}\n\nΣύνολο ${total}+ δεξιότητες!`,
      `**Competenze Tecniche** — ${name} è competente in ${cats.length} categorie:\n\n${cats.map(([cat, items]) => `▸ **${cat}**: ${items.join(', ')}`).join('\n')}\n\n${total}+ competenze individuali!`,
      `**Teknik Beceriler** — ${name}, ${cats.length} kategoride uzman:\n\n${cats.map(([cat, items]) => `▸ **${cat}**: ${items.join(', ')}`).join('\n')}\n\nToplam ${total}+ beceri!`,
      `**Abilități Tehnice** — ${name} este competent în ${cats.length} categorii:\n\n${cats.map(([cat, items]) => `▸ **${cat}**: ${items.join(', ')}`).join('\n')}\n\n${total}+ abilități individuale!`,
      `**Aftësi Teknike** — ${name} është i aftë në ${cats.length} kategori:\n\n${cats.map(([cat, items]) => `▸ **${cat}**: ${items.join(', ')}`).join('\n')}\n\nGjithsej ${total}+ aftësi!`,
      `**Технически умения** — ${name} владее ${cats.length} категории:\n\n${cats.map(([cat, items]) => `▸ **${cat}**: ${items.join(', ')}`).join('\n')}\n\nОбщо ${total}+ умения!`,
      `**Habilidades Técnicas** — ${name} es competente en ${cats.length} categorías:\n\n${cats.map(([cat, items]) => `▸ **${cat}**: ${items.join(', ')}`).join('\n')}\n\n¡${total}+ habilidades individuales!`,
      `**Compétences Techniques** — ${name} maîtrise ${cats.length} catégories :\n\n${cats.map(([cat, items]) => `▸ **${cat}**: ${items.join(', ')}`).join('\n')}\n\n${total}+ compétences individuelles !`
    );
  },
});

addIntent({
  id: 'frontend',
  labels: ['Frontend'],
  keywords: ['frontend', 'front-end', 'front end', 'ui', 'react', 'vue', 'angular', 'css', 'html', 'client-side', 'interface', 'spa', 'responsive', 'tailwind', 'bootstrap', 'material ui', 'javascript', 'typescript', 'διασύνδεση', 'διεπαφή', 'οπτική', 'σχεδίαση', 'προμετωπίδα'],
  patterns: [/^(frontend|front-end|front\s+end|ui|client\s*side)/i],
  priority: 3,
  response: (profile) => {
    const fe = profile.skills.Frontend || [];
    return __tr(
      `**Frontend Skills**\n\n${fe.join(', ')}\n\nHe's comfortable with modern SPA frameworks, responsive design, and component libraries like Material UI and Tailwind CSS.`,
      `**Frontend Δεξιότητες**\n\n${fe.join(', ')}\n\nΆνετος με σύγχρονα SPA frameworks, responsive design και βιβλιοθήκες components όπως Material UI και Tailwind CSS.`,
      `**Competenze Frontend**\n\n${fe.join(', ')}\n\nÈ a suo agio con framework SPA moderni, design responsivo e librerie di componenti come Material UI e Tailwind CSS.`,
      `**Ön Yüz Becerileri**\n\n${fe.join(', ')}\n\nModern SPA framework'leri, duyarlı tasarım ve Material UI ile Tailwind CSS gibi bileşen kütüphanelerinde rahattır.`,
      `**Abilități Frontend**\n\n${fe.join(', ')}\n\nEste confortabil cu framework-uri SPA moderne, design responsive și biblioteci de componente precum Material UI și Tailwind CSS.`,
      `**Aftësi Frontend**\n\n${fe.join(', ')}\n\nËshtë i rehatshëm me framework-et moderne SPA, dizajn responsive dhe biblioteka komponentësh si Material UI dhe Tailwind CSS.`,
      `**Frontend умения**\n\n${fe.join(', ')}\n\nТой е удобен с модерни SPA frameworks, responsive design и библиотеки от компоненти като Material UI и Tailwind CSS.`,
      `**Habilidades Frontend**\n\n${fe.join(', ')}\n\nSe siente cómodo con frameworks SPA modernos, diseño responsive y librerías de componentes como Material UI y Tailwind CSS.`,
      `**Compétences Frontend**\n\n${fe.join(', ')}\n\nIl est à l'aise avec les frameworks SPA modernes, le design responsive et les bibliothèques de composants comme Material UI et Tailwind CSS.`
    );
  },
});

addIntent({
  id: 'backend',
  labels: ['Backend'],
  keywords: ['backend', 'back-end', 'back end', 'server', 'api', 'django', 'express', 'laravel', 'node', 'server-side', 'database', 'rest', 'graphql', 'middleware', 'python', 'php', 'fastapi', 'flask', 'sql', 'nosql', 'διακομιστής', 'βάση δεδομένων', 'server', 'δεδομένα'],
  patterns: [/^(backend|back-end|back\s+end|server|api)/i],
  priority: 3,
  response: (profile) => {
    const be = profile.skills.Backend || [];
    return __tr(
      `**Backend Skills**\n\n${be.join(', ')}\n\nExperience spans Python (Django, Flask, FastAPI), PHP (Laravel), and Node.js (Express) ecosystems.`,
      `**Backend Δεξιότητες**\n\n${be.join(', ')}\n\nΕμπειρία σε Python (Django, Flask, FastAPI), PHP (Laravel) και Node.js (Express).`,
      `**Competenze Backend**\n\n${be.join(', ')}\n\nEsperienza negli ecosistemi Python (Django, Flask, FastAPI), PHP (Laravel) e Node.js (Express).`,
      `**Arka Uç Becerileri**\n\n${be.join(', ')}\n\nPython (Django, Flask, FastAPI), PHP (Laravel) ve Node.js (Express) ekosistemlerinde deneyimli.`,
      `**Abilități Backend**\n\n${be.join(', ')}\n\nExperiență în ecosistemele Python (Django, Flask, FastAPI), PHP (Laravel) și Node.js (Express).`,
      `**Aftësi Backend**\n\n${be.join(', ')}\n\nPërvojë në ekosistemet Python (Django, Flask, FastAPI), PHP (Laravel) dhe Node.js (Express).`,
      `**Backend умения**\n\n${be.join(', ')}\n\nОпит в екосистемите Python (Django, Flask, FastAPI), PHP (Laravel) и Node.js (Express).`,
      `**Habilidades Backend**\n\n${be.join(', ')}\n\nExperiencia en los ecosistemas Python (Django, Flask, FastAPI), PHP (Laravel) y Node.js (Express).`,
      `**Compétences Backend**\n\n${be.join(', ')}\n\nExpérience dans les écosystèmes Python (Django, Flask, FastAPI), PHP (Laravel) et Node.js (Express).`
    );
  },
});

addIntent({
  id: 'projects',
  labels: ['Projects'],
  keywords: ['projects', 'portfolio', 'built', 'created', 'developed', 'made', 'applications', 'apps', 'work', 'showcase', 'what have you', 'what did you', 'your work', 'creations', 'side projects', 'portfolio projects', 'έργα', 'projects', 'εργασίες', 'δημιούργησες', 'έχεις φτιάξει', 'κατασκευές', 'δημιουργίες'],
  patterns: [/what\s+(projects|apps|applications|things|creations)\s/i, /show\s+(me\s+)?(your\s+)?(projects|work|creations)/i, /^projects/i, /what\s+(have|did)\s+(you\s+)?(built|created|made)/i],
  priority: 4,
  response: (profile) => {
    const projects = profile.projects || [];
    const reply = __tr(
      `**Projects** (${projects.length} total):\n\n${projects.map(p => `▸ **[${p.title}](${p.link})** — ${p.description.split('.')[0]}.\n  _Tech: ${p.tech.join(', ')}_`).join('\n\n')}`,
      `**Projects** (σύνολο ${projects.length}):\n\n${projects.map(p => `▸ **[${p.title}](${p.link})** — ${p.description.split('.')[0]}.\n  _Τεχνολογίες: ${p.tech.join(', ')}_`).join('\n\n')}`,
      `**Progetti** (${projects.length} totali):\n\n${projects.map(p => `▸ **[${p.title}](${p.link})** — ${p.description.split('.')[0]}.\n  _Tech: ${p.tech.join(', ')}_`).join('\n\n')}`,
      `**Projeler** (toplam ${projects.length}):\n\n${projects.map(p => `▸ **[${p.title}](${p.link})** — ${p.description.split('.')[0]}.\n  _Teknoloji: ${p.tech.join(', ')}_`).join('\n\n')}`,
      `**Proiecte** (${projects.length} total):\n\n${projects.map(p => `▸ **[${p.title}](${p.link})** — ${p.description.split('.')[0]}.\n  _Tech: ${p.tech.join(', ')}_`).join('\n\n')}`,
      `**Projekte** (gjithsej ${projects.length}):\n\n${projects.map(p => `▸ **[${p.title}](${p.link})** — ${p.description.split('.')[0]}.\n  _Tech: ${p.tech.join(', ')}_`).join('\n\n')}`,
      `**Проекти** (общо ${projects.length}):\n\n${projects.map(p => `▸ **[${p.title}](${p.link})** — ${p.description.split('.')[0]}.\n  _Технологии: ${p.tech.join(', ')}_`).join('\n\n')}`,
      `**Proyectos** (${projects.length} en total):\n\n${projects.map(p => `▸ **[${p.title}](${p.link})** — ${p.description.split('.')[0]}.\n  _Tecnologías: ${p.tech.join(', ')}_`).join('\n\n')}`,
      `**Projets** (${projects.length} au total) :\n\n${projects.map(p => `▸ **[${p.title}](${p.link})** — ${p.description.split('.')[0]}.\n  _Technologies : ${p.tech.join(', ')}_`).join('\n\n')}`
    );
    return reply.trim();
  },
});

addIntent({
  id: 'project_detail',
  labels: ['Bio Explorer 2D', 'Bio Explorer 3D', 'RePaw', 'UR8', 'Pixel Sprint', 'Rustix', 'Speech Recognition', 'PhotoFavorites', 'Kivy Downloader', 'Tournaments', 'CryptDB', 'Flag Builder', 'PingPong', 'Asteroid', 'Snake', 'Flappy', 'Tetris', 'Quiz', 'Match', 'Base Ops', 'Bug Breaker', 'CareBeat', 'DrakosDesign', 'IslandBookings', 'MariaKostoula', 'AuraLibre'],
  keywords: ['project', 'tell me about', 'detail', 'bio explorer', 'repaw', 'rustix', 'pixelsprint', 'speech', 'photofavorites', 'kivy', 'tournaments', 'snake', 'flappy', 'tetris', 'asteroid', 'cryptdb', 'base ops', 'bug breaker', 'pacman', 'dev mario', 'donkey kong', 'code sprint', 'endless runner', 'match', 'quiz', 'carebeat', 'drakos', 'islandbookings', 'mariakostoula', 'laralibre', 'flag', 'pingpong', 'ur8', 'project', 'λεπτομέρειες', 'προβολή', 'πες μου για'],
  patterns: [/^(bio explorer|repaw|ur8|pixelsprint|rustix|speech|snake|photofavorites|kivy|tournaments|cryptdb|flag|pingpong|asteroid|carebeat|drakos|islandbookings|mariakostoula|laralibre|base ops|bug breaker|pacman|dev mario|donkey kong|code sprint|endless runner|match|quiz)/i],
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
      reply += __tr('**Key highlights:**\n', '**Κύρια σημεία:**\n', '**Punti salienti:**\n', '**Öne çıkanlar:**\n', '**Puncte cheie:**\n', '**Pikat kryesore:**\n', '**Основни моменти:**\n', '**Aspectos destacados:**\n', '**Points clés :**\n');
      for (const h of best.highlights) reply += `• ${h}\n`;
    }
    reply += `\n🔗 ${__tr('View on GitHub', 'Προβολή στο GitHub', 'Vedi su GitHub', 'GitHub\'da Gör', 'Vezi pe GitHub', 'Shiko në GitHub', 'Вижте в GitHub', 'Ver en GitHub', 'Voir sur GitHub')}`;
    if (best.link) reply += `: [${best.link}](${best.link})`;
    return reply;
  },
});

addIntent({
  id: 'experience',
  labels: ['Experience'],
  keywords: ['experience', 'work', 'job', 'career', 'employment', 'worked', 'professional', 'history', 'background', 'where did you', 'companies', 'roles', 'positions', 'previous jobs', 'where have you', 'προϋπηρεσία', 'εμπειρία', 'εργασία', 'δουλειά', 'επαγγελματική', 'που δούλεψες', 'θέσεις', 'εργάστηκες'],
  patterns: [/where\s+(have|did)\s+(you\s+)?(worked|work)/i, /work\s+(history|experience)/i, /^experience/i, /^(jobs|job\s+history|previous\s+jobs|roles)/i],
  priority: 4,
  response: (profile) => {
    const jobs = profile.experience || [];
    const reply = __tr(
      `**Professional Experience** — ${jobs.length} positions:\n\n${jobs.map(j => `▸ **${j.role}** @ ${j.company}\n  ${j.period} · ${j.type}\n${j.highlights.slice(0, 2).map(h => `  • ${h}`).join('\n')}`).join('\n\n')}`,
      `**Επαγγελματική Εμπειρία** — ${jobs.length} θέσεις:\n\n${jobs.map(j => `▸ **${j.role}** @ ${j.company}\n  ${j.period} · ${j.type}\n${j.highlights.slice(0, 2).map(h => `  • ${h}`).join('\n')}`).join('\n\n')}`,
      `**Esperienza Professionale** — ${jobs.length} posizioni:\n\n${jobs.map(j => `▸ **${j.role}** @ ${j.company}\n  ${j.period} · ${j.type}\n${j.highlights.slice(0, 2).map(h => `  • ${h}`).join('\n')}`).join('\n\n')}`,
      `**Profesyonel Deneyim** — ${jobs.length} pozisyon:\n\n${jobs.map(j => `▸ **${j.role}** @ ${j.company}\n  ${j.period} · ${j.type}\n${j.highlights.slice(0, 2).map(h => `  • ${h}`).join('\n')}`).join('\n\n')}`,
      `**Experiență Profesională** — ${jobs.length} poziții:\n\n${jobs.map(j => `▸ **${j.role}** @ ${j.company}\n  ${j.period} · ${j.type}\n${j.highlights.slice(0, 2).map(h => `  • ${h}`).join('\n')}`).join('\n\n')}`,
      `**Përvojë Profesionale** — ${jobs.length} pozita:\n\n${jobs.map(j => `▸ **${j.role}** @ ${j.company}\n  ${j.period} · ${j.type}\n${j.highlights.slice(0, 2).map(h => `  • ${h}`).join('\n')}`).join('\n\n')}`,
      `**Професионален опит** — ${jobs.length} позиции:\n\n${jobs.map(j => `▸ **${j.role}** @ ${j.company}\n  ${j.period} · ${j.type}\n${j.highlights.slice(0, 2).map(h => `  • ${h}`).join('\n')}`).join('\n\n')}`,
      `**Experiencia Profesional** — ${jobs.length} puestos:\n\n${jobs.map(j => `▸ **${j.role}** @ ${j.company}\n  ${j.period} · ${j.type}\n${j.highlights.slice(0, 2).map(h => `  • ${h}`).join('\n')}`).join('\n\n')}`,
      `**Expérience Professionnelle** — ${jobs.length} postes :\n\n${jobs.map(j => `▸ **${j.role}** @ ${j.company}\n  ${j.period} · ${j.type}\n${j.highlights.slice(0, 2).map(h => `  • ${h}`).join('\n')}`).join('\n\n')}`
    );
    return reply.trim();
  },
});

addIntent({
  id: 'education',
  labels: ['Education'],
  keywords: ['education', 'studied', 'degree', 'university', 'school', 'learned', 'college', 'academic', 'graduated', 'bachelor', 'certification', 'ecdl', 'unipi', 'qualifications', 'alma mater', 'major', 'field of study', 'computer science', 'informatics', 'πτυχίο', 'εκπαίδευση', 'σπουδές', 'πανεπιστήμιο', 'σχολή', 'εκπαιδευτικό', 'δίπλωμα', 'μεταπτυχιακό', 'πτυχίο', 'μαθήματα'],
  patterns: [/where\s+(did\s+)?(you\s+)?(study|go\s+to\s+school)/i, /academic\s+(background|history|qualifications)/i, /^education/i, /^(qualifications|degree|bachelor|master)/i],
  priority: 4,
  response: (profile) => {
    const edu = profile.education || [];
    const reply = __tr(
      `**Education**\n\n${edu.map(e => `▸ **${e.degree}**\n  ${e.school} · ${e.year}\n  ${e.description}`).join('\n\n')}`,
      `**Εκπαίδευση**\n\n${edu.map(e => `▸ **${e.degree}**\n  ${e.school} · ${e.year}\n  ${e.description}`).join('\n\n')}`,
      `**Istruzione**\n\n${edu.map(e => `▸ **${e.degree}**\n  ${e.school} · ${e.year}\n  ${e.description}`).join('\n\n')}`,
      `**Eğitim**\n\n${edu.map(e => `▸ **${e.degree}**\n  ${e.school} · ${e.year}\n  ${e.description}`).join('\n\n')}`,
      `**Educație**\n\n${edu.map(e => `▸ **${e.degree}**\n  ${e.school} · ${e.year}\n  ${e.description}`).join('\n\n')}`,
      `**Arsimi**\n\n${edu.map(e => `▸ **${e.degree}**\n  ${e.school} · ${e.year}\n  ${e.description}`).join('\n\n')}`,
      `**Образование**\n\n${edu.map(e => `▸ **${e.degree}**\n  ${e.school} · ${e.year}\n  ${e.description}`).join('\n\n')}`,
      `**Educación**\n\n${edu.map(e => `▸ **${e.degree}**\n  ${e.school} · ${e.year}\n  ${e.description}`).join('\n\n')}`,
      `**Formation**\n\n${edu.map(e => `▸ **${e.degree}**\n  ${e.school} · ${e.year}\n  ${e.description}`).join('\n\n')}`
    );
    return reply.trim();
  },
});

addIntent({
  id: 'github',
  labels: ['GitHub'],
  keywords: ['github', 'repository', 'repos', 'code', 'source', 'open source', 'contribution', 'tigerlero', 'git', 'source code', 'αποθετήριο', 'πηγαίος κώδικας', 'ανοικτός κώδικας', 'κώδικας', 'αποθετήρια'],
  patterns: [/^(github|git|repos|source\s+code)/i, /where\s+(is|can\s+i\s+find)\s+(your\s+)?(code|source)/i],
  priority: 5,
  response: (profile) => {
    const gh = profile.social.github;
    const name = profile.meta.name.split(' ')[0];
    return __tr(
      `**GitHub**\n\nUsername: **${gh.username}**\nURL: [${gh.url}](${gh.url})\n\n${name} has ${profile.projects.length} public repositories covering web apps, game engines, ML models, and tools. Open-source contributions are always welcome! 👨‍💻`,
      `**GitHub**\n\nUsername: **${gh.username}**\nURL: [${gh.url}](${gh.url})\n\nΟ ${name} έχει ${profile.projects.length} δημόσια repositories με web apps, game engines, ML μοντέλα και εργαλεία. Open-source συνεισφορές πάντα ευπρόσδεκτες! 👨‍💻`,
      `**GitHub**\n\nUsername: **${gh.username}**\nURL: [${gh.url}](${gh.url})\n\n${name} ha ${profile.projects.length} repository pubblici che coprono app web, motori di gioco, modelli ML e strumenti. I contributi open-source sono sempre benvenuti! 👨‍💻`,
      `**GitHub**\n\nKullanıcı adı: **${gh.username}**\nURL: [${gh.url}](${gh.url})\n\n${name}'in web uygulamaları, oyun motorları, ML modelleri ve araçlar içeren ${profile.projects.length} genel reposu var. Açık kaynak katkıları her zaman hoş karşılanır! 👨‍💻`,
      `**GitHub**\n\nUsername: **${gh.username}**\nURL: [${gh.url}](${gh.url})\n\n${name} are ${profile.projects.length} repository-uri publice care acoperă web apps, motoare de jocuri, modele ML și unelte. Contribuțiile open-source sunt întotdeauna binevenite! 👨‍💻`,
      `**GitHub**\n\nEmri: **${gh.username}**\nURL: [${gh.url}](${gh.url})\n\n${name} ka ${profile.projects.length} depo publike që përfshijnë aplikacione web, motorë lojërash, modele ML dhe mjete. Kontributet open-source janë gjithmonë të mirëseardhura! 👨‍💻`,
      `**GitHub**\n\nПотребителско име: **${gh.username}**\nURL: [${gh.url}](${gh.url})\n\n${name} има ${profile.projects.length} публични хранилища, обхващащи уеб приложения, игрови двигатели, ML модели и инструменти. Приносите с отворен код винаги са добре дошли! 👨‍💻`,
      `**GitHub**\n\nUsuario: **${gh.username}**\nURL: [${gh.url}](${gh.url})\n\n${name} tiene ${profile.projects.length} repositorios públicos que cubren aplicaciones web, motores de juegos, modelos ML y herramientas. ¡Las contribuciones open-source siempre son bienvenidas! 👨‍💻`,
      `**GitHub**\n\nNom d'utilisateur : **${gh.username}**\nURL : [${gh.url}](${gh.url})\n\n${name} a ${profile.projects.length} dépôts publics couvrant des applications web, des moteurs de jeu, des modèles ML et des outils. Les contributions open-source sont toujours les bienvenues ! 👨‍💻`
    );
  },
});

addIntent({
  id: 'linkedin',
  labels: ['LinkedIn'],
  keywords: ['linkedin', 'linked in', 'professional', 'profile', 'connect', 'network', 'λίνκεντίν', 'επαγγελματικό δίκτυο', 'προφίλ', 'σύνδεση'],
  patterns: [/^(linkedin|linked\s+in)/i],
  priority: 3,
  response: (profile) => {
    const li = profile.social.linkedin;
    const name = profile.meta.name.split(' ')[0];
    return __tr(
      `**LinkedIn**\n\n[${li.username}](${li.url})\n\nConnect with ${name} on LinkedIn for professional networking and collaboration opportunities.`,
      `**LinkedIn**\n\n[${li.username}](${li.url})\n\nΣυνδεθείτε με τον ${name} στο LinkedIn για επαγγελματική δικτύωση και συνεργασίες.`,
      `**LinkedIn**\n\n[${li.username}](${li.url})\n\nConnettiti con ${name} su LinkedIn per networking professionale e collaborazioni.`,
      `**LinkedIn**\n\n[${li.username}](${li.url})\n\nProfesyonel ağ kurma ve işbirliği fırsatları için ${name} ile LinkedIn'de bağlantı kurun.`,
      `**LinkedIn**\n\n[${li.username}](${li.url})\n\nConectează-te cu ${name} pe LinkedIn pentru networking profesional și oportunități de colaborare.`,
      `**LinkedIn**\n\n[${li.username}](${li.url})\n\nLidhu me ${name} në LinkedIn për rrjete profesionale dhe mundësi bashkëpunimi.`,
      `**LinkedIn**\n\n[${li.username}](${li.url})\n\nСвържете се с ${name} в LinkedIn за професионално общуване и възможности за сътрудничество.`,
      `**LinkedIn**\n\n[${li.username}](${li.url})\n\nConecta con ${name} en LinkedIn para networking profesional y oportunidades de colaboración.`,
      `**LinkedIn**\n\n[${li.username}](${li.url})\n\nConnectez-vous avec ${name} sur LinkedIn pour le réseautage professionnel et les opportunités de collaboration.`
    );
  },
});

addIntent({
  id: 'contact',
  labels: ['Contact'],
  keywords: ['contact', 'reach', 'email', 'phone', 'call', 'message', 'get in touch', 'how to', 'hire', 'available', 'how to hire', 'reach out', 'get hold of', 'information', 'επικοινωνία', 'τηλέφωνο', 'email', 'στοιχεία', 'επικοινωνήσω', 'τηλεφωνήσω', 'βρες'],
  patterns: [/how\s+(can\s+i|to)\s+(contact|reach|get|hire)/i, /^(email|phone|contact|reach|hire)/i],
  priority: 4,
  response: (profile) => {
    const c = profile.contact;
    const gh = profile.social.github.url;
    const li = profile.social.linkedin.url;
    const wa = profile.social.whatsapp.url;
    return __tr(
      `**Contact Information**\n\n📧 **Email**: [${c.email}](mailto:${c.email})\n📞 **Phone**: ${c.phone}\n📍 **Location**: ${c.location}\n\n💬 ${c.availability}\n\n**Social:**\n▸ [GitHub](${gh})\n▸ [LinkedIn](${li})\n▸ [WhatsApp](${wa})`,
      `**Στοιχεία Επικοινωνίας**\n\n📧 **Email**: [${c.email}](mailto:${c.email})\n📞 **Τηλέφωνο**: ${c.phone}\n📍 **Τοποθεσία**: ${c.location}\n\n💬 ${c.availability}\n\n**Social:**\n▸ [GitHub](${gh})\n▸ [LinkedIn](${li})\n▸ [WhatsApp](${wa})`,
      `**Informazioni di Contatto**\n\n📧 **Email**: [${c.email}](mailto:${c.email})\n📞 **Telefono**: ${c.phone}\n📍 **Posizione**: ${c.location}\n\n💬 ${c.availability}\n\n**Social:**\n▸ [GitHub](${gh})\n▸ [LinkedIn](${li})\n▸ [WhatsApp](${wa})`,
      `**İletişim Bilgileri**\n\n📧 **Email**: [${c.email}](mailto:${c.email})\n📞 **Telefon**: ${c.phone}\n📍 **Konum**: ${c.location}\n\n💬 ${c.availability}\n\n**Sosyal:**\n▸ [GitHub](${gh})\n▸ [LinkedIn](${li})\n▸ [WhatsApp](${wa})`,
      `**Informații de Contact**\n\n📧 **Email**: [${c.email}](mailto:${c.email})\n📞 **Telefon**: ${c.phone}\n📍 **Locație**: ${c.location}\n\n💬 ${c.availability}\n\n**Social:**\n▸ [GitHub](${gh})\n▸ [LinkedIn](${li})\n▸ [WhatsApp](${wa})`,
      `**Informacione Kontakti**\n\n📧 **Email**: [${c.email}](mailto:${c.email})\n📞 **Telefon**: ${c.phone}\n📍 **Vendndodhja**: ${c.location}\n\n💬 ${c.availability}\n\n**Social:**\n▸ [GitHub](${gh})\n▸ [LinkedIn](${li})\n▸ [WhatsApp](${wa})`,
      `**Информация за контакт**\n\n📧 **Email**: [${c.email}](mailto:${c.email})\n📞 **Телефон**: ${c.phone}\n📍 **Местоположение**: ${c.location}\n\n💬 ${c.availability}\n\n**Социални:**\n▸ [GitHub](${gh})\n▸ [LinkedIn](${li})\n▸ [WhatsApp](${wa})`,
      `**Información de Contacto**\n\n📧 **Email**: [${c.email}](mailto:${c.email})\n📞 **Teléfono**: ${c.phone}\n📍 **Ubicación**: ${c.location}\n\n💬 ${c.availability}\n\n**Redes:**\n▸ [GitHub](${gh})\n▸ [LinkedIn](${li})\n▸ [WhatsApp](${wa})`,
      `**Informations de Contact**\n\n📧 **Email**: [${c.email}](mailto:${c.email})\n📞 **Téléphone**: ${c.phone}\n📍 **Localisation**: ${c.location}\n\n💬 ${c.availability}\n\n**Social :**\n▸ [GitHub](${gh})\n▸ [LinkedIn](${li})\n▸ [WhatsApp](${wa})`
    );
  },
});

addIntent({
  id: 'interests',
  labels: ['Interests'],
  keywords: ['interests', 'hobbies', 'passionate', 'free time', 'fun', 'like to', 'enjoy', 'what are you into', 'passions', 'pastimes', 'ενδιαφέροντα', 'χόμπι', 'ελεύθερος χρόνος', 'ασχολίες', 'αγαπώ', 'μου αρέσει'],
  patterns: [/what\s+(are\s+)?(your\s+)?(interests|hobbies|passions)/i, /what\s+(do\s+)?(you\s+)?(do\s+)?(for\s+)?fun/i],
  priority: 3,
  response: (profile) => {
    const interests = profile.interests || [];
    const body = interests.map(i => `▸ ${i}`).join('\n');
    return __tr(
      `**Interests & Hobbies**\n\n${body}`,
      `**Ενδιαφέροντα & Χόμπι**\n\n${body}`,
      `**Interessi e Hobby**\n\n${body}`,
      `**İlgi Alanları ve Hobiler**\n\n${body}`,
      `**Interese și Hobby-uri**\n\n${body}`,
      `**Interesat dhe Hobi**\n\n${body}`,
      `**Интереси и хобита**\n\n${body}`,
      `**Intereses y Pasatiempos**\n\n${body}`,
      `**Centres d'Intérêt et Loisirs**\n\n${body}`
    );
  },
});

addIntent({
  id: 'help',
  labels: ['Help'],
  keywords: ['help', 'what can you do', 'commands', 'options', 'menu', 'capabilities', 'can you', 'what do you', 'tutorial', 'guide', 'what to ask', 'starter', 'βοήθεια', 'τι μπορείς', 'βοήθ', 'επιλογές', 'τι κάνεις', 'πώς δουλεύει', 'οδηγός', 'τι ξέρεις να κάνεις'],
  patterns: [/^(help|menu|options|commands|guide|tutorial)/i, /what\s+(can|do)\s+(you|i)\s+(do|ask)/i],
  priority: 1,
  response: () => {
    const suggestions = CONFIG.SUGGESTIONS.map(s => `▸ *"${s}"*`).join('\n');
    return __tr(
      `**I can help you learn about the portfolio!** Try asking:\n\n${suggestions}\n\nOr ask about specific projects (e.g., "Tell me about RePaw"), skills (e.g., "What frontend frameworks?"), freelance work, teaching, pricing, or games!`,
      `**Μπορώ να σε βοηθήσω να μάθεις για το portfolio!** Δοκίμασε να ρωτήσεις:\n\n${suggestions}\n\nΉ ρώτα για συγκεκριμένα projects (π.χ. "Πες μου για το RePaw"), δεξιότητες, freelance εργασία, διδασκαλία, τιμές ή παιχνίδια!`,
      `**Posso aiutarti a conoscere il portfolio!** Prova a chiedere:\n\n${suggestions}\n\nOppure chiedi su progetti specifici (es. "Parlami di RePaw"), competenze, lavoro freelance, insegnamento, prezzi o giochi!`,
      `**Portfolyo hakkında bilgi edinmene yardımcı olabilirim!** Şunları sor:\n\n${suggestions}\n\nVeya belirli projeler (ör. "RePaw hakkında bilgi ver"), beceriler, freelance işler, dersler, fiyatlar veya oyunlar hakkında sor!`,
      `**Pot să te ajut să afli despre portofoliu!** Încearcă să întrebi:\n\n${suggestions}\n\nSau întreabă despre proiecte specifice (ex. "Spune-mi despre RePaw"), abilități, freelance, predare, prețuri sau jocuri!`,
      `**Mund t'ju ndihmoj të mësoni rreth portofolit!** Provoni të pyesni:\n\n${suggestions}\n\nOse pyetni për projekte specifike, aftësi, punë freelance, mësimdhënie, çmime ose lojëra!`,
      `**Мога да ви помогна да научите за портфолиото!** Опитайте да попитате:\n\n${suggestions}\n\nИли попитайте за конкретни проекти, умения, freelance работа, преподаване, цени или игри!`,
      `**¡Puedo ayudarte a conocer el portafolio!** Intenta preguntar:\n\n${suggestions}\n\nO pregunta sobre proyectos específicos (ej. "Cuéntame sobre RePaw"), habilidades, trabajo freelance, enseñanza, precios o juegos!`,
      `**Je peux vous aider à découvrir le portfolio !** Essayez de demander :\n\n${suggestions}\n\nOu posez des questions sur des projets spécifiques, compétences, travail freelance, enseignement, tarifs ou jeux !`
    );
  },
});

addIntent({
  id: 'thanks',
  labels: [],
  keywords: ['thanks', 'thank', 'thx', 'ty', 'appreciate', 'cool', 'nice', 'awesome', 'great', 'wonderful', 'excellent', 'perfect', 'amazing', 'lovely', 'ευχαριστώ', 'σε ευχαριστώ', 'μπράβο', 'τέλεια', 'εξαιρετικά', 'ωραία', 'υπέροχα'],
  patterns: [/^(thanks|thank|thx|ty|ευχαριστώ)/i],
  priority: 1,
  response: () => {
    const idx = window.__CHAT_LANG_IDX || 0;
    const replies = [
      ["You're welcome! 😊 Feel free to ask anything else!", "Happy to help! 🙌 Let me know if you need more info.", "Anytime! 😄 Want to explore more about the portfolio?", "Glad I could help! 🚀"],
      ["Παρακαλώ! 😊 Ρώτα με ό,τι άλλο θες!", "Χαρά μου! 🙌 Πες μου αν θες κι άλλες πληροφορίες.", "Όποτε θες! 😄 Θέλεις να εξερευνήσεις κι άλλο το portfolio;", "Χάρηκα που βοήθησα! 🚀"],
      ["Prego! 😊 Chiedimi pure altro!", "Felice di aiutare! 🙌 Fammi sapere se vuoi altre info.", "Quando vuoi! 😄 Vuoi esplorare ancora il portfolio?", "Contento di essere stato utile! 🚀"],
      ["Rica ederim! 😊 Başka bir şey sormaktan çekinme!", "Yardımcı olabildiğime sevindim! 🙌 Daha fazla bilgi istersen söyle.", "Ne zaman istersen! 😄 Portfolyoyu daha fazla keşfetmek ister misin?", "Memnuniyetle! 🚀"],
      ["Cu plăcere! 😊 Întreabă-mă orice altceva!", "Mă bucur să ajut! 🙌 Anunță-mă dacă ai nevoie de mai multe informații.", "Oricând! 😄 Vrei să explorezi mai mult portofoliul?", "Mă bucur că am putut ajuta! 🚀"],
      ["Ju lutem! 😊 Pyetni çfarëdo tjetër!", "Gëzohem që ndihmova! 🙌 Më tregoni nëse keni nevojë për më shumë info.", "Kurdoherë! 😄 Dëshironi të eksploroni më shumë portofolin?", "I lumtur që ndihmova! 🚀"],
      ["Моля! 😊 Питайте за каквото друго искате!", "Радвам се да помогна! 🙌 Кажете ми, ако имате нужда от още информация.", "Винаги! 😄 Искате ли да разгледате още портфолиото?", "Щастлив съм, че помогнах! 🚀"],
      ["¡De nada! 😊 ¡Pregúntame lo que quieras!", "¡Feliz de ayudar! 🙌 Dime si necesitas más información.", "¡Cuando quieras! 😄 ¿Quieres explorar más el portafolio?", "¡Me alegra haber ayudado! 🚀"],
      ["De rien ! 😊 N'hésitez pas à demander autre chose !", "Ravi d'aider ! 🙌 Dites-moi si vous avez besoin de plus d'infos.", "À tout moment ! 😄 Voulez-vous explorer davantage le portfolio ?", "Content d'avoir pu aider ! 🚀"],
    ];
    return replies[idx][Math.floor(Math.random() * replies[idx].length)] || replies[0][0];
  },
});

addIntent({
  id: 'bye',
  labels: [],
  keywords: ['bye', 'goodbye', 'see you', 'later', 'cya', 'farewell', 'take care', 'peace', 'exit', 'quit', 'leave', 'done', 'signing off', 'αντίο', 'γεια', 'τα λέμε', 'θα τα πούμε', 'γεια χαρά', 'αντίο γεια'],
  patterns: [/^(bye|goodbye|see\s+you|later|cya|farewell|αντίο|γεια)\b/i],
  priority: 1,
  response: () => {
    return __tr(
      "Goodbye! Thanks for visiting the portfolio. Feel free to come back anytime! 👋",
      "Αντίο! Ευχαριστώ για την επίσκεψη στο portfolio. Μπορείς να επιστρέψεις όποτε θες! 👋",
      "Arrivederci! Grazie per aver visitato il portfolio. Torna quando vuoi! 👋",
      "Hoşça kal! Portfolyoyu ziyaret ettiğin için teşekkürler. İstediğin zaman geri gelebilirsin! 👋",
      "La revedere! Mulțumesc pentru vizita pe portofoliu. Poți reveni oricând! 👋",
      "Mirupafshim! Faleminderit që vizituat portofolin. Mund të ktheheni kur të doni! 👋",
      "Довиждане! Благодаря за посещението на портфолиото. Заповядайте отново по всяко време! 👋",
      "¡Adiós! Gracias por visitar el portafolio. ¡Vuelve cuando quieras! 👋",
      "Au revoir ! Merci d'avoir visité le portfolio. Revenez quand vous voulez ! 👋"
    );
  },
});

addIntent({
  id: 'freelance',
  labels: ['Freelance'],
  keywords: ['freelance', 'freelancer', 'independent', 'client', 'contract', 'gig', 'side project', 'consulting', 'carebeat', 'drakosdesign', 'islandbookings', 'mariakostoula', 'laralibre', 'enosi', 'freelancing', 'self-employed', 'contract work', 'gigs', 'side gigs', 'ελεύθερος επαγγελματίας', 'freelance projects', 'συνεργάτες', 'ελεύθερος', 'ανάθεση', 'συμβόλαιο', 'projects'],
  patterns: [/freelance/i, /what\s+(freelance|client|contract|self\s*employed)\s+(work|projects)/i, /^(freelance|freelancer|self\s*employed)/i],
  priority: 4,
  response: (profile) => {
    const fl = profile.freelance || [];
    const body = fl.map(p => `▸ **[${p.project}]** — ${p.period}\n  ${p.description.split('.')[0]}.\n  _${p.tech.join(', ')}_`).join('\n\n');
    const footer = __tr('\n\nWant pricing details? Ask about "Pricing"!', '\n\nΘέλεις λεπτομέρειες τιμολόγησης; Ρώτα "Pricing"!', '\n\nVuoi dettagli sui prezzi? Chiedi "Pricing"!', '\n\nFiyatlandırma detayları mı istiyorsun? "Pricing" diye sor!', '\n\nVrei detalii prețuri? Întreabă "Pricing"!', '\n\nDëshironi detaje çmimesh? Pyetni "Pricing"!', '\n\nИскате подробности за цените? Попитайте "Pricing"!', '\n\n¿Quieres detalles de precios? ¡Pregunta "Pricing"!', '\n\nVous voulez des détails sur les prix ? Demandez "Pricing" !');
    return __tr(
      `**Freelance Projects** (${fl.length} total):\n\n${body}${footer}`,
      `**Freelance Projects** (σύνολο ${fl.length}):\n\n${body}${footer}`,
      `**Progetti Freelance** (${fl.length} totali):\n\n${body}${footer}`,
      `**Freelance Projeler** (toplam ${fl.length}):\n\n${body}${footer}`,
      `**Proiecte Freelance** (${fl.length} total):\n\n${body}${footer}`,
      `**Projekte Freelance** (gjithsej ${fl.length}):\n\n${body}${footer}`,
      `**Freelance проекти** (общо ${fl.length}):\n\n${body}${footer}`,
      `**Proyectos Freelance** (${fl.length} total):\n\n${body}${footer}`,
      `**Projets Freelance** (${fl.length} au total) :\n\n${body}${footer}`
    );
  },
});

addIntent({
  id: 'teaching',
  labels: ['Teaching'],
  keywords: ['teaching', 'tutoring', 'tutor', 'teacher', 'instructor', 'lesson', 'course', 'class', 'student', 'educate', 'algorithmics', 'ecdl', 'workshop', 'lessons', 'training', 'mentoring', 'coding instructor', 'kids', 'education', 'mentor', 'διδασκαλία', 'μάθημα', 'φροντιστήριο', 'δάσκαλος', 'μαθητής', 'μαθήματα', 'εκπαίδευση', 'σεμινάρια', 'παραδίδω', 'καθηγητής', 'εκπαιδευτής'],
  patterns: [/teaching|tutoring|mentoring/i, /what\s+(do\s+)?(you\s+)?teach/i, /can\s+(you\s+)?teach/i],
  priority: 4,
  response: (profile) => {
    const teach = profile.teaching || [];
    const body = teach.map(t => `▸ **${t.role}**${t.location ? ` @ ${t.location}` : ''}${t.period ? ` (${t.period})` : ''}\n  ${t.description}\n  _${__tr('Subjects', 'Μαθήματα', 'Materie', 'Dersler', 'Materii', 'Lëndët', 'Предмети', 'Materias', 'Matières')}: ${t.subjects.join(', ')}_`).join('\n\n');
    const footer = __tr('\n\n💡 Ask about "Pricing" for tutoring rates!', '\n\n💡 Ρώτα "Pricing" για τιμές μαθημάτων!', '\n\n💡 Chiedi "Pricing" per le tariffe di tutoraggio!', '\n\n💡 Ders ücretleri için "Pricing" sor!', '\n\n💡 Întreabă "Pricing" pentru tarifele de tutorat!', '\n\n💡 Pyetni "Pricing" për tarifat e tutorimit!', '\n\n💡 Попитайте "Pricing" за тарифите за уроци!', '\n\n💡 ¡Pregunta "Pricing" por las tarifas de tutoría!', '\n\n💡 Demandez "Pricing" pour les tarifs de tutorat !');
    return __tr(
      `**Teaching & Tutoring Experience**\n\n${body}${footer}`,
      `**Διδασκαλία & Φροντιστήριο**\n\n${body}${footer}`,
      `**Esperienza di Insegnamento e Tutoraggio**\n\n${body}${footer}`,
      `**Öğretim ve Ders Verme Deneyimi**\n\n${body}${footer}`,
      `**Experiență de Predare și Tutorat**\n\n${body}${footer}`,
      `**Përvojë Mësimdhënieje dhe Tutorimi**\n\n${body}${footer}`,
      `**Опит в преподаването и обучението**\n\n${body}${footer}`,
      `**Experiencia en Enseñanza y Tutoría**\n\n${body}${footer}`,
      `**Expérience d'Enseignement et de Tutorat**\n\n${body}${footer}`
    );
  },
});

addIntent({
  id: 'pricing',
  labels: ['Pricing'],
  keywords: ['pricing', 'price', 'cost', 'rate', 'fee', 'how much', 'charge', 'budget', '€', 'eur', 'euro', 'dollar', 'hire', 'services', 'offer', 'prices', 'pricelist', 'payment', 'invest', 'package', 'packages', 'quote', 'τιμές', 'τιμολόγηση', 'κόστος', 'πόσο', 'χρεώνεις', 'πακέτα', 'πληρωμή', 'τιμή', 'κατάλογος', 'προσφορές', 'πακέτο'],
  patterns: [/how\s+much\s+(do\s+)?(you\s+)?(charge|cost)/i, /what\s+(are\s+)?(your\s+)?(rates|prices|pricelist)/i, /^(pricing|rates|cost|prices|quote)/i],
  priority: 4,
  response: (profile) => {
    const svc = profile.pricing.services || [];
    const body = svc.map(s => {
      const basic = s.tiers.find(t => t.name === 'Basic');
      return `▸ **${s.category}** — ${__tr('from', 'από', 'da', 'itibaren', 'de la', 'nga', 'от', 'desde', 'à partir de')} €${basic ? basic.priceEUR : 'varies'}`;
    }).join('\n');
    return __tr(
      `**Service Pricing** (EUR — starting prices):\n\n${body}\n\n**Tutoring** (per 1-1.5h session):\n▸ Coding & Programming: €20 remote / €25 in-person\n▸ MS Office, Windows/Linux: €10 remote / €15 in-person\n▸ Video, Image, Sound Editing: €15 remote / €20 in-person\n\n💡 Each service has Basic, Standard, and Premium tiers. Ask about a specific category for details!`,
      `**Τιμολόγηση Υπηρεσιών** (EUR — αρχικές τιμές):\n\n${body}\n\n**Φροντιστήριο** (ανά 1-1.5 ώρα):\n▸ Coding & Programming: €20 εξ αποστάσεως / €25 δια ζώσης\n▸ MS Office, Windows/Linux: €10 εξ αποστάσεως / €15 δια ζώσης\n▸ Video, Image, Sound Editing: €15 εξ αποστάσεως / €20 δια ζώσης\n\n💡 Κάθε υπηρεσία έχει Basic, Standard και Premium πακέτα. Ρώτα για συγκεκριμένη κατηγορία!`,
      `**Prezzi dei Servizi** (EUR — prezzi di partenza):\n\n${body}\n\n**Tutoraggio** (per sessione 1-1.5h):\n▸ Coding & Programming: €20 remoto / €25 in presenza\n▸ MS Office, Windows/Linux: €10 remoto / €15 in presenza\n▸ Video, Image, Sound Editing: €15 remoto / €20 in presenza\n\n💡 Ogni servizio ha piani Basic, Standard e Premium. Chiedi una categoria specifica per dettagli!`,
      `**Hizmet Fiyatlandırması** (EUR — başlangıç fiyatları):\n\n${body}\n\n**Ders** (1-1.5 saatlik oturum başına):\n▸ Kodlama ve Programlama: €20 uzaktan / €25 yüz yüze\n▸ MS Office, Windows/Linux: €10 uzaktan / €15 yüz yüze\n▸ Video, Görüntü, Ses Düzenleme: €15 uzaktan / €20 yüz yüze\n\n💡 Her hizmetin Basic, Standard ve Premium paketleri vardır. Detaylar için belirli bir kategori sorun!`,
      `**Prețuri Servicii** (EUR — prețuri de pornire):\n\n${body}\n\n**Tutorat** (per sesiune 1-1.5h):\n▸ Coding & Programming: €20 remote / €25 față în față\n▸ MS Office, Windows/Linux: €10 remote / €15 față în față\n▸ Video, Image, Sound Editing: €15 remote / €20 față în față\n\n💡 Fiecare serviciu are niveluri Basic, Standard și Premium. Întreabă o categorie specifică pentru detalii!`,
      `**Çmimet e Shërbimeve** (EUR — çmimet fillestare):\n\n${body}\n\n**Tutorim** (për seancë 1-1.5 orë):\n▸ Kodim & Programim: €20 në distancë / €25 fizikisht\n▸ MS Office, Windows/Linux: €10 në distancë / €15 fizikisht\n▸ Video, Foto, Zë: €15 në distancë / €20 fizikisht\n\n💡 Çdo shërbim ka paketa Basic, Standard dhe Premium. Pyetni për një kategori specifike!`,
      `**Цени на услугите** (EUR — начални цени):\n\n${body}\n\n**Обучение** (за сесия 1-1.5ч):\n▸ Програмиране: €20 отдалечено / €25 на място\n▸ MS Office, Windows/Linux: €10 отдалечено / €15 на място\n▸ Видео, Изображения, Звук: €15 отдалечено / €20 на място\n\n💡 Всяка услуга има Basic, Standard и Premium нива. Попитайте за конкретна категория!`,
      `**Precios de Servicios** (EUR — precios iniciales):\n\n${body}\n\n**Tutoría** (por sesión 1-1.5h):\n▸ Coding & Programming: €20 remoto / €25 presencial\n▸ MS Office, Windows/Linux: €10 remoto / €15 presencial\n▸ Video, Imagen, Sonido: €15 remoto / €20 presencial\n\n💡 Cada servicio tiene niveles Basic, Standard y Premium. ¡Pregunta por una categoría específica para más detalles!`,
      `**Tarifs des Services** (EUR — prix de départ) :\n\n${body}\n\n**Tutorat** (par séance 1-1.5h) :\n▸ Codage & Programmation : 20€ à distance / 25€ en présentiel\n▸ MS Office, Windows/Linux : 10€ à distance / 15€ en présentiel\n▸ Montage Vidéo, Image, Son : 15€ à distance / 20€ en présentiel\n\n💡 Chaque service a des niveaux Basique, Standard et Premium. Demandez une catégorie spécifique pour plus de détails !`
    );
  },
});

addIntent({
  id: 'pricing_detail',
  labels: [],
  keywords: ['website pricing', 'landing page', 'desktop app', 'web app', 'game dev', 'game development', 'website', 'landing', 'desktop', 'web application', 'saas', 'dashboard', 'game', 'unity', 'unreal', 'tutoring pricing', 'pricing details', 'τιμή ιστοσελίδας', 'τιμή εφαρμογής', 'τιμή παιχνιδιού'],
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
    const title = __tr(`${matched.category} — Pricing Details`, `${matched.category} — Λεπτομέρειες Τιμολόγησης`, `${matched.category} — Dettagli Prezzi`, `${matched.category} — Fiyatlandırma Detayları`, `${matched.category} — Detalii Prețuri`, `${matched.category} — Detaje Çmimesh`, `${matched.category} — Подробности за цените`, `${matched.category} — Detalles de Precios`, `${matched.category} — Détails des Prix`);
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
  keywords: ['games', 'minigames', 'mini games', 'game dev', 'snake', 'flappy', 'tetris', 'breakout', 'quiz', 'match', 'base ops', 'bug breaker', 'bio explorer', 'play', 'game project', 'pacman', 'donkey kong', 'mario', 'dev mario', 'code sprint', 'endless runner', 'dungeon', 'skill pacman', 'παιχνίδια', 'παιχνίδι', 'minigames', 'παιχνίδια υπολογιστή'],
  patterns: [/what\s+games/i, /what\s+(minigames|mini-games)/i, /^(games|minigames|παιχνίδια)/i, /what\s+(games|minigames)\s+(are\s+)?(there|available)/i],
  priority: 4,
  response: (profile) => {
    const games = profile.games || [];
    const body = games.map(g => {
      const url = g.playUrl ? ` — [${__tr('Play', 'Παίξε', 'Gioca', 'Oyna', 'Joacă', 'Luaj', 'Играй', 'Jugar', 'Jouer')}](${g.playUrl})` : g.link ? ` — [GitHub](${g.link})` : '';
      return `▸ **${g.title}**${url}\n  ${g.description.split('.')[0]}.\n  _${g.tech.join(', ')}_`;
    }).join('\n\n');
    const minigamesCount = games.filter(g => g.playUrl).length;
    const standaloneCount = games.length - minigamesCount;
    return __tr(
      `**🎮 Game Projects** (${games.length} total — ${minigamesCount} minigames + ${standaloneCount} standalone games)\n\n${body}\n\nAll minigames are playable from the Bio Explorer 2D overworld or directly via URL.`,
      `**🎮 Game Projects** (σύνολο ${games.length} — ${minigamesCount} minigames + ${standaloneCount} standalone games)\n\n${body}\n\nΌλα τα minigames παίζονται από τον Bio Explorer 2D overworld ή απευθείας από URL.`,
      `**🎮 Progetti di Giochi** (${games.length} totali — ${minigamesCount} minigiochi + ${standaloneCount} giochi autonomi)\n\n${body}\n\nTutti i minigiochi sono giocabili dal mondo Bio Explorer 2D o direttamente via URL.`,
      `**🎮 Oyun Projeleri** (toplam ${games.length} — ${minigamesCount} minigames + ${standaloneCount} bağımsız oyun)\n\n${body}\n\nTüm minigames, Bio Explorer 2D dünyasından veya doğrudan URL üzerinden oynanabilir.`,
      `**🎮 Proiecte Jocuri** (${games.length} total — ${minigamesCount} minigames + ${standaloneCount} jocuri standalone)\n\n${body}\n\nToate minigames-urile sunt jucabile din lumea Bio Explorer 2D sau direct prin URL.`,
      `**🎮 Projekte Lojërash** (gjithsej ${games.length} — ${minigamesCount} minigame + ${standaloneCount} lojëra standalone)\n\n${body}\n\nTë gjitha minigames janë të luajtshme nga Bio Explorer 2D ose direkt përmes URL.`,
      `**🎮 Игрови проекти** (общо ${games.length} — ${minigamesCount} мини-игри + ${standaloneCount} самостоятелни игри)\n\n${body}\n\nВсички мини-игри се играят от Bio Explorer 2D свят или директно чрез URL.`,
      `**🎮 Proyectos de Juegos** (${games.length} total — ${minigamesCount} minijuegos + ${standaloneCount} juegos independientes)\n\n${body}\n\nTodos los minijuegos se pueden jugar desde el mundo Bio Explorer 2D o directamente desde URL.`,
      `**🎮 Projets de Jeux** (${games.length} au total — ${minigamesCount} mini-jeux + ${standaloneCount} jeux autonomes)\n\n${body}\n\nTous les mini-jeux sont jouables depuis le monde Bio Explorer 2D ou directement via URL.`
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
    if (window.__CHAT_PROFILE_DATA) {
      this.cached = window.__CHAT_PROFILE_DATA;
      return this.cached;
    }
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
