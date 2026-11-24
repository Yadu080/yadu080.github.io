/* Generative project covers.
   Each project without an uploaded image gets a deterministic drawing,
   seeded by its slug, in one of five styles chosen in the admin. */
(function () {
  const INK = "#0c0c0a", BONE = "#ece8df", SIGNAL = "#ff4d1a", MUTED = "rgba(236,232,223,.22)";

  function hash(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return (h >>> 0) || 1;
  }
  function rng(seed) {
    let a = hash(seed);
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const styles = {
    constellation(ctx, w, h, r) {
      const pts = [];
      const clusters = 3 + Math.floor(r() * 3);
      for (let c = 0; c < clusters; c++) {
        const cx = w * (0.15 + r() * 0.7), cy = h * (0.18 + r() * 0.64), s = Math.min(w, h) * (0.08 + r() * 0.12);
        const n = 26 + Math.floor(r() * 30);
        for (let i = 0; i < n; i++) {
          const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * s;
          pts.push([cx + Math.cos(a) * d * 1.4, cy + Math.sin(a) * d, c]);
        }
      }
      for (let i = 0; i < 60; i++) pts.push([r() * w, r() * h, -1]);
      ctx.lineWidth = Math.max(1, w / 1400);
      const max = Math.min(w, h) * 0.09;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], d = Math.hypot(dx, dy);
          if (d < max) {
            ctx.strokeStyle = `rgba(236,232,223,${0.16 * (1 - d / max)})`;
            ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke();
          }
        }
      }
      const hot = Math.floor(r() * clusters);
      for (const [x, y, c] of pts) {
        const rad = (c === -1 ? 0.6 : 1 + r() * 1.6) * (w / 900);
        ctx.fillStyle = c === hot && r() > 0.45 ? SIGNAL : c === -1 ? MUTED : BONE;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      }
    },
    waves(ctx, w, h, r) {
      const lines = 34, amp = h * (0.05 + r() * 0.05), f1 = 1 + r() * 2.5, f2 = 3 + r() * 4, ph = r() * 10;
      const hot = 8 + Math.floor(r() * (lines - 16));
      ctx.lineWidth = Math.max(1, w / 900);
      for (let l = 0; l < lines; l++) {
        const y0 = h * 0.12 + (h * 0.76 * l) / (lines - 1);
        ctx.strokeStyle = l === hot ? SIGNAL : `rgba(236,232,223,${0.12 + 0.5 * Math.sin((l / lines) * Math.PI)})`;
        ctx.lineWidth = (l === hot ? 2.2 : 1) * Math.max(1, w / 900);
        ctx.beginPath();
        for (let x = 0; x <= w; x += w / 160) {
          const t = x / w;
          const env = Math.sin(t * Math.PI);
          const y = y0 + env * amp * (Math.sin(t * f1 * 6.28 + ph + l * 0.18) + 0.45 * Math.sin(t * f2 * 6.28 - l * 0.3));
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },
    grid(ctx, w, h, r) {
      const cols = 36, rows = Math.round(cols * (h / w)), cw = w / cols, ch = h / rows, gap = Math.max(1, cw * 0.14);
      const fx = r() * 4, fy = r() * 4, band = Math.floor(r() * rows);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const v = 0.5 + 0.5 * Math.sin(x * 0.21 + fx) * Math.cos(y * 0.33 + fy) + (r() - 0.5) * 0.35;
          if (Math.abs(y - band) <= 1 && x > cols * 0.45 && x < cols * 0.8 && r() > 0.25) {
            ctx.fillStyle = SIGNAL;
          } else if (v < 0.18) {
            // "unknown, not zero" — hatched cell
            ctx.strokeStyle = MUTED; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x * cw + gap, y * ch + ch - gap); ctx.lineTo(x * cw + cw - gap, y * ch + gap); ctx.stroke();
            continue;
          } else {
            ctx.fillStyle = `rgba(236,232,223,${Math.min(0.85, Math.max(0.05, v * 0.6))})`;
          }
          ctx.fillRect(x * cw + gap / 2, y * ch + gap / 2, cw - gap, ch - gap);
        }
      }
    },
    rings(ctx, w, h, r) {
      const cx = w * (0.35 + r() * 0.3), cy = h * (0.4 + r() * 0.2), n = 22, maxR = Math.max(w, h) * 0.55;
      ctx.lineWidth = Math.max(1, w / 1100);
      for (let i = 1; i <= n; i++) {
        const rad = (maxR * i) / n, ox = Math.sin(i * 0.5) * w * 0.012, oy = Math.cos(i * 0.4) * h * 0.012;
        ctx.strokeStyle = `rgba(236,232,223,${0.5 - (i / n) * 0.42})`;
        ctx.beginPath(); ctx.arc(cx + ox, cy + oy, rad, 0, Math.PI * 2); ctx.stroke();
      }
      for (let k = 0; k < 4; k++) {
        const i = 3 + Math.floor(r() * (n - 6)), rad = (maxR * i) / n, s = r() * 6.28;
        ctx.strokeStyle = SIGNAL; ctx.lineWidth = Math.max(2, w / 400);
        ctx.beginPath(); ctx.arc(cx, cy, rad, s, s + 0.4 + r() * 0.9); ctx.stroke();
      }
      ctx.fillStyle = SIGNAL; ctx.beginPath(); ctx.arc(cx, cy, Math.max(3, w / 160), 0, Math.PI * 2); ctx.fill();
    },
    bars(ctx, w, h, r) {
      const n = 96, bw = w / n, mid = h * 0.52, f = 2 + r() * 3, ph = r() * 6;
      const hotStart = Math.floor(n * (0.3 + r() * 0.35)), hotEnd = hotStart + 6 + Math.floor(r() * 8);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const env = Math.pow(Math.sin(t * Math.PI), 0.8);
        const v = env * (0.25 + 0.75 * Math.abs(Math.sin(t * f * 6.28 + ph) * 0.6 + (r() - 0.5) * 0.8));
        const bh = v * h * 0.36;
        ctx.fillStyle = i >= hotStart && i <= hotEnd ? SIGNAL : `rgba(236,232,223,${0.25 + v * 0.6})`;
        ctx.fillRect(i * bw + bw * 0.2, mid - bh, bw * 0.6, bh * 2);
      }
      ctx.fillStyle = MUTED; ctx.fillRect(0, mid, w, Math.max(1, w / 1600));
    },
  };

  function draw(canvas, style, seed, label) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
    if (canvas.width === w && canvas.height === h && canvas.dataset.drawn === seed + style) return;
    canvas.width = w; canvas.height = h; canvas.dataset.drawn = seed + style;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = INK; ctx.fillRect(0, 0, w, h);
    (styles[style] || styles.constellation)(ctx, w, h, rng(seed + style));
    if (label) {
      const fs = Math.max(10 * dpr, w / 70);
      ctx.font = `500 ${fs}px "Geist Mono", ui-monospace, monospace`;
      ctx.fillStyle = "rgba(236,232,223,.55)";
      ctx.textBaseline = "bottom";
      ctx.fillText(("FIG. — " + label).toUpperCase(), fs * 1.6, h - fs * 1.4);
    }
  }

  function drawAll() {
    document.querySelectorAll("canvas[data-cover]").forEach((c) =>
      draw(c, c.dataset.cover, c.dataset.seed || "x", c.dataset.label));
  }

  window.drawCover = draw;
  const ro = "ResizeObserver" in window ? new ResizeObserver(() => drawAll()) : null;
  function init() {
    drawAll();
    if (ro) document.querySelectorAll("canvas[data-cover]").forEach((c) => ro.observe(c));
    if (document.fonts) document.fonts.ready.then(() => { document.querySelectorAll("canvas[data-cover]").forEach((c) => (c.dataset.drawn = "")); drawAll(); });
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
