/* GPAN Tech Fest — General Science — Interactivity */
(() => {
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  // Responsive nav
  const navToggle = $('.nav-toggle');
  const navMenu = $('#nav-menu');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const open = navMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  // Smooth scroll for same-page links
  $$('#nav-menu a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.getAttribute('href');
      const el = $(id);
      if (el) el.scrollIntoView({behavior:'smooth'});
      navMenu.classList.remove('open');
      navToggle.setAttribute('aria-expanded','false');
    });
  });

  // Background stars / particles
  const canvas = $('#bg-canvas');
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  let stars = [];
  function resize() {
    canvas.width = innerWidth * DPR;
    canvas.height = innerHeight * DPR;
  }
  function initStars() {
    stars = Array.from({length: 160}, () => ({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height,
      r: Math.random()*1.8 + .2,
      s: Math.random()*0.5 + 0.2
    }));
  }
  function animate() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (const s of stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(200, 210, 255, 0.85)';
      ctx.fill();
      s.y += s.s;
      if (s.y - s.r > canvas.height) s.y = -5;
    }
    requestAnimationFrame(animate);
  }
  window.addEventListener('resize', () => { resize(); initStars(); });
  resize(); initStars(); animate();

  // Reveal on scroll
  $$('.section .container, .card, .timeline li, .register form').forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, {threshold: 0.12});
  $$('.reveal').forEach(el => io.observe(el));

  // Topic modals
  const modals = {
    physics: $('#modal-physics'),
    chemistry: $('#modal-chemistry'),
    biology: $('#modal-biology'),
    astronomy: $('#modal-astronomy'),
    computer: $('#modal-computer'),
    general: $('#modal-general'),
  };
  $$('[data-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-open');
      modals[key]?.showModal();
    });
  });

  // Countdown with configurable date (stored in localStorage)
  const dd = $('#dd'), hh = $('#hh'), mm = $('#mm'), ss = $('#ss');
  const KEY = 'gpan_event_datetime';
  const defaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 0);          // default: 30 days from now
    d.setHours(0, 0, 0, 0);              // 10:00 local time
    return d;
  };
  function getEventDate() {
    const raw = localStorage.getItem(KEY);
    return raw ? new Date(raw) : defaultDate();
  }
  let EVENT_DATE = getEventDate();

  function tick() {
    const now = new Date();
    const t = EVENT_DATE - now;
    if (t <= 0) {
      dd.textContent = '00'; hh.textContent = '00'; mm.textContent = '00'; ss.textContent='00';
      return;
    }
    const days = Math.floor(t / (1000*60*60*24));
    const hours = Math.floor((t / (1000*60*60)) % 24);
    const mins = Math.floor((t / (1000*60)) % 60);
    const secs = Math.floor((t / 1000) % 60);
    dd.textContent = String(days).padStart(2,'0');
    hh.textContent = String(hours).padStart(2,'0');
    mm.textContent = String(mins).padStart(2,'0');
    ss.textContent = String(secs).padStart(2,'0');
  }
  setInterval(tick, 1000); tick();

  // Set event date via prompt (simple UX)
  $('#set-date').addEventListener('click', () => {
    const current = EVENT_DATE.toISOString().slice(0,16);
    const input = prompt('Set Event Date & Time (local) in format YYYY-MM-DDTHH:MM', current);
    if (!input) return;
    const cand = new Date(input);
    if (isNaN(cand.getTime())) {
      alert('Invalid date format.');
      return;
    }
    EVENT_DATE = cand;
    localStorage.setItem(KEY, cand.toISOString());
    tick();
  });

  // Registration form + validation + localStorage + CSV export
  const form = $('#reg-form');
  const errors = {
    name: v => v.trim().length >= 2 ? '' : 'Please enter your full name.',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Please enter a valid email.',
    branch: v => v ? '' : 'Please select a branch.'
  };
  const REG_KEY = 'gpan_science_registrations';

  function readRegs() {
    try { return JSON.parse(localStorage.getItem(REG_KEY) || '[]'); }
    catch { return []; }
  }
  function writeRegs(list) {
    localStorage.setItem(REG_KEY, JSON.stringify(list));
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    let hasError = false;
    for (const k of ['name','email','branch']) {
      const msg = errors[k](data[k] || '');
      const el = document.querySelector(`.error[data-for="${k}"]`);
      if (el) el.textContent = msg;
      if (msg) hasError = true;
    }
    if (hasError) return;

    const list = readRegs();
    list.push({
      timestamp: new Date().toISOString(),
      name: data.name.trim(),
      email: data.email.trim(),
      branch: data.branch,
      team: (data.team || '').trim()
    });
    writeRegs(list);
    form.reset();
    alert('Registration submitted! See Export CSV to download entries.');
  });

  $('#export-csv').addEventListener('click', () => {
    const list = readRegs();
    if (!list.length) { alert('No registrations yet.'); return; }
    const headers = ['timestamp','name','email','branch','team'];
    const csv = [headers.join(',')].concat(
      list.map(r => headers.map(h => `"${String(r[h]||'').replace(/"/g,'""')}"`).join(','))
    ).join('\n');

    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gpan_science_registrations.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

})();