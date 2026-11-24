/* Site interactions: smooth scroll, reveals, nav theming, archive filters,
   cursor preview, counters, clock and mobile menu. Content stays fully
   usable without this file (or with prefers-reduced-motion). */
(function () {
  const root = document.documentElement;
  const motion = root.classList.contains("motion") && window.gsap && window.ScrollTrigger;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  window.__siteReady = true;
  if (!motion) root.classList.remove("motion");

  /* ---------------- clock ---------------- */
  const clock = document.querySelector("[data-clock]");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: clock.dataset.tz || "Asia/Kolkata", hour12: false });
    const tick = () => (clock.textContent = fmt.format(new Date()) + " IST");
    tick(); setInterval(tick, 15000);
  }

  /* ---------------- mobile menu ---------------- */
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");
  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
    document.body.classList.toggle("menu-open", open);
    if (open) menu.querySelector("a")?.focus();
  }
  toggle?.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  menu?.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu?.hidden) { setMenu(false); toggle.focus(); } });

  /* ---------------- smooth scroll ---------------- */
  let lenis = null;
  if (motion && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = url.hash === "#main" ? document.body : document.querySelector(url.hash);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: url.hash === "#main" ? 0 : -20 });
    else target.scrollIntoView({ behavior: motion ? "smooth" : "auto" });
    history.replaceState(null, "", url.hash);
  });

  /* ---------------- nav: theme follows the section below it ---------------- */
  const nav = document.querySelector("[data-nav]");
  const themed = [
    [".work-section", "light"], [".record", "light"], [".contact", "signal"], [".next", "light"],
  ];
  const zones = [];
  themed.forEach(([sel, theme]) => document.querySelectorAll(sel).forEach((el) => zones.push([el, theme])));
  const navLinks = [...document.querySelectorAll("[data-link]")];
  const sections = navLinks.map((a) => document.querySelector(new URL(a.href).hash)).filter(Boolean);
  let lastY = 0;
  function onScroll() {
    const y = window.scrollY;
    const probe = 34;
    let theme = "dark";
    for (const [el, t] of zones) {
      const r = el.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { theme = t; break; }
    }
    nav.classList.toggle("is-light", theme === "light");
    nav.classList.toggle("is-signal", theme === "signal");
    nav.classList.toggle("is-scrolled", y > 40);
    nav.classList.toggle("is-hidden", y > 600 && y > lastY + 4 && !document.body.classList.contains("menu-open"));
    if (y < lastY - 4) nav.classList.remove("is-hidden");
    lastY = y;
    const mid = innerHeight * 0.4;
    let current = null;
    sections.forEach((s) => { const r = s.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) current = s; });
    navLinks.forEach((a) => a.classList.toggle("is-active", current && new URL(a.href).hash === "#" + current.id));
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------- archive filters ---------------- */
  const filters = [...document.querySelectorAll("[data-filter]")];
  const rows = [...document.querySelectorAll("[data-rows] .row")];
  const count = document.querySelector("[data-archive-count]");
  filters.forEach((btn) =>
    btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      filters.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      let n = 0;
      rows.forEach((row) => {
        const show = f === "all" || row.dataset.category === f;
        row.hidden = !show;
        if (show) n++;
      });
      if (count) count.textContent = String(n).padStart(2, "0");
      if (motion) gsap.fromTo(rows.filter((r) => !r.hidden), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.035, ease: "power3.out" });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    })
  );

  /* ---------------- archive cursor preview (desktop only) ---------------- */
  const preview = document.querySelector("[data-preview]");
  if (preview && finePointer && window.gsap) {
    const img = preview.querySelector("[data-preview-target-img]");
    const canvas = preview.querySelector("[data-preview-target-canvas]");
    const xTo = gsap.quickTo(preview, "x", { duration: 0.5, ease: "power3" });
    const yTo = gsap.quickTo(preview, "y", { duration: 0.5, ease: "power3" });
    gsap.set(preview, { xPercent: -50, yPercent: -50 });
    addEventListener("mousemove", (e) => { xTo(e.clientX + 190); yTo(e.clientY); }, { passive: true });
    document.querySelectorAll(".row__link").forEach((link) => {
      link.addEventListener("mouseenter", () => {
        if (link.dataset.previewImg) {
          img.src = link.dataset.previewImg; img.hidden = false; canvas.hidden = true;
        } else {
          img.hidden = true; canvas.hidden = false;
          canvas.dataset.drawn = "";
          window.drawCover?.(canvas, link.dataset.previewStyle, link.dataset.previewSeed);
        }
        preview.classList.add("is-on");
        gsap.to(preview, { scale: 1, duration: 0.45, ease: "power3.out" });
      });
      link.addEventListener("mouseleave", () => {
        preview.classList.remove("is-on");
        gsap.to(preview, { scale: 0.85, duration: 0.35, ease: "power3.out" });
      });
    });
  }

  /* ---------------- magnetic contact link ---------------- */
  if (finePointer && window.gsap) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.12);
        yTo((e.clientY - r.top - r.height / 2) * 0.25);
      });
      el.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
    });
  }

  if (!motion) return;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------------- helpers ---------------- */
  function splitChars(el) {
    const text = el.textContent;
    el.textContent = "";
    const frag = document.createDocumentFragment();
    for (const ch of text) {
      const s = document.createElement("span");
      s.className = "char";
      s.textContent = ch === " " ? " " : ch;
      frag.appendChild(s);
    }
    el.appendChild(frag);
    return el.querySelectorAll(".char");
  }
  function splitWords(el) {
    // Walk text nodes so <em> accents survive.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const s = document.createElement("span");
        s.className = "word"; s.textContent = part;
        frag.appendChild(s);
      });
      node.replaceWith(frag);
    });
    return el.querySelectorAll(".word");
  }

  /* ---------------- hero entrance ---------------- */
  const heroChars = [];
  document.querySelectorAll("[data-split]").forEach((el) => heroChars.push(...splitChars(el)));
  const intro = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.15 });
  if (heroChars.length) intro.from(heroChars, { yPercent: 105, duration: 1.25, stagger: 0.035 });
  intro.from(".hero__initial", { opacity: 0, y: 20, duration: 1 }, 0.5);
  intro.to("[data-hero-fade]", { opacity: 1, duration: 1, stagger: 0.08, ease: "power2.out" }, 0.45);
  intro.from("[data-hero-fade]", { y: 18, duration: 1.1, stagger: 0.08 }, 0.45);

  const heroName = document.querySelector(".hero__name");
  if (heroName && document.querySelector(".hero")) {
    gsap.to(heroName, {
      yPercent: -18, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
  }

  /* ---------------- manifesto: words brighten as you read ---------------- */
  document.querySelectorAll("[data-words]").forEach((el) => {
    const words = splitWords(el);
    gsap.fromTo(words, { opacity: 0.16 }, {
      opacity: 1, stagger: 0.05, ease: "none",
      scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: 0.6 },
    });
  });

  /* ---------------- generic reveals ---------------- */
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 90%", once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1, stagger: 0.07, ease: "expo.out", overwrite: true }),
  });
  document.querySelectorAll("[data-reveal-media]").forEach((el) => {
    gsap.to(el, {
      clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
    const inner = el.querySelector("img, canvas");
    if (inner) gsap.fromTo(inner, { scale: 1.12 }, { scale: 1, duration: 1.8, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
  });

  /* work rows: body text rises in after its image */
  document.querySelectorAll("[data-work]").forEach((w) => {
    gsap.from(w.querySelectorAll(".work__meta, .work__title, .work__kicker, .metrics > div, .work__stack, .work__links"), {
      y: 30, opacity: 0, duration: 1, stagger: 0.06, ease: "expo.out",
      scrollTrigger: { trigger: w, start: "top 78%", once: true },
    });
  });

  /* ---------------- counters ---------------- */
  document.querySelectorAll("[data-count]").forEach((el) => {
    const raw = el.dataset.count;
    const m = raw.match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/);
    if (!m) return;
    const [, pre, num, post] = m;
    const target = parseFloat(num.replace(",", ""));
    const decimals = (num.split(".")[1] || "").length;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 1.6, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onUpdate: () => (el.textContent = pre + obj.v.toFixed(decimals) + post),
      onComplete: () => (el.textContent = raw),
    });
  });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
