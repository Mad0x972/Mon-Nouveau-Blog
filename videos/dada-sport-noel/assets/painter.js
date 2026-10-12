/*
 * Painter — petite bibliothèque de peinture procédurale pour
 * « Les Chevaux de l'Étoile » (Dada Sport Paris).
 *
 * Tout est déterministe : chaque tirage aléatoire passe par un PRNG à graine.
 * Les décors sont peints une fois au chargement (formes + passe « coups de
 * pinceau »), les éléments vivants (chevaux, cavalière, neige, étincelles)
 * sont redessinés à chaque image à partir du temps de la timeline.
 */
(function () {
  "use strict";

  const TAU = Math.PI * 2;

  // ------------------------------------------------------------- hasard

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  // bruit de valeur 2D lissé
  function noise2(seed) {
    const R = rng(seed);
    const P = new Float32Array(512);
    for (let i = 0; i < 512; i++) P[i] = R();
    const at = (x, y) => P[((x & 255) + ((y & 255) * 57)) & 511];
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }

  function fbm(n, x, y, oct) {
    let s = 0, amp = 0.5, f = 1;
    for (let i = 0; i < (oct || 4); i++) {
      s += amp * n(x * f, y * f);
      f *= 2.03;
      amp *= 0.5;
    }
    return s;
  }

  // ------------------------------------------------------------- canvas

  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function mount(parent, cnv, cls) {
    cnv.className = cls || "layer";
    parent.appendChild(cnv);
    return cnv;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }
  function smooth(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }
  function mix(h1, h2, t) {
    const a = hexToRgb(h1), b = hexToRgb(h2);
    const c = a.map((v, i) => Math.round(lerp(v, b[i], t)));
    return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  function glow(ctx, x, y, r, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(0.35, rgba(color, alpha * 0.45));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function vgrad(ctx, w, h, stops) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    stops.forEach(([p, c]) => g.addColorStop(p, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // brume : grosses taches douces
  function fog(ctx, R, x0, y0, x1, y1, n, rmin, rmax, color, alpha) {
    for (let i = 0; i < n; i++) {
      const x = lerp(x0, x1, R()), y = lerp(y0, y1, R());
      glow(ctx, x, y, lerp(rmin, rmax, R()), color, alpha * (0.5 + 0.5 * R()));
    }
  }

  // ------------------------------------------------------------- pinceau

  /*
   * Repeint une image source en coups de pinceau orientés le long des
   * contours (gradient de luminance) ou d'un champ de bruit ailleurs.
   * passes : [{size, len, density, alpha, jitter, edge}] du plus large au plus fin.
   */
  function brushify(src, o) {
    const w = src.width, h = src.height;
    const img = src.getContext("2d").getImageData(0, 0, w, h).data;
    const g = 4, gw = Math.ceil(w / g), gh = Math.ceil(h / g);
    const lum = new Float32Array(gw * gh);
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        const i = ((Math.min(h - 1, y * g) * w) + Math.min(w - 1, x * g)) * 4;
        lum[y * gw + x] = ((img[i] * 0.3 + img[i + 1] * 0.59 + img[i + 2] * 0.11) * img[i + 3]) / 255;
      }
    const gx = new Float32Array(gw * gh), gy = new Float32Array(gw * gh);
    for (let y = 1; y < gh - 1; y++)
      for (let x = 1; x < gw - 1; x++) {
        const k = y * gw + x;
        gx[k] = lum[k - gw + 1] + 2 * lum[k + 1] + lum[k + gw + 1] - lum[k - gw - 1] - 2 * lum[k - 1] - lum[k + gw - 1];
        gy[k] = lum[k + gw - 1] + 2 * lum[k + gw] + lum[k + gw + 1] - lum[k - gw - 1] - 2 * lum[k - gw] - lum[k - gw + 1];
      }
    const out = canvas(w, h);
    const c = out.getContext("2d");
    if (o.underpaint !== false) {
      c.filter = `blur(${o.underBlur || 2}px)`;
      c.drawImage(src, 0, 0);
      c.filter = "none";
    }
    const R = rng(o.seed || 1);
    const flow = noise2((o.seed || 1) + 99);
    const flowScale = o.flowScale || 0.004;
    const flowAngle = o.flowAngle == null ? 0 : o.flowAngle;
    for (const p of o.passes) {
      const n = Math.round(((w * h) / (p.size * p.len)) * (p.density || 1));
      for (let k = 0; k < n; k++) {
        const x = (R() * w) | 0, y = (R() * h) | 0;
        const i = (y * w + x) * 4;
        const a = img[i + 3];
        if (a < 10) continue;
        const gi = ((y / g) | 0) * gw + ((x / g) | 0);
        const mag = Math.hypot(gx[gi], gy[gi]);
        if (p.edge && mag < p.edge) continue;
        let ang;
        if (mag > (o.edgeThreshold || 18)) ang = Math.atan2(gy[gi], gx[gi]) + Math.PI / 2;
        else ang = flowAngle + (flow(x * flowScale, y * flowScale) - 0.5) * (o.flowSpread || 2.4);
        ang += (R() - 0.5) * 0.35;
        const j = p.jitter == null ? 10 : p.jitter;
        const r = clamp(img[i] + (R() - 0.5) * j, 0, 255) | 0;
        const gg = clamp(img[i + 1] + (R() - 0.5) * j, 0, 255) | 0;
        const b = clamp(img[i + 2] + (R() - 0.5) * j, 0, 255) | 0;
        const len = p.len * (0.55 + R() * 0.9);
        const sz = p.size * (0.6 + R() * 0.7);
        c.fillStyle = `rgba(${r},${gg},${b},${((p.alpha || 0.6) * a) / 255})`;
        const cs = Math.cos(ang), sn = Math.sin(ang);
        c.setTransform(cs, sn, -sn, cs, x, y);
        c.beginPath();
        c.ellipse(0, 0, len / 2, sz / 2, 0, 0, TAU);
        c.fill();
      }
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (o.mask) {
      c.globalCompositeOperation = "destination-in";
      c.filter = `blur(${o.maskBlur || 1.2}px)`;
      c.drawImage(src, 0, 0);
      c.filter = "none";
      c.globalCompositeOperation = "source-over";
    }
    return out;
  }

  // texture de toile / papier en gris, pour les éléments dessinés à chaque image
  function paperTexture(w, h, seed) {
    const cnv = canvas(w, h);
    const c = cnv.getContext("2d");
    const R = rng(seed || 7);
    c.fillStyle = "#808080";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < (w * h) / 60; i++) {
      const x = R() * w, y = R() * h, v = (110 + R() * 40) | 0;
      c.fillStyle = `rgba(${v},${v},${v},0.35)`;
      const ang = -0.6 + (R() - 0.5) * 0.8;
      c.setTransform(Math.cos(ang), Math.sin(ang), -Math.sin(ang), Math.cos(ang), x, y);
      c.fillRect(-6, -1, 12 + R() * 10, 2);
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    return cnv;
  }

  // ------------------------------------------------------------- décor

  // tronc de bouleau : légère courbe, effilé, marques noires, lumière latérale
  function birch(ctx, R, o) {
    const { x, base, top, w, lean = 0, light = 1, lightSide = 1, color = "#e9e6dc", shade = "#9aa7b4", mark = "#2b2f36", rim = "#fff6d8" } = o;
    const H = base - top;
    const pts = [];
    const bend = (R() - 0.5) * 0.08 * H;
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const px = x + lean * H * t + Math.sin(t * Math.PI) * bend + Math.sin(t * 9 + x) * w * 0.05;
      const py = base - H * t;
      const pw = w * (1 - 0.55 * t);
      pts.push([px, py, pw]);
    }
    ctx.beginPath();
    pts.forEach(([px, py, pw], i) => (i ? ctx.lineTo(px - pw / 2, py) : ctx.moveTo(px - pw / 2, py)));
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0] + pts[i][2] / 2, pts[i][1]);
    ctx.closePath();
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    if (lightSide > 0) {
      g.addColorStop(0, shade);
      g.addColorStop(0.55, mix(shade, color, light * 0.8));
      g.addColorStop(0.92, color);
      g.addColorStop(1, rim);
    } else {
      g.addColorStop(0, rim);
      g.addColorStop(0.08, color);
      g.addColorStop(0.45, mix(shade, color, light * 0.8));
      g.addColorStop(1, shade);
    }
    ctx.fillStyle = g;
    ctx.fill();
    // marques
    ctx.save();
    ctx.clip();
    const marks = Math.round((H / 100) * (o.marks == null ? 2.2 : o.marks));
    for (let i = 0; i < marks; i++) {
      const t = R();
      const k = Math.min(24, Math.round(t * 24));
      const [px, py, pw] = pts[k];
      const mw = pw * (0.25 + R() * 0.6);
      const mx = px + (R() - 0.5) * pw * 0.7;
      ctx.fillStyle = rgba(mark, (o.markAlpha == null ? 0.85 : o.markAlpha) * (0.55 + 0.45 * R()));
      ctx.beginPath();
      ctx.moveTo(mx - mw / 2, py);
      ctx.quadraticCurveTo(mx, py - 2 - R() * 4, mx + mw / 2, py + (R() - 0.5) * 3);
      ctx.quadraticCurveTo(mx, py + 2 + R() * 3, mx - mw / 2, py);
      ctx.fill();
    }
    ctx.restore();
    return pts;
  }

  function branch(ctx, R, x, y, ang, len, width, color, depth) {
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    let cx = x, cy = y, a = ang;
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      const nx = cx + Math.cos(a) * (len / segs);
      const ny = cy + Math.sin(a) * (len / segs);
      ctx.lineWidth = Math.max(0.6, width * (1 - i / segs));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      if (depth > 0 && R() < 0.45) branch(ctx, R, nx, ny, a + (R() - 0.5) * 1.4, len * 0.45, width * 0.5, color, depth - 1);
      cx = nx;
      cy = ny;
      a += (R() - 0.5) * 0.5;
    }
  }

  // sapin / épicéa stylisé en étages
  function fir(ctx, R, x, base, h, w, color, light, snow) {
    const tiers = Math.max(5, Math.round(h / 38));
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers;
      const ty = base - h * t;
      const tw = w * (1 - t) * (0.9 + R() * 0.2);
      const th = (h / tiers) * 1.9;
      ctx.fillStyle = mix(color, light || color, t * 0.4);
      ctx.beginPath();
      ctx.moveTo(x - tw / 2, ty);
      for (let k = 0; k <= 6; k++) {
        const u = k / 6;
        ctx.lineTo(x - tw / 2 + tw * u, ty + (k % 2 ? 6 : -2) * (1 - t));
      }
      ctx.lineTo(x + tw * 0.08, ty - th);
      ctx.closePath();
      ctx.fill();
      if (snow) {
        ctx.fillStyle = snow;
        ctx.beginPath();
        ctx.moveTo(x - tw * 0.42, ty - th * 0.18);
        ctx.quadraticCurveTo(x, ty - th * 0.55, x + tw * 0.4, ty - th * 0.2);
        ctx.quadraticCurveTo(x, ty - th * 0.3, x - tw * 0.42, ty - th * 0.18);
        ctx.fill();
      }
    }
  }

  // étoile à 5 branches
  function starPath(ctx, x, y, r, inner, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * inner : r;
      const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  // ------------------------------------------------------------- personnages

  // IK à deux segments : renvoie le point d'articulation
  function ik(ax, ay, bx, by, l1, l2, bendSign) {
    const dx = bx - ax, dy = by - ay;
    let d = Math.hypot(dx, dy);
    d = Math.min(d, l1 + l2 - 0.01);
    const a = Math.atan2(dy, dx);
    const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const ang = a + bendSign * Math.acos(cosA);
    return [ax + Math.cos(ang) * l1, ay + Math.sin(ang) * l1];
  }

  function limb(ctx, pts, widths) {
    // polygone effilé le long d'une polyligne
    const L = [], Rr = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
      const dx = q[0] - o[0], dy = q[1] - o[1];
      const d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d;
      const w = widths[i] / 2;
      L.push([p[0] + nx * w, p[1] + ny * w]);
      Rr.push([p[0] - nx * w, p[1] - ny * w]);
    }
    ctx.beginPath();
    L.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    for (let i = Rr.length - 1; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]);
    ctx.closePath();
    ctx.fill();
    pts.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p[0], p[1], widths[i] / 2, 0, TAU);
      ctx.fill();
    });
  }

  /*
   * Cheval de profil (tourné vers la droite), sabots sur y = 0, unités ≈ px à scale 1.
   * pose : { walk (0..1 phase), stride, head (0 tête haute … 1 broute), tail (-1..1),
   *          breath (0..1), earFlick }
   * style : { body, far, mane, rim, rimAlpha, light:[lx,ly] direction vers la lumière }
   */
  function horseShape(pose) {
    const head = pose.head || 0;
    const neckA = lerp(-1.0, 0.62, head) + (pose.nod || 0) * 0.06;
    const B = [78, -168];
    const NL = 118;
    const P = [B[0] + Math.cos(neckA) * NL, B[1] + Math.sin(neckA) * NL];
    const ha = neckA + lerp(1.95, 1.0, head);
    return { B, P, neckA, ha, NL };
  }

  function drawHorse(ctx, x, y, scale, pose, style, flip) {
    pose = pose || {};
    style = style || {};
    const S = horseShape(pose);
    const body = style.body || "#3b2a22";
    const far = style.far || mix(body, "#000000", 0.28);
    const mane = style.mane || mix(body, "#000000", 0.45);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -scale : scale, scale);
    const breath = 1 + (pose.breath || 0) * 0.014;

    // pattes : pas à 4 temps
    const stride = pose.stride == null ? 0 : pose.stride;
    const walk = pose.walk || 0;
    const legs = [
      { hip: [-90, -126], ph: 0.0, front: false, home: -100 },
      { hip: [-80, -124], ph: 0.5, front: false, home: -92 },
      { hip: [80, -112], ph: 0.25, front: true, home: 82 },
      { hip: [90, -114], ph: 0.75, front: true, home: 92 },
    ];
    function footAt(leg) {
      const p = (walk + leg.ph) % 1;
      const duty = 0.64;
      let fx, fy, sw = -1;
      if (stride === 0) return [leg.home, 0, -1];
      if (p < duty) {
        fx = lerp(stride / 2, -stride / 2, p / duty);
        fy = 0;
      } else {
        const u = (p - duty) / (1 - duty);
        fx = lerp(-stride / 2, stride / 2, smooth(u));
        fy = -Math.sin(u * Math.PI) * 24;
        sw = u;
      }
      return [leg.home + fx, fy, sw];
    }
    function hoof(fx, fy, color, back) {
      ctx.fillStyle = mix(color, "#000000", 0.4);
      ctx.beginPath();
      ctx.moveTo(fx - 6 + back, fy - 9);
      ctx.lineTo(fx + 8 + back, fy - 8);
      ctx.lineTo(fx + 11 + back, fy + 0.5);
      ctx.lineTo(fx - 8 + back, fy + 0.5);
      ctx.closePath();
      ctx.fill();
    }
    function drawLeg(leg, color) {
      ctx.fillStyle = color;
      const [fx, fy, sw] = footAt(leg);
      const hip = leg.hip;
      if (leg.front) {
        const curl = sw >= 0 ? Math.sin(sw * Math.PI) : 0;
        const fet = [fx - 2 - curl * 10, fy - 17 + curl * 4];
        const knee = ik(hip[0], hip[1], fet[0], fet[1], 54, 42, -1);
        const mid = [lerp(hip[0], knee[0], 0.45) + 3, lerp(hip[1], knee[1], 0.45)];
        const pas = [fet[0] + 6 - curl * 6, fet[1] + 11];
        limb(ctx, [hip, mid, knee, fet, pas], [30, 21, 14, 12.5, 10.5]);
        hoof(pas[0], pas[1] + 6, color, 0);
      } else {
        const fet = [fx + 2, fy - 17];
        const hock = ik(hip[0], hip[1], fet[0], fet[1], 66, 50, 1);
        const mid = [lerp(hip[0], hock[0], 0.4) - 4, lerp(hip[1], hock[1], 0.4)];
        const pas = [fet[0] + 6, fet[1] + 11];
        limb(ctx, [hip, mid, hock, fet, pas], [50, 30, 15, 12.5, 10.5]);
        hoof(pas[0], pas[1] + 6, color, 0);
      }
    }
    drawLeg(legs[0], far);
    drawLeg(legs[2], far);

    // queue
    const tail = pose.tail || 0;
    ctx.fillStyle = mane;
    ctx.beginPath();
    ctx.moveTo(-104, -178);
    ctx.bezierCurveTo(-130 + tail * 6, -168, -136 + tail * 14, -120, -128 + tail * 22, -58);
    ctx.bezierCurveTo(-124 + tail * 22, -46, -110 + tail * 18, -50, -108 + tail * 14, -66);
    ctx.bezierCurveTo(-112 + tail * 10, -116, -110, -156, -94, -172);
    ctx.closePath();
    ctx.fill();

    // corps
    ctx.save();
    ctx.translate(0, -150);
    ctx.scale(1, breath);
    ctx.translate(0, 150);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-104, -176);
    ctx.bezierCurveTo(-96, -199, -62, -205, -30, -194);
    ctx.bezierCurveTo(0, -186, 30, -190, 58, -203);
    ctx.lineTo(96, -166);
    ctx.bezierCurveTo(114, -150, 114, -126, 98, -113);
    ctx.bezierCurveTo(78, -102, 40, -100, 4, -103);
    ctx.bezierCurveTo(-30, -105, -56, -110, -72, -121);
    ctx.bezierCurveTo(-96, -117, -120, -136, -118, -160);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // encolure (repère local : x le long du cou, y côté gorge)
    const { B, P, neckA, ha, NL } = S;
    ctx.save();
    ctx.translate(B[0], B[1]);
    ctx.rotate(neckA);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-54, -30);
    ctx.quadraticCurveTo(40, -50, NL - 4, -16);
    ctx.quadraticCurveTo(NL + 10, -2, NL + 2, 22);
    ctx.bezierCurveTo(80, 20, 30, 22, 0, 36);
    ctx.lineTo(-30, 44);
    ctx.lineTo(-44, 34);
    ctx.closePath();
    ctx.fill();
    // crinière
    ctx.fillStyle = mane;
    ctx.beginPath();
    const cq = (t) => {
      const a = [-50, -31], c = [40, -50], b = [NL - 4, -16];
      return [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
    };
    const wind = pose.wind || 0;
    for (let i = 0; i <= 16; i++) {
      const [qx, qy] = cq(0.04 + 0.96 * (i / 16));
      i ? ctx.lineTo(qx, qy - 4) : ctx.moveTo(qx, qy - 4);
    }
    for (let i = 16; i >= 0; i--) {
      const [qx, qy] = cq(0.04 + 0.96 * (i / 16));
      const jag = 8 + hash(i * 3.7 + (style.seed || 0)) * 14 + (i % 3 === 0 ? 6 : 0);
      const [px, py] = cq(0.04 + 0.96 * ((i + 0.5) / 16));
      ctx.quadraticCurveTo(px - 2, py + jag * 0.5, qx - 4 - wind * 8, qy + jag);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // tête
    ctx.save();
    ctx.translate(P[0], P[1]);
    ctx.rotate(ha);
    ctx.scale(0.86, 0.86);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-8, -18);
    ctx.bezierCurveTo(30, -24, 70, -19, 96, -11);
    ctx.bezierCurveTo(108, -7, 110, 8, 101, 16);
    ctx.bezierCurveTo(93, 22, 80, 21, 72, 17);
    ctx.bezierCurveTo(55, 21, 40, 42, 20, 42);
    ctx.bezierCurveTo(4, 42, -6, 30, -12, 16);
    ctx.closePath();
    ctx.fill();
    const ear = pose.earFlick || 0;
    ctx.beginPath();
    ctx.moveTo(-6, -12);
    ctx.quadraticCurveTo(-26 + ear * 6, -26, -24 + ear * 10, -42);
    ctx.quadraticCurveTo(-8, -30, 8, -18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = far;
    ctx.beginPath();
    ctx.moveTo(4, -15);
    ctx.quadraticCurveTo(-14, -30, -10, -44);
    ctx.quadraticCurveTo(2, -30, 14, -19);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = mane;
    ctx.beginPath();
    ctx.moveTo(-4, -17);
    ctx.quadraticCurveTo(14, -30, 28, -15);
    ctx.quadraticCurveTo(16, -12, 6, -5);
    ctx.closePath();
    ctx.fill();
    if (style.eye !== false) {
      ctx.fillStyle = style.eyeColor || "rgba(10,8,8,0.85)";
      ctx.beginPath();
      ctx.ellipse(34, -3, 4.6, 3.4, 0.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.arc(35.5, -4.5, 1.3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(94, 5, 4, 2.5, 0.6, 0, TAU);
      ctx.fill();
    }
    if (style.blaze) {
      ctx.fillStyle = style.blaze;
      ctx.beginPath();
      ctx.moveTo(18, -16);
      ctx.quadraticCurveTo(60, -17, 94, -9);
      ctx.quadraticCurveTo(70, -11, 20, -11);
      ctx.closePath();
      ctx.fill();
    }
    if (style.halter) {
      ctx.strokeStyle = style.halter;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(2, -16);
      ctx.quadraticCurveTo(8, 12, 18, 40);
      ctx.moveTo(70, -18);
      ctx.quadraticCurveTo(76, 2, 72, 17);
      ctx.moveTo(18, 32);
      ctx.lineTo(72, 12);
      ctx.stroke();
    }
    ctx.restore();

    drawLeg(legs[1], body);
    drawLeg(legs[3], body);

    if (style.blanket) drawBlanket(ctx, style.blanket);
    ctx.restore();
    // point du licol (sous la ganache), en coordonnées du canvas
    const hs = 0.86;
    const lx = P[0] + Math.cos(ha) * 20 * hs - Math.sin(ha) * 36 * hs;
    const ly = P[1] + Math.sin(ha) * 20 * hs + Math.cos(ha) * 36 * hs;
    const mx = P[0] + Math.cos(ha) * 98 * hs, my = P[1] + Math.sin(ha) * 98 * hs;
    return {
      halter: [x + (flip ? -lx : lx) * scale, y + ly * scale],
      muzzle: [x + (flip ? -mx : mx) * scale, y + my * scale],
    };
  }

  // couverture d'écurie (clin d'œil textile) posée sur le dos
  function drawBlanket(ctx, b) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(-100, -180);
    ctx.bezierCurveTo(-92, -201, -60, -206, -30, -195);
    ctx.bezierCurveTo(0, -187, 30, -191, 58, -204);
    ctx.lineTo(90, -172);
    ctx.bezierCurveTo(98, -150, 94, -130, 86, -118);
    ctx.lineTo(-86, -124);
    ctx.bezierCurveTo(-106, -134, -112, -160, -100, -180);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = b.trim;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-86, -126);
    ctx.lineTo(86, -120);
    ctx.stroke();
    if (b.text) {
      ctx.fillStyle = b.trim;
      ctx.font = "500 15px Montserrat";
      ctx.save();
      ctx.translate(-30, -140);
      ctx.fillText(b.text, 0, 0);
      ctx.restore();
    }
  }

  /*
   * Lumière de contour : remplit un masque de la silhouette avec la couleur du
   * contre-jour, puis le décale vers l'ombre pour ne garder qu'un liseré.
   */
  function rimLight(target, silhouette, color, dx, dy, alpha, blur) {
    const w = silhouette.width, h = silhouette.height;
    const tmp = rimLight._tmp && rimLight._tmp.width === w && rimLight._tmp.height === h ? rimLight._tmp : (rimLight._tmp = canvas(w, h));
    const c = tmp.getContext("2d");
    c.globalCompositeOperation = "source-over";
    c.clearRect(0, 0, w, h);
    c.drawImage(silhouette, 0, 0);
    c.globalCompositeOperation = "source-in";
    c.fillStyle = color;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "destination-out";
    c.filter = `blur(${blur || 2}px)`;
    c.drawImage(silhouette, dx, dy);
    c.filter = "none";
    c.globalCompositeOperation = "source-over";
    const t = target.getContext("2d");
    t.save();
    t.globalAlpha = alpha;
    t.globalCompositeOperation = "lighter";
    t.drawImage(tmp, 0, 0);
    t.restore();
  }

  // ombrage interne + texture peinte sur une silhouette déjà dessinée
  function shadeFigure(cnv, o) {
    const c = cnv.getContext("2d");
    const w = cnv.width, h = cnv.height;
    const mask = shadeFigure._m && shadeFigure._m.width === w && shadeFigure._m.height === h ? shadeFigure._m : (shadeFigure._m = canvas(w, h));
    const mc = mask.getContext("2d");
    mc.clearRect(0, 0, w, h);
    mc.drawImage(cnv, 0, 0);
    c.save();
    c.globalCompositeOperation = "source-atop";
    if (o.gradient) {
      const g = c.createLinearGradient(o.gradient[0], o.gradient[1], o.gradient[2], o.gradient[3]);
      g.addColorStop(0, o.gradColors[0]);
      g.addColorStop(1, o.gradColors[1]);
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
    if (o.texture) {
      c.globalAlpha = o.textureAlpha || 0.25;
      c.globalCompositeOperation = "overlay";
      c.drawImage(o.texture, o.tx || 0, o.ty || 0, w, h);
      c.globalAlpha = 1;
    }
    c.globalCompositeOperation = "destination-in";
    c.drawImage(mask, 0, 0);
    c.restore();
  }

  // halo de contre-jour : silhouette floutée et teintée, dessinée en « lighter »
  function bloom(target, silhouette, color, blur, alpha, ox, oy) {
    const w = silhouette.width, h = silhouette.height;
    const tmp = bloom._t && bloom._t.width === w && bloom._t.height === h ? bloom._t : (bloom._t = canvas(w, h));
    const c = tmp.getContext("2d");
    c.globalCompositeOperation = "source-over";
    c.clearRect(0, 0, w, h);
    c.filter = `blur(${blur}px)`;
    c.drawImage(silhouette, 0, 0);
    c.filter = "none";
    c.globalCompositeOperation = "source-in";
    c.fillStyle = color;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "source-over";
    const t = target.getContext("2d");
    t.save();
    t.globalAlpha = alpha;
    t.globalCompositeOperation = "lighter";
    t.drawImage(tmp, ox || 0, oy || 0);
    t.restore();
  }

  /*
   * Cavalière stylisée (doudoune marine type Tinka, pantalon, bottes, bonnet).
   * pose : { walk (phase 0..1), stride, armReach (main tendue vers la longe), lantern }
   */
  function drawRider(ctx, x, y, scale, pose, st) {
    pose = pose || {};
    st = st || {};
    const coat = st.coat || "#1d2a44";
    const coatLight = st.coatLight || "#2e4166";
    const pants = st.pants || "#1a1c22";
    const boots = st.boots || "#14100e";
    const skin = st.skin || "#e8c3a6";
    const hair = st.hair || "#4a2f22";
    const hat = st.hat || "#c9b9a6";
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const walk = pose.walk || 0;
    const stride = pose.stride == null ? 28 : pose.stride;
    const bob = Math.abs(Math.sin(walk * TAU)) * 2.5 * (stride > 0 ? 1 : 0);
    ctx.translate(0, -bob);
    // jambes
    function leg(ph, color) {
      const p = (walk + ph) % 1;
      const s = Math.sin(p * TAU);
      const hip = [0, -98];
      const foot = [s * stride * 0.5, Math.min(0, -Math.cos(p * TAU) * 7) + bob];
      const knee = ik(hip[0], hip[1], foot[0], foot[1] - 4, 50, 50, -1);
      ctx.fillStyle = color;
      limb(ctx, [hip, knee, [foot[0], foot[1] - 6]], [22, 15, 13]);
      ctx.fillStyle = boots;
      limb(ctx, [[knee[0] + (foot[0] - knee[0]) * 0.35, knee[1] + (foot[1] - knee[1]) * 0.35], [foot[0], foot[1] - 6]], [16, 15]);
      ctx.beginPath();
      ctx.moveTo(foot[0] - 7, foot[1] - 10);
      ctx.lineTo(foot[0] + 14, foot[1] - 6);
      ctx.lineTo(foot[0] + 15, foot[1]);
      ctx.lineTo(foot[0] - 8, foot[1]);
      ctx.closePath();
      ctx.fill();
    }
    leg(0.5, mix(pants, "#000000", 0.3));
    // bras arrière (tient la lanterne)
    const swing = Math.sin(walk * TAU) * (stride > 0 ? 0.25 : 0);
    ctx.fillStyle = mix(coat, "#000000", 0.3);
    const sh = [-2, -160];
    const handB = pose.lantern ? [-30, -112] : [-14 - swing * 30, -104];
    limb(ctx, [sh, [-16, -132], handB], [24, 21, 15]);
    if (pose.lantern) {
      ctx.strokeStyle = "#1a1410";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(handB[0], handB[1]);
      ctx.lineTo(handB[0], handB[1] + 14);
      ctx.stroke();
      ctx.fillStyle = "#2a1f18";
      ctx.fillRect(handB[0] - 9, handB[1] + 13, 18, 4);
      ctx.fillStyle = "#ffcf7a";
      ctx.fillRect(handB[0] - 7, handB[1] + 17, 14, 20);
      ctx.fillStyle = "#2a1f18";
      ctx.fillRect(handB[0] - 9, handB[1] + 37, 18, 4);
    }
    leg(0, pants);
    // doudoune : volume matelassé, longue jusqu'aux hanches
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-24, -170);
    ctx.bezierCurveTo(-34, -150, -32, -110, -26, -86);
    ctx.bezierCurveTo(-10, -80, 14, -80, 26, -86);
    ctx.bezierCurveTo(32, -112, 30, -150, 20, -170);
    ctx.bezierCurveTo(10, -180, -14, -180, -24, -170);
    ctx.closePath();
    ctx.fill();
    // matelassage
    ctx.strokeStyle = mix(coat, "#000000", 0.45);
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const yy = -160 + i * 13;
      ctx.beginPath();
      ctx.moveTo(-30, yy + 2);
      ctx.quadraticCurveTo(0, yy + 5, 29, yy + 2);
      ctx.stroke();
    }
    // reflet
    ctx.fillStyle = rgba(coatLight, 0.6);
    ctx.beginPath();
    ctx.moveTo(12, -168);
    ctx.bezierCurveTo(24, -150, 26, -118, 22, -92);
    ctx.lineTo(16, -92);
    ctx.bezierCurveTo(20, -120, 18, -150, 8, -166);
    ctx.closePath();
    ctx.fill();
    // col montant
    ctx.fillStyle = mix(coat, "#000000", 0.15);
    ctx.beginPath();
    ctx.moveTo(-14, -180);
    ctx.quadraticCurveTo(0, -186, 14, -180);
    ctx.lineTo(13, -168);
    ctx.quadraticCurveTo(0, -164, -13, -168);
    ctx.closePath();
    ctx.fill();
    // tête, cheveux, bonnet
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(-8, -186, 12, 16, -0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(4, -196, 11, 13, 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(-2, -200, 12, 10, 0.2, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = hat;
    ctx.beginPath();
    ctx.moveTo(-12, -203);
    ctx.bezierCurveTo(-10, -224, 16, -226, 16, -203);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = mix(hat, "#000000", 0.15);
    ctx.fillRect(-13, -206, 30, 6);
    ctx.fillStyle = hat;
    ctx.beginPath();
    ctx.arc(3, -227, 6, 0, TAU);
    ctx.fill();
    // écharpe
    ctx.fillStyle = st.scarf || "#a3483f";
    ctx.beginPath();
    ctx.moveTo(-12, -182);
    ctx.quadraticCurveTo(2, -176, 16, -182);
    ctx.lineTo(16, -174);
    ctx.quadraticCurveTo(0, -168, -14, -174);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-14, -176);
    ctx.quadraticCurveTo(-26 - (pose.wind || 0) * 12, -170, -30 - (pose.wind || 0) * 18, -150);
    ctx.lineTo(-22 - (pose.wind || 0) * 14, -150);
    ctx.quadraticCurveTo(-18, -166, -6, -174);
    ctx.closePath();
    ctx.fill();
    // bras avant (vers la longe)
    ctx.fillStyle = coat;
    const reach = pose.armReach || 0;
    const handF = [lerp(10 + swing * 30, 46, reach), lerp(-104, -126, reach)];
    limb(ctx, [[8, -162], [lerp(16, 30, reach), lerp(-134, -146, reach)], handF], [24, 21, 15]);
    ctx.fillStyle = st.glove || "#2b1d16";
    ctx.beginPath();
    ctx.arc(handF[0], handF[1], 7, 0, TAU);
    ctx.fill();
    ctx.restore();
    return { hand: [x + handF[0] * scale, y + (handF[1] - bob) * scale], lantern: pose.lantern ? [x + handB[0] * scale, y + (handB[1] + 27 - bob) * scale] : null };
  }

  // ------------------------------------------------------------- particules

  function flakeSprite(r, color) {
    const s = Math.ceil(r * 4);
    const c = canvas(s, s);
    const x = c.getContext("2d");
    glow(x, s / 2, s / 2, s / 2, color || "#ffffff", 0.95);
    return c;
  }

  /*
   * Neige déterministe : chaque flocon a sa position en fonction du temps.
   */
  function makeSnow(seed, count, w, h, o) {
    o = o || {};
    const R = rng(seed);
    const flakes = [];
    for (let i = 0; i < count; i++) {
      const depth = Math.pow(R(), 1.6);
      flakes.push({
        x: R() * w,
        y: R() * h,
        r: lerp(o.rmin || 1.2, o.rmax || 5.5, depth),
        v: lerp(o.vmin || 28, o.vmax || 110, depth),
        sway: lerp(6, 28, R()),
        f: lerp(0.2, 0.7, R()),
        ph: R() * TAU,
        a: lerp(0.35, 0.95, depth),
      });
    }
    const sprites = [1, 2, 3, 4, 6].map((r) => flakeSprite(r, o.color));
    return {
      draw(ctx, t, alpha) {
        const wind = o.wind || 14;
        for (const f of flakes) {
          const y = (f.y + f.v * t) % (h + 20);
          const x = (((f.x + wind * t + Math.sin(f.ph + t * f.f * TAU) * f.sway) % (w + 20)) + w + 20) % (w + 20);
          const sp = sprites[Math.min(4, Math.round(f.r / 1.4))];
          const s = f.r * 4;
          ctx.globalAlpha = f.a * (alpha == null ? 1 : alpha);
          ctx.drawImage(sp, x - s / 2, y - 10 - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
      },
    };
  }

  // étincelle à 4 branches (scintillement des paillettes)
  function sparkle(ctx, x, y, r, a, color) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, x, y, r * 2.2, color || "#fff6dc", 0.5);
    ctx.fillStyle = color || "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2);
    ctx.quadraticCurveTo(x, y, x + r * 2, y);
    ctx.quadraticCurveTo(x, y, x, y + r * 2);
    ctx.quadraticCurveTo(x, y, x - r * 2, y);
    ctx.quadraticCurveTo(x, y, x, y - r * 2);
    ctx.fill();
    ctx.restore();
  }

  // buée (souffle) : quelques volutes qui s'élèvent
  function breathPuff(ctx, x, y, t, period, dir, scale, alpha) {
    const p = (t % period) / period;
    if (p > 0.75) return;
    const u = p / 0.75;
    for (let i = 0; i < 4; i++) {
      const k = u - i * 0.08;
      if (k <= 0) continue;
      const px = x + dir * (12 + 60 * k) * scale + Math.sin(k * 6 + i) * 4 * scale;
      const py = y - (6 + 22 * k * k) * scale;
      glow(ctx, px, py, (10 + 34 * k) * scale, "#eef3f8", alpha * (1 - k) * 0.5);
    }
  }

  window.Painter = {
    TAU, rng, hash, noise2, fbm, canvas, mount, lerp, clamp, smooth, hexToRgb, rgba, mix,
    glow, vgrad, fog, brushify, paperTexture, birch, branch, fir, starPath,
    ik, limb, drawHorse, horseShape, drawBlanket, rimLight, shadeFigure, bloom, drawRider,
    makeSnow, sparkle, breathPuff, flakeSprite,
  };
})();
