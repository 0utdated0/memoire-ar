/* ============================================================
   Relevé d'un bâtiment non construit.

   Technique : tout est dessiné trois fois, en rouge pur, vert
   pur et bleu pur, légèrement décalés, en composition additive.
   Là où les trois passes se superposent, le trait redevient
   blanc ; sur les bords, les canaux se séparent et frangent.
   C'est une aberration chromatique réelle, pas un dégradé.

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

  /* ---------- Volume ---------- */
  const S = [], A = [], niveaux = [];
  const boite = (cx, cz, l, p, y0, y1) => {
    const d = S.length;
    for(const y of [y0, y1])
      for(const x of [cx - l, cx + l])
        for(const z of [cz - p, cz + p]) S.push([x, y, z]);
    [[0,1],[1,3],[3,2],[2,0],[4,5],[5,7],[7,6],[6,4],
     [0,4],[1,5],[2,6],[3,7]].forEach(a => A.push([d+a[0], d+a[1]]));
  };

  let y = -1.1;
  const etages = 7 + Math.floor(alea() * 3);
  for(let i = 0; i < etages; i++){
    const h = .26 + alea() * .26;
    boite((alea()-.5)*.40, (alea()-.5)*.32,
          Math.max(.56 - i*.045 + alea()*.12, .14),
          Math.max(.43 - i*.026 + alea()*.10, .11), y, y + h);
    niveaux.push(S.length - 5);
    y += h + .05;
  }
  boite(.88, .09, .48, .16, y - .90, y - .60);   // porte-à-faux
  niveaux.push(S.length - 6);

  /* ---------- Anneaux de relevé, gradués ---------- */
  const anneaux = [];
  const cerc = (r, axe, incl, ticks) => {
    const pts = [], n = 120;
    for(let i = 0; i < n; i++){
      const t = (i / n) * Math.PI * 2;
      let p = [Math.cos(t) * r, 0, Math.sin(t) * r];
      const c = Math.cos(incl), s = Math.sin(incl);
      p = axe === 'x' ? [p[0], p[1]*c - p[2]*s, p[1]*s + p[2]*c]
                      : [p[0]*c - p[1]*s, p[0]*s + p[1]*c, p[2]];
      pts.push(p);
    }
    anneaux.push({ pts, ticks });
  };
  cerc(1.72, 'x', .16, 72);
  cerc(1.34, 'z', 1.24, 0);
  cerc(2.05, 'x', 1.42, 36);

  /* ---------- Relevés attachés au volume ---------- */
  const releves = niveaux.slice(0, 6).map((idx, i) => ({
    idx,
    txt: `N${String(i+1).padStart(2,'0')} · H ${(4.2 + i*3.4).toFixed(1)} · ANCRÉ`
  }));

  /* ---------- Projection ---------- */
  let L = 0, H = 0;
  const redim = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    L = hote.clientWidth; H = hote.clientHeight;
    cv.width = L * dpr; cv.height = H * dpr;
    cv.style.width = L + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const proj = (p, a) => {
    const ca = Math.cos(a), sa = Math.sin(a);
    const x = p[0]*ca - p[2]*sa, z = p[0]*sa + p[2]*ca;
    const cb = Math.cos(.34), sb = Math.sin(.34);
    const yy = p[1]*cb - z*sb, zz = p[1]*sb + z*cb;
    const f = 3.4 / (3.4 + zz + 5.0);
    const e = Math.min(L, H) * .46;
    return [L/2 + x*f*e, H/2 - yy*f*e + H*.06];
  };

  /* ---------- Rendu ---------- */
  // Aberration latérale : chaque canal est dilaté depuis le centre
  // de l'image. Au centre les trois se superposent et le trait est
  // blanc ; plus on s'éloigne, plus ils se séparent et frangent.
  const CANAUX = [
    { k: 1.0042, c:'rgb(255,55,55)' },
    { k: 1.0000, c:'rgb(55,255,105)' },
    { k: 0.9958, c:'rgb(70,110,255)' }
  ];

  const lent = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let angle = .70, vivant = true;

  const geometrie = (k) => {
    // dilate un point depuis le centre de l'image
    const ab = q => [L/2 + (q[0] - L/2) * k, H/2 + (q[1] - H/2) * k];
    const pts = S.map(s => ab(proj(s, angle)));

    // Trame de sol, très en retrait
    ctx.globalAlpha = .12;
    ctx.beginPath();
    const G = 2.4, N = 8;
    for(let i = 0; i <= N; i++){
      const t = -G + (2*G*i)/N;
      const a1 = ab(proj([t,-1.15,-G], angle)), a2 = ab(proj([t,-1.15,G], angle));
      const b1 = ab(proj([-G,-1.15,t], angle)), b2 = ab(proj([G,-1.15,t], angle));
      ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]);
      ctx.moveTo(b1[0], b1[1]); ctx.lineTo(b2[0], b2[1]);
    }
    ctx.stroke();

    // Anneaux et graduations
    ctx.globalAlpha = .30;
    for(const an of anneaux){
      ctx.beginPath();
      an.pts.forEach((p, i) => {
        const q = ab(proj(p, angle));
        i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
      });
      ctx.closePath();
      ctx.stroke();

      if(an.ticks){
        ctx.beginPath();
        const pas = Math.max(1, Math.floor(an.pts.length / an.ticks));
        for(let i = 0; i < an.pts.length; i += pas){
          const p  = an.pts[i];
          const q  = ab(proj(p, angle));
          const q2 = ab(proj([p[0]*1.05, p[1]*1.05, p[2]*1.05], angle));
          ctx.moveTo(q[0], q[1]); ctx.lineTo(q2[0], q2[1]);
        }
        ctx.stroke();
      }
    }

    // Volume
    ctx.globalAlpha = .58;
    ctx.beginPath();
    for(const [a, b] of A){
      ctx.moveTo(pts[a][0], pts[a][1]);
      ctx.lineTo(pts[b][0], pts[b][1]);
    }
    ctx.stroke();

    // Réticules et relevés
    ctx.globalAlpha = .46;
    ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
    for(const r of releves){
      const q = pts[r.idx];
      if(!q) continue;
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
    ctx.globalCompositeOperation = 'lighter';   // les canaux s'additionnent
    ctx.lineWidth = .8;
    for(const k of CANAUX){
      ctx.strokeStyle = k.c;
      ctx.fillStyle   = k.c;
      geometrie(k.k);
    }
  };

  const boucle = () => {
    if(!vivant) return;
    if(!lent) angle += .0011;
    trace();
    requestAnimationFrame(boucle);
  };

  addEventListener('resize', () => { redim(); trace(); });
  redim();
  requestAnimationFrame(boucle);

  return {
    arrete(){ vivant = false; },
    reprend(){ if(!vivant){ vivant = true; requestAnimationFrame(boucle); } }
  };
}
