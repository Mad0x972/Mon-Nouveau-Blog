/*
 * Illustrations des pièces Dada Sport mises en avant (dessinées, vue de face).
 * Chaque fonction peint sur un canvas 900×900 puis le repasse au pinceau.
 *   - Tinka : doudoune imperméable matelassée, marine
 *   - Giovani Winter : pantalon d'équitation doublé polaire, grip aux genoux
 *   - New Tzara : veste de concours, coloris Orage
 */
(function () {
  "use strict";
  const P = window.Painter;
  const S = 900;

  function sym(ctx, draw) {
    draw(1);
    ctx.save();
    ctx.translate(S, 0);
    ctx.scale(-1, 1);
    draw(-1);
    ctx.restore();
  }

  function finish(base, seed) {
    return P.brushify(base, {
      seed,
      mask: true,
      maskBlur: 0.8,
      underBlur: 0.6,
      flowAngle: 0,
      flowSpread: 0.8,
      edgeThreshold: 10,
      passes: [
        { size: 5, len: 16, density: 0.8, alpha: 0.35, jitter: 10 },
        { size: 2.2, len: 7, density: 0.6, alpha: 0.4, jitter: 10 },
      ],
    });
  }

  // ------------------------------------------------------------------ Tinka
  function tinka() {
    const cnv = P.canvas(S, S);
    const c = cnv.getContext("2d");
    const navy = "#1c2b4a",
      hi = "#3d5d93",
      seam = "#0d1630";
    const cx = S / 2;
    // silhouette du corps
    const body = new Path2D();
    body.moveTo(cx - 96, 150);
    body.bezierCurveTo(cx - 150, 160, cx - 188, 176, cx - 196, 214);
    body.bezierCurveTo(cx - 200, 380, cx - 186, 560, cx - 196, 724);
    body.quadraticCurveTo(cx, 748, cx + 196, 724);
    body.bezierCurveTo(cx + 186, 560, cx + 200, 380, cx + 196, 214);
    body.bezierCurveTo(cx + 188, 176, cx + 150, 160, cx + 96, 150);
    body.closePath();
    // manches
    const sleeve = (s) => {
      const p = new Path2D();
      p.moveTo(cx + s * 170, 176);
      p.bezierCurveTo(cx + s * 236, 196, cx + s * 262, 246, cx + s * 272, 330);
      p.lineTo(cx + s * 300, 690);
      p.quadraticCurveTo(cx + s * 262, 708, cx + s * 220, 696);
      p.lineTo(cx + s * 196, 360);
      p.closePath();
      return p;
    };
    const parts = [sleeve(-1), sleeve(1), body];
    // remplissage + matelassage
    parts.forEach((part, pi) => {
      c.save();
      c.clip(part);
      const g = c.createLinearGradient(cx - 300, 0, cx + 300, 0);
      g.addColorStop(0, P.mix(navy, seam, 0.4));
      g.addColorStop(0.42, navy);
      g.addColorStop(0.6, P.mix(navy, hi, 0.35));
      g.addColorStop(1, P.mix(navy, seam, 0.5));
      c.fillStyle = g;
      c.fillRect(0, 0, S, S);
      const step = pi < 2 ? 50 : 58;
      for (let y = pi < 2 ? 200 : 168; y < 760; y += step) {
        // boudin : clair au centre, couture sombre
        const bg = c.createLinearGradient(0, y, 0, y + step);
        bg.addColorStop(0, "rgba(8,14,34,0.55)");
        bg.addColorStop(0.18, "rgba(60,92,150,0.0)");
        bg.addColorStop(0.45, "rgba(110,150,210,0.28)");
        bg.addColorStop(0.8, "rgba(10,18,40,0.0)");
        bg.addColorStop(1, "rgba(8,14,34,0.6)");
        c.fillStyle = bg;
        c.fillRect(0, y, S, step);
        c.strokeStyle = seam;
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(0, y + step);
        c.bezierCurveTo(S * 0.3, y + step + 6, S * 0.7, y + step + 6, S, y + step);
        c.stroke();
      }
      // reflet « imperméable »
      c.filter = "blur(10px)";
      c.fillStyle = "rgba(170,200,240,0.09)";
      c.beginPath();
      c.ellipse(cx + (pi === 2 ? 80 : pi === 0 ? -250 : 250), 420, 18, 230, pi === 2 ? 0.05 : pi === 0 ? 0.08 : -0.08, 0, P.TAU);
      c.fill();
      c.filter = "none";
      c.restore();
    });
    // col montant
    c.fillStyle = P.mix(navy, seam, 0.2);
    c.beginPath();
    c.moveTo(cx - 100, 160);
    c.quadraticCurveTo(cx - 106, 110, cx - 92, 92);
    c.quadraticCurveTo(cx, 76, cx + 92, 92);
    c.quadraticCurveTo(cx + 106, 110, cx + 100, 160);
    c.quadraticCurveTo(cx, 186, cx - 100, 160);
    c.fill();
    c.fillStyle = "rgba(110,150,210,0.25)";
    c.fillRect(cx - 90, 118, 180, 10);
    // intérieur du col
    c.fillStyle = "#14203a";
    c.beginPath();
    c.ellipse(cx, 96, 84, 16, 0, 0, P.TAU);
    c.fill();
    // zip central
    c.strokeStyle = "#0a1022";
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(cx, 96);
    c.lineTo(cx, 738);
    c.stroke();
    c.strokeStyle = "#b9c2cf";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx, 98);
    c.lineTo(cx, 736);
    c.stroke();
    c.fillStyle = "#c9d1dc";
    c.fillRect(cx - 6, 120, 12, 30);
    c.fillStyle = "#1a1f2a";
    c.fillRect(cx - 4, 148, 8, 18);
    // poches zippées
    sym(c, () => {
      c.strokeStyle = "#0a1022";
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(cx - 150, 500);
      c.lineTo(cx - 110, 610);
      c.stroke();
      c.strokeStyle = "rgba(185,194,207,0.8)";
      c.lineWidth = 1.5;
      c.stroke();
    });
    // écusson caoutchouc
    c.fillStyle = "#121a2e";
    c.beginPath();
    c.roundRect(cx + 70, 236, 70, 26, 6);
    c.fill();
    c.strokeStyle = "rgba(200,170,110,0.8)";
    c.lineWidth = 1.5;
    c.stroke();
    // poignets élastiques
    sym(c, (s) => {
      c.fillStyle = "#101a30";
      c.beginPath();
      c.moveTo(cx - 300, 690);
      c.quadraticCurveTo(cx - 262, 708, cx - 220, 696);
      c.lineTo(cx - 222, 716);
      c.quadraticCurveTo(cx - 262, 728, cx - 298, 712);
      c.closePath();
      c.fill();
    });
    return finish(cnv, 501);
  }

  // ------------------------------------------------------------------ Giovani Winter
  function giovani() {
    const cnv = P.canvas(S, S);
    const c = cnv.getContext("2d");
    const base = "#1d2232",
      hi = "#3e4762",
      dark = "#0e111b";
    const cx = S / 2;
    const leg = (s) => {
      const p = new Path2D();
      p.moveTo(cx + s * 4, 300);
      p.bezierCurveTo(cx + s * 8, 420, cx + s * 20, 560, cx + s * 34, 640);
      p.lineTo(cx + s * 44, 846);
      p.lineTo(cx + s * 128, 846);
      p.bezierCurveTo(cx + s * 136, 700, cx + s * 152, 600, cx + s * 160, 520);
      p.bezierCurveTo(cx + s * 172, 400, cx + s * 168, 260, cx + s * 160, 168);
      p.lineTo(cx + s * 4, 168);
      p.closePath();
      return p;
    };
    [-1, 1].forEach((s) => {
      const p = leg(s);
      c.save();
      c.clip(p);
      const g = c.createLinearGradient(cx + s * 0, 0, cx + s * 170, 0);
      g.addColorStop(0, dark);
      g.addColorStop(0.35, base);
      g.addColorStop(0.62, P.mix(base, hi, 0.6));
      g.addColorStop(1, P.mix(base, dark, 0.5));
      c.fillStyle = g;
      c.fillRect(0, 0, S, S);
      // grip silicone à l'intérieur du genou
      c.fillStyle = "rgba(150,160,190,0.55)";
      for (let y = 420; y < 610; y += 13) {
        for (let k = 0; k < 6; k++) {
          const x = cx + s * (30 + k * 13 + (Math.floor(y / 13) % 2) * 6);
          c.beginPath();
          c.arc(x, y, 3.2, 0, P.TAU);
          c.fill();
        }
      }
      // couture et plis
      c.strokeStyle = "rgba(90,100,130,0.6)";
      c.lineWidth = 2;
      c.setLineDash([7, 6]);
      c.beginPath();
      c.moveTo(cx + s * 150, 200);
      c.bezierCurveTo(cx + s * 160, 400, cx + s * 140, 600, cx + s * 118, 846);
      c.stroke();
      c.setLineDash([]);
      c.strokeStyle = "rgba(10,12,20,0.5)";
      c.lineWidth = 3;
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.moveTo(cx + s * 60, 640 + k * 18);
        c.quadraticCurveTo(cx + s * 90, 650 + k * 18, cx + s * 120, 640 + k * 18);
        c.stroke();
      }
      // chaussette élastique à la cheville
      c.fillStyle = "#151926";
      c.fillRect(0, 780, S, 70);
      c.strokeStyle = "rgba(90,100,130,0.5)";
      c.lineWidth = 1.5;
      for (let y = 786; y < 846; y += 8) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(S, y);
        c.stroke();
      }
      c.restore();
    });
    // ceinture
    c.fillStyle = base;
    c.beginPath();
    c.moveTo(cx - 166, 120);
    c.lineTo(cx + 166, 120);
    c.lineTo(cx + 162, 176);
    c.lineTo(cx - 162, 176);
    c.closePath();
    c.fill();
    // doublure polaire qui dépasse (le « doublé polaire »)
    c.fillStyle = "#e9e1d1";
    c.beginPath();
    c.moveTo(cx - 166, 120);
    c.quadraticCurveTo(cx, 104, cx + 166, 120);
    c.lineTo(cx + 166, 132);
    c.quadraticCurveTo(cx, 118, cx - 166, 132);
    c.closePath();
    c.fill();
    const R = P.rng(4);
    for (let i = 0; i < 260; i++) {
      c.fillStyle = `rgba(${200 + R() * 40},${190 + R() * 40},${170 + R() * 40},0.8)`;
      c.beginPath();
      c.arc(cx - 160 + R() * 320, 112 + R() * 18, 1.2 + R() * 1.6, 0, P.TAU);
      c.fill();
    }
    // passants, bouton, braguette
    c.fillStyle = dark;
    [-150, -80, 80, 150].forEach((x) => c.fillRect(cx + x - 6, 122, 12, 56));
    c.strokeStyle = "rgba(10,12,20,0.7)";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx + 2, 176);
    c.quadraticCurveTo(cx + 34, 250, cx + 6, 300);
    c.stroke();
    c.fillStyle = "#b7bfcc";
    c.beginPath();
    c.arc(cx, 148, 9, 0, P.TAU);
    c.fill();
    // poches avant
    [-1, 1].forEach((s) => {
      c.strokeStyle = "rgba(10,12,20,0.6)";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(cx + s * 100, 178);
      c.quadraticCurveTo(cx + s * 120, 240, cx + s * 162, 262);
      c.stroke();
    });
    return finish(cnv, 502);
  }

  // ------------------------------------------------------------------ New Tzara
  function tzara() {
    const cnv = P.canvas(S, S);
    const c = cnv.getContext("2d");
    const base = "#5c6773",
      hi = "#8f9cab",
      dark = "#353d47";
    const cx = S / 2;
    const body = new Path2D();
    body.moveTo(cx - 80, 150);
    body.bezierCurveTo(cx - 140, 156, cx - 182, 172, cx - 186, 214);
    body.bezierCurveTo(cx - 190, 320, cx - 150, 420, cx - 146, 470);
    body.bezierCurveTo(cx - 170, 560, cx - 200, 640, cx - 214, 720);
    body.quadraticCurveTo(cx - 100, 744, cx, 730);
    body.quadraticCurveTo(cx + 100, 744, cx + 214, 720);
    body.bezierCurveTo(cx + 200, 640, cx + 170, 560, cx + 146, 470);
    body.bezierCurveTo(cx + 150, 420, cx + 190, 320, cx + 186, 214);
    body.bezierCurveTo(cx + 182, 172, cx + 140, 156, cx + 80, 150);
    body.closePath();
    const sleeve = (s) => {
      const p = new Path2D();
      p.moveTo(cx + s * 160, 170);
      p.bezierCurveTo(cx + s * 222, 186, cx + s * 240, 230, cx + s * 244, 300);
      p.bezierCurveTo(cx + s * 252, 420, cx + s * 262, 560, cx + s * 266, 690);
      p.lineTo(cx + s * 196, 696);
      p.bezierCurveTo(cx + s * 192, 560, cx + s * 180, 420, cx + s * 176, 330);
      p.closePath();
      return p;
    };
    [sleeve(-1), sleeve(1), body].forEach((part, pi) => {
      c.save();
      c.clip(part);
      const g = c.createLinearGradient(cx - 280, 0, cx + 280, 0);
      g.addColorStop(0, dark);
      g.addColorStop(0.4, base);
      g.addColorStop(0.62, P.mix(base, hi, 0.55));
      g.addColorStop(1, dark);
      c.fillStyle = g;
      c.fillRect(0, 0, S, S);
      // tissu bi-stretch : fines stries
      c.strokeStyle = "rgba(255,255,255,0.04)";
      c.lineWidth = 1;
      for (let x = 0; x < S; x += 5) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + 30, S);
        c.stroke();
      }
      if (pi === 2) {
        // pinces de cintrage
        c.strokeStyle = "rgba(30,36,44,0.55)";
        c.lineWidth = 2.5;
        [-1, 1].forEach((s) => {
          c.beginPath();
          c.moveTo(cx + s * 96, 300);
          c.bezierCurveTo(cx + s * 104, 420, cx + s * 100, 520, cx + s * 120, 720);
          c.stroke();
        });
      }
      c.restore();
    });
    // revers / col (plus sombre, contrastant)
    [-1, 1].forEach((s) => {
      c.fillStyle = dark;
      c.beginPath();
      c.moveTo(cx + s * 82, 150);
      c.quadraticCurveTo(cx + s * 50, 220, cx + s * 4, 330);
      c.lineTo(cx + s * 46, 300);
      c.lineTo(cx + s * 80, 250);
      c.quadraticCurveTo(cx + s * 108, 190, cx + s * 98, 154);
      c.closePath();
      c.fill();
    });
    // plastron (chemise blanche de concours)
    c.fillStyle = "#f1eee8";
    c.beginPath();
    c.moveTo(cx - 72, 152);
    c.quadraticCurveTo(cx, 170, cx + 72, 152);
    c.lineTo(cx + 4, 330);
    c.lineTo(cx - 4, 330);
    c.closePath();
    c.fill();
    c.fillStyle = "#dcd7cd";
    c.beginPath();
    c.moveTo(cx - 72, 152);
    c.quadraticCurveTo(cx - 30, 120, cx, 128);
    c.quadraticCurveTo(cx + 30, 120, cx + 72, 152);
    c.quadraticCurveTo(cx, 176, cx - 72, 152);
    c.fill();
    // fermeture et boutons
    c.strokeStyle = "rgba(30,36,44,0.7)";
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(cx, 330);
    c.lineTo(cx, 470);
    c.quadraticCurveTo(cx + 4, 600, cx, 730);
    c.stroke();
    [360, 410, 460].forEach((y) => {
      c.fillStyle = "#2a3038";
      c.beginPath();
      c.arc(cx + 8, y, 10, 0, P.TAU);
      c.fill();
      c.fillStyle = "rgba(220,226,234,0.55)";
      c.beginPath();
      c.arc(cx + 5, y - 3, 3, 0, P.TAU);
      c.fill();
    });
    // rabats de poches
    [-1, 1].forEach((s) => {
      c.fillStyle = P.mix(base, dark, 0.4);
      c.beginPath();
      c.moveTo(cx + s * 40, 520);
      c.lineTo(cx + s * 140, 512);
      c.lineTo(cx + s * 142, 540);
      c.lineTo(cx + s * 44, 548);
      c.closePath();
      c.fill();
    });
    // basque évasée (fente dos suggérée)
    c.strokeStyle = "rgba(30,36,44,0.45)";
    c.lineWidth = 2;
    [-1, 1].forEach((s) => {
      c.beginPath();
      c.moveTo(cx + s * 150, 520);
      c.quadraticCurveTo(cx + s * 180, 640, cx + s * 200, 720);
      c.stroke();
    });
    return finish(cnv, 503);
  }

  window.Products = { tinka, giovani, tzara };
})();
