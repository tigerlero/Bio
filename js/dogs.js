(function(){
  var c = document.getElementById('dogsCanvas');
  if (!c) return;
  var cx = c.getContext('2d');
  var W, H, LINE = '#00d4ff';

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    c.width = W;
    c.height = H;
  }
  resize();
  window.addEventListener('resize', resize);

  var dogs = [
    { x:W*0.2,y:H*0.75,vx:0,vy:0,s:1.0,er:'p',nm:'Onar',sp:1.2,ears:'black',pet:0,resting:true },
    { x:W*0.4,y:H*0.78,vx:0,vy:0,s:0.9,er:'f',nm:'Goldie',sp:1.0,pet:0,resting:true },
    { x:W*0.6,y:H*0.76,vx:0,vy:0,s:0.75,er:'p',nm:'Reggie',sp:1.5,pet:0,resting:true },
    { x:W*0.8,y:H*0.8,vx:0,vy:0,s:0.5,er:'f',nm:'Luna',sp:2.0,pet:0,resting:true }
  ];
  var ball = { x:W/2,y:H/2,vx:0,vy:0,r:10,a:false,t:0,held:false };
  function allResting() { for (var i=0;i<dogs.length;i++) { if (!dogs[i].resting) return false; } return true; }
  document.body.style.cursor = allResting() ? 'default' : 'grab';
  var m = { x:W/2,y:H/2,dx:0,dy:0,dn:false };
  var time = 0, frame = 0;

  function dog(d) {
    var s=d.s*50, sw=Math.sin(time*d.sp*5)*s*0.08, wg=Math.sin(time*d.sp*8)*s*0.12;
    var dx=ball.a?ball.x-d.x:m.x-d.x, f=dx>0;
    cx.save(); cx.translate(Math.round(d.x),Math.round(d.y));
    if (!f) cx.scale(-1,1);
    cx.strokeStyle=LINE; cx.lineWidth=Math.max(1.5,d.s*1.5); cx.lineCap='round'; cx.lineJoin='round';
    cx.globalAlpha=0.35;
    if (d.resting && Math.abs(d.vx) < 2 && Math.abs(d.vy) < 2) {
      // sleeping pose
      cx.globalAlpha=0.25;
      // curled body
      cx.beginPath(); cx.ellipse(0,0,s*0.4,s*0.2,0,0,Math.PI*2); cx.stroke();
      // tucked head
      var shx=s*0.3, shy=-s*0.1;
      cx.beginPath(); cx.ellipse(shx,shy,s*0.16,s*0.18,0.3,0,Math.PI*2); cx.stroke();
      cx.beginPath(); cx.ellipse(shx+s*0.08,shy+s*0.02,s*0.1,s*0.07,0,0,Math.PI*2); cx.stroke();
      // closed eye
      cx.fillStyle=LINE; cx.globalAlpha=0.3;
      cx.beginPath(); cx.arc(shx+s*0.04,shy-0.02*s,s*0.02,0,Math.PI*2); cx.fill();
      // zzz
      cx.globalAlpha=0.5 + Math.sin(time*4)*0.2; cx.font='bold 16px monospace'; cx.textAlign='center';
      cx.fillStyle=LINE; cx.fillText('Z z z', s*0.06, -s*0.55 - Math.sin(time*3)*s*0.05);
      cx.restore(); return;
    }
    // tail
    cx.beginPath(); cx.moveTo(-s*0.5,-s*0.05); cx.quadraticCurveTo(-s*0.7,-s*0.4+wg,-s*0.9,-s*0.25+wg); cx.stroke();
    // back legs
    cx.strokeRect(-s*0.35,s*0.3+sw,s*0.09,s*0.3); cx.beginPath(); cx.ellipse(-s*0.305,s*0.6+sw,s*0.06,s*0.03,0,0,Math.PI*2); cx.stroke();
    cx.strokeRect(-s*0.15,s*0.3-sw,s*0.09,s*0.3); cx.beginPath(); cx.ellipse(-s*0.105,s*0.6-sw,s*0.06,s*0.03,0,0,Math.PI*2); cx.stroke();
    // body
    cx.beginPath(); cx.ellipse(0,0,s*0.58,s*0.3,0,0,Math.PI*2); cx.stroke();
    // front legs
    cx.strokeRect(s*0.15,s*0.3+sw,s*0.09,s*0.3); cx.beginPath(); cx.ellipse(s*0.195,s*0.6+sw,s*0.06,s*0.03,0,0,Math.PI*2); cx.stroke();
    cx.strokeRect(s*0.35,s*0.3-sw,s*0.09,s*0.3); cx.beginPath(); cx.ellipse(s*0.395,s*0.6-sw,s*0.06,s*0.03,0,0,Math.PI*2); cx.stroke();
    // neck
    cx.beginPath(); cx.ellipse(s*0.38,-s*0.05,s*0.2,s*0.22,0,0,Math.PI*2); cx.stroke();
    // head
    var hx=s*0.55, hy=-s*0.18;
    cx.beginPath(); cx.ellipse(hx,hy,s*0.22,s*0.25,0,0,Math.PI*2); cx.stroke();
    // snout
    cx.beginPath(); cx.ellipse(hx+s*0.18,hy+s*0.05,s*0.14,s*0.11,0,0,Math.PI*2); cx.stroke();
    // nose
    cx.fillStyle=LINE; cx.globalAlpha=0.5; cx.beginPath(); cx.ellipse(hx+s*0.26,hy+s*0.04,s*0.045,s*0.035,0,0,Math.PI*2); cx.fill();
    // mouth
    cx.globalAlpha=0.35; cx.beginPath(); cx.moveTo(hx+s*0.24,hy+s*0.07); cx.quadraticCurveTo(hx+s*0.18,hy+s*0.14,hx+s*0.12,hy+s*0.1); cx.stroke();
    // ears
    cx.globalAlpha=0.25;
    if (d.er==='p') {
      cx.beginPath(); cx.moveTo(hx-0.22*s,hy-0.1*s); cx.lineTo(hx-0.08*s,hy-0.48*s); cx.lineTo(hx+0.08*s,hy-0.2*s); cx.closePath(); cx.stroke();
      cx.beginPath(); cx.moveTo(hx-0.04*s,hy-0.1*s); cx.lineTo(hx+0.1*s,hy-0.48*s); cx.lineTo(hx+0.2*s,hy-0.15*s); cx.closePath(); cx.stroke();
    } else {
      cx.beginPath(); cx.moveTo(hx-0.12*s,hy-0.18*s); cx.quadraticCurveTo(hx-0.16*s,hy+0.1*s,hx-0.14*s,hy+0.3*s); cx.quadraticCurveTo(hx-0.1*s,hy+0.28*s,hx-0.08*s,hy-0.06*s); cx.closePath(); cx.stroke();
      cx.beginPath(); cx.moveTo(hx+0.1*s,hy-0.18*s); cx.quadraticCurveTo(hx+0.06*s,hy+0.12*s,hx+0.08*s,hy+0.32*s); cx.quadraticCurveTo(hx+0.12*s,hy+0.3*s,hx+0.14*s,hy-0.06*s); cx.closePath(); cx.stroke();
    }
    // eyes
    cx.fillStyle=LINE; cx.globalAlpha=0.5; cx.beginPath(); cx.arc(hx-0.08*s,hy-0.06*s,s*0.035,0,Math.PI*2); cx.arc(hx+0.06*s,hy-0.06*s,s*0.035,0,Math.PI*2); cx.fill();
    // pet hearts
    if (d.pet > 0) {
      cx.globalAlpha = Math.min(1, d.pet / 20);
      cx.strokeStyle = LINE; cx.lineWidth = 1.5;
      var hoffs = -Math.sin(d.pet * 0.3) * s * 0.08;
      for (var hi = 0; hi < 3; hi++) {
        var hx2 = hx - s*0.06 + hi * s*0.06, hy2 = hy - s*0.45 + hoffs;
        cx.beginPath();
        cx.moveTo(hx2, hy2 + s*0.04);
        cx.quadraticCurveTo(hx2 - s*0.04, hy2 - s*0.02, hx2, hy2 - s*0.04);
        cx.quadraticCurveTo(hx2 + s*0.04, hy2 - s*0.02, hx2, hy2 + s*0.04);
        cx.stroke();
      }
    }
    cx.restore();
  }

  function drawHouses() {
    for (var hi = 0; hi < dogs.length; hi++) {
      var hx = W - 60, hy = 110 + hi * 70, hw = 44, hh = 46;
      cx.save();
      cx.translate(hx, hy);
      cx.strokeStyle = LINE; cx.lineWidth = 2; cx.globalAlpha = 0.3;
      cx.beginPath(); cx.moveTo(-hw*0.55, 0); cx.lineTo(0, -hh*0.6); cx.lineTo(hw*0.55, 0); cx.closePath(); cx.stroke();
      cx.strokeRect(-hw*0.55, 0, hw*1.1, hh*0.4);
      cx.globalAlpha = 0.4; cx.font = 'bold 24px monospace'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillStyle = LINE; cx.fillText(dogs[hi].nm[0], 0, -hh*0.3);
      cx.restore();
    }
  }
  function checkElemBounce() {
    if (!ball.a) return;
    var el = document.elementFromPoint(ball.x, ball.y);
    if (!el || el === c || el === document.body || el === document.documentElement) return;
    var r = el.getBoundingClientRect();
    var dl = ball.x - r.left, dr = r.right - ball.x;
    var dt = ball.y - r.top, db = r.bottom - ball.y;
    var min = Math.min(dl, dr, dt, db);
    if (min < 30) {
      if (min === dl || min === dr) { ball.vx *= -0.8; ball.x += ball.vx*1.5 + (min===dl?-6:6); }
      else { ball.vy *= -0.8; ball.y += ball.vy*1.5 + (min===dt?-6:6); }
    }
  }

  function loop(){
    frame++;
    time += 0.016;
    if (ball.a) {
      ball.t += 16;
      if (ball.t > 6000) { ball.vx = 0; ball.vy = 0; ball.a = false; }
      ball.vy += 0.3;
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vx *= 0.99;
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -0.7; }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx *= -0.7; }
      if (ball.y > H - ball.r) { ball.y = H - ball.r; ball.vy *= -0.6; ball.vx *= 0.95; }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy *= -0.6; }
      if (frame % 2 === 0) checkElemBounce();
      if (Math.abs(ball.vx) < 0.3 && Math.abs(ball.vy) < 0.3 && ball.y >= H - ball.r - 2) {
        ball.vx = 0; ball.vy = 0; ball.a = false;
      }
    }
    var tx = ball.a ? ball.x : m.x;
    var ty = ball.a ? ball.y : Math.min(m.y, H-20);
    dogs.forEach(function(d){
      var targetX = tx, targetY = ty;
      if (d.resting) { var si = dogs.indexOf(d); targetX = W - 60; targetY = 110 + si * 70; }
      var dx = targetX - d.x, dy = targetY - d.y, dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > 15) { var sp = d.sp * 2.0; d.vx += dx/dist*sp*0.08; d.vy += dy/dist*sp*0.08; }
      // avoid hero button zone (center-top, not overlapping houses on the right)
      var hz = { x:W*0.45, y:Math.min(H*0.3,350), w:W*0.3, h:200 };
      if (Math.abs(d.x - hz.x) < hz.w && Math.abs(d.y - hz.y) < hz.h) {
        var px = d.x - hz.x, py = d.y - hz.y, pd = Math.sqrt(px*px+py*py)||1;
        d.vx += px/pd*1.2; d.vy += py/pd*1.2;
      }
      dogs.forEach(function(o){
        if (o === d) return;
        var sx = d.x - o.x, sy = d.y - o.y, sd = Math.sqrt(sx*sx + sy*sy);
        if (sd < d.s*20 + o.s*20 + 5) { d.vx += sx/sd * 0.3; d.vy += sy/sd * 0.3; }
      });
      if (d.pet > 0) d.pet--;
      d.vx *= 0.9; d.vy *= 0.9;
      d.x += d.vx; d.y += d.vy;
      d.x = Math.max(10, Math.min(W-10, d.x));
      d.y = Math.max(10, Math.min(H-10, d.y));
    });
    cx.clearRect(0, 0, W, H);
    // ball trail
    if (ball.a && (Math.abs(ball.vx) > 0.5 || Math.abs(ball.vy) > 0.5)) {
      cx.fillStyle = 'rgba(0,212,255,0.06)';
      for (var i = 1; i <= 4; i++) {
        cx.beginPath();
        cx.arc(ball.x - ball.vx*i*0.4, ball.y - ball.vy*i*0.4, ball.r - i*1.8, 0, Math.PI*2);
        cx.fill();
      }
    }
    // ball
    if (ball.a || Math.abs(ball.vx) > 0.3) {
      cx.strokeStyle = LINE; cx.lineWidth = 2; cx.globalAlpha = 0.6;
      cx.beginPath(); cx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); cx.stroke();
      cx.globalAlpha = 0.3; cx.lineWidth = 1;
      cx.beginPath(); cx.moveTo(ball.x-ball.r, ball.y); cx.lineTo(ball.x+ball.r, ball.y); cx.stroke();
      cx.beginPath(); cx.moveTo(ball.x, ball.y-ball.r); cx.lineTo(ball.x, ball.y+ball.r); cx.stroke();
      cx.globalAlpha = 1;
    }
    // dogs
    var ds = dogs.slice().sort(function(a,b){ return (a.y + (a.s*25)) - (b.y + (b.s*25)); });
    cx.globalAlpha = 1;
    ds.forEach(function(d){ dog(d); });
    drawHouses();
    requestAnimationFrame(loop);
  }

  document.addEventListener('mousemove', function(e) { m.x = e.clientX; m.y = e.clientY; if (allResting()) return; if (ball.held) { ball.x = e.clientX; ball.y = e.clientY; } else if (!ball.a) { ball.x = e.clientX; ball.y = e.clientY; } });
  document.addEventListener('mousedown', function(e) {
    // check house clicks
    for (var hi = 0; hi < dogs.length; hi++) {
      var hx = W - 60, hy = 110 + hi * 70;
      if (Math.abs(e.clientX - hx) < 55 && Math.abs(e.clientY - hy) < 35) {
        dogs[hi].resting = !dogs[hi].resting;
        document.body.style.cursor = allResting() ? 'default' : 'grab';
        return;
      }
    }
    if (allResting()) return;
    var hitDog = false;
    for (var di = 0; di < dogs.length; di++) {
      var dd = dogs[di];
      if (Math.abs(e.clientX - dd.x) < dd.s * 55 && Math.abs(e.clientY - dd.y) < dd.s * 55) {
        dd.pet = 40; hitDog = true; break;
      }
    }
    if (hitDog) return;
    m.dn = true; m.dx = e.clientX; m.dy = e.clientY; ball.a = false; ball.held = true; ball.vx = 0; ball.vy = 0; ball.x = e.clientX; ball.y = e.clientY; document.body.style.cursor = 'grabbing';
  });
  document.addEventListener('mouseup', function(e) {
    if (!m.dn) return; if (allResting()) return;
    m.dn = false; ball.held = false;
    ball.x = e.clientX; ball.y = e.clientY;
    ball.vx = (e.clientX - m.dx) * 0.5;
    ball.vy = (e.clientY - m.dy) * 0.5;
    ball.a = true; ball.t = 0;
    document.body.style.cursor = 'grab';
  });
  document.addEventListener('touchstart', function(e) {
    var t = e.touches[0];
    m.x = t.clientX; m.y = t.clientY;
  }, {passive:true});
  document.addEventListener('touchmove', function(e) {
    var t = e.touches[0];
    m.x = t.clientX; m.y = t.clientY;
  }, {passive:true});

  loop();
})();
