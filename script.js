const workGrid = document.getElementById("work-grid");
const soundBoundElements = new WeakSet();
let audioContext;
let masterGain;
let noiseBuffer;
let lastHoverAt = 0;
let lastClickAt = 0;

function createNoiseBuffer(context) {
  const buffer = context.createBuffer(1, context.sampleRate * 0.5, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(audioContext.destination);
    noiseBuffer = createNoiseBuffer(audioContext);
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

// C major pentatonic across 3 octaves: C D E G A
const HOVER_NOTES = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3, 784, 880];
const CLICK_NOTES = [130.8, 146.8, 164.8, 196, 220, 261.6, 293.7, 329.6, 392, 440];
const WAVE_TYPES  = ["sine", "triangle"];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function playTone({ freq, endFreq, type, volume, attack, duration, filterFreq }) {
  const context = getAudioContext();
  if (!context) return;

  const now = context.currentTime;
  const osc    = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain   = context.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(filterFreq, now);
  filter.Q.value = 0.5;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + duration + 0.01);
}

function playFilteredNoise({ volume, duration, filterType, filterFreq, q = 1, attack = 0.003 }) {
  const context = getAudioContext();
  if (!context || !noiseBuffer) return;

  const now = context.currentTime;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain   = context.createGain();

  source.buffer = noiseBuffer;
  source.loop = true;

  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreq, now);
  filter.Q.value = q;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  source.start(now);
  source.stop(now + duration + 0.01);
}

function playHoverSound() {
  const timestamp = performance.now();
  if (timestamp - lastHoverAt < 110) return;
  lastHoverAt = timestamp;

  const freq = pick(HOVER_NOTES);
  const type = pick(WAVE_TYPES);
  const duration = 0.18 + Math.random() * 0.1;

  // Main melodic tone
  playTone({ freq, endFreq: freq * (1 + Math.random() * 0.08), type, volume: 0.06, attack: 0.008, duration, filterFreq: 3000 });

  // Optional soft harmony a 5th up (~1.5x)
  if (Math.random() > 0.4) {
    playTone({ freq: freq * 1.5, type: "sine", volume: 0.025, attack: 0.012, duration: duration * 0.8, filterFreq: 2200 });
  }

  // Breath of noise underneath
  playFilteredNoise({ volume: 0.03, duration: 0.05, filterType: "bandpass", filterFreq: 800, q: 0.5, attack: 0.002 });
}

function playClickSound() {
  const timestamp = performance.now();
  if (timestamp - lastClickAt < 120) return;
  lastClickAt = timestamp;

  const freq = pick(CLICK_NOTES);
  const duration = 0.22 + Math.random() * 0.1;

  // Pitched thud — drops in pitch
  playTone({ freq, endFreq: freq * 0.6, type: "sine", volume: 0.1, attack: 0.003, duration, filterFreq: 1800 });
  // Harmonic layer
  playTone({ freq: freq * 2, endFreq: freq * 1.2, type: "triangle", volume: 0.04, attack: 0.005, duration: duration * 0.7, filterFreq: 2400 });
  // Snap transient
  playFilteredNoise({ volume: 0.08, duration: 0.025, filterType: "bandpass", filterFreq: 1200, q: 0.6, attack: 0.001 });
}

function bindUISounds() {
  const soundTargets = document.querySelectorAll(
    ".work-card, a, button, .contact-cta, .cap-item, .ham-l, .fm-1, .fm-2, .fm-3, .googly-eyes, .analog-clock"
  );

  soundTargets.forEach((element) => {
    if (soundBoundElements.has(element)) {
      return;
    }

    soundBoundElements.add(element);

    element.addEventListener("pointerenter", () => {
      playHoverSound();
    });

    element.addEventListener("mouseenter", () => {
      playHoverSound();
    });

    element.addEventListener("focus", () => {
      playHoverSound();
    });

    element.addEventListener("pointerdown", () => {
      playClickSound();
    });

    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        playClickSound();
      }
    });
  });
}

function renderPlaceholderWork(count = 4) {
  workGrid.innerHTML = "";

  for (let index = 0; index < count; index += 1) {
    const article = document.createElement("article");
    article.className = "work-card is-placeholder";

    const media = document.createElement("div");
    media.className = "work-media";

    article.appendChild(media);
    workGrid.appendChild(article);
  }
}

function createMediaNodeForSrc(src, alt) {
  const extension = src.split(".").pop()?.toLowerCase();

  if (extension === "mp4") {
    const video = document.createElement("video");
    video.src = src;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    return video;
  }

  const image = document.createElement("img");
  image.src = src;
  image.alt = alt || "";
  image.loading = "lazy";
  return image;
}

function renderWork(items) {
  workGrid.innerHTML = "";

  items.forEach((item) => {
    const slides = Array.isArray(item.slides) && item.slides.length > 0
      ? item.slides
      : [item.src];
    let slideIndex = 0;
    let isSliding = false;

    const article = document.createElement("article");
    article.className = item.featured ? "work-card is-featured" : "work-card";
    if (item.color) article.style.setProperty("--frame-color", item.color);

    const media = document.createElement("div");
    media.className = "work-media";

    const mediaNode = createMediaNodeForSrc(slides[0], item.alt);
    media.appendChild(mediaNode);

    function setSlideCounter() {
      const counter = article.querySelector(".work-slide-counter");
      if (counter) counter.textContent = (slideIndex + 1) + " / " + slides.length;
    }

    function changeSlide(step) {
      if (isSliding) return;
      isSliding = true;

      const direction = step >= 0 ? 1 : -1;
      slideIndex = (slideIndex + direction + slides.length) % slides.length;

      const nextSrc = slides[slideIndex];
      const current = media.querySelector("img, video");
      const next = createMediaNodeForSrc(nextSrc, item.alt);

      if (current) current.remove();
      media.insertBefore(next, media.firstChild);
      isSliding = false;

      setSlideCounter();
    }

    // Click to cycle slides
    if (slides.length > 1) {
      let touchStartX = 0;
      let touchStartY = 0;
      let hasTouchStart = false;
      let suppressClickUntil = 0;

      media.addEventListener("click", (e) => {
        if (e.target.closest(".work-visit") || performance.now() < suppressClickUntil) return;
        changeSlide(1);
      });

      media.addEventListener("touchstart", (event) => {
        if (event.target.closest(".work-visit")) return;
        const touch = event.changedTouches[0];
        if (!touch) return;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        hasTouchStart = true;
      }, { passive: true });

      media.addEventListener("touchend", (event) => {
        if (!hasTouchStart || event.target.closest(".work-visit")) return;
        hasTouchStart = false;

        const touch = event.changedTouches[0];
        if (!touch) return;

        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absX < 36 || absX < absY * 1.15) return;

        suppressClickUntil = performance.now() + 360;
        changeSlide(deltaX < 0 ? 1 : -1);
      }, { passive: true });

      media.addEventListener("touchcancel", () => {
        hasTouchStart = false;
      }, { passive: true });
    }

    const overlay = document.createElement("div");
    overlay.className = "work-overlay";

    const title = document.createElement("span");
    title.className = "work-title";
    title.textContent = item.title || item.alt || "";
    overlay.appendChild(title);

    const categories = Array.isArray(item.category)
      ? item.category
      : item.category
      ? [item.category]
      : [];
    if (categories.length) {
      const catsRow = document.createElement("div");
      catsRow.className = "work-overlay-cats";
      categories.forEach((label) => {
        const cat = document.createElement("span");
        cat.className = "work-category";
        cat.textContent = label;
        catsRow.appendChild(cat);
      });
      overlay.appendChild(catsRow);
    }

    // Slide counter — top right
    if (slides.length > 1) {
      const counter = document.createElement("span");
      counter.className = "work-slide-counter";
      counter.textContent = "1 / " + slides.length;
      overlay.appendChild(counter);
    }

    // Visit link — bottom right
    if (item.url) {
      const visit = document.createElement("a");
      visit.className = "work-visit";
      visit.href = item.url;
      visit.target = "_blank";
      visit.rel = "noopener noreferrer";
      visit.textContent = "Visit Website";
      overlay.appendChild(visit);
    }

    media.appendChild(overlay);
    article.appendChild(media);
    workGrid.appendChild(article);
  });
}

function preventParagraphWidow(paragraph) {
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  let lastTextNode = null;
  let node = walker.nextNode();

  while (node) {
    if (node.nodeValue.replace(/\u00A0/g, " ").trim()) {
      lastTextNode = node;
    }
    node = walker.nextNode();
  }

  if (!lastTextNode) return;

  lastTextNode.nodeValue = lastTextNode.nodeValue.replace(/ (\S+)\s*$/, "\u00A0$1");
}

function applyNoWidowParagraphs(root = document) {
  root.querySelectorAll("p").forEach((paragraph) => {
    preventParagraphWidow(paragraph);
  });
}

function activateRevealAnimations() {
  const revealTargets = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.15 },
  );

  revealTargets.forEach((element, index) => {
    element.style.transitionDelay = `${index * 80}ms`;
    revealObserver.observe(element);
  });
}

function animateWorkLoad() {
  const workCards = document.querySelectorAll(".work-card");

  requestAnimationFrame(() => {
    workCards.forEach((card, index) => {
      window.setTimeout(() => {
        card.classList.add("is-loaded");
      }, 120 + index * 110);
    });
  });
}

async function loadWork() {
  const inlineManifest = window.SELECTED_WORK;

  if (Array.isArray(inlineManifest)) {
    if (inlineManifest.length === 0) {
      renderPlaceholderWork();
    } else {
      renderWork(inlineManifest);
  }

  applyNoWidowParagraphs();
  activateRevealAnimations();
  animateWorkLoad();
  bindUISounds();
  return;
}

  try {
    const response = await fetch("./selected-work/manifest.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Manifest missing");
    }

    const items = await response.json();

    if (!Array.isArray(items) || items.length === 0) {
      renderPlaceholderWork();
    } else {
      renderWork(items);
    }
  } catch {
    renderPlaceholderWork();
  }

  applyNoWidowParagraphs();
  activateRevealAnimations();
  animateWorkLoad();
  bindUISounds();
}

document.addEventListener("pointerdown", () => {
  getAudioContext();
}, { once: true });

document.addEventListener("keydown", () => {
  getAudioContext();
}, { once: true });

function updateAnalogClock() {
  const now = new Date();
  const s = now.getSeconds() + now.getMilliseconds() / 1000;
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;

  const sd = s * 6;
  const md = m * 6;
  const hd = h * 30;

  function setHand(id, deg, length) {
    const el = document.getElementById(id);
    if (!el) return;
    const rad = (deg - 90) * (Math.PI / 180);
    el.setAttribute("x2", 50 + length * Math.cos(rad));
    el.setAttribute("y2", 50 + length * Math.sin(rad));
  }

  setHand("hand-hour",   hd, 28);
  setHand("hand-minute", md, 36);
  setHand("hand-second", sd, 38);
}

function updateClock() {
  const now = new Date();
  const timeEl = document.getElementById("clock-time");
  const dateEl = document.getElementById("clock-date");

  if (!timeEl) return;

  const opts = { timeZone: "America/Chicago" };

  const month = now.toLocaleDateString("en-US", { ...opts, month: "short" });
  const day   = now.toLocaleDateString("en-US", { ...opts, day: "numeric" });
  const year  = now.toLocaleDateString("en-US", { ...opts, year: "numeric" });

  const rawTime = now.toLocaleTimeString("en-US", {
    ...opts,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  // "03:24:10 PM" → "03:24:10PM"
  const time = rawTime.replace(" ", "");

  const tzName = now.toLocaleString("en-US", { ...opts, timeZoneName: "short" });
  const tz = tzName.includes("CDT") ? "CDT" : "CST";

  timeEl.innerHTML =
    `<span class="ck-pink">${month} ${day} ${year}</span> ` +
    `<span class="ck-blue">${time}</span> ` +
    `<span class="ck-gold">Chicago</span> ` +
    `<span class="ck-mint">${tz}</span>`;
  if (dateEl) dateEl.textContent = "";
  fitClock();
}


function fitToContainer(el, scale = 1) {
  if (!el) return;
  const availableWidth = el.parentElement.clientWidth;
  el.style.fontSize = "100px";
  el.style.width = "max-content";
  const naturalWidth = el.scrollWidth;
  el.style.width = "";
  el.style.fontSize = Math.floor(100 * (availableWidth / naturalWidth) * scale) + "px";
}

function fitFooterMark() {
  fitToContainer(document.querySelector(".footer-mark"));
}

function fitClock() {}

function equalizeCapabilityHeights() {
  const items = Array.from(document.querySelectorAll(".cap-item"));
  if (!items.length) return;

  items.forEach((item) => {
    item.style.minHeight = "";
  });

  if (window.innerWidth <= 720) return;

  const tallest = Math.max(...items.map((item) => item.offsetHeight));
  items.forEach((item) => {
    item.style.minHeight = `${tallest}px`;
  });
}

fitFooterMark();
fitClock();
equalizeCapabilityHeights();
applyNoWidowParagraphs();
window.addEventListener("resize", () => {
  fitFooterMark();
  fitClock();
  equalizeCapabilityHeights();
});

loadWork();
const yr = new Date().getFullYear();
document.getElementById("year").textContent = yr;
const yrSidebar = document.getElementById("year-sidebar");
if (yrSidebar) yrSidebar.textContent = yr;
updateClock();
updateAnalogClock();
setInterval(() => {
  updateClock();
  updateAnalogClock();
}, 1000);

function positionTooltip(tip, x, y) {
  const margin = 8;
  tip.style.left = "0px";
  tip.style.top = "0px";

  const rect = tip.getBoundingClientRect();
  const maxLeft = window.innerWidth - rect.width - margin;
  const maxTop = window.innerHeight - rect.height - margin;
  const left = Math.min(Math.max(margin, x), Math.max(margin, maxLeft));
  const top = Math.min(Math.max(margin, y), Math.max(margin, maxTop));

  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

(function initGooglyEyes() {
  const eyes = [
    document.getElementById("eye-left"),
    document.getElementById("eye-right"),
  ];

  function trackMouse(e) {
    const mx = e.clientX;
    const my = e.clientY;

    eyes.forEach((eye) => {
      const rect = eye.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = mx - cx;
      const dy = my - cy;
      const angle = Math.atan2(dy, dx);
      const radius = rect.width * 0.22;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      eye.querySelector(".googly-pupil").style.transform =
        `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
    });
  }

  document.addEventListener("mousemove", trackMouse);
}());

(function initHAM() {
  const spans = [0, 1, 2].map((i) => document.getElementById(`ham-${i}`));

  /* --- scramble disabled ---
  const permutations = [
    ["H", "A", "M"], ["H", "M", "A"], ["A", "H", "M"],
    ["A", "M", "H"], ["M", "H", "A"], ["M", "A", "H"],
  ];
  let current = 0;
  let paused = false;
  function next() {
    if (paused) return;
    let pick;
    do { pick = Math.floor(Math.random() * permutations.length); } while (pick === current);
    current = pick;
    const letters = permutations[pick];
    spans.forEach((span, i) => { span.textContent = letters[i]; });
    const isHAM = letters.join("") === "HAM";
    setTimeout(next, isHAM ? 4000 + Math.random() * 3000 : 1200 + Math.random() * 1000);
  }
  const heroMark = document.querySelector(".hero-mark");
  if (heroMark) {
    heroMark.addEventListener("mouseenter", () => { paused = true; });
    heroMark.addEventListener("mouseleave", () => { paused = false; setTimeout(next, 800 + Math.random() * 600); });
  }
  setTimeout(next, 2000 + Math.random() * 1000);
  --- end scramble --- */

  // Tooltips
  const hamTooltipData = { "H": "Mango ice cream", "A": "Yellowtail nigiri", "M": "Tres Leches Cake" };
  const hamTip = document.createElement("div");
  hamTip.className = "name-tooltip";
  document.body.appendChild(hamTip);

  spans.forEach((el) => {
    el.addEventListener("mouseenter", (e) => {
      const text = hamTooltipData[el.textContent.trim()];
      if (!text) return;
      hamTip.textContent = text;
      hamTip.style.opacity = "1";
      positionTooltip(hamTip, e.clientX + 12, e.clientY - 28);
    });
    el.addEventListener("mousemove", (e) => {
      positionTooltip(hamTip, e.clientX + 12, e.clientY - 28);
    });
    el.addEventListener("mouseleave", () => { hamTip.style.opacity = "0"; });
  });
}());

(function cycleCtaColor() {
  const cta = document.querySelector(".contact-cta");
  if (!cta) return;
  const colors = [
    "var(--pink)", "var(--blue)", "var(--gold)", "var(--cyan)",
    "var(--red)", "var(--purple)", "var(--mint)", "var(--green)",
  ];
  let idx = 0;
  setInterval(() => {
    idx = (idx + 1) % colors.length;
    cta.style.background = colors[idx];
  }, 1800);
}());

(function cycleHAMColors() {
  const spans = [0, 1, 2].map((i) => document.getElementById(`ham-${i}`));
  if (spans.some((el) => !el)) return;
  const colors = [
    "var(--pink)", "var(--blue)", "var(--gold)", "var(--cyan)",
    "var(--red)", "var(--purple)", "var(--mint)", "var(--green)",
  ];
  const current = [colors[0], colors[3], colors[6]];

  function pickColor() {
    let c;
    do { c = colors[Math.floor(Math.random() * colors.length)]; }
    while (current.includes(c));
    return c;
  }

  spans.forEach((el, i) => {
    el.style.color = current[i];
    el.style.webkitTextStrokeColor = current[i];
    function swap() {
      const next = pickColor();
      current[i] = next;
      el.style.color = next;
      el.style.webkitTextStrokeColor = next;
      setTimeout(swap, 1800 + Math.random() * 2200);
    }
    setTimeout(swap, 700 + i * 350 + Math.random() * 700);
  });
}());

/* --- scrambleFooterMark disabled ---
(function scrambleFooterMark() {
  const permutations = [
    ["Henry", "Allen", "Monina"], ["Henry", "Monina", "Allen"],
    ["Allen", "Henry", "Monina"], ["Allen", "Monina", "Henry"],
    ["Monina", "Henry", "Allen"], ["Monina", "Allen", "Henry"],
  ];
  const spans = ["fm-1", "fm-2", "fm-3"].map((id) => document.querySelector(`.${id}`));
  if (spans.some((el) => !el)) return;
  let current = 0;
  let paused = false;
  function next() {
    if (paused) return;
    let pick;
    do { pick = Math.floor(Math.random() * permutations.length); } while (pick === current);
    current = pick;
    const words = permutations[pick];
    spans.forEach((span, i) => { span.textContent = words[i]; });
    const isDefault = words.join("") === "HenryAllenMonina";
    setTimeout(next, isDefault ? 4000 + Math.random() * 3000 : 1200 + Math.random() * 1000);
  }
  const footerMark = document.querySelector(".footer-mark");
  if (footerMark) {
    footerMark.addEventListener("mouseenter", () => { paused = true; });
    footerMark.addEventListener("mouseleave", () => { paused = false; setTimeout(next, 800 + Math.random() * 600); });
  }
  setTimeout(next, 2500 + Math.random() * 1000);
}());
--- end scrambleFooterMark --- */

(function cycleFooterMarkColors() {
  const names = ["fm-1", "fm-2", "fm-3"].map((id) => {
    const span = document.querySelector(`.${id}`);
    return span;
  });
  if (names.some((el) => !el)) return;
  const colors = [
    "var(--pink)", "var(--blue)", "var(--gold)", "var(--cyan)",
    "var(--red)", "var(--purple)", "var(--mint)", "var(--green)",
  ];
  const current = [colors[0], colors[1], colors[2]];

  function pickColor() {
    let c;
    do { c = colors[Math.floor(Math.random() * colors.length)]; }
    while (current.includes(c));
    return c;
  }

  names.forEach((el, i) => {
    el.style.color = current[i];
    el.style.webkitTextStrokeColor = current[i];
    function swap() {
      const next = pickColor();
      current[i] = next;
      el.style.color = next;
      el.style.webkitTextStrokeColor = next;
      setTimeout(swap, 1500 + Math.random() * 2000);
    }
    setTimeout(swap, 800 + i * 400 + Math.random() * 800);
  });
}());

(function initNameTooltips() {
  const tooltipData = {
    "henry":  "The Youngest Hovering Art Director",
    "allen":  "Night owl",
    "monina": "KPOP Demon Hunters no.1 fan",
  };

  const tip = document.createElement("div");
  tip.className = "name-tooltip";
  document.body.appendChild(tip);

  const spans = document.querySelectorAll(".fm-1, .fm-2, .fm-3");

  function show(el, e) {
    const key = el.textContent.trim().toLowerCase();
    const text = tooltipData[key];
    if (!text) return;
    tip.textContent = text;
    tip.style.opacity = "1";
    move(e);
  }

  function move(e) {
    positionTooltip(tip, e.clientX + 12, e.clientY - 28);
  }

  spans.forEach((el) => {
    el.addEventListener("mouseenter", (e) => show(el, e));
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", () => { tip.style.opacity = "0"; });
  });
}());

(function initFixedTooltips() {
  function makeTooltip(el, getText, offset) {
    const tip = document.createElement("div");
    tip.className = "name-tooltip";
    document.body.appendChild(tip);

    function move(e) {
      tip.style.left  = offset.left  != null ? e.clientX + offset.left  + "px" : "";
      tip.style.right = offset.right != null ? window.innerWidth - e.clientX + offset.right + "px" : "";
      tip.style.top   = e.clientY + offset.top + "px";
    }

    el.addEventListener("mouseenter", (e) => {
      tip.textContent = getText();
      tip.style.opacity = "1";
      move(e);
    });
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", () => { tip.style.opacity = "0"; });
  }

  const eyes = document.querySelector(".googly-eyes");
  if (eyes) makeTooltip(
    eyes,
    () => "Hello there! Nice to meet you.",
    { left: 12, right: null, top: 12 }
  );

  const clock = document.querySelector(".analog-clock");
  if (clock) makeTooltip(
    clock,
    () => {
      const now = new Date();
      return now.toLocaleTimeString("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).toLowerCase().replace(" ", "");
    },
    { left: null, right: 12, top: 12 }
  );
}());
