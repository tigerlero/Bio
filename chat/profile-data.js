window.__CHAT_PROFILE_DATA = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "meta": {
    "name": "Panagiotis Efstathiadis",
    "title": "Computer Scientist & Fullstack Engineer",
    "tagline": "Building robust web applications, game engines, and everything in between.",
    "avatar": "https://github.com/tigerlero.png",
    "location": "Greece, Dodecanese, Leros",
    "phone": "+30 698 257 2887",
    "email": "visualbasic008@gmail.com"
  },
  "bio": {
    "summary": "I'm a Computer Scientist and Fullstack Engineer from Greece with a passion for building robust web applications, game engines, and everything in between. I hold a B.Sc. in Computer Science from the University of Piraeus and have worked across startups, agencies, and enterprise environments. I also teach coding to kids at Algorithmics.",
    "fullBio": "Panagiotis Efstathiadis is a versatile software engineer with expertise spanning fullstack web development, game engine programming, AI/ML, and systems programming. With professional experience across seven companies in Greece and Cyprus, he has built everything from CRM systems with AI chatbots to transfer booking platforms with Stripe integration. He is proficient in 14+ programming languages and comfortable across the entire stack — from React frontends to Docker/Kubernetes deployments. Outside of work, he develops game engines in Rust, explores WebGL/WebAssembly, and contributes to open-source projects on GitHub. He also runs a freelance business building websites, web apps, desktop apps, and games for clients."
  },
  "skills": {
    "Frontend": ["React", "Vue", "Angular", "TypeScript", "SCSS", "Tailwind CSS", "Material UI", "HTMX", "Bootstrap", "Bulma"],
    "Backend": ["Django", "Flask", "Express.js", "Laravel", "PHP", "FastAPI", "Node.js", "WordPress"],
    "Databases": ["PostgreSQL", "MySQL", "MongoDB", "SQLite", "Redis", "Firebase"],
    "DevOps": ["Docker", "Kubernetes", "Linux", "Nginx", "AWS", "GitHub Actions", "Plesk"],
    "Languages": ["Python", "JavaScript", "TypeScript", "C", "C++", "C#", "Rust", "Java", "Kotlin", "Prolog"],
    "Game Dev": ["Unity", "Unreal Engine 5", "Phaser.js", "Three.js", "PyGame", "Blender", "OpenGL", "WebGL"],
    "AI/ML": ["Keras", "TensorFlow", "PyTorch", "scikit-learn", "librosa", "OpenAI API", "LLama2", "NumPy", "Pandas"],
    "Tools & Platforms": ["Git", "Webpack", "Vite", "Playwright", "Pytest", "Celery", "FFmpeg", "Postman", "Stripe", "Leaflet.js"]
  },
  "projects": [
    {
      "id": "bio-explorer-2d",
      "title": "Bio Explorer 2D",
      "description": "Interactive 2D portfolio explorer built with Phaser.js and TypeScript. Features a 2600x2000 overworld with 5 themed zones (Home, Projects, Jobs, Skills, Education), NPC interactions, 49 collectible skills across 7 categories, a day/night cycle, minimap, save/load system, and 7 playable minigames: Snake, Project Match, Campus Quiz, Flappy Job, Tetris Projects, Base Ops, and Bug Breaker.",
      "tech": ["TypeScript", "Phaser.js", "HTML5 Canvas"],
      "link": "https://github.com/tigerlero",
      "highlights": [
        "2600x2000 pixel overworld with 5 interconnected zones and day/night cycle",
        "7 playable minigames integrated into the world map with thematic portals",
        "Full save/load system with localStorage persistence",
        "Virtual joystick and interaction button for mobile support",
        "Procedurally generated textures for trees, rocks, flowers, NPCs, and buildings",
        "3 coffee shops (Central Perk, Code Brew, Study Bean) with freddo espresso speed boost"
      ]
    },
    {
      "id": "bio-explorer-3d",
      "title": "Bio Explorer 3D",
      "description": "3D portfolio explorer built with Three.js and TypeScript. Navigate a 2600x2000 3D overworld with a capsule humanoid avatar, third-person orbit camera controls, dynamic day/night cycle, procedural trees, fog atmosphere, and interactive crystals representing 7 skill categories. Features fade transitions between the overworld and 5 detail zone scenes (ProjectPark, JobDistrict, SkillGarden, EducationCampus).",
      "tech": ["TypeScript", "Three.js", "WebGL"],
      "link": "https://github.com/tigerlero",
      "highlights": [
        "Third-person camera with right-drag orbit controls (WASD movement relative to camera angle)",
        "Procedural tree generation and fog-based atmospheric rendering",
        "Dynamic day/night cycle affecting light intensity and background color",
        "Fade transitions between overworld and 5 detail zone scenes",
        "Capsule humanoid avatar with walk animation, dust particles, and shadow",
        "3 coffee shops with freddo espresso speed boost mechanic"
      ]
    },
    {
      "id": "repaw",
      "title": "RePaw",
      "description": "Django REST API and webapp about dogs — connecting dog owners with services, walkers, and pet stores. Features a mobile-friendly responsive interface and comprehensive REST API with token-based authentication.",
      "tech": ["Django REST", "Python", "Mobile"],
      "link": "https://github.com/tigerlero/RePaw",
      "highlights": [
        "Full REST API with token-based authentication and CRUD operations",
        "Mobile-first responsive design for on-the-go access",
        "Service provider marketplace system connecting owners with walkers, vets, and pet stores"
      ]
    },
    {
      "id": "finance-accounts",
      "title": "Finance Accounts",
      "description": "Personal finance tracker with transaction management, category analytics, and spending visualization dashboards built with Django. Helps users track income, expenses, and budgets with interactive charts.",
      "tech": ["Django", "Python", "Analytics"],
      "link": "https://github.com/tigerlero/financialDjango",
      "highlights": [
        "Transaction management with categorization and search",
        "Spending analytics with interactive visualization dashboards",
        "Budget tracking and financial reporting"
      ]
    },
    {
      "id": "ur8",
      "title": "UR8 — YouTube Clone",
      "description": "Full YouTube clone with video streaming, channels, user subscriptions, comment system, and admin panel. Built with FFmpeg for video transcoding and PostgreSQL for relational storage. Redis caching for high-traffic optimization.",
      "tech": ["FFmpeg", "PostgreSQL", "Redis", "Bootstrap"],
      "link": "https://github.com/tigerlero/UR8",
      "highlights": [
        "Video upload and transcoding pipeline with FFmpeg supporting multiple formats",
        "Subscription-based feed algorithm for personalized content discovery",
        "Redis caching layer for high-traffic endpoint optimization",
        "Admin panel for content moderation and user management"
      ]
    },
    {
      "id": "pixelsprint",
      "title": "PixelSprint",
      "description": "Task management application with sprint planning, Kanban boards, team collaboration, Celery async task processing, and comprehensive Pytest test suite with 95%+ coverage.",
      "tech": ["Django", "Celery", "Bulma", "HTMX", "Pytest"],
      "link": "https://github.com/tigerlero/PixelSprint",
      "highlights": [
        "Drag-and-drop Kanban boards with HTMX for seamless interactivity",
        "Async background task processing with Celery and Redis broker",
        "95%+ test coverage with Pytest ensuring production reliability",
        "Sprint planning with velocity tracking and burndown charts"
      ]
    },
    {
      "id": "photofavorites",
      "title": "PhotoFavorites",
      "description": "Photo gallery application built with Angular 16 and TypeScript, featuring end-to-end testing with TestBed. Users can browse, favorite, and organize photo collections with a clean Material Design interface.",
      "tech": ["Angular", "TypeScript", "SCSS", "TestBed"],
      "link": "https://github.com/tigerlero/angular16_photo_favorites",
      "highlights": [
        "Angular 16 standalone components architecture",
        "End-to-end testing suite using Angular TestBed",
        "Responsive Material Design with custom SCSS theming"
      ]
    },
    {
      "id": "speech-recognition",
      "title": "Speech Recognition 0-9",
      "description": "Machine learning model that recognizes spoken digits 0-9 using MFCC audio feature extraction and a multi-layer perceptron classifier via Keras/TensorFlow. Achieves 95%+ accuracy on the FSDD dataset with real-time prediction via pyaudio.",
      "tech": ["Python", "Keras", "scikit-learn", "librosa", "pyaudio"],
      "link": "https://github.com/tigerlero/FSDD-0-9-Speech-Recognition-",
      "highlights": [
        "MFCC-based audio feature extraction pipeline for robust digit recognition",
        "Multi-layer perceptron classifier achieving 95%+ accuracy on FSDD dataset",
        "Real-time prediction via pyaudio microphone input for live demo",
        "Thesis project at University of Piraeus Computer Science department"
      ]
    },
    {
      "id": "kivy-youtube-downloader",
      "title": "Kivy YouTube Downloader",
      "description": "Cross-platform desktop application built with Python and Kivy for downloading YouTube videos and audio. Supports resolutions up to 8K and 320kbps audio, playlist downloads, and format selection via yt-dlp and FFmpeg.",
      "tech": ["Python", "Kivy", "yt-dlp", "FFmpeg"],
      "link": "https://github.com/tigerlero/kivy-youtube-downloader",
      "highlights": [
        "Cross-platform GUI with Kivy framework (Windows, macOS, Linux)",
        "Supports up to 8K video resolution and 320kbps audio quality",
        "Playlist download support with batch processing",
        "Format selection: MP4, WebM, MKV, MP3, FLAC, and more"
      ]
    },
    {
      "id": "tournaments",
      "title": "Tournaments",
      "description": "Sports tournament organizer built with TypeScript. Creates and manages bracket-style tournaments with multiple formats including single elimination, double elimination, and round-robin.",
      "tech": ["TypeScript", "Brackets"],
      "link": "https://github.com/tigerlero/Tournaments",
      "highlights": [
        "Multiple tournament formats: single elimination, double elimination, round-robin",
        "Interactive bracket visualization with match progression tracking",
        "Team and player management with seeding support"
      ]
    },
    {
      "id": "cryptdb-server",
      "title": "CryptDB-Server",
      "description": "Encrypted database server with secure query processing. Implements cryptographic techniques for executing SQL queries over encrypted data, ensuring data privacy even from the server operator.",
      "tech": ["Security", "Database", "Encryption"],
      "link": "https://github.com/tigerlero/CryptDB-Server",
      "highlights": [
        "Onion-layered encryption scheme for query-aware encryption",
        "Supports SELECT, JOIN, ORDER BY, and aggregation over encrypted data",
        "Demonstrates practical database encryption techniques from CryptDB research"
      ]
    },
    {
      "id": "rustix",
      "title": "Rustix Engine",
      "description": "Game development engine written in Rust with WebAssembly support. Features a custom Entity-Component-System (ECS) architecture for efficient game object management and a WebGL-powered renderer with batch draw-call optimization. Compiles to WASM for browser-based gameplay.",
      "tech": ["Rust", "WASM", "WebGL", "ECS"],
      "link": "https://github.com/tigerlero/Rustix",
      "highlights": [
        "Custom ECS (Entity-Component-System) architecture for game object management",
        "WebAssembly compilation for cross-platform browser-based gameplay",
        "WebGL renderer with batch draw-call optimization for 60fps performance",
        "Live demo available on GitHub Pages"
      ]
    },
    {
      "id": "flag-animation",
      "title": "Flag & Animation Builder",
      "description": "OpenGL-based flag and animation builder built with C++. Features real-time rendering of waving flags with customizable physics parameters — wind strength, gravity, fabric stiffness, and resolution.",
      "tech": ["C++", "OpenGL", "Computer Graphics"],
      "link": "https://github.com/tigerlero/flag-and-animation-builder-cpp-opengl",
      "highlights": [
        "Real-time 3D flag simulation with vertex-based physics",
        "Customizable parameters: wind, gravity, fabric stiffness, and grid resolution",
        "OpenGL rendering pipeline with shader-based lighting"
      ]
    },
    {
      "id": "misc-projects",
      "title": "Misc Projects",
      "description": "Various academic and experimental projects spanning multiple languages and paradigms including SQL, Java, Kotlin, Prolog, and HTML. Covers assignments, mini-tools, and explorations from university coursework and personal experimentation.",
      "tech": ["SQL", "Java", "Kotlin", "Prolog", "HTML"],
      "link": "https://github.com/tigerlero",
      "highlights": [
        "SQL database design and query optimization projects",
        "Java console applications and object-oriented design exercises",
        "Kotlin Android development experiments",
        "Prolog logic programming and knowledge base systems",
        "HTML/CSS static website prototypes"
      ]
    }
  ],
  "freelance": [
    {
      "project": "CareBeat.co.uk",
      "period": "2026 — Present",
      "description": "Django webapp for hospital staff recruitment with multi-HR management system. Enables hospitals to post positions, manage applicants, and coordinate hiring across departments.",
      "tech": ["Django", "Python", "PostgreSQL"]
    },
    {
      "project": "DrakosDesign.gr",
      "period": "2025 — Present",
      "description": "Woodshop e-commerce store with product catalog, shopping cart, and checkout system. Custom WordPress theme with WooCommerce integration for handmade wooden furniture.",
      "tech": ["WordPress", "WooCommerce", "SEO"]
    },
    {
      "project": "Expresstransfers.gr",
      "period": "2026 — Present",
      "description": "Transfer booking platform with Stripe payment processing, interactive Leaflet maps for route visualization, and containerized Docker deployment. Full booking lifecycle from search to confirmation.",
      "tech": ["Django", "Stripe", "Leaflet", "Docker", "WordPress"]
    },
    {
      "project": "IslandBookings.gr",
      "period": "2025 — 2026",
      "description": "Island accommodation booking platform for Greek island properties. Features property listings, availability calendars, online booking, and payment processing.",
      "tech": ["WordPress", "PHP", "MySQL"]
    },
    {
      "project": "MariaKostoula.gr",
      "period": "2022 — 2024",
      "description": "Personal portfolio and professional website for Maria Kostoula. Custom design with content management system, blog, and contact form integration.",
      "tech": ["WordPress", "PHP", "CSS"]
    },
    {
      "project": "AuraLibre",
      "period": "2026 — Present",
      "description": "Publishing house e-commerce platform with book catalog, shopping cart, and checkout. Custom theme and plugin development for book-specific metadata and inventory management.",
      "tech": ["WordPress", "WooCommerce", "PHP"]
    },
    {
      "project": "Enosiypallilonlerou.gr",
      "period": "2016 — 2018",
      "description": "Union website for employees of Leros island. Information portal with news, announcements, member resources, and event calendar.",
      "tech": ["WordPress", "PHP"]
    }
  ],
  "teaching": [
    {
      "role": "Algorithmics Tutor",
      "type": "Certified Licences",
      "description": "Certified to teach Unity, Python, Frontend Development, and Game Design through the Algorithmics international platform. Delivered courses to children aged 6-18.",
      "subjects": ["Unity", "Python", "Frontend Development", "Game Design"]
    },
    {
      "role": "ECDL Tutor",
      "location": "Kypseli, Piraeus",
      "period": "2016",
      "description": "Taught children IT fundamentals, Microsoft Office (Word, Excel, PowerPoint, Access), and Windows OS operation. Focused on making technology accessible and fun for young learners.",
      "subjects": ["MS Office", "Windows OS", "IT Fundamentals"]
    },
    {
      "role": "Algorithmics Tutor",
      "period": "2024",
      "description": "Delivered courses in Python programming fundamentals, Frontend web development (HTML, CSS, JavaScript), Unity game development, and Video Blogging to students of various ages and skill levels.",
      "subjects": ["Python", "Frontend Development", "Unity", "Video Blogging"]
    }
  ],
  "pricing": {
    "services": [
      {
        "category": "Websites",
        "icon": "fa-globe",
        "description": "Multi-page business sites, online stores, web applications, and mobile apps with CMS, databases, and modern frameworks.",
        "tiers": [
          { "name": "Basic", "priceEUR": 800, "priceUSD": 875, "priceGBP": 690, "features": ["Responsive design", "Contact form", "Basic SEO", "Social media integration"] },
          { "name": "Standard", "priceEUR": 3000, "priceUSD": 3275, "priceGBP": 2580, "features": ["All Basic features", "CMS integration", "Blog/news section", "Advanced SEO", "Performance optimization"] },
          { "name": "Premium", "priceEUR": 10000, "priceUSD": 10900, "priceGBP": 8600, "features": ["All Standard features", "Custom feature development", "Priority support", "Ongoing maintenance"] }
        ]
      },
      {
        "category": "Landing Page / Portfolio",
        "icon": "fa-file-alt",
        "description": "Single-page or multi-page personal/business site. Perfect for freelancers, artists, and small businesses wanting a professional online presence.",
        "tiers": [
          { "name": "Basic", "priceEUR": 400, "priceUSD": 436, "priceGBP": 344, "features": ["Responsive design", "Contact form", "Basic SEO", "Social media integration"] },
          { "name": "Standard", "priceEUR": 600, "priceUSD": 655, "priceGBP": 515, "features": ["All Basic features", "CMS integration", "Blog/news section", "Advanced SEO"] },
          { "name": "Premium", "priceEUR": 1000, "priceUSD": 1095, "priceGBP": 860, "features": ["All Standard features", "Custom features", "Priority support"] }
        ]
      },
      {
        "category": "Desktop Application",
        "icon": "fa-desktop",
        "description": "Cross-platform desktop software using Python (Kivy, PyQt) or Electron. For productivity tools, media apps, and automation utilities.",
        "tiers": [
          { "name": "Basic", "priceEUR": 800, "priceUSD": 872, "priceGBP": 688, "features": ["Cross-platform UI", "File operations", "Basic functionality", "Installer packaging"] },
          { "name": "Standard", "priceEUR": 3000, "priceUSD": 3275, "priceGBP": 2580, "features": ["All Basic features", "Database integration", "Advanced functionality"] },
          { "name": "Premium", "priceEUR": 8000, "priceUSD": 8725, "priceGBP": 6880, "features": ["All Standard features", "Auto-updates", "Custom features", "Priority support", "Ongoing maintenance"] }
        ]
      },
      {
        "category": "Web Application",
        "icon": "fa-window-maximize",
        "description": "Complex web applications with advanced features, APIs, dashboards, and database integration. For sophisticated SaaS platforms and internal business tools.",
        "tiers": [
          { "name": "Basic", "priceEUR": 1200, "priceUSD": 1308, "priceGBP": 1032, "features": ["User authentication & profiles", "Database integration", "Admin panel", "API development"] },
          { "name": "Standard", "priceEUR": 2000, "priceUSD": 2180, "priceGBP": 1720, "features": ["All Basic features", "CMS integration", "Advanced SEO", "Performance optimization"] },
          { "name": "Premium", "priceEUR": 7000, "priceUSD": 7635, "priceGBP": 6020, "features": ["All Standard features", "Custom features", "Priority support", "Ongoing maintenance"] }
        ]
      },
      {
        "category": "Game Development",
        "icon": "fa-gamepad",
        "description": "Custom video games built with Unity, Unreal Engine, Phaser.js, or custom Rust engines. Includes 2D/3D design, programming, optimization, and publishing.",
        "tiers": [
          { "name": "Basic", "priceEUR": 400, "priceUSD": 436, "priceGBP": 344, "features": ["Simple 2D game", "Basic mechanics & controls", "2 levels/scenes", "Web build export"] },
          { "name": "Standard", "priceEUR": 5000, "priceUSD": 5450, "priceGBP": 4300, "features": ["All Basic features", "3D game support", "Custom art & assets", "5+ levels", "Sound design & music"] },
          { "name": "Premium", "priceEUR": 20000, "priceUSD": 21800, "priceGBP": 17200, "features": ["All Standard features", "Multiplayer online", "Full 3D world design", "Custom engine development", "Priority support & updates"] }
        ]
      }
    ],
    "tutoring": {
      "description": "Per session (1-1.5h). Package discounts available for multiple sessions.",
      "remoteMultiplier": 1,
      "inPersonMultiplier": 1,
      "subjects": [
        { "name": "MS Office", "description": "Word, Excel, PowerPoint, Access — from basics to advanced", "beginnerRemote": 10, "beginnerInPerson": 15, "advancedRemote": 20, "advancedInPerson": 25, "proRemote": 30, "proInPerson": 35 },
        { "name": "Windows & Linux", "description": "OS installation, configuration, troubleshooting, system administration", "beginnerRemote": 10, "beginnerInPerson": 15, "advancedRemote": 20, "advancedInPerson": 25, "proRemote": 30, "proInPerson": 35 },
        { "name": "Video Editing", "description": "DaVinci Resolve, Premiere Pro — cutting, effects, color grading, export", "beginnerRemote": 15, "beginnerInPerson": 20, "advancedRemote": 25, "advancedInPerson": 30, "proRemote": 35, "proInPerson": 40 },
        { "name": "Image Editing", "description": "Photoshop, GIMP, Canva — retouching, compositing, graphic design, optimization", "beginnerRemote": 15, "beginnerInPerson": 20, "advancedRemote": 25, "advancedInPerson": 30, "proRemote": 35, "proInPerson": 40 },
        { "name": "Sound Editing", "description": "Audacity, FL Studio — recording, mixing, effects, audio restoration", "beginnerRemote": 15, "beginnerInPerson": 20, "advancedRemote": 25, "advancedInPerson": 30, "proRemote": 35, "proInPerson": 40 },
        { "name": "Coding & Programming", "description": "Python, web dev (HTML, CSS, JS), algorithms, problem-solving — all ages and levels", "beginnerRemote": 20, "beginnerInPerson": 25, "advancedRemote": 30, "advancedInPerson": 35, "proRemote": 40, "proInPerson": 40 }
      ]
    }
  },
  "games": [
    {
      "id": "snake-game",
      "title": "Snake Game",
      "description": "Classic Snake game built with Phaser.js and TypeScript. Navigate a 24x18 grid, collect 49 skill orbs across 7 categories (color-coded), and grow your snake. Features progressive speed increase from 180ms to 80ms interval, wall and self-collision game-over, and victory condition when all skills are collected.",
      "tech": ["TypeScript", "Phaser.js", "Game Development"],
      "playUrl": "play/?game=snake",
      "category": "Minigame"
    },
    {
      "id": "project-match",
      "title": "Project Match",
      "description": "Memory card matching game — flip cards to find 8 project tech-stack pairs (e.g., Django REST with Python, React with TypeScript). Built with Phaser.js. Features 4x4 grid, match tracking, and victory overlay with celebration.",
      "tech": ["TypeScript", "Phaser.js", "Memory Game"],
      "playUrl": "play/?game=match",
      "category": "Minigame"
    },
    {
      "id": "campus-quiz",
      "title": "Campus Quiz",
      "description": "Trivia quiz with 6 questions drawn from job experience and education history. Test your knowledge about the portfolio's professional background. Built with Phaser.js with multiple-choice answers and score tracking.",
      "tech": ["TypeScript", "Phaser.js", "Quiz"],
      "playUrl": "play/?game=quiz",
      "category": "Minigame"
    },
    {
      "id": "flappy-job",
      "title": "Flappy Job",
      "description": "Flappy Bird clone with a portfolio twist — flap through pipes labeled with job roles (Fullstack Developer, Coding Instructor) and project titles. Score tracks 'Jobs Completed'. Built with Phaser.js with gravity-based physics and collision detection.",
      "tech": ["TypeScript", "Phaser.js", "Arcade"],
      "playUrl": "play/?game=flappy",
      "category": "Minigame"
    },
    {
      "id": "tetris-projects",
      "title": "Tetris Projects",
      "description": "Full Tetris implementation with 7 tetrominoes (I, O, T, S, Z, L, J), 10x20 grid, hard drop, wall kicks, 5-level progressive speed system, line scoring, and pause support. Each tetromino displays a different skill category icon. Built with Phaser.js.",
      "tech": ["TypeScript", "Phaser.js", "Puzzle"],
      "playUrl": "play/?game=tetris",
      "category": "Minigame"
    },
    {
      "id": "base-ops",
      "title": "Base Ops",
      "description": "Multi-phase army simulation game. Experience 6 daily phases over 2 day cycles: Morning Briefing, Camera Room (spot anomalies), Field Patrol (find items), Recon (photo enemies), Basketball (score hoops), and Evening Debrief. Manage morale and fatigue for a mission grade. Built with Phaser.js.",
      "tech": ["TypeScript", "Phaser.js", "Simulation"],
      "playUrl": "play/?game=baseops",
      "category": "Minigame"
    },
    {
      "id": "bug-breaker",
      "title": "Bug Breaker",
      "description": "Breakout-style arcade game where you smash 20 blocks labeled with real coding bugs across 5 categories: Runtime Errors (Null Pointer, Stack Overflow, Memory Leak), Logic Bugs (Off-by-One, Infinite Loop, Race Condition), Security Holes (SQL Injection, XSS, Buffer Overflow), Code Smells (Spaghetti Code, Magic Numbers, Circular Dep), and Async Bugs (Uncaught Promise, Hoisting, Type Coercion). Mouse or keyboard controls, 3 lives, score tracking. Built with Phaser.js.",
      "tech": ["TypeScript", "Phaser.js", "Arcade"],
      "playUrl": "play/?game=bugbreaker",
      "category": "Minigame"
    },
    {
      "id": "skill-pacman",
      "title": "Skill Pacman",
      "description": "Pacman-style maze game where you collect 49 color-coded skill dots across a 28x20 grid while evading 4 job-themed ghosts (Frontend, Backend, Databases, DevOps). Features power pellets for ghost-eating, distinct ghost AI per role, animated mouth, score popups, and 3 lives. Collect all skills to win! Built with Phaser.js and TypeScript.",
      "tech": ["TypeScript", "Phaser.js", "Arcade"],
      "playUrl": "play/?game=pacman",
      "category": "Minigame"
    },
    {
      "id": "dev-mario",
      "title": "Dev Mario",
      "description": "Super Mario-style platformer with a developer protagonist. Run, jump, and stomp Bugs and Deadlines across a 5200px scrolling level. Collect coins, enter pipe sub-levels for Focus Mode to grab glowing bytes with intense visuals, and reach the Sprint End flag to deliver the demo on time! Built with Phaser.js and TypeScript.",
      "tech": ["TypeScript", "Phaser.js", "Platformer"],
      "playUrl": "play/?game=mario",
      "category": "Minigame"
    },
    {
      "id": "donkey-kong",
      "title": "Donkey Kong (Bug Tower)",
      "description": "Donkey Kong-style vertical climber — a Tester at the top of Bug Tower throws bugs down at you as you climb 6 levels of platforms connected by ladders. Dodge, jump, and collect coins to reach the top and survive the bug onslaught! Built with Phaser.js and TypeScript.",
      "tech": ["TypeScript", "Phaser.js", "Arcade", "Platformer"],
      "playUrl": "play/?game=dk",
      "category": "Minigame"
    },
    {
      "id": "pingpong",
      "title": "PingPong Game",
      "description": "Classic Pong game built with Python and PyGame. Features AI opponent with adjustable difficulty, local 2-player multiplayer mode, score tracking, and sound effects.",
      "tech": ["PyGame", "Python"],
      "link": "https://github.com/tigerlero/PyPong3hours",
      "category": "Game"
    },
    {
      "id": "asteroid-space",
      "title": "AsteroidSpaceGame",
      "description": "Space-themed asteroid shooter game with progressive difficulty. Navigate a spaceship through asteroid fields, shoot obstacles, and survive increasingly challenging waves. Built with Python and PyGame.",
      "tech": ["PyGame", "Python", "Game Dev"],
      "link": "https://github.com/tigerlero/AsteroidSpaceGame",
      "category": "Game"
    }
  ],
  "experience": [
    {
      "company": "Valmore-Neogen",
      "role": "Fullstack Developer",
      "period": "2023 — Present",
      "type": "Remote",
      "highlights": [
        "Building and maintaining fullstack web applications across multiple client projects",
        "Developing React and Vue.js frontends with modern tooling",
        "Building RESTful APIs with Express.js and PHP",
        "Containerized deployments with Docker and cloud infrastructure management",
        "Managing MongoDB databases and optimizing query performance"
      ],
      "tags": ["React", "Vue", "PHP", "Express", "Docker", "MongoDB"]
    },
    {
      "company": "ExpressTransfers",
      "role": "Fullstack Developer",
      "period": "2026 — Present",
      "type": "Remote",
      "highlights": [
        "Developing a transfer booking platform with Stripe payment integration",
        "Interactive Leaflet maps for route visualization and fare estimation",
        "Containerized deployment with Docker and CI/CD pipelines",
        "WordPress backend with custom plugin development"
      ],
      "tags": ["WordPress", "Docker", "Stripe", "Django", "Leaflet"]
    },
    {
      "company": "Evalion-SHL",
      "role": "Fullstack Developer",
      "period": "2025",
      "type": "Cyprus (On-site)",
      "highlights": [
        "Developed enterprise-grade web applications using Laravel + Vue.js stack",
        "End-to-end testing with Playwright for critical user flow coverage",
        "Containerized development environments with Laravel Sail",
        "Built with Inertia.js for seamless SPA experience"
      ],
      "tags": ["Laravel", "Vue", "Sail", "Inertia", "Playwright", "Docker"]
    },
    {
      "company": "Algorithmics",
      "role": "Coding Instructor",
      "period": "2024 — 2025",
      "type": "Greece (Remote)",
      "highlights": [
        "Taught Python, Scratch, and MIT App Inventor to children aged 6-18",
        "Developed lesson plans and curriculum materials for coding courses",
        "Mentored students through project-based learning modules",
        "Conducted workshops on algorithms, logic, and computational thinking"
      ],
      "tags": ["Python", "Scratch", "App Inventor", "Algorithms", "Teaching", "Curriculum"]
    },
    {
      "company": "Infologic-Weblogic",
      "role": "Fullstack Developer",
      "period": "2022 — 2023",
      "type": "Greece (Remote)",
      "highlights": [
        "Built a React-based CRM with AI chatbot integration powered by LLama2",
        "Developed booking web applications with Django REST Framework",
        "Created template component answer systems for automated responses",
        "Implemented RESTful APIs for frontend-backend communication"
      ],
      "tags": ["Django REST", "React", "LLama2", "LLM/AI", "CRM"]
    },
    {
      "company": "Newdeal Real Estates",
      "role": "Fullstack Developer & IT",
      "period": "2022",
      "type": "Cyprus (On-site)",
      "highlights": [
        "Developed real estate platform with Flask and MongoDB",
        "Implemented SEO strategies and Google Analytics tracking",
        "Managed WordPress and Laravel CMS websites",
        "Configured Plesk server hosting, domains, and email management"
      ],
      "tags": ["MongoDB", "Flask", "Firebase", "WordPress", "Laravel", "Plesk", "SEO", "CRM"]
    },
    {
      "company": "Datawise",
      "role": "Frontend / Fullstack Developer",
      "period": "2021 — 2022",
      "type": "Greece (On-site)",
      "highlights": [
        "Developed React applications with Material UI design system",
        "Built Node.js backend services for data processing",
        "Integrated Moodle e-learning platform with custom plugins",
        "Created Java-based tools and utilities for internal workflows"
      ],
      "tags": ["React", "Node.js", "Moodle", "Java", "MUI"]
    }
  ],
  "education": [
    {
      "degree": "B.Sc. Computer Science",
      "school": "University of Piraeus (UNIPI)",
      "year": 2020,
      "description": "Graduated with a focus on software engineering, distributed systems, and game development. Thesis on speech recognition using neural networks (FSDD dataset, MFCC features, Keras/TensorFlow). Relevant coursework included algorithms, data structures, databases, computer graphics, AI, and software engineering."
    },
    {
      "degree": "ECDL Expert Certification",
      "school": "European Computer Driving Licence",
      "year": 2015,
      "description": "Expert level certification covering advanced Office Suite (Word, Excel, PowerPoint, Access), Operating Systems (Windows, Linux), and PC Hardware fundamentals."
    }
  ],
  "contact": {
    "email": "visualbasic008@gmail.com",
    "phone": "+30 698 257 2887",
    "location": "Greece, Dodecanese, Leros",
    "availability": "Open to remote opportunities worldwide"
  },
  "social": {
    "github": {
      "url": "https://github.com/tigerlero",
      "username": "tigerlero"
    },
    "linkedin": {
      "url": "https://www.linkedin.com/in/panagiotis-efstathiadis-7b2a39112/",
      "username": "Panagiotis Efstathiadis"
    },
    "whatsapp": {
      "url": "https://wa.me/306982572887",
      "label": "+30 698 257 2887"
    },
    "viber": {
      "url": "viber://chat?number=%2B306982572887",
      "label": "+30 698 257 2887"
    }
  },
  "interests": [
    "Game engine development (Rust, WebGL, WASM)",
    "Speech recognition and audio processing with neural networks",
    "Web technologies and interactive data visualizations",
    "Open-source contribution and community projects",
    "Teaching and mentoring the next generation of developers",
    "Computer graphics and real-time rendering"
  ]
}
;
