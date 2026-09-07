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

  /* --- Couronnement : treillis pyramidal au sommet du mât --- */
  const cime = pt(0, SOL + HAUT + .30, 0);
  const cour = [];
  for(let i = 0; i < 8; i++){
    const t = i/8 * Math.PI*2, r = .30;
    cour.push(pt(Math.cos(t)*r, SOL + HAUT + .02, Math.sin(t)*r));
  }
  for(let i = 0; i < 8; i++){
    sg(porteur, cour[i], cour[(i+1)%8]);
    sg(resille, cour[i], cime);
    sg(resille, cour[i], matHaut[i % 4]);
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

  /* =========================================================
     PROJECTION
     ========================================================= */
  let L = 0, H = 0;
  const redim = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    L = hote.clientWidth; H = hote.clientHeight;
    cv.width = L*dpr; cv.height = H*dpr;
    cv.style.width = L+'px'; cv.style.height = H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
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
    tilt = Math.max(-.12, Math.min(1.15, tilt + dy*.0035));
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
  const flouActif = () => L > 760 && !lent;

  const trace = () => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.clearRect(0,0,L,H);
    ctx.globalCompositeOperation = 'lighter';

    for(const canal of CANAUX){
      ctx.strokeStyle = canal.c;
      ctx.fillStyle   = canal.c;
      dessine(canal.k);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
  };

  const dessine = (k) => {
    const ab = q => [L/2 + (q[0]-L/2)*k, H/2 + (q[1]-H/2)*k, q[2]];
    const pts = P.map(p => ab(proj(p)));

    // Cinq tranches réparties sur l'étendue réelle de profondeur,
    // recalculée à chaque image. Le plan de netteté est au centre du
    // volume ; le flou croît de part et d'autre. L'épaisseur et
    // l'opacité sont compensées, sinon le trait ne devient pas flou,
    // il s'évapore.
    let zMin = 1e9, zMax = -1e9;
    for(const q of pts){ if(q[2] < zMin) zMin = q[2]; if(q[2] > zMax) zMax = q[2]; }
    const zMid = (zMin + zMax) / 2, demi = Math.max(.001, (zMax - zMin) / 2);

    const bandes = [];
    if(flouActif()){
      const NB = 5;
      for(let i = 0; i < NB; i++){
        const a = zMin + (zMax - zMin) * i / NB;
        const b = zMin + (zMax - zMin) * (i+1) / NB;
        const d = Math.abs(((a+b)/2 - zMid) / demi);   // 0 au net, 1 aux extrêmes
        const r = 2.8 * d * d;                          // rayon de flou
        bandes.push({ min:a, max:(i===NB-1 ? 1e9 : b),
                      blur: r < .25 ? 'none' : `blur(${r.toFixed(2)}px)`,
                      ep: 1 + r * .95, op: 1 + r * .75 });
      }
    } else bandes.push({ min:-1e9, max:1e9, blur:'none', ep:1, op:1 });

    const dansBande = (a,b,bd) => {
      const z = (pts[a][2] + pts[b][2]) / 2;
      return z >= bd.min && z < bd.max;
    };

    const lot = (couche, alpha, lw, bd, dash) => {
      ctx.globalAlpha = Math.min(1, alpha * (bd.op || 1));
      ctx.lineWidth = lw * (bd.ep || 1);
      if(dash){ ctx.setLineDash(dash); ctx.lineDashOffset = -temps * .02; }
      else ctx.setLineDash([]);
      ctx.beginPath();
      for(const [a,b] of couche){
        if(!dansBande(a,b,bd)) continue;
        ctx.moveTo(pts[a][0], pts[a][1]);
        ctx.lineTo(pts[b][0], pts[b][1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    for(const bd of bandes){
      ctx.filter = bd.blur;
      // La trame de sol s'efface avec l'éloignement du centre :
      // quatre couronnes d'opacité décroissante.
      for(let c = 0; c < 4; c++){
        const sousLot = trame.filter(([a,b]) => {
          const pa = P[a], pb = P[b];
          const d = Math.max(Math.hypot(pa[0],pa[2]), Math.hypot(pb[0],pb[2]));
          return d >= c*G/4 && d < (c+1)*G/4;
        });
        lot(sousLot, .13 * (1 - c*.28), .6, bd);
      }
      lot(resille, .22, .5, bd);
      lot(cables,  .30, .5, bd, [3,4]);   // pointillés défilants
      lot(dalles,  .50, .8, bd);
      lot(porteur, .68,1.0, bd);
    }
    ctx.filter = 'none';

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
    ctx.lineCap = 'round';
    for(const arc of arcs){
      const ph = (temps * arc.v + arc.ph) % 1;      // la lumière glisse
      const n  = arc.pts.length;
      const i0 = Math.floor(ph * n);
      const len = 13;
      for(let j = 0; j < len; j++){
        const i = (i0 + j) % (n - 1);
        const a = abS(proj(arc.pts[i])), b = abS(proj(arc.pts[i+1]));
        const g = Math.sin(j / len * Math.PI);       // fondu aux extrémités
        ctx.globalAlpha = .95 * g;
        ctx.lineWidth = .8 + 2.1 * g;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
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
      ctx.globalAlpha = .9 * g;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(q[0] - Math.cos(e.ang)*e.l/2, q[1] - Math.sin(e.ang)*e.l/2);
      ctx.lineTo(q[0] + Math.cos(e.ang)*e.l/2, q[1] + Math.sin(e.ang)*e.l/2);
      ctx.stroke();
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

  const boucle = (t) => {
    if(!vivant) return;
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
