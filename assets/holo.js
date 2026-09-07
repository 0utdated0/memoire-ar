/* ============================================================
   Beyond Blueprint - relevé d'un bâtiment non construit.

   Écrit intégralement pour ce projet. Techniques employées,
   toutes d'usage courant :
     - aberration chromatique latérale par dilatation radiale
       de trois passes rouge, verte et bleue
     - flou de profondeur par bandes de distance
     - pointillés défilants par décalage de phase
     - champ de courbes de niveau animé par somme de sinus
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

  /* =========================================================
     GÉOMÉTRIE
     Couches séparées, chacune avec son intensité et son trait.
     ========================================================= */
  const P = [];
  const porteur = [], dalles = [], resille = [], cables = [], trame = [];
  const ancres = [];

  const pt  = (x,y,z) => (P.push([x,y,z]), P.length - 1);
  const sg  = (c,a,b) => c.push([a,b]);
  const quad = (c,a,b,d,e) => { sg(c,a,b); sg(c,b,d); sg(c,d,e); sg(c,e,a); };

  /* --- Mât central : la structure porteuse unique --- */
  const MAT = .17, HAUT = 1.95, SOL = -1.15;
  const matBas = [], matHaut = [];
  for(const [x,z] of [[-MAT,-MAT],[MAT,-MAT],[MAT,MAT],[-MAT,MAT]]){
    matBas.push(pt(x, SOL, z));
    matHaut.push(pt(x, SOL + HAUT, z));
  }
  quad(porteur, ...matBas); quad(porteur, ...matHaut);
  for(let i = 0; i < 4; i++) sg(porteur, matBas[i], matHaut[i]);
  // Croisillons du mât, en X sur toute la hauteur
  for(let i = 0; i < 11; i++){
    const y0 = SOL + HAUT*i/11, y1 = SOL + HAUT*(i+1)/11;
    sg(resille, pt(-MAT,y0,-MAT), pt(MAT,y1,-MAT));
    sg(resille, pt( MAT,y0,-MAT), pt(-MAT,y1,-MAT));
    sg(resille, pt( MAT,y0, MAT), pt(-MAT,y1, MAT));
  }

  /* --- Plateaux en porte-à-faux, suspendus au mât --- */
  const nbPlateaux = 7 + Math.floor(alea()*2);
  const rot0 = alea() * Math.PI * 2;
  for(let i = 0; i < nbPlateaux; i++){
    const y   = SOL + .26 + (HAUT - .46) * (i / nbPlateaux);
    const ep  = .05;
    // angle d'or : les porte-à-faux rayonnent sans jamais se répéter
    const rot = rot0 + i * 2.39996;
    const l   = .74 + alea()*.46;         // longue portée d'un côté
    const p   = .30 + alea()*.14;
    const dx  = Math.cos(rot), dz = Math.sin(rot);

    // Plateau décentré : il déborde très largement d'un seul côté
    const cx = dx * (l*.52), cz = dz * (l*.52);
    const coins = [];
    for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
      const x = cx + sx*l*.5*Math.abs(dx ? 1 : 1) + sx*0;
      const z = cz + sz*p;
      coins.push([cx + sx*l*.5, cz + sz*p]);
    }
    const bas = [], hau = [];
    for(const [x,z] of coins){
      bas.push(pt(x, y, z));
      hau.push(pt(x, y+ep, z));
    }
    quad(dalles, ...bas); quad(dalles, ...hau);
    for(let k = 0; k < 4; k++) sg(dalles, bas[k], hau[k]);

    // Nervures : subdivision fine du plateau, pas des fenêtres
    for(let k = 1; k < 7; k++){
      const t = k/7;
      sg(resille,
         pt(coins[0][0] + (coins[1][0]-coins[0][0])*t, y+ep, coins[0][1] + (coins[1][1]-coins[0][1])*t),
         pt(coins[3][0] + (coins[2][0]-coins[3][0])*t, y+ep, coins[3][1] + (coins[2][1]-coins[3][1])*t));
    }

    // Garde-corps périphérique, en retrait du nez de dalle
    const gc = [];
    for(const [x,z] of coins){
      const rx = cx + (x-cx)*.90, rz = cz + (z-cz)*.90;
      gc.push(pt(rx, y+ep+.075, rz));
    }
    quad(resille, ...gc);
    for(let k = 0; k < 4; k++){
      sg(resille, gc[k], pt(P[gc[k]][0], y+ep, P[gc[k]][2]));
      // montants intermédiaires
      const n = gc[(k+1)%4];
      for(let m = 1; m < 4; m++){
        const t = m/4;
        const xx = P[gc[k]][0] + (P[n][0]-P[gc[k]][0])*t;
        const zz2 = P[gc[k]][2] + (P[n][2]-P[gc[k]][2])*t;
        sg(resille, pt(xx, y+ep, zz2), pt(xx, y+ep+.075, zz2));
      }
    }

    // Poutre-caisson sous dalle, treillis en N
    const nez = [ (coins[1][0]+coins[2][0])/2, (coins[1][1]+coins[2][1])/2 ];
    const pied = [ (coins[0][0]+coins[3][0])/2, (coins[0][1]+coins[3][1])/2 ];
    const prof = .13;
    for(let m = 0; m <= 6; m++){
      const t = m/6;
      const xx = pied[0] + (nez[0]-pied[0])*t, zz2 = pied[1] + (nez[1]-pied[1])*t;
      sg(resille, pt(xx, y, zz2), pt(xx, y-prof*(1-t*.55), zz2));
      if(m < 6){
        const t2 = (m+1)/6;
        const x2 = pied[0] + (nez[0]-pied[0])*t2, z2 = pied[1] + (nez[1]-pied[1])*t2;
        sg(resille, pt(xx, y-prof*(1-t*.55), zz2), pt(x2, y, z2));
      }
    }

    // Nacelle technique suspendue sous une dalle sur deux
    if(i % 2 === 0){
      const nx = cx + (nez[0]-cx)*.62, nz = cz + (nez[1]-cz)*.62;
      const ny = y - .30, np = [];
      for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]])
        np.push(pt(nx + sx*.075, ny, nz + sz*.055));
      quad(dalles, ...np);
      for(const q of np) sg(cables, q, pt(P[q][0], y, P[q][2]));
    }

    // Câbles de suspension depuis le sommet du mât, en pointillés
    const ancrage = pt(0, SOL + HAUT - .06, 0);
    sg(cables, ancrage, bas[1]);
    sg(cables, ancrage, bas[2]);
    sg(cables, pt(0, SOL + HAUT - .34, 0), bas[0]);

    ancres.push({ idx: hau[1], phase: alea()*6.28, n: i+1, h: (y - SOL) * 12.4 });
  }

  /* --- Anneaux structurels autour du mât, en hauteur --- */
  for(let a = 0; a < 3; a++){
    const y = SOL + .55 + a * .52, r = .40 + a * .085;
    const prev = [];
    for(let i = 0; i < 16; i++){
      const t = i/16 * Math.PI*2;
      prev.push(pt(Math.cos(t)*r, y, Math.sin(t)*r));
    }
    for(let i = 0; i < 16; i++) sg(resille, prev[i], prev[(i+1)%16]);
    for(let i = 0; i < 16; i += 4) sg(cables, prev[i], matHaut[i % 4]);
  }

  /* --- Couronnement : plateforme annulaire ouverte, et un disque
         en lévitation au-dessus. Aucun sommet, aucune pointe. --- */
  const yC = SOL + HAUT + .06;
  const cInt = [], cExt = [];
  for(let i = 0; i < 12; i++){
    const t = i/12 * Math.PI*2;
    cInt.push(pt(Math.cos(t)*.24, yC, Math.sin(t)*.24));
    cExt.push(pt(Math.cos(t)*.62, yC, Math.sin(t)*.62));
  }
  for(let i = 0; i < 12; i++){
    sg(porteur, cExt[i], cExt[(i+1)%12]);
    sg(resille, cInt[i], cInt[(i+1)%12]);
    sg(resille, cInt[i], cExt[i]);                 // rayons
    sg(resille, cInt[i], cExt[(i+1)%12]);          // contreventement
    if(i % 3 === 0) sg(resille, cExt[i], matHaut[(i/3) % 4]);
  }
  // Disque suspendu, détaché de la structure
  const dInt = [], dExt = [];
  for(let i = 0; i < 12; i++){
    const t = i/12 * Math.PI*2;
    dInt.push(pt(Math.cos(t)*.16, yC + .42, Math.sin(t)*.16));
    dExt.push(pt(Math.cos(t)*.44, yC + .42, Math.sin(t)*.44));
  }
  for(let i = 0; i < 12; i++){
    sg(dalles, dExt[i], dExt[(i+1)%12]);
    sg(resille, dInt[i], dInt[(i+1)%12]);
    sg(resille, dInt[i], dExt[i]);
    if(i % 4 === 0) sg(cables, dInt[i], cInt[i]);  // trois haubans seulement
  }

  /* --- Pilotis : le bâtiment ne touche pas le sol --- */
  for(let i = 0; i < 4; i++){
    const t = i/4 * Math.PI*2, r = .52;
    sg(porteur, pt(Math.cos(t)*r, SOL - .28, Math.sin(t)*r), matBas[i]);
  }

  /* --- Gnomon : les trois axes du relevé --- */
  const AX = 1.30;
  const axes = [
    { a: pt(0,SOL-.30,0), b: pt(AX,SOL-.30,0), lab:'X' },
    { a: pt(0,SOL-.30,0), b: pt(0,SOL-.30+AX,0), lab:'Y' },
    { a: pt(0,SOL-.30,0), b: pt(0,SOL-.30,AX), lab:'Z' }
  ];
  // graduations sur chaque axe
  const gradAxes = [];
  for(const [i,d] of [[0,[1,0,0]],[1,[0,1,0]],[2,[0,0,1]]]){
    for(let k=1;k<=6;k++){
      const t=AX*k/6, e=(k%3?.035:.075);
      gradAxes.push([
        pt(d[0]*t, SOL-.30+d[1]*t, d[2]*t),
        pt(d[0]*t + (d[0]?0:e), SOL-.30+d[1]*t + (d[1]?0:e*.6), d[2]*t + (d[2]?0:0))
      ]);
    }
  }

  /* --- Éclats prismatiques : petits fragments qui accrochent la lumière --- */
  const eclats = [];
  for(let i=0;i<5;i++){
    const t = alea()*Math.PI*2, r = 1.05 + alea()*1.05;
    const y = SOL + .25 + alea()*1.6;
    eclats.push({ p:[Math.cos(t)*r, y, Math.sin(t)*r],
                  l: 12 + alea()*26, ang: alea()*Math.PI, ph: alea()*6.28 });
  }

  /* --- Trame de sol --- */
  const G = 2.5, N = 9;
  for(let i = 0; i <= N; i++){
    const t = -G + (2*G*i)/N;
    sg(trame, pt(t, SOL-.30, -G), pt(t, SOL-.30, G));
    sg(trame, pt(-G, SOL-.30, t), pt(G, SOL-.30, t));
  }

  /* --- Couronne graduée : lecture d'azimut en degrés --- */
  const couronne = [];
  for(let d = 0; d < 360; d += 5){
    const t = d * Math.PI/180, r = 1.66;
    couronne.push({ deg:d, p:[Math.cos(t)*r, SOL-.30, Math.sin(t)*r],
                    q:[Math.cos(t)*(r + (d%45 ? .05 : .13)), SOL-.30, Math.sin(t)*(r + (d%45 ? .05 : .13))] });
  }

  /* --- Cercles d'instrument : grandes couronnes graduées qui
         encerclent le bâtiment selon des plans différents. --- */
  const instruments = [];
  const cercle = (r, incl, azi, ticks, opts={}) => {
    const pts = [], n = 132;
    for(let i = 0; i < n; i++){
      const t = i/n * Math.PI*2;
      let q = [Math.cos(t)*r, 0, Math.sin(t)*r];
      // basculement puis rotation propre du plan
      const c1 = Math.cos(incl), s1 = Math.sin(incl);
      q = [q[0], q[1]*c1 - q[2]*s1, q[1]*s1 + q[2]*c1];
      const c2 = Math.cos(azi), s2 = Math.sin(azi);
      q = [q[0]*c2 - q[2]*s2, q[1], q[0]*s2 + q[2]*c2];
      pts.push([q[0], q[1] + SOL + .95, q[2]]);
    }
    instruments.push({ pts, ticks, r,
      dash: opts.dash || null, al: opts.al ?? .24,
      arc: opts.arc || null, vit: opts.vit || 0 });
  };
  cercle(1.62, .12, 0,    120, { al:.30 });
  cercle(1.34, 1.42, .5,   60, { al:.22 });
  cercle(1.86, .82, 2.1,   36, { al:.20, dash:[5,7] });
  cercle(1.12, 1.05, 4.0,  90, { al:.26 });
  cercle(2.02, 1.50, 1.2,   0, { al:.16, dash:[2,9] });
  // deux secteurs partiels, avec crochets aux extrémités
  cercle(1.48, .55, 3.1,   24, { al:.34, arc:[.06,.30] });
  cercle(1.72, 1.20, 5.4,  24, { al:.34, arc:[.58,.76] });

  /* --- Arcs spéculaires : portions d'anneau éclairées --- */
  const arcs = [];
  for(let i=0;i<4;i++){
    const r    = 1.15 + alea()*.85;
    const incl = alea()*1.5;
    const axe  = alea() < .5 ? 'x' : 'z';
    const d0   = alea()*Math.PI*2;
    const arc  = .5 + alea()*1.5;          // longueur angulaire
    const pts  = [];
    for(let k=0;k<=40;k++){
      const t = d0 + arc*k/40;
      let q = [Math.cos(t)*r, 0, Math.sin(t)*r];
      const c=Math.cos(incl), si=Math.sin(incl);
      q = axe==='x' ? [q[0], q[1]*c-q[2]*si, q[1]*si+q[2]*c]
                    : [q[0]*c-q[1]*si, q[0]*si+q[1]*c, q[2]];
      pts.push([q[0], q[1]+SOL+1.0, q[2]]);
    }
    arcs.push({ pts, ph: alea()*6.28, v: .0004 + alea()*.0009 });
  }

  /* La trame de sol est découpée une fois pour toutes en quatre
     couronnes d'opacité décroissante. Le faire à chaque image, pour
     chaque tranche et chaque canal, coûtait très cher pour rien. */
  const trameCour = [0,1].map(c => ({
    seg: trame.filter(([a,b]) => {
      const d = Math.max(Math.hypot(P[a][0],P[a][2]), Math.hypot(P[b][0],P[b][2]));
      return d >= c*G/2 && d < (c+1)*G/2;
    }),
    al: .13 * (1 - c*.42)
  }));

  /* Quels sommets appartiennent au bâtiment et non au décor.
     C'est sur eux, et eux seuls, que se règle la mise au point. */
  const estBati = P.map(p => Math.hypot(p[0], p[2]) < 1.35);

  /* =========================================================
     PROJECTION
     ========================================================= */
  /* Deux calques hors écran en définition réduite. Redessiné à
     l'échelle 1, un calque à 24 % est nettement flou, un calque à
     4,5 % l'est énormément : c'est le rééchantillonnage qui fait le
     flou, sans aucun coût de tracé supplémentaire. */
  const ECH = [.24, .045];
  const bufs = ECH.map(() => {
    const c = document.createElement('canvas');
    return { c, x: c.getContext('2d') };
  });

  let L = 0, H = 0, DPR = 1;
  const redim = () => {
    DPR = Math.min(devicePixelRatio || 1, 2);
    L = hote.clientWidth; H = hote.clientHeight;
    cv.width = L*DPR; cv.height = H*DPR;
    cv.style.width = L+'px'; cv.style.height = H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    bufs.forEach((b,i) => {
      b.c.width  = Math.max(1, Math.round(L*DPR*ECH[i]));
      b.c.height = Math.max(1, Math.round(H*DPR*ECH[i]));
      b.x.setTransform(DPR*ECH[i], 0, 0, DPR*ECH[i], 0, 0);
    });
  };

  let angle = .70, tilt = .34;
  // renvoie [x écran, y écran, profondeur]
  const proj = (p) => {
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const x = p[0]*ca - p[2]*sa, z = p[0]*sa + p[2]*ca;
    const cb = Math.cos(tilt), sb = Math.sin(tilt);
    const yy = p[1]*cb - z*sb, zz = p[1]*sb + z*cb;
    const f = 3.4 / (3.4 + zz + 5.0);
    const e = Math.min(L,H) * .55;
    return [L/2 + x*f*e, H/2 - yy*f*e + H*.03, zz];
  };

  /* =========================================================
     PILOTAGE
     ========================================================= */
  const lent = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AUTO = .0009;
  let vitesse = AUTO, tire = false, xP = 0, yP = 0, vivant = true, temps = 0;

  hote.style.touchAction = 'none';
  hote.style.cursor = 'grab';
  hote.addEventListener('pointerdown', e => {
    tire = true; xP = e.clientX; yP = e.clientY;
    hote.style.cursor = 'grabbing';
    if(hote.setPointerCapture) hote.setPointerCapture(e.pointerId);
  });
  hote.addEventListener('pointermove', e => {
    if(!tire) return;
    const dx = e.clientX - xP, dy = e.clientY - yP;
    xP = e.clientX; yP = e.clientY;
    vitesse = dx * .0055;
    angle += vitesse;
    tilt = Math.max(-1.45, Math.min(1.45, tilt + dy*.0045));
  });
  const fin = () => { tire = false; hote.style.cursor = 'grab'; };
  ['pointerup','pointercancel','pointerleave'].forEach(t => hote.addEventListener(t, fin));

  /* =========================================================
     RENDU
     ========================================================= */
  // Aberration latérale : trois canaux purs qui se recomposent en
  // blanc au centre et frangent en périphérie.
  const CANAUX = [
    { k: 1.0052, c:'rgb(255,0,0)' },
    { k: 1.0000, c:'rgb(0,255,0)' },
    { k: 0.9948, c:'rgb(0,0,255)' }
  ];

  // Le flou coûte cher : on l'écarte sur petit écran.
  // Qualité adaptative. On mesure la durée des images ; si la cadence
  // s'effondre durablement, le flou est abandonné plutôt que de faire
  // ramer la page. Il revient si la machine respire à nouveau.
  let cadence = 16, degrade = false;
  const flouActif = () => L > 760 && !lent && !degrade;

  // ctx.filter est ignoré par plusieurs moteurs lorsqu'on dessine en
  // composition additive, ce qui est notre cas. On ne s'y fie plus :
  // le flou est produit par un noyau de passes décalées, une méthode
  // qui ne dépend d'aucune fonction du navigateur.

  const trace = () => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0,0,L,H);
    for(const b of bufs){
      b.x.globalCompositeOperation = 'source-over';
      b.x.clearRect(0,0,L,H);
      b.x.globalCompositeOperation = 'lighter';
    }
    ctx.globalCompositeOperation = 'lighter';

    for(const canal of CANAUX){
      ctx.strokeStyle = canal.c; ctx.fillStyle = canal.c;
      for(const b of bufs){ b.x.strokeStyle = canal.c; b.x.fillStyle = canal.c; }
      dessine(canal.k);
    }

    // Réagrandissement des calques : le lissage bilinéaire du
    // navigateur fait le flou, sans un seul tracé de plus.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    for(const b of bufs) ctx.drawImage(b.c, 0, 0, cv.width, cv.height);
    ctx.restore();

    ctx.globalCompositeOperation = 'source-over';
  };

  const dessine = (k) => {
    const ab = q => [L/2 + (q[0]-L/2)*k, H/2 + (q[1]-H/2)*k, q[2]];
    const pts = P.map(p => ab(proj(p)));

    // Cinq tranches réparties sur l'étendue réelle de profondeur,
    // recalculée à chaque image. Le plan de netteté est au centre du
    // volume ; le flou croît de part et d'autre. L'épaisseur et
    // l'opacité sont compensées, sinon le trait ne devient pas flou,
    // il s'évapore.
    // Mise au point réglée sur le BÂTIMENT seul. Se baser sur toute
    // la scène était l'erreur : la trame de sol, bien plus étendue,
    // écrasait l'échelle et le bâtiment restait entièrement net.
    let bMin = 1e9, bMax = -1e9;
    for(let i = 0; i < pts.length; i++){
      if(!estBati[i]) continue;
      if(pts[i][2] < bMin) bMin = pts[i][2];
      if(pts[i][2] > bMax) bMax = pts[i][2];
    }
    const zMid = (bMin + bMax) / 2;
    const demi = Math.max(.22, (bMax - bMin) / 3.2);

    let zMin = 1e9, zMax = -1e9;
    for(const q of pts){ if(q[2] < zMin) zMin = q[2]; if(q[2] > zMax) zMax = q[2]; }

    const flou = flouActif();


    // cible 0 : image nette. 1 : calque doux. 2 : calque très flou.
    const CIBLES = [ctx, bufs[0].x, bufs[1].x];
    // Les calques ont un repère mis à l'échelle. Sans compenser
    // l'épaisseur, un trait de 0,6 px n'en fait plus que 0,027 dans le
    // calque le plus grossier : il n'est pas flou, il est absent.
    const COMP = [1, 1/ECH[0], 1/ECH[1]];
    const lot = (seg, alpha, lw, cible, dash) => {
      const c = CIBLES[cible];
      const k2 = COMP[cible];
      if(dash){ c.setLineDash(dash.map(v => v*k2)); c.lineDashOffset = -temps*.02*k2; }
      else c.setLineDash([]);
      c.globalAlpha = Math.min(1, alpha);
      c.lineWidth = lw * k2;
      c.beginPath();
      for(const [a,b] of seg){
        c.moveTo(pts[a][0], pts[a][1]);
        c.lineTo(pts[b][0], pts[b][1]);
      }
      c.stroke();
      c.setLineDash([]);
    };

    // Chaque couche est parcourue UNE fois et ses segments rangés
    // dans la tranche qui leur revient. On dessine ensuite tranche
    // par tranche. C'est là que se joue la fluidité.
    const couches = [
      ...trameCour.map(t => ({ seg:t.seg, al:t.al, lw:.6 })),
      { seg:resille, al:.22, lw:.5 },
      { seg:cables,  al:.30, lw:.5, dash:[3,4] },
      { seg:dalles,  al:.50, lw:.8 },
      { seg:porteur, al:.68, lw:1.0 }
    ];

    // Chaque segment calcule SON flou, en continu. On les regroupe
    // ensuite par valeur voisine, en huit crans, uniquement pour
    // pouvoir tracer par lots. Aucun palier visible, et le nombre de
    // tracés reste borné.
    const Q = 4;
    for(const co of couches){
      const casiers = new Map();
      for(const sgt of co.seg){
        let n = 0;
        if(flou){
          const z = (pts[sgt[0]][2] + pts[sgt[1]][2]) / 2;
          const d = Math.min(2, Math.abs((z - zMid) / demi));
          n = Math.min(1, d * d * 1.45);
        }
        // deux cibles voisines au plus : net, doux, très flou
        const paires = n < .5 ? [[0, 1 - n*2], [1, n*2]]
                              : [[1, 2 - n*2], [2, n*2 - 1]];
        for(const [cible, p] of paires){
          if(p < .14) continue;
          const cran = Math.min(Q, Math.max(1, Math.round(p * Q)));
          const cle = cible * 16 + cran;
          let liste = casiers.get(cle);
          if(!liste) casiers.set(cle, liste = []);
          liste.push(sgt);
        }
      }
      for(const [cle, liste] of casiers)
        lot(liste, co.al * ((cle % 16) / Q), co.lw, (cle / 16) | 0, co.dash);
    }

    // ---- Champ de courbes de niveau, animé -------------------
    ctx.globalAlpha = .17; ctx.lineWidth = .5; ctx.setLineDash([]);
    for(let c = 0; c < 6; c++){
      const r0 = .58 + c*.17;
      ctx.beginPath();
      for(let i = 0; i <= 96; i++){
        const a2 = i/96 * Math.PI*2;
        const r = r0
          + .085*Math.sin(3*a2 + temps*.0007 + c*.9)
          + .055*Math.sin(5*a2 - temps*.0005 + c*1.7)
          + .032*Math.sin(8*a2 + temps*.0009);
        const q = ab(proj([Math.cos(a2)*r, SOL-.28, Math.sin(a2)*r]));
        i ? ctx.lineTo(q[0],q[1]) : ctx.moveTo(q[0],q[1]);
      }
      ctx.stroke();
    }

    // ---- Couronne graduée en degrés --------------------------
    ctx.globalAlpha = .26; ctx.lineWidth = .6;
    ctx.beginPath();
    for(const g of couronne){
      const a1 = ab(proj(g.p)), a2 = ab(proj(g.q));
      ctx.moveTo(a1[0],a1[1]); ctx.lineTo(a2[0],a2[1]);
    }
    ctx.stroke();
    ctx.globalAlpha = .34;
    ctx.font = '8px ui-monospace, monospace';
    for(const g of couronne){
      if(g.deg % 90) continue;
      const a2 = ab(proj(g.q));
      ctx.fillText(String(g.deg).padStart(3,'0'), a2[0]+3, a2[1]-3);
    }

    // ---- Cercles d'instrument --------------------------------
    for(const inst of instruments){
      const n = inst.pts.length;
      const i0 = inst.arc ? Math.floor(inst.arc[0]*n) : 0;
      const i1 = inst.arc ? Math.floor(inst.arc[1]*n) : n;

      ctx.globalAlpha = inst.al; ctx.lineWidth = .6;
      if(inst.dash){ ctx.setLineDash(inst.dash); ctx.lineDashOffset = -temps*.018; }
      else ctx.setLineDash([]);
      ctx.beginPath();
      for(let i = i0; i <= i1; i++){
        const q = ab(proj(inst.pts[i % n]));
        i === i0 ? ctx.moveTo(q[0],q[1]) : ctx.lineTo(q[0],q[1]);
      }
      if(!inst.arc) ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      if(inst.ticks){
        ctx.globalAlpha = inst.al * .8; ctx.lineWidth = .5;
        ctx.beginPath();
        const pas = Math.max(1, Math.floor(n / inst.ticks));
        for(let i = i0; i < i1; i += pas){
          const p = inst.pts[i % n];
          const cx2 = 0, cy2 = SOL + .95, cz2 = 0;
          const dx2 = p[0]-cx2, dy2 = p[1]-cy2, dz2 = p[2]-cz2;
          const g = ((i/pas) % 5 === 0) ? 1.075 : 1.032;   // graduation renforcée
          const a1 = ab(proj(p));
          const a2 = ab(proj([cx2+dx2*g, cy2+dy2*g, cz2+dz2*g]));
          ctx.moveTo(a1[0],a1[1]); ctx.lineTo(a2[0],a2[1]);
        }
        ctx.stroke();
      }

      // Crochets aux extrémités des secteurs partiels
      if(inst.arc){
        ctx.globalAlpha = inst.al * 1.5; ctx.lineWidth = .9;
        ctx.beginPath();
        for(const i of [i0, i1 - 1]){
          const p = inst.pts[i % n];
          const g = 1.11;
          const a1 = ab(proj(p));
          const a2 = ab(proj([p[0]*g, (p[1]-(SOL+.95))*g + SOL+.95, p[2]*g]));
          ctx.moveTo(a1[0],a1[1]); ctx.lineTo(a2[0],a2[1]);
        }
        ctx.stroke();
      }
    }

    // ---- Gnomon XYZ ------------------------------------------
    ctx.globalAlpha = .40; ctx.lineWidth = .9; ctx.setLineDash([]);
    ctx.beginPath();
    for(const ax of axes){
      ctx.moveTo(pts[ax.a][0], pts[ax.a][1]);
      ctx.lineTo(pts[ax.b][0], pts[ax.b][1]);
    }
    for(const [a,b] of gradAxes){
      ctx.moveTo(pts[a][0], pts[a][1]); ctx.lineTo(pts[b][0], pts[b][1]);
    }
    ctx.stroke();
    ctx.globalAlpha = .62;
    ctx.font = '11px ui-monospace, monospace';
    for(const ax of axes){
      const q = pts[ax.b];
      ctx.fillText(ax.lab, q[0] + 6, q[1] - 5);
    }

    // ---- Arcs spéculaires : l'élément qui accroche l'œil -------
    // Le décalage des canaux y est volontairement exagéré : c'est
    // sur les hautes lumières que l'aberration se voit le plus.
    const kSpec = 1 + (k - 1) * 3.4;
    const abS = q => [L/2 + (q[0]-L/2)*kSpec, H/2 + (q[1]-H/2)*kSpec];
    // Choix du calque selon la profondeur, pour que les éléments
    // lumineux soient eux aussi soumis à la profondeur de champ.
    const calquePour = (p3) => {
      if(!flou) return 0;
      const z = proj(p3)[2];
      const d = Math.min(2, Math.abs((z - zMid) / demi));
      const n = Math.min(1, d * d * 1.45);
      return n < .34 ? 0 : (n < .72 ? 1 : 2);
    };

    ctx.lineCap = 'round';
    for(const arc of arcs){
      const ph = (temps * arc.v + arc.ph) % 1;      // la lumière glisse
      const n  = arc.pts.length;
      const i0 = Math.floor(ph * n);
      // Cinq tronçons au lieu de treize : le fondu reste lisible et
      // le coût est divisé par presque trois.
      const len = 15, TR = 5;
      const cq = calquePour(arc.pts[i0 % n]);
      const cc = CIBLES[cq], kk = COMP[cq];
      cc.lineCap = 'round';
      for(let t2 = 0; t2 < TR; t2++){
        const g = Math.sin((t2 + .5) / TR * Math.PI);
        cc.globalAlpha = .95 * g;
        cc.lineWidth = (.8 + 2.1 * g) * kk;
        cc.beginPath();
        for(let j = Math.floor(t2*len/TR); j <= Math.floor((t2+1)*len/TR); j++){
          const q = abS(proj(arc.pts[(i0 + j) % n]));
          j === Math.floor(t2*len/TR) ? cc.moveTo(q[0],q[1]) : cc.lineTo(q[0],q[1]);
        }
        cc.stroke();
      }
      cc.lineCap = 'butt';
      // le reste de l'arc, à peine visible
      ctx.globalAlpha = .13; ctx.lineWidth = .5;
      ctx.beginPath();
      arc.pts.forEach((p,i) => {
        const q = ab(proj(p));
        i ? ctx.lineTo(q[0],q[1]) : ctx.moveTo(q[0],q[1]);
      });
      ctx.stroke();
    }

    // ---- Éclats prismatiques ----------------------------------
    for(const e of eclats){
      const q = abS(proj(e.p));
      const g = .35 + .65 * Math.abs(Math.sin(temps * .0011 + e.ph));
      const cq = calquePour(e.p), cc = CIBLES[cq], kk = COMP[cq];
      cc.globalAlpha = .9 * g;
      cc.lineWidth = 2.4 * kk;
      cc.lineCap = 'round';
      cc.beginPath();
      cc.moveTo(q[0] - Math.cos(e.ang)*e.l/2, q[1] - Math.sin(e.ang)*e.l/2);
      cc.lineTo(q[0] + Math.cos(e.ang)*e.l/2, q[1] + Math.sin(e.ang)*e.l/2);
      cc.stroke();
      cc.lineCap = 'butt';
    }
    ctx.lineCap = 'butt';

    // ---- Ancres : réagissent à l'orientation, et clignotent ----
    ctx.font = '9px ui-monospace, monospace';
    for(const an of ancres){
      const q = pts[an.idx]; if(!q) continue;
      const cachee = q[2] > .28;                       // passée derrière
      const bat = .55 + .45*Math.sin(temps*.004 + an.phase);
      const al  = cachee ? .10 : .30 + .28*bat;
      ctx.globalAlpha = al;
      ctx.lineWidth = cachee ? .5 : .8;

      const x = q[0], y = q[1], s = cachee ? 5 : 8;
      ctx.beginPath();
      ctx.moveTo(x-s,y-s+3); ctx.lineTo(x-s,y-s); ctx.lineTo(x-s+3,y-s);
      ctx.moveTo(x+s-3,y-s); ctx.lineTo(x+s,y-s); ctx.lineTo(x+s,y-s+3);
      ctx.moveTo(x-s,y+s-3); ctx.lineTo(x-s,y+s); ctx.lineTo(x-s+3,y+s);
      ctx.moveTo(x+s-3,y+s); ctx.lineTo(x+s,y+s); ctx.lineTo(x+s,y+s-3);
      ctx.stroke();

      if(!cachee){
        // Relevé en coordonnées écran normalisées, comme une station
        // de poursuite : la valeur change à chaque image.
        const X = (x/L).toFixed(2), Y = (y/H).toFixed(2);
        const Z = (1 - (q[2]+2.6)/5.2).toFixed(2);
        const etat = bat > .82 ? 'VERROU' : 'SUIVI';
        ctx.globalAlpha = .30 + .34*bat;
        ctx.fillText(`P${String(an.n).padStart(2,'0')} · X${X} Y${Y} Z${Z} · ${etat}`,
                     x - 4, y - s - 7);
      }
    }

    // ---- Croix de visée au centre -----------------------------
    ctx.globalAlpha = .22; ctx.lineWidth = .6;
    ctx.beginPath();
    ctx.moveTo(L/2-9, H/2); ctx.lineTo(L/2-3, H/2);
    ctx.moveTo(L/2+3, H/2); ctx.lineTo(L/2+9, H/2);
    ctx.moveTo(L/2, H/2-9); ctx.lineTo(L/2, H/2-3);
    ctx.moveTo(L/2, H/2+3); ctx.lineTo(L/2, H/2+9);
    ctx.stroke();

    ctx.globalAlpha = 1;
  };

  let tPrec = 0;
  const boucle = (t) => {
    if(!vivant) return;
    if(tPrec){
      const dt = Math.min(200, t - tPrec);
      cadence += (dt - cadence) * .06;          // moyenne glissante
      if(!degrade && cadence > 34) degrade = true;   // sous ~29 images/s
      else if(degrade && cadence < 20) degrade = false;
    }
    tPrec = t;
    temps = t || 0;
    if(!tire && !lent){
      vitesse += (AUTO - vitesse) * .035;
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
      aretes:porteur.length+dalles.length+resille.length+cables.length+trame.length,
      ancres:ancres.length }; }
  };
}
