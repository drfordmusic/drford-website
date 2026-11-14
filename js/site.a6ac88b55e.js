/* Dr. Ford — site behavior. Vanilla JS, no dependencies, no third-party requests
   except the consultation form submission (Formspree). Every effect degrades to a
   fully readable static page if JS is off or the visitor prefers reduced motion. */
(function () {
  'use strict';

  var doc = document.documentElement;
  doc.classList.remove('no-js');
  doc.classList.add('js');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Ad attribution (first-party, no cookies, no third parties) ----------
     An ad landing page (/go/<platform>/) or a utm_source tag records where the
     visitor came from in this browser only. The consultation form sends it along,
     so each inquiry says which ad it came from. Expires after 90 days. */
  var SRC_KEY = 'drf_src', SRC_DAYS = 90;
  var clean = function (v) { return v ? String(v).replace(/[^\w .:/+-]/g, '').slice(0, 80) : ''; };
  (function recordSource() {
    var q; try { q = new URLSearchParams(location.search); } catch (e) { return; }
    var src = clean(document.body.getAttribute('data-source') || q.get('utm_source'));
    if (!src) return;
    var rec = { src: src, campaign: clean(q.get('utm_campaign')), ad: clean(q.get('utm_content')), t: Date.now() };
    try { localStorage.setItem(SRC_KEY, JSON.stringify(rec)); } catch (e) {}
  })();
  // A page can name what a referrer-less visit most likely means (for /contact: the printed banner QR code).
  var directLabel = (!document.referrer && document.body.getAttribute('data-direct-label')) || '';
  function readSource() {
    try {
      var o = JSON.parse(localStorage.getItem(SRC_KEY) || 'null');
      if (!o || !o.src || Date.now() - o.t > SRC_DAYS * 864e5) return directLabel || 'No ad (direct, search or referral)';
      return [o.src, o.campaign, o.ad].filter(Boolean).join(' · ') + ' (landed ' + new Date(o.t).toISOString().slice(0, 10) + ')';
    } catch (e) { return 'Unknown'; }
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$('.rv, .grow');
  if ('IntersectionObserver' in window && !reduce.matches) {
    var io = new IntersectionObserver(function (entries) {
      // Stagger: things that arrive together cascade in 70ms apart (Emil Kowalski's 30-80ms rule)
      var k = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.setProperty('--d', Math.min(k++, 4) * 70 + 'ms');
        e.target.classList.add('in'); io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- "How much should I shape it" ---------- */
  var shapes = [
    { text: 'Your demo, played by real Nashville musicians and mixed to sound like a record. Exactly the way you wrote it.', note: 'Most artists start here' },
    { text: 'Bring me the song, and I’ll bring the ideas: arrangement, structure, sound. You pick what stays.', note: 'Your song, taken further' },
    { text: 'Bring a title, a story or just a feeling. We’ll write it together, and I’ll produce it start to finish.', note: 'Co-writing and production' },
    { text: 'A custom song for someone you love, or original music for TV, film and ads. Tell me the story, and I’ll do the rest.', note: 'Custom songs, gifts and sync' }
  ];
  var shapeCard = $('#shape');
  if (shapeCard) {
    var toggles = $$('.toggle', shapeCard);
    var sText = $('.shape-text', shapeCard), sNote = $('.shape-note', shapeCard);
    var go = $('.shape-go', shapeCard);
    // The visitor's pick carries into the consultation form (same three answers there).
    function carry(label) {
      $$('input[name="shaping"]').forEach(function (r) { r.checked = (r.value === label); });
    }
    toggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = Number(btn.getAttribute('data-shape')) || 0;
        toggles.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        sText.textContent = shapes[i].text;
        sNote.textContent = shapes[i].note;
        carry(btn.textContent.trim());
        if (go) go.hidden = false;
      });
    });
  }

  /* ---------- Before / after player: two versions in sync, switch at the same spot ---------- */
  var AC = window.AudioContext || window.webkitAudioContext;
  var abActive = null;
  $$('[data-ab]').forEach(function (card) {
    if (!AC) { card.querySelector('.ab-status').textContent = 'This browser can’t play the comparison.'; return; }
    var btns = $$('.ab-play', card), bar = $('.ab-progress span', card), status = $('.ab-status', card);
    var ctx = null, buffers = null, gains = {}, sources = [], startedAt = 0, offset = 0, playing = false, current = null, raf = 0, loading = false;
    function load() {
      if (buffers || loading) return Promise.resolve();
      loading = true; status.textContent = 'Loading…';
      ctx = ctx || new AC();
      // AAC (.mp4) everywhere it plays; Opus (.webm) for the few browsers without AAC.
      var probe = document.createElement('audio');
      var ext = probe.canPlayType('audio/mp4; codecs="mp4a.40.2"') ? '.mp4' : '.webm';
      var pick = function (u) { return u.replace(/\.mp4$/, ext); };
      var get = function (u) { u = pick(u); return fetch(u, { credentials: 'omit' }).then(function (r) { if (!r.ok) throw new Error(); return r.arrayBuffer(); }).then(function (b) { return new Promise(function (res, rej) { ctx.decodeAudioData(b, res, rej); }); }); };
      return Promise.all([get(card.getAttribute('data-memo')), get(card.getAttribute('data-record'))]).then(function (b) {
        buffers = { memo: b[0], record: b[1] }; loading = false; status.textContent = '';
      }).catch(function () { loading = false; status.textContent = 'Couldn’t load the audio. Try again.'; throw new Error('load'); });
    }
    function duration() { return Math.min(buffers.memo.duration, buffers.record.duration); }
    function now() { return playing ? Math.min(duration(), offset + ctx.currentTime - startedAt) : offset; }
    function setGains(v, t) {
      ['memo', 'record'].forEach(function (k) { if (!gains[k]) return; gains[k].gain.cancelScheduledValues(ctx.currentTime); gains[k].gain.setTargetAtTime(k === v ? 1 : 0, ctx.currentTime, t || 0.015); });
    }
    function stopSources() { sources.forEach(function (src) { try { src.onended = null; src.stop(); } catch (e) {} }); sources = []; cancelAnimationFrame(raf); }
    function tick() { bar.style.transform = 'scaleX(' + (now() / duration()) + ')'; if (playing) raf = requestAnimationFrame(tick); }
    function mark() { btns.forEach(function (b) { b.setAttribute('aria-pressed', String(playing && b.getAttribute('data-version') === current)); }); card.classList.toggle('is-playing', playing); }
    function play(v) {
      if (abActive && abActive !== api) abActive.pause();
      abActive = api; current = v;
      if (ctx.state === 'suspended') ctx.resume();
      if (offset >= duration() - 0.05) offset = 0;
      var t0 = ctx.currentTime + 0.05;
      ['memo', 'record'].forEach(function (k) {
        var src = ctx.createBufferSource(); src.buffer = buffers[k];
        var g = gains[k] = ctx.createGain(); g.gain.value = k === v ? 1 : 0;
        src.connect(g).connect(ctx.destination); src.start(t0, offset); sources.push(src);
      });
      sources[0].onended = function () { if (playing && now() >= duration() - 0.1) { playing = false; offset = 0; stopSources(); bar.style.transform = 'scaleX(0)'; mark(); } };
      startedAt = t0; playing = true; mark(); tick();
    }
    function pause() { if (!playing) return; offset = now(); playing = false; stopSources(); mark(); }
    var api = { pause: pause };
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-version');
        load().then(function () {
          if (playing && current === v) { pause(); return; }      // tap the playing version again to pause
          if (playing) { current = v; setGains(v); mark(); return; } // switch versions at the same spot
          play(v);
        }).catch(function () {});
      });
    });
  });

  /* ---------- The session: tap players in and out ----------
     Each lane is one part of the record. Without stems, the switches only show the idea.
     With stems (data-stems="audio/session/<song>/" on #console, files <key>.mp4 + .webm),
     every part plays in sync and loops, the switches fade parts in and out at the same
     spot, and the waveforms are redrawn from the real audio. */
  var sessionEl = $('[data-session]');
  var lanes = $$('#lanes .lane');
  var NB = window.innerWidth < 640 ? 44 : 72;
  function drawBars(lane, peaks) {
    var wave = $('.wave', lane), frag = document.createDocumentFragment();
    wave.textContent = '';
    peaks.forEach(function (v) {
      var bar = document.createElement('i');
      bar.style.height = Math.max(6, Math.round(v * 100)) + '%';
      frag.appendChild(bar);
    });
    wave.appendChild(frag);
  }
  lanes.forEach(function (lane) {
    var seed = parseFloat(lane.getAttribute('data-seed')), amp = parseFloat(lane.getAttribute('data-amp')), base = parseFloat(lane.getAttribute('data-base'));
    var peaks = [];
    for (var i = 0; i < NB; i++) peaks.push(clamp((Math.abs(Math.sin(i * 0.37 + seed) * Math.cos(i * 0.113 + seed * 1.7)) * amp + base) / 34, 0, 1));
    drawBars(lane, peaks);
  });
  if (sessionEl) (function () {
    var playBtn = $('.session-play', sessionEl), clockEl = $('.session-clock', sessionEl), note = $('.session-note', sessionEl);
    var stemBase = sessionEl.getAttribute('data-stems');
    var ctx = null, bufs = null, gains = {}, srcs = [], startedAt = 0, offset = 0, playing = false, raf = 0, loading = false;
    function isOn(l) { return l.classList.contains('on'); }
    function updateNote() {
      var on = lanes.filter(isOn), memoOnly = on.length === 1 && on[0].getAttribute('data-stem') === 'memo';
      note.textContent = on.length === lanes.length ? 'Everyone’s in. This is the record.'
        : memoOnly ? 'Just your voice memo. Now bring the band in.'
        : on.length === 0 ? 'Silence. Tap a player in.'
        : on.length + ' of ' + lanes.length + ' parts playing.';
    }
    function setLane(l, on) {
      l.classList.toggle('on', on);
      l.setAttribute('aria-pressed', String(on));
      var g = gains[l.getAttribute('data-stem')];
      if (g) { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.02); }
    }
    lanes.forEach(function (l) { l.addEventListener('click', function () { setLane(l, !isOn(l)); updateNote(); }); });
    $$('[data-lanes]', sessionEl).forEach(function (b) {
      b.addEventListener('click', function () {
        var mode = b.getAttribute('data-lanes');
        lanes.forEach(function (l) { setLane(l, mode === 'all' || l.getAttribute('data-stem') === mode); });
        updateNote();
      });
    });
    if (!stemBase || !AC) return;
    playBtn.hidden = false; clockEl.hidden = false;
    var probe = document.createElement('audio');
    var ext = probe.canPlayType('audio/mp4; codecs="mp4a.40.2"') ? '.mp4' : '.webm';
    function load() {
      if (bufs || loading) return Promise.resolve();
      loading = true; note.textContent = 'Loading the session…';
      ctx = ctx || new AC();
      return Promise.all(lanes.map(function (l) {
        return fetch(stemBase + l.getAttribute('data-stem') + ext, { credentials: 'omit' })
          .then(function (r) { if (!r.ok) throw new Error(); return r.arrayBuffer(); })
          .then(function (b) { return new Promise(function (res, rej) { ctx.decodeAudioData(b, res, rej); }); });
      })).then(function (list) {
        bufs = {}; var all = [], top = 0;
        lanes.forEach(function (l, k) {
          bufs[l.getAttribute('data-stem')] = list[k];
          // Real waveform: loudest point in each slice, scaled against the loudest part in the session.
          var d = list[k].getChannelData(0), step = Math.floor(d.length / NB), pk = [];
          for (var i = 0; i < NB; i++) { var m = 0; for (var j = i * step, e = j + step; j < e; j += 64) { var v = Math.abs(d[j]); if (v > m) m = v; } pk.push(m); if (m > top) top = m; }
          all.push(pk);
        });
        lanes.forEach(function (l, k) { drawBars(l, all[k].map(function (v) { return top ? Math.sqrt(v / top) : 0; })); });
        loading = false; updateNote();
      }).catch(function () { loading = false; note.textContent = 'Couldn’t load the session. Try again.'; throw new Error('load'); });
    }
    function dur() { var m = Infinity; for (var k in bufs) m = Math.min(m, bufs[k].duration); return m; }
    function now() { return playing ? (offset + ctx.currentTime - startedAt) % dur() : offset; }
    function fmt(t) { return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); }
    function tick() { var t = now(); sessionEl.style.setProperty('--ph', (t / dur() * 100).toFixed(2) + '%'); clockEl.textContent = fmt(t); if (playing) raf = requestAnimationFrame(tick); }
    function stopSrcs() { srcs.forEach(function (x) { try { x.stop(); } catch (e) {} }); srcs = []; cancelAnimationFrame(raf); }
    function play() {
      if (abActive && abActive !== api) abActive.pause();
      abActive = api;
      if (ctx.state === 'suspended') ctx.resume();
      var t0 = ctx.currentTime + 0.05;
      lanes.forEach(function (l) {
        var k = l.getAttribute('data-stem'), src = ctx.createBufferSource(), g = gains[k] = ctx.createGain();
        src.buffer = bufs[k]; src.loop = true; src.loopEnd = dur();
        g.gain.value = isOn(l) ? 1 : 0;
        src.connect(g).connect(ctx.destination); src.start(t0, offset); srcs.push(src);
      });
      startedAt = t0; playing = true; sessionEl.classList.add('is-playing'); playBtn.setAttribute('aria-label', 'Pause'); tick();
    }
    function pause() { if (!playing) return; offset = now(); playing = false; stopSrcs(); gains = {}; sessionEl.classList.remove('is-playing'); playBtn.setAttribute('aria-label', 'Play'); }
    var api = { pause: pause };
    playBtn.addEventListener('click', function () { if (playing) { pause(); return; } load().then(play).catch(function () {}); });
  })();

  /* ---------- Scroll-driven scenes ---------- */
  var header = $('#header');
  var track = $('#tl-track'), view = $('#tl-view'), tlBar = $('#tl-bar'), tlYear = $('#tl-year');
  var years = $$('#tl-track .yr').map(function (el) { return el.textContent; });
  var heroImg = $('.hero-photo img');

  function progress(el) {
    var r = el.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    return total > 0 ? clamp(-r.top / total, 0, 1) : 0;
  }

  var pinned = !reduce.matches && window.innerHeight >= 560;
  function setPinned(on) {
    pinned = on;
    doc.classList.toggle('no-pin', !on);
  }
  setPinned(pinned);

  var ticking = false, last = {};
  function frame() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;

    if (header) header.classList.toggle('scrolled', y > 40);

    if (!pinned) return;

    if (heroImg && y < window.innerHeight * 1.2) {
      heroImg.style.transform = 'translate3d(0,' + (y * -0.08).toFixed(1) + 'px,0)';
    }

  }

  /* ---------- Timeline: native side-scroll (swipe, trackpad, or the arrow buttons) ---------- */
  if (track && view) (function () {
    var cards = $$('.tl-card', track), prev = $('.tl-prev'), next = $('.tl-next'), lastIdx = -1;
    function update() {
      var max = view.scrollWidth - view.clientWidth, q = max > 0 ? view.scrollLeft / max : 0;
      if (tlBar) tlBar.style.transform = 'scaleX(' + q.toFixed(4) + ')';
      var idx = 0, left = view.getBoundingClientRect().left + view.clientWidth * 0.25;
      cards.forEach(function (c, i) { if (c.getBoundingClientRect().left <= left) idx = i; });
      if (q > 0.995) idx = cards.length - 1;
      if (idx !== lastIdx && tlYear) { tlYear.textContent = years[idx] === 'Next' ? 'Next · your record' : years[idx] + ' → today'; lastIdx = idx; }
      if (prev) prev.disabled = view.scrollLeft < 4;
      if (next) next.disabled = view.scrollLeft > max - 4;
    }
    function step(dir) {
      var w = cards[0] ? cards[0].getBoundingClientRect().width + 24 : view.clientWidth * 0.8;
      view.scrollBy({ left: dir * w, behavior: reduce.matches ? 'auto' : 'smooth' });
    }
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
    view.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  })();

  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    var want = !reduce.matches && window.innerHeight >= 560;
    if (want !== pinned) setPinned(want);
    last = {};
    onScroll();
  }, { passive: true });
  if (reduce.addEventListener) reduce.addEventListener('change', function () { setPinned(!reduce.matches); last = {}; onScroll(); });
  frame();

  /* ---------- Short forms (/contact): one step, sent securely ---------- */
  $$('form[data-simple-form]').forEach(function (sf) {
    sf.setAttribute('novalidate', '');
    var st = $('.form-status', sf), btn = $('button[type="submit"]', sf);
    sf.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = $$('input, textarea, select', sf);
      for (var i = 0; i < fields.length; i++) {
        if (!fields[i].checkValidity()) {
          st.classList.add('error');
          st.textContent = fields[i].validationMessage || 'Please check this field.';
          fields[i].focus();
          return;
        }
      }
      if (sf.action.indexOf('YOUR_FORM_ID') !== -1) {
        st.classList.remove('error');
        st.textContent = 'Preview only: the form isn’t connected yet.';
        return;
      }
      btn.disabled = true;
      st.classList.remove('error');
      st.textContent = 'Sending…';
      var data = new FormData(sf);
      data.append('came_from', readSource());
      fetch(sf.action, { method: 'POST', body: data, headers: { Accept: 'application/json' }, credentials: 'omit' })
        .then(function (r) {
          if (!r.ok) throw new Error('bad status');
          var done = document.createElement('div');
          done.className = 'form-done';
          done.setAttribute('tabindex', '-1');
          var h = document.createElement('strong'); h.textContent = 'Got it. Thank you.';
          var p = document.createElement('p'); p.textContent = 'I read every one myself. You’ll hear back from me personally, usually within a day.';
          done.appendChild(h); done.appendChild(p);
          sf.replaceChildren(done);
          done.focus();
        })
        .catch(function () {
          btn.disabled = false;
          st.classList.add('error');
          st.textContent = 'Something went wrong sending that. Please try again, or email daniel@drford.com.';
        });
    });
  });

  /* ---------- Consultation form: three steps, sent securely ---------- */
  var form = $('#form');
  if (!form) return;
  var fsteps = $$('.step', form).filter(function (s) { return s.parentElement === form; });
  var backBtn = $('#back'), nextBtn = $('#next'), submitBtn = $('#submit');
  var stepLabel = $('#step-label'), stepName = $('#step-name'), bar = $('#progress'), status = $('#form-status');
  var cur = 0;

  function show(i) {
    cur = clamp(i, 0, fsteps.length - 1);
    fsteps.forEach(function (s, k) { s.classList.toggle('current', k === cur); });
    stepLabel.textContent = 'Step ' + (cur + 1) + ' of ' + fsteps.length;
    stepName.textContent = fsteps[cur].getAttribute('data-name');
    bar.style.transform = 'scaleX(' + ((cur + 1) / fsteps.length).toFixed(4) + ')';
    backBtn.hidden = cur === 0;
    var last = cur === fsteps.length - 1;
    nextBtn.hidden = last;
    submitBtn.classList.toggle('show', last);
    status.textContent = '';
    status.classList.remove('error');
  }
  function firstInvalid(scope) {
    var els = $$('input, select, textarea', scope);
    for (var i = 0; i < els.length; i++) { if (!els[i].checkValidity()) return els[i]; }
    return null;
  }
  function complain(el) {
    status.classList.add('error');
    var msg = el.validationMessage || 'Please check this field.';
    if (el.type === 'radio') msg = 'Please choose one to continue.';
    status.textContent = msg;
    el.focus();
  }
  nextBtn.addEventListener('click', function () {
    var bad = firstInvalid(fsteps[cur]);
    if (bad) return complain(bad);
    show(cur + 1);
    form.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
  });
  backBtn.addEventListener('click', function () { show(cur - 1); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    for (var k = 0; k < fsteps.length; k++) {
      var bad = firstInvalid(fsteps[k]);
      if (bad) { show(k); return complain(bad); }
    }
    if (form.action.indexOf('YOUR_FORM_ID') !== -1) {
      status.classList.remove('error');
      status.textContent = 'Preview only: the form isn’t connected yet.';
      return;
    }
    submitBtn.disabled = true;
    status.classList.remove('error');
    status.textContent = 'Sending…';
    var data = new FormData(form);
    data.append('came_from', readSource());
    fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' }, credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('bad status');
        var done = document.createElement('div');
        done.className = 'form-done';
        done.setAttribute('tabindex', '-1');
        var h = document.createElement('strong'); h.textContent = 'Got it. Thank you.';
        var p = document.createElement('p'); p.textContent = 'I read every one myself. You’ll hear back from me personally, usually within a day.';
        done.appendChild(h); done.appendChild(p);
        form.replaceChildren(done);
        done.focus();
      })
      .catch(function () {
        submitBtn.disabled = false;
        status.classList.add('error');
        status.textContent = 'Something went wrong sending that. Please try again in a moment.';
      });
  });

  show(0);
})();
