// Block pinch-to-zoom. The viewport meta (user-scalable=no) covers Android, but
// iOS Safari ignores it, so also cancel the pinch gesture events it fires. These
// events only fire for multi-touch pinch/rotate, so single-finger scrolling is
// unaffected. Double-tap zoom is also suppressed by preventing rapid double taps.
['gesturestart', 'gesturechange', 'gestureend'].forEach(evt =>
  document.addEventListener(evt, e => e.preventDefault(), { passive: false })
);
let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now ? Date.now() : new Date().getTime();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

// Header background follows the current section (hero / why / section2)
const header = document.querySelector('header');
const navSections = [
  {el: document.getElementById('hero'), cls: 'nav-hero'},
  {el: document.getElementById('why'), cls: 'nav-why'},
  {el: document.getElementById('section2'), cls: 'nav-s2'}
].filter(s => s.el);
const logoImg = document.querySelector('.logo-img');
const LOGO_DEFAULT = 'assets/logo.png';
const LOGO_S2 = 'assets/logo-black.png';
function updateHeaderScrolled(){
  header.classList.toggle('scrolled', window.scrollY > 0);
}
updateHeaderScrolled();
window.addEventListener('scroll', updateHeaderScrolled, {passive:true});

// Hide the header while scrolling down and reveal it on scroll up. The translate
// is gated to mobile in CSS (header.header-hidden), so toggling the class does
// nothing on desktop. The header is always shown at the very top of the page.
let lastHeaderScrollY = window.scrollY;
let headerVisTicking = false;
function updateHeaderVisibility(){
  const y = window.scrollY;
  if (y <= 4) {
    header.classList.remove('header-hidden');
  } else if (y > lastHeaderScrollY + 6) {
    header.classList.add('header-hidden');     // scrolling down
  } else if (y < lastHeaderScrollY - 6) {
    header.classList.remove('header-hidden');  // scrolling up
  }
  lastHeaderScrollY = y;
}
window.addEventListener('scroll', () => {
  if (!headerVisTicking) {
    window.requestAnimationFrame(() => { updateHeaderVisibility(); headerVisTicking = false; });
    headerVisTicking = true;
  }
}, {passive:true});

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const match = navSections.find(s => s.el === entry.target);
    if (!match) return;
    navSections.forEach(s => header.classList.remove(s.cls));
    header.classList.add(match.cls);
    if (logoImg) logoImg.src = match.cls === 'nav-s2' ? LOGO_S2 : LOGO_DEFAULT;
  });
}, {threshold:0.5});
navSections.forEach(s => navObserver.observe(s.el));

// Responsive sizing: shrink each "READ/CONNECT/EXPAND" mark (image + box + cursor)
// as one unit so it always fits within 30px side margins, keeping its proportions.
// All three share ONE scale factor (the smallest one any of them individually needs),
// so whichever mark is showing always renders at the same height — READ, CONNECT and
// EXPAND have different natural widths, so scaling each to its own width would make
// them different sizes on narrow screens even though they share the same base height.
const WHY_MARK_MARGIN = 30;

const whyHighlight = document.querySelector('.why-read-highlight');
const whyCursor = document.querySelector('.why-cursor');
const whyReadImg = document.querySelector('.why-read');
const whyReadWrapEl = document.querySelector('.why-read-wrap');
const whyConnectHighlight = document.querySelector('.why-connect-highlight');
const whyConnectCursor = document.querySelector('.why-connect-cursor');
const whyConnectImg = document.querySelector('.why-connect');
const whyConnectWrapEl = document.querySelector('.why-connect-wrap');
const whyExpandHighlight = document.querySelector('.why-expand-highlight');
const whyExpandCursor = document.querySelector('.why-expand-cursor');
const whyExpandImg = document.querySelector('.why-expand');
const whyExpandWrapEl = document.querySelector('.why-expand-wrap');

function fitAllWhyMarks(){
  const marks = [
    { highlight: whyHighlight, wrap: whyReadWrapEl },
    { highlight: whyConnectHighlight, wrap: whyConnectWrapEl },
    { highlight: whyExpandHighlight, wrap: whyExpandWrapEl }
  ];
  const maxAllowed = window.innerWidth - WHY_MARK_MARGIN * 2;
  let scale = 1;
  marks.forEach(({highlight}) => {
    if (!highlight) return;
    const boxWidth = highlight.offsetWidth;
    if (boxWidth > 0 && boxWidth > maxAllowed) {
      scale = Math.min(scale, maxAllowed / boxWidth);
    }
  });
  marks.forEach(({wrap}) => {
    if (!wrap) return;
    // Full transform set directly (not a --custom-property fed into scale()) —
    // this can never resolve to an invalid/missing transform, which would otherwise
    // drop the whole translate(-50%,-50%) centering and leave the mark pinned top-left.
    wrap.style.transform = `translate(-50%,-50%) scale(${scale})`;
  });
}

function whenImagesReady(imgs, cb){
  const pending = imgs.filter(img => img && !(img.complete && img.naturalWidth));
  if (pending.length === 0) { cb(); return; }
  let remaining = pending.length;
  pending.forEach(img => {
    img.addEventListener('load', () => {
      remaining -= 1;
      if (remaining === 0) cb();
    }, {once:true});
  });
}

// Cursor travel distances can be set per-mark as soon as each image is ready —
// that only affects the sweep animation, not the shared initial layout.
if (whyHighlight && whyCursor) {
  whyCursor.style.setProperty('--cursor-travel', whyHighlight.offsetWidth + 'px');
}
if (whyConnectHighlight && whyConnectCursor && whyConnectImg) {
  whenImagesReady([whyConnectImg], () => {
    whyConnectCursor.style.setProperty('--cursor-travel2', whyConnectHighlight.offsetWidth + 'px');
  });
}
if (whyExpandHighlight && whyExpandCursor && whyExpandImg) {
  whenImagesReady([whyExpandImg], () => {
    whyExpandCursor.style.setProperty('--cursor-travel3', whyExpandHighlight.offsetWidth + 'px');
  });
}

// But the scale (shared layout/position math) is only computed once, for all
// three together, after every image has finished loading. READ stays hidden
// until then too, so it can never flash at the wrong (unscaled) size first —
// exactly like CONNECT/EXPAND, which are already hidden until their turn.
whenImagesReady([whyReadImg, whyConnectImg, whyExpandImg], () => {
  fitAllWhyMarks();
  if (whyReadWrapEl) whyReadWrapEl.classList.add('show');
});

// Subhead text: shrink to fit within the same 30px margins without wrapping,
// keeping both lines at one shared font size.
const WHY_SUB_MAX = 30;
const WHY_SUB_MIN = 14;
const WHY_SUB_MARGIN = 30;
const whySubEl = document.getElementById('why-sub');
const whySubCanvas = document.createElement('canvas');
const whySubCtx = whySubCanvas.getContext('2d');
function fitWhySub(){
  if (!whySubEl) return;
  const parts = whySubEl.innerHTML.split(/<br\s*\/?>/i).map(s => s.trim());
  const cs = getComputedStyle(whySubEl);
  whySubCtx.font = `${cs.fontWeight} ${WHY_SUB_MAX}px ${cs.fontFamily}`;
  let widest = 0;
  parts.forEach(text => {
    const w = whySubCtx.measureText(text).width;
    if (w > widest) widest = w;
  });
  const maxAllowed = window.innerWidth - WHY_SUB_MARGIN * 2;
  let fontSize = WHY_SUB_MAX;
  if (widest > maxAllowed) {
    fontSize = Math.max(WHY_SUB_MIN, WHY_SUB_MAX * (maxAllowed / widest));
  }
  whySubEl.style.fontSize = fontSize + 'px';
  const actualWidest = whySubEl.scrollWidth;
  if (actualWidest > maxAllowed) {
    fontSize = Math.max(WHY_SUB_MIN, fontSize * (maxAllowed / actualWidest));
    whySubEl.style.fontSize = fontSize + 'px';
  }
}
fitWhySub();

let whyFitTimer;
window.addEventListener('resize', () => {
  clearTimeout(whyFitTimer);
  whyFitTimer = setTimeout(() => {
    fitAllWhyMarks();
    fitWhySub();
  }, 100);
});

// READ -> CONNECT -> EXPAND -> READ -> ...: once one mark's sweep finishes, pause
// briefly, hide it, then reset + play the next one's sweep in its own colors. The
// subhead color switches partway through that pause — later than immediately at
// sweep-end, earlier than the full pause (i.e. earlier than the next image itself
// actually appears). Loops forever.
const WHY_SWAP_BUFFER_MS = 500;
const WHY_COLOR_DELAY_MS = 250;
const whyReadWrap = document.querySelector('.why-read-wrap');
const whyConnectWrap = document.querySelector('.why-connect-wrap');
const whyExpandWrap = document.querySelector('.why-expand-wrap');
const whySub = document.getElementById('why-sub');
const WHY_COLOR_CLASSES = ['c-connect', 'c-expand'];

const whyMarks = [
  { wrap: whyReadWrap, highlight: whyHighlight, playClass: 'play', colorClass: null },
  { wrap: whyConnectWrap, highlight: whyConnectHighlight, playClass: 'play', colorClass: 'c-connect' },
  { wrap: whyExpandWrap, highlight: whyExpandHighlight, playClass: 'play', colorClass: 'c-expand' }
];

function resetWhyMark(mark){
  mark.wrap.style.transition = 'none';
  mark.highlight.style.transition = 'none';
  // also strip 'in-view' — READ's first sweep is driven by the shared scroll-reveal
  // observer, but every loop after that needs to re-collapse it via 'play' alone.
  mark.wrap.classList.remove(mark.playClass, 'in-view');
  void mark.wrap.offsetHeight;
  mark.wrap.style.transition = '';
  mark.highlight.style.transition = '';
}

function playWhyMark(index){
  const mark = whyMarks[index];
  const nextMark = whyMarks[(index + 1) % whyMarks.length];
  mark.wrap.classList.remove('hide');
  mark.wrap.classList.add('show');
  mark.wrap.classList.add(mark.playClass);
  mark.highlight.addEventListener('transitionend', function onSweepDone(e){
    if (e.propertyName !== 'transform') return;
    mark.highlight.removeEventListener('transitionend', onSweepDone);
    setTimeout(() => {
      if (whySub) {
        whySub.classList.remove(...WHY_COLOR_CLASSES);
        if (nextMark.colorClass) whySub.classList.add(nextMark.colorClass);
      }
    }, WHY_COLOR_DELAY_MS);
    setTimeout(() => {
      mark.wrap.classList.add('hide');
      // wait for the fade-out to actually finish before resetting the sweep —
      // resetting mid-fade cut the opacity transition short and snapped it off early.
      mark.wrap.addEventListener('transitionend', function onHideDone(ev){
        if (ev.propertyName !== 'opacity') return;
        mark.wrap.removeEventListener('transitionend', onHideDone);
        resetWhyMark(mark);
      });
      playWhyMark((index + 1) % whyMarks.length);
    }, WHY_SWAP_BUFFER_MS);
  });
}

if (whyReadWrap && whyHighlight && whyConnectWrap && whyExpandWrap) {
  // First run of READ is driven by scroll-into-view (.reveal -> in-view), matching
  // every other reveal on the page; from there the loop drives itself.
  whyHighlight.addEventListener('transitionend', function onFirstReadSweepDone(e){
    if (e.propertyName !== 'transform') return;
    whyHighlight.removeEventListener('transitionend', onFirstReadSweepDone);
    setTimeout(() => {
      if (whySub) whySub.classList.add('c-connect');
    }, WHY_COLOR_DELAY_MS);
    setTimeout(() => {
      whyReadWrap.classList.add('hide');
      whyReadWrap.addEventListener('transitionend', function onHideDone(ev){
        if (ev.propertyName !== 'opacity') return;
        whyReadWrap.removeEventListener('transitionend', onHideDone);
        resetWhyMark(whyMarks[0]);
      });
      playWhyMark(1);
    }, WHY_SWAP_BUFFER_MS);
  });
}

// Hero title responsive sizing: shrink with viewport, but never closer than 50px to either edge
const HERO_LINE_MAX = 70;
const HERO_LINE_MIN = 24;
const HERO_LINE_MARGIN = 50;
const heroLines = document.querySelectorAll('.hero-line');
const heroFitCanvas = document.createElement('canvas');
const heroFitCtx = heroFitCanvas.getContext('2d');
function fitHeroText(){
  if (!heroLines.length) return;
  const sample = getComputedStyle(heroLines[0]);
  heroFitCtx.font = `${sample.fontWeight} ${HERO_LINE_MAX}px ${sample.fontFamily}`;
  let widest = 0;
  heroLines.forEach(line => {
    const w = heroFitCtx.measureText(line.textContent).width;
    if (w > widest) widest = w;
  });
  const maxAllowed = window.innerWidth - HERO_LINE_MARGIN * 2;
  let fontSize = HERO_LINE_MAX;
  if (widest > maxAllowed) {
    fontSize = Math.max(HERO_LINE_MIN, HERO_LINE_MAX * (maxAllowed / widest));
  }
  heroLines.forEach(line => { line.style.fontSize = fontSize + 'px'; });

  // Canvas-measured width can drift slightly from actual layout; correct once against real render.
  let actualWidest = 0;
  heroLines.forEach(line => {
    const w = line.getBoundingClientRect().width;
    if (w > actualWidest) actualWidest = w;
  });
  if (actualWidest > maxAllowed) {
    fontSize = Math.max(HERO_LINE_MIN, fontSize * (maxAllowed / actualWidest));
    heroLines.forEach(line => { line.style.fontSize = fontSize + 'px'; });
  }
}
fitHeroText();
let heroFitTimer;
window.addEventListener('resize', () => {
  clearTimeout(heroFitTimer);
  heroFitTimer = setTimeout(fitHeroText, 100);
});

// The text-fit math above runs synchronously, before the Korean web fonts finish
// loading — so it measures against fallback-font metrics and can pick a size that
// overflows once the real (wider) glyphs render, clipping the text left and right
// on mobile. Re-fit once the fonts are ready, and again on full load as a fallback.
function refitText(){
  fitHeroText();
  fitWhySub();
  fitAllWhyMarks();
}
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(refitText);
}
window.addEventListener('load', refitText);

// Hero mark sequence:
// 1) dot and line 1 both fade in together at the start (line 1 sits 20px below dot).
// 2) after a delay, dot rises out of the way while colon fades in at dot's
//    original spot, and line 2 fades in below line 1 — together.
const heroDot = document.getElementById('hero-dot');
const heroColon = document.getElementById('hero-colon');
const heroLine1 = document.getElementById('hero-line-1');
const heroLine2 = document.getElementById('hero-line-2');
if (heroDot && heroColon && heroLine1 && heroLine2) {
  heroDot.classList.add('show');
  heroLine1.classList.add('show');
  setTimeout(() => {
    heroDot.classList.add('risen');
    heroColon.classList.add('show');
    heroLine2.classList.add('show');
  }, 2000);
}

// Hero background video sequence with crossfade — 4s per clip.
const heroVideos = document.querySelectorAll('.hero-video');
const HERO_SLIDE_MS = 4000;
const CROSSFADE_MS = 1400;
let heroIdx = 0;

function scheduleHeroAdvance(){
  const current = heroVideos[heroIdx];
  const slideMs = parseInt(current.dataset.slideMs, 10) || HERO_SLIDE_MS;
  setTimeout(advanceHero, slideMs - CROSSFADE_MS);
}

function advanceHero(){
  const nextIdx = (heroIdx + 1) % heroVideos.length;
  const current = heroVideos[heroIdx];
  const next = heroVideos[nextIdx];
  next.currentTime = 0;
  next.play().catch(() => {});
  next.classList.add('active');
  current.classList.remove('active');
  heroIdx = nextIdx;
  scheduleHeroAdvance();
}

if (heroVideos.length) {
  const first = heroVideos[0];
  first.play().catch(() => {});
  scheduleHeroAdvance();
}

// Generic reveal-on-scroll
const revealItems = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('in-view');
  });
}, {threshold:0.2});
revealItems.forEach(el => revealObserver.observe(el));

// Section 2: highlight sweep -> btn shrink-away -> bubble pop-in -> typewriter -> tag highlight, looping between two variants
const s2Visual = document.querySelector('.s2-visual');
const s2BtnWrap = document.querySelector('.s2-btn-wrap');
if (s2Visual && s2BtnWrap) {
  const s2BubbleTextEl = s2BtnWrap.querySelector('.s2-bubble-text');
  const s2Highlights = s2Visual.querySelectorAll('.s2-highlight');
  const s2Tags = s2BtnWrap.querySelectorAll('.s2-bubble-tag');
  s2BubbleTextEl.textContent = '';

  const s2Cycles = [
    {
      text: '사랑을 뭐 이렇게 쉽고 명확하게 정리해. 역시 튜닝의 끝은 순정이다.',
      hlColor: 'rgba(0,191,150,.3)',
      tag: 'empathy',
      tagBg: '#00BF96',
      tagBold: true
    },
    {
      text: "'팔딱팔딱' 한 마디로 사랑을 직관적 체감의 영역으로 끌어내린 8살짜리 천재 모먼트",
      hlColor: 'rgba(0,144,255,.25)',
      tag: 'analysis',
      tagBg: '#0090FF',
      tagBold: false
    },
    {
      text: '내 가슴이 뛰는 게 사랑인지, 카페인 때문인지 헷갈리는 어른이 되어버렸다.',
      hlColor: 'rgba(132,0,255,.2)',
      tag: 'question',
      tagBg: '#8400FF',
      tagBold: false
    },
    {
      text: '지 혼자 가슴 뛰면 다 사랑인가. 사랑은 자고로 주고받는 상호작용이어야지.',
      hlColor: 'rgba(255,81,0,.25)',
      tag: 'critique',
      tagBg: '#FF5100',
      tagBold: false
    }
  ];

  function resetS2Tags(){
    s2Tags.forEach(t => {
      t.style.background = '';
      t.style.color = '';
      t.style.fontWeight = '';
    });
  }

  function playS2Cycle(i){
    const cfg = s2Cycles[i % s2Cycles.length];
    const showBtn = (i % s2Cycles.length === 0); // btn only appears once, at the start of each full round
    s2Highlights.forEach(h => { h.style.background = cfg.hlColor; });
    s2BubbleTextEl.textContent = '';
    resetS2Tags();
    s2BtnWrap.classList.remove('btn-hide', 'bubble-show');
    s2Visual.classList.remove('cycle-active', 'no-btn');
    void s2Visual.offsetWidth; // force reflow so the animations restart cleanly
    if (!showBtn) s2Visual.classList.add('no-btn');
    s2Visual.classList.add('cycle-active');

    if (showBtn) {
      setTimeout(() => s2BtnWrap.classList.add('btn-hide'), 500); // quick btn flourish, doesn't gate the box
    }
    const bubbleDelay = showBtn ? 500 : 0; // box appears together with (or immediately after) the highlight, every cycle
    const holdAfterTyping = 1200; // every box stays visible ~3.5s total (500ms longer than before), then rolls straight into the next
    setTimeout(() => {
      s2BtnWrap.classList.add('bubble-show');
      setTimeout(() => {
        // Reserve the final text height up front so the box is locked to its final
        // height while typing, instead of growing line-by-line as characters appear.
        s2BubbleTextEl.style.minHeight = '';
        s2BubbleTextEl.textContent = cfg.text;
        s2BubbleTextEl.style.minHeight = s2BubbleTextEl.offsetHeight + 'px';
        s2BubbleTextEl.textContent = '';
        const duration = 2000;
        const start = performance.now();
        function tick(now){
          const p = Math.min((now - start) / duration, 1);
          s2BubbleTextEl.textContent = cfg.text.slice(0, Math.floor(cfg.text.length * p));
          if (p < 1) {
            requestAnimationFrame(tick);
          } else {
            const activeTag = s2BtnWrap.querySelector(`.s2-bubble-tag[data-tag="${cfg.tag}"]`);
            activeTag.style.background = cfg.tagBg;
            activeTag.style.color = '#fff';
            activeTag.style.fontWeight = cfg.tagBold ? '700' : '400';
            setTimeout(() => {
              s2Visual.classList.remove('cycle-active');
              setTimeout(() => playS2Cycle(i + 1), 50);
            }, holdAfterTyping);
          }
        }
        requestAnimationFrame(tick);
      }, 300);
    }, bubbleDelay);
  }

  let s2Played = false;
  const s2Observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !s2Played) {
        s2Played = true;
        playS2Cycle(0);
      }
    });
  }, {threshold:0.4});
  s2Observer.observe(s2Visual);
}

// Section 4 insight tabs
const s4Tabs = document.querySelectorAll('.s4-tab');
const s4Panels = document.querySelectorAll('.s4-panel');
s4Tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    s4Tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.target;
    let matched = false;
    s4Panels.forEach(p => {
      const isMatch = p.dataset.view === target;
      p.hidden = !isMatch;
      if (isMatch) matched = true;
    });
    // Fallback to the first (주제별) panel for tabs without a dedicated view
    if (!matched) s4Panels.forEach((p, i) => { p.hidden = i !== 0; });
  });
});

// Section 4 · 생각별 type filters (공감 / 의문 / 분석 / 비판)
const s4TpFilters = document.querySelectorAll('.s4-tp-filter');
s4TpFilters.forEach(btn => {
  btn.addEventListener('click', () => {
    s4TpFilters.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Section 4 bubble cluster: gentle random drift, bouncing off each other and the 520x300 bounds
const s4BubblesEl = document.querySelector('.s4-bubbles');
if (s4BubblesEl) {
  const BOUND_W = 520, BOUND_H = 300;
  const bubbleEls = Array.from(s4BubblesEl.querySelectorAll('.s4-bubble'));
  const balls = bubbleEls.map(el => {
    const r = el.offsetWidth / 2;
    const left = parseFloat(el.style.left || getComputedStyle(el).left);
    const top = parseFloat(el.style.top || getComputedStyle(el).top);
    const speed = 0.25 + Math.random() * 0.25;
    const angle = Math.random() * Math.PI * 2;
    return {
      el, r,
      cx: left + r,
      cy: top + r,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed
    };
  });

  function stepS4Bubbles(){
    // integrate
    balls.forEach(b => {
      b.cx += b.vx;
      b.cy += b.vy;
    });
    // bounce off the virtual 520x300 boundary
    balls.forEach(b => {
      if (b.cx - b.r < 0) { b.cx = b.r; b.vx = Math.abs(b.vx); }
      if (b.cx + b.r > BOUND_W) { b.cx = BOUND_W - b.r; b.vx = -Math.abs(b.vx); }
      if (b.cy - b.r < 0) { b.cy = b.r; b.vy = Math.abs(b.vy); }
      if (b.cy + b.r > BOUND_H) { b.cy = BOUND_H - b.r; b.vy = -Math.abs(b.vy); }
    });
    // push apart on overlap (simple elastic response)
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        const dx = b.cx - a.cx, dy = b.cy - a.cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const minDist = a.r + b.r;
        if (dist < minDist) {
          const overlap = minDist - dist;
          const nx = dx / dist, ny = dy / dist;
          a.cx -= nx * overlap / 2; a.cy -= ny * overlap / 2;
          b.cx += nx * overlap / 2; b.cy += ny * overlap / 2;
          const aDot = a.vx * nx + a.vy * ny;
          const bDot = b.vx * nx + b.vy * ny;
          a.vx += (bDot - aDot) * nx; a.vy += (bDot - aDot) * ny;
          b.vx += (aDot - bDot) * nx; b.vy += (aDot - bDot) * ny;
        }
      }
    }
    // apply to DOM
    balls.forEach(b => {
      b.el.style.left = (b.cx - b.r) + 'px';
      b.el.style.top = (b.cy - b.r) + 'px';
    });
    requestAnimationFrame(stepS4Bubbles);
  }
  requestAnimationFrame(stepS4Bubbles);
}

// Section 4 height matches section 3's natural height; trust section matches section 4's
function syncS4Height(){
  const s3 = document.getElementById('section3');
  const s4 = document.getElementById('section4');
  const trust = document.getElementById('trust');
  if (!s3 || !s4) return;
  const h = s3.getBoundingClientRect().height;
  // Section 4 height fixed to section 3; taller panels (e.g. 생각별) are clipped by overflow:hidden
  s4.style.minHeight = '';
  s4.style.height = h + 'px';
  if (trust) trust.style.minHeight = '';
  if (trust) trust.style.height = h + 'px';
}
syncS4Height();
window.addEventListener('load', syncS4Height);
window.addEventListener('resize', syncS4Height);

// CTA toast
const toast = document.getElementById('toast');
let toastTimer;
function showToast(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
document.querySelectorAll('[data-toast]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    showToast(el.dataset.toast);
  });
});
