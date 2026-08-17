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
  {el: document.getElementById('section2'), cls: 'nav-s2'},
  {el: document.getElementById('section3'), cls: 'nav-s3'},
  {el: document.getElementById('section4'), cls: 'nav-s4'},
  {el: document.getElementById('section5'), cls: 'nav-s5'},
  {el: document.getElementById('trust'), cls: 'nav-trust'}
].filter(s => s.el);
const logoImg = document.querySelector('.logo-img');
const LOGO_DEFAULT = 'assets/logo.png';
const LOGO_S2 = 'assets/logo-black.png';
// 배경이 어두운 구간에서는 흰 로고, 크림색 구간(s2~s5)에서는 검은 로고
const LOGO_LIGHT_NAVS = ['nav-hero', 'nav-why', 'nav-trust'];
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
    if (logoImg) logoImg.src = LOGO_LIGHT_NAVS.includes(match.cls) ? LOGO_DEFAULT : LOGO_S2;
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
// 실제로 줄바꿈으로 동작하는 <br> 만 기준으로 줄을 나눈다.
// 모바일 전용 <br class="br-mo"> 는 데스크톱에서 display:none 이라 줄이 아니라 공백으로 센다.
function whySubParts(){
  const parts = [];
  let cur = '';
  whySubEl.childNodes.forEach(node => {
    if (node.nodeName === 'BR') {
      if (getComputedStyle(node).display === 'none') { cur += ' '; return; }
      parts.push(cur);
      cur = '';
    } else {
      cur += node.textContent;
    }
  });
  parts.push(cur);
  return parts.map(s => s.trim()).filter(Boolean);
}
function fitWhySub(){
  if (!whySubEl) return;
  const parts = whySubParts();
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
// 모바일에서는 좌우 여백을 줄여 같은 화면 폭에서 글자를 더 크게 쓴다
const HERO_LINE_MARGIN_PC = 50;
const HERO_LINE_MARGIN_MO = 20;
function heroLineMargin(){
  return window.matchMedia('(max-width:640px)').matches ? HERO_LINE_MARGIN_MO : HERO_LINE_MARGIN_PC;
}
const heroLines = document.querySelectorAll('.hero-line');
// 히어로에서 번갈아 도는 문구 (0번이 마크업의 초기 문구)
// typed:true 인 문구는 줄 단위 페이드 대신 한 글자씩 차례로 나타난다.
const HERO_PHRASES = [
  {lines: ['혼자 읽고 마치던 생각을', '같이 이어나갑니다']},
  {lines: ['소셜 리딩 커뮤니티,', '세미콜론.'], typed: true}
];
const heroFitCanvas = document.createElement('canvas');
const heroFitCtx = heroFitCanvas.getContext('2d');
function fitHeroText(){
  if (!heroLines.length) return;
  const sample = getComputedStyle(heroLines[0]);
  heroFitCtx.font = `${sample.fontWeight} ${HERO_LINE_MAX}px ${sample.fontFamily}`;
  // 화면에 떠 있는 문구가 아니라 롤링되는 모든 문구를 함께 재서, 문구가 바뀌어도
  // 글자 크기가 튀지 않게 한다.
  let widest = 0;
  HERO_PHRASES.forEach(phrase => phrase.lines.forEach(text => {
    const w = heroFitCtx.measureText(text).width;
    if (w > widest) widest = w;
  }));
  const maxAllowed = window.innerWidth - heroLineMargin() * 2;
  let fontSize = HERO_LINE_MAX;
  if (widest > maxAllowed) {
    fontSize = Math.max(HERO_LINE_MIN, HERO_LINE_MAX * (maxAllowed / widest));
  }
  heroLines.forEach(line => { line.style.fontSize = fontSize + 'px'; });

  // Canvas-measured width can drift slightly from actual layout; correct once against real render.
  // 지금 떠 있는 문구의 (실제 폭 / 캔버스 예측 폭)을 보정 계수로 삼아 가장 긴 문구의
  // 실제 폭을 역산한다 — 짧은 문구가 떠 있는 동안 리사이즈돼도 보정이 정확하다.
  let actualCurrent = 0, canvasCurrent = 0;
  heroLines.forEach(line => {
    actualCurrent = Math.max(actualCurrent, line.getBoundingClientRect().width);
    canvasCurrent = Math.max(canvasCurrent, heroFitCtx.measureText(line.textContent).width);
  });
  if (!canvasCurrent || !actualCurrent) return;
  const projectedWidest = actualCurrent * (widest / canvasCurrent);
  if (projectedWidest > maxAllowed) {
    fontSize = Math.max(HERO_LINE_MIN, fontSize * (maxAllowed / projectedWidest));
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
const heroTextGroup = document.querySelector('.hero-text-group');

// 3) 인트로가 다 뜬 뒤부터는 두 문구를 번갈아 롤링한다.
//    (한 문구가 머무는 시간 HOLD, 교체는 페이드 아웃 -> 텍스트 교체 -> 페이드 인)
const HERO_INTRO_MS = 2000;   // 1번 줄 -> 2번 줄 등장 간격
const HERO_ROLL_FADE = 800;   // CSS .rolling 의 opacity transition 과 동일
const HERO_ROLL_HOLD = 2000;  // 문구가 완전히 뜬 뒤 다음 문구로 넘어가기까지
const HERO_TYPE_MS = 2000;    // 타이핑 문구가 전부 드러나는 데 걸리는 시간
const HERO_CHAR_FADE = 500;   // 글자 하나가 켜지는 시간 (CSS .hero-char transition 과 동일)

let heroTypeTimers = [];
function clearHeroTyping(){
  heroTypeTimers.forEach(clearTimeout);
  heroTypeTimers = [];
}

// 두 줄을 글자 span 으로 미리 깔아두고 순서대로 켠다.
// 첫 글자가 0ms, 마지막 글자가 HERO_TYPE_MS 에 '다 보이도록' 간격을 역산한다.
function showHeroTyped(lines, done){
  const chars = [];
  [heroLine1, heroLine2].forEach((line, i) => {
    line.textContent = '';
    Array.from(lines[i]).forEach(ch => {
      const span = document.createElement('span');
      span.className = 'hero-char';
      span.textContent = ch === ' ' ? '\u00A0' : ch;   // 공백이 접히지 않도록 nbsp
      line.appendChild(span);
      chars.push(span);
    });
  });
  heroTextGroup.classList.add('typing');
  heroLine1.classList.add('show');
  heroLine2.classList.add('show');
  const gap = chars.length > 1 ? (HERO_TYPE_MS - HERO_CHAR_FADE) / (chars.length - 1) : 0;
  chars.forEach((span, i) => {
    heroTypeTimers.push(setTimeout(() => span.classList.add('on'), gap * i));
  });
  heroTypeTimers.push(setTimeout(() => {
    heroTextGroup.classList.remove('typing');
    done();
  }, HERO_TYPE_MS));
}

function showHeroFaded(lines, done){
  heroLine1.textContent = lines[0];
  heroLine2.textContent = lines[1];
  heroLine1.classList.add('show');
  heroLine2.classList.add('show');
  heroTypeTimers.push(setTimeout(done, HERO_ROLL_FADE));
}

let heroPhraseIdx = 0;
function rollHeroPhrase(){
  clearHeroTyping();
  heroPhraseIdx = (heroPhraseIdx + 1) % HERO_PHRASES.length;
  const phrase = HERO_PHRASES[heroPhraseIdx];
  heroLine1.classList.remove('show');
  heroLine2.classList.remove('show');
  heroTypeTimers.push(setTimeout(() => {
    const holdThenRoll = () => {
      heroTypeTimers.push(setTimeout(rollHeroPhrase, HERO_ROLL_HOLD));
    };
    if (phrase.typed) showHeroTyped(phrase.lines, holdThenRoll);
    else showHeroFaded(phrase.lines, holdThenRoll);
  }, HERO_ROLL_FADE));
}

if (heroDot && heroColon && heroLine1 && heroLine2) {
  heroDot.classList.add('show');
  heroLine1.classList.add('show');
  setTimeout(() => {
    heroDot.classList.add('risen');
    heroColon.classList.add('show');
    heroLine2.classList.add('show');
    setTimeout(() => {
      if (heroTextGroup) heroTextGroup.classList.add('rolling');
      rollHeroPhrase();
    }, 1000 + HERO_ROLL_HOLD);   // 2번 줄 페이드인(1s)이 끝난 뒤부터 hold 시작
  }, HERO_INTRO_MS);
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

// Section 4 insight tabs — auto-rotate every 2s, but manual clicks still switch
// (and restart the timer so the clicked tab holds for a full interval).
const s4Tabs = Array.from(document.querySelectorAll('.s4-tab'));
const s4Panels = document.querySelectorAll('.s4-panel');
const S4_TAB_INTERVAL = 3000;
function activateS4Tab(btn){
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
  clampS4Panels();
}

// 패널이 섹션 밖으로 넘쳐 직선으로 잘리면 아래 모서리가 각져 보인다.
// 섹션 하단에서 S4_PANEL_BOTTOM_GAP 만큼 위에서 끝나도록 높이를 제한해,
// 패널 자신의 30px 라운딩이 그대로 드러나게 한다.
// 세 패널은 같은 자리에 겹쳐 있으므로 보이는 패널의 위치를 재서 셋 다에 적용한다.
const S4_PANEL_BOTTOM_GAP = 20;
let s4ClampedWidth = null;
// offsetTop 을 누적해 섹션 기준 위치를 구한다. getBoundingClientRect 와 달리
// reveal 의 translateY 같은 transform 에 영향받지 않아, 등장 애니메이션 도중에
// 재도 최종 위치가 나온다.
function offsetTopWithin(el, ancestor){
  let y = 0, node = el;
  while (node && node !== ancestor) { y += node.offsetTop; node = node.offsetParent; }
  return y;
}
function clampS4Panels(force){
  const s4 = document.getElementById('section4');
  if (!s4 || !s4Panels.length) return;
  // 모바일에서 스크롤로 주소창이 접혔다 펴지면 높이만 바뀌며 resize 가 계속 뜬다.
  // 그때마다 다시 재면 역스크롤 중에 패널 높이가 줄었다 늘었다 하므로,
  // 가로폭이 실제로 달라졌을 때(회전 등)만 갱신한다.
  if (!force && s4ClampedWidth === window.innerWidth) return;
  const visible = s4.querySelector('.s4-panel:not([hidden])');
  const sectionH = s4.offsetHeight;
  if (!visible || !sectionH) return;
  const max = Math.max(0, sectionH - offsetTopWithin(visible, s4) - S4_PANEL_BOTTOM_GAP);
  s4Panels.forEach(p => { p.style.maxHeight = max + 'px'; });
  s4ClampedWidth = window.innerWidth;
}
let s4TabIdx = 0;
let s4TabTimer = null;
function startS4TabRoll(){
  clearInterval(s4TabTimer);
  s4TabTimer = setInterval(() => {
    if (!s4Tabs.length) return;
    s4TabIdx = (s4TabIdx + 1) % s4Tabs.length;
    activateS4Tab(s4Tabs[s4TabIdx]);
  }, S4_TAB_INTERVAL);
}
s4Tabs.forEach((btn, i) => {
  btn.addEventListener('click', () => {
    s4TabIdx = i;
    activateS4Tab(btn);
    startS4TabRoll(); // restart the interval so the clicked tab stays for a full 2s
  });
});
if (s4Tabs.length) startS4TabRoll();
clampS4Panels(true);
window.addEventListener('load', () => clampS4Panels(true));
window.addEventListener('resize', () => clampS4Panels());

// Member map: give each plain thought-dot a random opacity (100/70/50/30%),
// so the #C5B79D / #A49272 dots read as a scattered field at varied depths.
// The float animation itself lives in CSS (@keyframes mbFloat) — here we only
// desync it: a random period plus a negative delay so each dot starts mid-cycle.
(function randomizeMemberMap(){
  const ops = [1, 0.7, 0.5, 0.3];
  document.querySelectorAll('.s4-mb-dot').forEach(d => {
    d.style.opacity = ops[Math.floor(Math.random() * ops.length)];
  });
  // 점 20개 + 나 아바타 + 노드 4개 = 25개 모두 서로 다른 주기/위상으로 떠 있게
  document.querySelectorAll('.s4-mb-dot, .s4-mb-me, .s4-mb-node').forEach(el => {
    el.style.setProperty('--float-dur', (3.6 + Math.random() * 2.8).toFixed(2) + 's');
    el.style.setProperty('--float-delay', (-Math.random() * 6).toFixed(2) + 's');
  });
})();

// 생각별 지도의 좋아요/보관 뱃지: 지도가 처음 화면에 들어온 순간 8개가 한 번에 팝인.
// 패널이 display:none인 동안에는 교차하지 않으므로, 탭이 실제로 보인 첫 시점에 발동한다.
const tpMap = document.querySelector('.s4-tp-map');
if (tpMap) {
  const tpMapObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      tpMap.classList.add('badges-in');
      obs.disconnect();   // 처음 한 번만
    });
  }, {threshold:0.3});
  tpMapObserver.observe(tpMap);
}

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
  // 모바일에서 display:none 인 원(작은 2개)은 물리 계산에서 제외한다 —
  // 반지름 0 으로 섞이면 충돌 판정만 어지럽히고 화면에는 나오지 않는다.
  // offsetWidth 가 아니라 자기 자신의 computed display/width 를 보는 이유: 스크립트가
  // 도는 시점에 주제별 패널이 숨겨져 있으면 offsetWidth 는 전부 0 이라 원이 하나도
  // 안 남는다. computed 값은 패널이 숨겨져 있어도 제대로 나온다.
  const bubbleEls = Array.from(s4BubblesEl.querySelectorAll('.s4-bubble'))
    .filter(el => getComputedStyle(el).display !== 'none');
  const balls = bubbleEls.map(el => {
    const r = (parseFloat(getComputedStyle(el).width) || el.offsetWidth) / 2;
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
    // Bounds follow the element's live size, so the circles fill whatever area the
    // CSS gives them (520x300 on desktop, the full panel width x height on mobile).
    const BOUND_W = s4BubblesEl.clientWidth;
    const BOUND_H = s4BubblesEl.clientHeight;
    // Paused while the 주제별 panel is hidden (0 size) — avoids the circles drifting
    // out of bounds and snapping back when the auto-rolling tab returns to it.
    if (!BOUND_W || !BOUND_H) { requestAnimationFrame(stepS4Bubbles); return; }
    // integrate
    balls.forEach(b => {
      b.cx += b.vx;
      b.cy += b.vy;
    });
    // bounce off the boundary
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

// 섹션 높이는 이제 전부 CSS 의 height:100vh 로 통일되어 있다(모바일에서는 height:auto).
// 예전에는 여기서 s3 의 자연 높이를 재서 s4/s5/trust 에 인라인으로 복사했는데,
// 그러면 s3 만 한 화면보다 커져 1~3번 섹션과 높이가 어긋났다.

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
