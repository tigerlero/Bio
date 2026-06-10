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
    var pi = 0, ci = 0, deleting = false, to = null;
    function getPhrases() {
      var p = [];
      for (var i = 0; i < 6; i++) p.push(window._get ? window._get('typing_' + i) : '');
      return p;
    }
    function type() {
      var phrases = getPhrases();
      if (phrases.length === 0 || !phrases[0]) return;
      var phrase = phrases[pi];
      if (!deleting) {
        el.textContent = phrase.slice(0, ++ci);
        if (ci === phrase.length) { deleting = true; to = setTimeout(type, 1800); return; }
      } else {
        el.textContent = phrase.slice(0, --ci);
        if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; }
      }
      to = setTimeout(type, deleting ? 55 : 90);
    }
    window.restartTyping = function() {
      if (to) clearTimeout(to);
      ci = 0; deleting = false; pi = 0;
      if (el) type();
    };
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
    document.querySelectorAll('.project-gallery .project-card, .cards-grid .card, .freelance-grid .freelance-card, .edu-grid .edu-card, .detail-section').forEach(function(el, i) {
      el.style.transitionDelay = (i * 0.07) + 's';
    });
  })();

  /* ── GITHUB DASHBOARD ── */
  (function() {
    var cal = document.getElementById('contribution-calendar');
    var diary = document.getElementById('diary-list');
    if (!cal && !diary) return;
    var USERNAME = 'tigerlero';

    /* contribution calendar */
    if (cal) {
      fetch('https://github-contributions-api.jogruber.de/v4/' + USERNAME)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data || !data.contributions) throw new Error('No data');
          renderCalendar(cal, data);
        })
        .catch(function() {
          cal.innerHTML = '<div class="calendar-loading" style="color:#f87171;"><i class="fas fa-exclamation-triangle"></i> Could not load contribution data. <a href="https://github.com/' + USERNAME + '" target="_blank" style="color:var(--accent-blue);">View on GitHub</a></div>';
        });
    }

    function renderCalendar(container, data) {
      var contribs = data.contributions;
      var today = new Date();
      today.setHours(0,0,0,0);
      var yearAgo = new Date(today);
      yearAgo.setDate(yearAgo.getDate() - 90);
      var dayMap = {};
      for (var i = 0; i < contribs.length; i++) {
        dayMap[contribs[i].date] = contribs[i];
      }
      var weeks = [];
      var cursor = new Date(yearAgo);
      while (cursor <= today) {
        var week = [];
        for (var d = 0; d < 7; d++) {
          var ds = cursor.toISOString().slice(0,10);
          week.push(dayMap[ds] || { date: ds, count: 0, level: 0 });
          cursor.setDate(cursor.getDate() + 1);
          if (cursor > today) break;
        }
        if (week.length > 0) weeks.push(week);
      }
      var total = 0;
      for (var wi = 0; wi < weeks.length; wi++) {
        for (var di = 0; di < weeks[wi].length; di++) {
          total += weeks[wi][di].count;
        }
      }
      var dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var cellSize = window.innerWidth < 900 ? 50 : 100;
      var gap = 4;
      var step = cellSize + gap;

      /* header: total + legend */
      var html = '<div class="calendar-header" style="margin-bottom:8px;">';
      html += '<div class="calendar-stats"><span><strong>' + total + '</strong> contributions in the last 3 months</span></div>';
      html += '<div class="calendar-legend">Less <span class="calendar-cell level-0"></span><span class="calendar-cell level-1"></span><span class="calendar-cell level-2"></span><span class="calendar-cell level-3"></span><span class="calendar-cell level-4"></span> More</div>';
      html += '</div>';

      /* ── vertical layout: days on top, months on left ── */
      html += '<div class="cal-v">';

      /* top row: day-of-week labels (offset for month column) */
      html += '<div class="cal-v-row" style="padding-left:44px;">';
      for (var d = 0; d < 7; d++) {
        html += '<div style="width:' + cellSize + 'px;font-size:11px;text-align:center;color:var(--text-muted);font-weight:500;">' + dayNames[d] + '</div>';
      }
      html += '</div>';

      /* data rows: month label + 7 cells */
      var lastMonth = -1;
      for (var w = 0; w < weeks.length; w++) {
        var m = new Date(weeks[w][0].date + 'T00:00:00').getMonth();
        html += '<div class="cal-v-row" style="gap:' + gap + 'px;">';
        if (m !== lastMonth) {
          html += '<div style="width:40px;font-size:11px;color:var(--text-muted);text-align:right;padding-right:4px;line-height:' + step + 'px;font-weight:500;">' + monthNames[m] + '</div>';
          lastMonth = m;
        } else {
          html += '<div style="width:40px;"></div>';
        }
        for (var dd = 0; dd < 7; dd++) {
          if (dd < weeks[w].length) {
            var c = weeks[w][dd];
            html += '<div class="calendar-cell level-' + c.level + '" style="width:' + cellSize + 'px;height:' + cellSize + 'px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:' + Math.max(8, Math.min(14, cellSize * 0.16)) + 'px;line-height:1.1;" title="' + c.date + ': ' + c.count + ' contribution' + (c.count !== 1 ? 's' : '') + '"><div style="color:rgba(255,255,255,0.85);font-weight:600;">' + parseInt(c.date.slice(8)) + '</div><div style="color:rgba(255,255,255,0.5);font-size:' + Math.max(6, Math.min(11, cellSize * 0.12)) + 'px;">' + c.count + '</div></div>';
          } else {
            html += '<div style="width:' + cellSize + 'px;height:' + cellSize + 'px;"></div>';
          }
        }
        html += '</div>';
      }
      html += '</div>';
      container.innerHTML = html;
    }

    /* diary */
    if (diary) {
      fetch('https://api.github.com/users/' + USERNAME + '/events/public')
        .then(function(r) { return r.json(); })
        .then(function(events) {
          if (!events || !events.length) throw new Error('No events');
          renderDiary(diary, events);
        })
        .catch(function() {
          diary.innerHTML = '<div class="diary-error"><i class="fas fa-exclamation-triangle"></i> Could not load activity.</div>';
        });
    }

    function renderDiary(container, events) {
      var html = '';
      var maxItems = 15;
      var count = 0;
      for (var i = 0; i < events.length && count < maxItems; i++) {
        var ev = events[i];
        if (ev.type !== 'PushEvent' && ev.type !== 'CreateEvent' && ev.type !== 'PullRequestEvent' && ev.type !== 'IssuesEvent' && ev.type !== 'WatchEvent' && ev.type !== 'ForkEvent') continue;
        count++;
        var repo = ev.repo.name;
        var typeLabel = ev.type.replace('Event', '');
        if (typeLabel === 'Push') typeLabel = 'Commit';
        else if (typeLabel === 'Watch') typeLabel = 'Star';
        var timeAgo = getTimeAgo(ev.created_at);
        html += '<div class="diary-item">';
        html += '<div class="diary-item-header">';
        html += '<span class="diary-repo">' + repo + '</span>';
        html += '<span class="diary-type">' + typeLabel + '</span>';
        html += '<span class="diary-time" title="' + ev.created_at + '">' + timeAgo + '</span>';
        html += '</div>';
        if (ev.type === 'PushEvent' && ev.payload.commits && ev.payload.commits.length) {
          html += '<div class="diary-commits">';
          var maxCommits = Math.min(ev.payload.commits.length, 3);
          for (var ci = 0; ci < maxCommits; ci++) {
            var msg = ev.payload.commits[ci].message.split('\n')[0];
            if (msg.length > 60) msg = msg.slice(0, 57) + '...';
            html += '<div class="diary-commit"><i class="fas fa-code-commit"></i> ' + escapeHtml(msg) + '</div>';
          }
          if (ev.payload.commits.length > 3) {
            html += '<div class="diary-commit" style="color:var(--text-muted);font-style:italic;">+ ' + (ev.payload.commits.length - 3) + ' more</div>';
          }
          html += '</div>';
        } else if (ev.type === 'CreateEvent' && ev.payload.ref) {
          html += '<div class="diary-commits"><div class="diary-commit"><i class="fas fa-code-branch"></i> ' + escapeHtml(ev.payload.ref) + '</div></div>';
        } else if (ev.type === 'PullRequestEvent') {
          html += '<div class="diary-commits"><div class="diary-commit"><i class="fas fa-code-pull-request"></i> ' + escapeHtml(ev.payload.action) + ': ' + escapeHtml((ev.payload.pull_request && ev.payload.pull_request.title) || '') + '</div></div>';
        } else if (ev.type === 'IssuesEvent') {
          html += '<div class="diary-commits"><div class="diary-commit"><i class="fas fa-circle-exclamation"></i> ' + escapeHtml(ev.payload.action) + ': ' + escapeHtml((ev.payload.issue && ev.payload.issue.title) || '') + '</div></div>';
        }
        html += '</div>';
      }
      if (!count) {
        html = '<div class="diary-empty">No recent public activity found.</div>';
      }
      html += '<div style="text-align:center;margin-top:0.75rem;"><a href="https://github.com/' + USERNAME + '" target="_blank" class="btn btn-outline" style="display:inline-flex;"><i class="fab fa-github"></i> View full profile</a></div>';
      container.innerHTML = html;
    }

    function getTimeAgo(dateStr) {
      var n = Date.now() - new Date(dateStr).getTime();
      var mins = Math.floor(n / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return mins + 'm ago';
      var hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + 'h ago';
      var days = Math.floor(hrs / 24);
      if (days < 30) return days + 'd ago';
      var months = Math.floor(days / 30);
      return months + 'mo ago';
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
  })();

}
