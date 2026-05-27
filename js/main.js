function initSite() {

  /* ── PARTICLE CANVAS ── */
  (function() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];
    const COUNT = 90;
    const MAX_DIST = 130;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    function Particle() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.r = Math.random() * 1.8 + 0.5;
      this.alpha = Math.random() * 0.6 + 0.2;
    }
    Particle.prototype.update = function() {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > W) this.vx *= -1;
      if (this.y < 0 || this.y > H) this.vy *= -1;
    };

    for (let i = 0; i < COUNT; i++) particles.push(new Particle());

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        p.update();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,255,${p.alpha})`;
        ctx.fill();
        for (let j = i + 1; j < COUNT; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < MAX_DIST) {
            const opacity = (1 - dist / MAX_DIST) * 0.25;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(0,212,255,${opacity})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    draw();
  })();

  /* ── TYPING ANIMATION ── */
  (function() {
    const el = document.getElementById('typed-text');
    if (!el) return;
    const phrases = [
      'Computer Scientist',
      'Fullstack Engineer',
      'React & Vue Developer',
      'Django & Laravel Dev',
      'Game Developer',
      'ML Enthusiast'
    ];
    let pi = 0, ci = 0, deleting = false;
    function type() {
      const phrase = phrases[pi];
      if (!deleting) {
        el.textContent = phrase.slice(0, ++ci);
        if (ci === phrase.length) { deleting = true; setTimeout(type, 1800); return; }
      } else {
        el.textContent = phrase.slice(0, --ci);
        if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; }
      }
      setTimeout(type, deleting ? 55 : 90);
    }
    type();
  })();

  /* ── NAVBAR SCROLL ── */
  (function() {
    const nav = document.getElementById('navbar');
    const btn = document.getElementById('back-top');
    if (!nav) return;
    window.addEventListener('scroll', function() {
      if (window.scrollY > 80) { nav.classList.add('scrolled'); if (btn) btn.classList.add('visible'); }
      else { nav.classList.remove('scrolled'); if (btn) btn.classList.remove('visible'); }
    });
  })();

  /* ── HAMBURGER MENU ── */
  (function() {
    const ham = document.getElementById('hamburger');
    const menu = document.getElementById('mobile-menu');
    if (!ham || !menu) return;
    ham.addEventListener('click', function() {
      ham.classList.toggle('open');
      menu.classList.toggle('open');
    });
    document.querySelectorAll('.mobile-link').forEach(function(a) {
      a.addEventListener('click', function() {
        ham.classList.remove('open');
        menu.classList.remove('open');
      });
    });
  })();

  /* ── INTERSECTION OBSERVER (scroll reveal) ── */
  (function() {
    const opts = { threshold: 0.12, rootMargin: '0px 0px -40px 0px' };
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, opts);
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(function(el) {
      observer.observe(el);
    });
  })();

  /* ── STAGGER DELAY for cards ── */
  (function() {
    document.querySelectorAll('.project-gallery .project-card, .cards-grid .card, .freelance-grid .freelance-card, .edu-grid .edu-card').forEach(function(el, i) {
      el.style.transitionDelay = (i * 0.07) + 's';
    });
  })();
}
