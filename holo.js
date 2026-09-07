/* ============================================================
   Volume filaire holographique.
   Canvas 2D, aucune bibliothèque, environ 4 ko.

   Le volume est engendré par une graine numérique : changez la
   graine et vous obtenez un autre bâtiment. Une graine par
   projet suffit à donner une identité propre à chaque page.

   Usage :  holo(document.querySelector('#scene'), 1789);
   ============================================================ */

function holo(hote, graine){
  if(!hote) return null;

  const cv  = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  hote.appendChild(cv);

  /* Générateur déterministe : même graine, même bâtiment. */
  let etat = graine >>> 0;
  const alea = () => {
    etat ^= etat << 13; etat >>>= 0;
    etat ^= etat >> 17;
    etat ^= etat << 5;  etat >>>= 0;
    return etat / 4294967296;
  };

  /* ---- Construction du volume ---- */
  const sommets = [], aretes = [];
  const boite = (cx, cz, l, p, y0, y1) => {
    const d = sommets.length;
    const xs = [cx - l, cx + l], zs = [cz - p, cz + p];
    for(const y of [y0, y1])
      for(const x of xs)
        for(const z of zs) sommets.push([x, y, z]);
    // 0-1-3-2 en bas, 4-5-7-6 en haut, puis les montants
    [[0,1],[1,3],[3,2],[2,0],[4,5],[5,7],[7,6],[6,4],
     [0,4],[1,5],[2,6],[3,7]].forEach(a => aretes.push([d+a[0], d+a[1]]));
  };

  let y = -1.15;
  const etages = 7 + Math.floor(alea() * 3);
  for(let i = 0; i < etages; i++){
    const h  = .30 + alea() * .30;
    const l  = .60 - i * .048 + alea() * .13;
    const p  = .46 - i * .028 + alea() * .11;
    const cx = (alea() - .5) * .42;
    const cz = (alea() - .5) * .34;
    boite(cx, cz, Math.max(l, .15), Math.max(p, .12), y, y + h);
    y += h + .05;
  }

  /* Un porte-à-faux, la signature des architectures spéculatives */
  boite(.92, .10, .52, .17, y - .95, y - .64);

  /* Sol : trame ouverte, dessinée à part pour rester en retrait */
  const solS = [], solA = [];
  const G = 2.0, N = 7;
  for(let i = 0; i <= N; i++){
    const t = -G + (2 * G * i) / N;
    const d = solS.length;
    solS.push([t, -1.2, -G], [t, -1.2, G], [-G, -1.2, t], [G, -1.2, t]);
    solA.push([d, d + 1], [d + 2, d + 3]);
  }

  /* ---- Projection ---- */
  let L = 0, H = 0, dpr = 1;
  const redim = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    L = hote.clientWidth; H = hote.clientHeight;
    cv.width = L * dpr; cv.height = H * dpr;
    cv.style.width = L + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const TILT = .40, DIST = 4.6, FOV = 3.2;
  const projete = (p, a) => {
    const ca = Math.cos(a), sa = Math.sin(a);
    const x  = p[0] * ca - p[2] * sa;
    const z  = p[0] * sa + p[2] * ca;
    const cb = Math.cos(TILT), sb = Math.sin(TILT);
    const yy = p[1] * cb - z * sb;
    const zz = p[1] * sb + z * cb;
    const f  = FOV / (FOV + zz + DIST);
    const e  = Math.min(L, H) * .52;
    return [L / 2 + x * f * e, H / 2 - yy * f * e + H * .10];
  };

  /* ---- Rendu ---- */
  const passes = [
    { dx:-1.15, dy: .5, col:'rgba(100,233,255,.62)' },  // cyan
    { dx: 1.15, dy:-.5, col:'rgba(255,143,200,.50)' },  // rose
    { dx: 0,    dy: 0,  col:'rgba(226,236,255,.80)' }   // arête nette
  ];

  const lent = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let angle = .62, brut = 0, vivant = true;

  const trace = () => {
    ctx.clearRect(0, 0, L, H);
    const pts = sommets.map(s => projete(s, angle));
    const pSol = solS.map(s => projete(s, angle));

    // Ligne de balayage, remontant lentement le volume
    const scan = H * (1 - ((brut * .00022) % 1)) ;

    // Le sol reste en retrait : c'est le bâtiment qu'on regarde
    ctx.strokeStyle = 'rgba(140,160,215,.20)';
    ctx.lineWidth = .5;
    ctx.beginPath();
    for(const [a, b] of solA){
      ctx.moveTo(pSol[a][0], pSol[a][1]);
      ctx.lineTo(pSol[b][0], pSol[b][1]);
    }
    ctx.stroke();

    for(const pa of passes){
      ctx.strokeStyle = pa.col;
      ctx.lineWidth = pa.dx === 0 ? .95 : .65;
      ctx.beginPath();
      for(const [a, b] of aretes){
        ctx.moveTo(pts[a][0] + pa.dx, pts[a][1] + pa.dy);
        ctx.lineTo(pts[b][0] + pa.dx, pts[b][1] + pa.dy);
      }
      ctx.stroke();
    }

    if(!lent){
      const g = ctx.createLinearGradient(0, scan - 90, 0, scan + 90);
      g.addColorStop(0,  'rgba(167,139,250,0)');
      g.addColorStop(.5, 'rgba(167,139,250,.13)');
      g.addColorStop(1,  'rgba(167,139,250,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, scan - 90, L, 180);
    }
  };

  const boucle = (t) => {
    if(!vivant) return;
    brut = t;
    angle += lent ? 0 : .0016;
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
