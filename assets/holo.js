/* ============================================================
   Beyond Blueprint - relevé d'un bâtiment non construit.

   Aberration chromatique sur la palette du projet : le trait est
   dessiné trois fois, en Bleu Blueprint, en Blanc cassé et en
   Cyan léger, chaque passe dilatée depuis le centre de l'image.
   Au centre les trois se superposent et le trait est clair ; en
   périphérie ils se séparent et frangent bleu d'un côté, cyan de
   l'autre. Aucun rouge, aucun dégradé.

   Canvas 2D, aucune bibliothèque.
   ============================================================ */

function holo(hote, graine){
  if(!hote) return null;

  const cv  = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  hote.appendChild(cv);

  let etat = graine >>> 0;
  const alea = () => {
    etat ^= etat << 13; etat >>>= 0;
    etat ^= etat >> 17;
    etat ^= etat << 5;  etat >>>= 0;
    return etat / 4294967296;
  };

  /* ---------------------------------------------------------
     Géométrie, répartie en quatre couches d'intensité.
     --------------------------------------------------------- */
  const P = [];                                   // sommets
  const structure = [], dalles = [], menuiserie = [], trame = [];
  const ancres = [];

  const pt = (x, y, z) => (P.push([x, y, z]), P.length - 1);
  const seg = (couche, a, b) => couche.push([a, b]);

  const rect3 = (couche, a, b, c, d) => {
    seg(couche, a, b); seg(couche, b, c); seg(couche, c, d); seg(couche, d, a);
  };

  /* Une baie : rectangle posé sur une façade verticale. */
  const baie = (couche, x0, z0, x1, z1, y0, y1) => {
    const a = pt(x0, y0, z0), b = pt(x1, y0, z1);
    const c = pt(x1, y1, z1), d = pt(x0, y1, z0);
    rect3(couche, a, b, c, d);
  };

  /* Un niveau : volume porteur, dalle, et ses baies sur quatre faces. */
  const niveau = (cx, cz, l, p, y0, y1, nbBaies) => {
    const bas = [], haut = [];
    for(const [x, z] of [[cx-l,cz-p],[cx+l,cz-p],[cx+l,cz+p],[cx-l,cz+p]]){
      bas.push(pt(x, y0, z));
      haut.push(pt(x, y1, z));
    }
    rect3(structure, ...bas);
    rect3(structure, ...haut);
    for(let i = 0; i < 4; i++) seg(structure, bas[i], haut[i]);

    // Dalle marquée, légèrement débordante
    const db = [];
    for(const [x, z] of [[cx-l-.03,cz-p-.03],[cx+l+.03,cz-p-.03],
                         [cx+l+.03,cz+p+.03],[cx-l-.03,cz+p+.03]])
      db.push(pt(x, y1, z));
    rect3(dalles, ...db);

    // Baies : bandeau régulier sur les quatre façades
    const h = y1 - y0;
    const yb = y0 + h * .26, yh = y1 - h * .20;
    if(h > .18){
      for(let f = 0; f < 4; f++){
        const [ax, az, bx, bz] = f === 0 ? [cx-l, cz-p, cx+l, cz-p]
                               : f === 1 ? [cx+l, cz-p, cx+l, cz+p]
                               : f === 2 ? [cx+l, cz+p, cx-l, cz+p]
                                         : [cx-l, cz+p, cx-l, cz-p];
        for(let i = 0; i < nbBaies; i++){
          const t0 = (i + .22) / nbBaies, t1 = (i + .78) / nbBaies;
          baie(menuiserie,
               ax + (bx-ax)*t0, az + (bz-az)*t0,
               ax + (bx-ax)*t1, az + (bz-az)*t1,
               yb, yh);
        }
      }
      // Meneau central sur la façade avant
      const mx = cx, mz = cz - p;
      seg(menuiserie, pt(mx, yb, mz), pt(mx, yh, mz));
    }
    ancres.push(haut[1]);
    return y1;
  };

  /* ---- Empilement ---- */
  let y = -1.10;
  const etages = 7 + Math.floor(alea() * 3);
  const hauteurs = [];
  for(let i = 0; i < etages; i++){
    const h = .24 + alea() * .17;
    const l = Math.max(.54 - i*.040 + alea()*.10, .16);
    const p = Math.max(.41 - i*.024 + alea()*.08, .12);
    y = niveau((alea()-.5)*.34, (alea()-.5)*.26, l, p, y, y + h,
               2 + Math.floor(alea() * 3));
    hauteurs.push(y);
    y += .035;
  }

  /* ---- Rez-de-chaussée : porte et poteaux ---- */
  const solY = -1.10;
  baie(structure, -.16, -.52, .16, -.52, solY, solY + .30);   // porte
  seg(menuiserie, pt(0, solY, -.52), pt(0, solY + .30, -.52));
  for(const x of [-.44, -.15, .15, .44])
    seg(structure, pt(x, solY - .05, -.40), pt(x, solY + .34, -.40));

  /* ---- Porte-à-faux ---- */
  niveau(.86, .08, .46, .15, y - .86, y - .58, 3);

  /* ---- Couronnement ---- */
  const cr = [];
  for(const [x, z] of [[-.20,-.16],[.20,-.16],[.20,.16],[-.20,.16]])
    cr.push(pt(x, y + .16, z));
  rect3(structure, ...cr);
  for(let i = 0; i < 4; i++)
    seg(structure, cr[i], pt(P[cr[i]][0]*1.02, y, P[cr[i]][2]*1.02));

  /* ---- Trame de sol ---- */
  const G = 2.4, N = 8;
  for(let i = 0; i <= N; i++){
    const t = -G + (2*G*i)/N;
    seg(trame, pt(t, -1.15, -G), pt(t, -1.15, G));
    seg(trame, pt(-G, -1.15, t), pt(G, -1.15, t));
  }

  /* ---- Anneaux de relevé gradués ---- */
  const anneaux = [];
  const cerc = (r, axe, incl, ticks) => {
    const pts = [], n = 108;
    for(let i = 0; i < n; i++){
      const t = (i/n) * Math.PI * 2;
      let q = [Math.cos(t)*r, 0, Math.sin(t)*r];
      const c = Math.cos(incl), s = Math.sin(incl);
      q = axe === 'x' ? [q[0], q[1]*c - q[2]*s, q[1]*s + q[2]*c]
                      : [q[0]*c - q[1]*s, q[0]*s + q[1]*c, q[2]];
      pts.push(q);
    }
    anneaux.push({ pts, ticks });
  };
  cerc(1.74, 'x', .16, 72);
  cerc(1.36, 'z', 1.24, 0);
  cerc(2.06, 'x', 1.42, 36);

  /* ---- Cartouches accrochés au volume ---- */
  const releves = ancres.slice(0, 6).map((idx, i) => ({
    idx, txt: `N${String(i+1).padStart(2,'0')} · H ${(3.6 + i*3.2).toFixed(1)} · NON BÂTI`
  }));

  /* ---------------------------------------------------------
     Projection
     --------------------------------------------------------- */
  let L = 0, H = 0;
  const redim = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    L = hote.clientWidth; H = hote.clientHeight;
    cv.width = L*dpr; cv.height = H*dpr;
    cv.style.width = L + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  let angle = .70, tilt = .34;
  const proj = (p) => {
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const x = p[0]*ca - p[2]*sa, z = p[0]*sa + p[2]*ca;
    const cb = Math.cos(tilt), sb = Math.sin(tilt);
    const yy = p[1]*cb - z*sb, zz = p[1]*sb + z*cb;
    const f = 3.4 / (3.4 + zz + 5.0);
    const e = Math.min(L, H) * .46;
    return [L/2 + x*f*e, H/2 - yy*f*e + H*.06];
  };

  /* ---------------------------------------------------------
     Rendu : trois passes, palette du projet, dilatation radiale
     --------------------------------------------------------- */
  // Deux franges en additif, puis le corps du trait par-dessus en
  // opaque : le trait reste Blanc cassé, et seuls les bords, là où
  // les passes se décalent, laissent voir le bleu et le cyan.
  const CANAUX = [
    { k: 1.0042, c:'rgb(30,95,168)',   mode:'lighter'     },  // Bleu Blueprint
    { k: 0.9958, c:'rgb(56,188,216)',  mode:'lighter'     },  // Cyan léger
    { k: 1.0000, c:'rgb(210,216,224)', mode:'source-over' }   // Blanc cassé
  ];

  const lent = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let vivant = true;

  /* ---------------------------------------------------------
     Pilotage : glisser pour tourner autour du bâtiment.
     Au relâcher, la vitesse retombe progressivement vers la
     dérive automatique, elle ne s'arrête pas net.
     --------------------------------------------------------- */
  const AUTO = .0009;
  let vitesse = AUTO, tire = false, xPrec = 0, yPrec = 0;

  hote.style.touchAction = 'none';
  hote.style.cursor = 'grab';

  const debut = (e) => {
    tire = true; xPrec = e.clientX; yPrec = e.clientY;
    hote.style.cursor = 'grabbing';
    hote.setPointerCapture && hote.setPointerCapture(e.pointerId);
  };
  const bouge = (e) => {
    if(!tire) return;
    const dx = e.clientX - xPrec, dy = e.clientY - yPrec;
    xPrec = e.clientX; yPrec = e.clientY;
    vitesse = dx * .0055;
    angle += vitesse;
    tilt = Math.max(-.15, Math.min(1.15, tilt + dy * .0035));
  };
  const fin = () => { tire = false; hote.style.cursor = 'grab'; };

  hote.addEventListener('pointerdown', debut);
  hote.addEventListener('pointermove', bouge);
  hote.addEventListener('pointerup', fin);
  hote.addEventListener('pointercancel', fin);
  hote.addEventListener('pointerleave', fin);

  const geometrie = (k) => {
    const ab = q => [L/2 + (q[0] - L/2)*k, H/2 + (q[1] - H/2)*k];
    const pts = P.map(p => ab(proj(p)));

    const lot = (couche, alpha, lw) => {
      ctx.globalAlpha = alpha; ctx.lineWidth = lw;
      ctx.beginPath();
      for(const [a, b] of couche){
        ctx.moveTo(pts[a][0], pts[a][1]);
        ctx.lineTo(pts[b][0], pts[b][1]);
      }
      ctx.stroke();
    };

    lot(trame,      .11, .6);
    lot(menuiserie, .30, .5);   // baies, trait fin
    lot(dalles,     .44, .7);
    lot(structure,  .62, .9);   // porteur, trait fort

    // Anneaux
    ctx.globalAlpha = .26; ctx.lineWidth = .6;
    for(const an of anneaux){
      ctx.beginPath();
      an.pts.forEach((p, i) => {
        const q = ab(proj(p));
        i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      });
      ctx.closePath(); ctx.stroke();
      if(an.ticks){
        ctx.beginPath();
        const pas = Math.max(1, Math.floor(an.pts.length / an.ticks));
        for(let i = 0; i < an.pts.length; i += pas){
          const p = an.pts[i];
          const q  = ab(proj(p));
          const q2 = ab(proj([p[0]*1.05, p[1]*1.05, p[2]*1.05]));
          ctx.moveTo(q[0], q[1]); ctx.lineTo(q2[0], q2[1]);
        }
        ctx.stroke();
      }
    }

    // Réticules et cartouches
    ctx.globalAlpha = .42; ctx.lineWidth = .6;
    ctx.font = '9px ui-monospace, "SFMono-Regular", monospace';
    for(const r of releves){
      const q = pts[r.idx]; if(!q) continue;
      const x = q[0], yy = q[1], s = 7;
      ctx.beginPath();
      ctx.moveTo(x-s, yy-s+3); ctx.lineTo(x-s, yy-s); ctx.lineTo(x-s+3, yy-s);
      ctx.moveTo(x+s-3, yy-s); ctx.lineTo(x+s, yy-s); ctx.lineTo(x+s, yy-s+3);
      ctx.moveTo(x-s, yy+s-3); ctx.lineTo(x-s, yy+s); ctx.lineTo(x-s+3, yy+s);
      ctx.moveTo(x+s-3, yy+s); ctx.lineTo(x+s, yy+s); ctx.lineTo(x+s, yy+s-3);
      ctx.stroke();
      ctx.fillText(r.txt, x + 13, yy - 9);
    }
    ctx.globalAlpha = 1;
  };

  const trace = () => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, L, H);
    for(const c of CANAUX){
      ctx.globalCompositeOperation = c.mode;
      ctx.strokeStyle = c.c; ctx.fillStyle = c.c;
      geometrie(c.k);
    }
  };

  const boucle = () => {
    if(!vivant) return;
    if(!tire && !lent){
      vitesse += (AUTO - vitesse) * .035;   // retour souple à la dérive
      angle += vitesse;
    }
    trace();
    requestAnimationFrame(boucle);
  };

  addEventListener('resize', () => { redim(); trace(); });
  redim();
  requestAnimationFrame(boucle);

  return {
    arrete(){ vivant = false; },
    reprend(){ if(!vivant){ vivant = true; requestAnimationFrame(boucle); } },
    stats(){ return { sommets:P.length,
                      aretes:structure.length+dalles.length+menuiserie.length+trame.length }; }
  };
}
