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

    // Câbles de suspension depuis le sommet du mât, en pointillés
    const ancrage = pt(0, SOL + HAUT - .06, 0);
    sg(cables, ancrage, bas[1]);
    sg(cables, ancrage, bas[2]);

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

  /* --- Pilotis : le bâtiment ne touche pas le sol --- */
  for(let i = 0; i < 4; i++){
    const t = i/4 * Math.PI*2, r = .52;
    sg(porteur, pt(Math.cos(t)*r, SOL - .28, Math.sin(t)*r), matBas[i]);
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
    const t = d * Math.PI/180, r = 1.92;
    couronne.push({ deg:d, p:[Math.cos(t)*r, SOL-.30, Math.sin(t)*r],
                    q:[Math.cos(t)*(r + (d%45 ? .05 : .13)), SOL-.30, Math.sin(t)*(r + (d%45 ? .05 : .13))] });
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
    const e = Math.min(L,H) * .52;
    return [L/2 + x*f*e, H/2 - yy*f*e + H*.14, zz];
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

    // Deux bandes de profondeur : le lointain est flouté.
    const bandes = flouActif()
      ? [{ min: .15, blur:'blur(1.7px)' }, { min:-99, max:.15, blur:'none' }]
      : [{ min:-99, blur:'none' }];

    const dansBande = (a,b,bd) => {
      const z = (pts[a][2] + pts[b][2]) / 2;
      return z >= (bd.min ?? -99) && z < (bd.max ?? 99);
    };

    const lot = (couche, alpha, lw, bd, dash) => {
      ctx.globalAlpha = alpha; ctx.lineWidth = lw;
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
      lot(trame,   .09, .6, bd);
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
        // Trait de rappel puis cote, avec azimut courant
        const az = ((an.n*61 + angle*57.2958) % 360).toFixed(1).padStart(5,'0');
        const cote = (x > L*.62) ? -1 : 1;      // rappel vers l'intérieur
        ctx.beginPath();
        ctx.moveTo(x + cote*s, y-s);
        ctx.lineTo(x + cote*(s+14), y-s-10);
        ctx.lineTo(x + cote*(s+78), y-s-10);
        ctx.stroke();
        const lib = `P${String(an.n).padStart(2,'0')} · ${an.h.toFixed(1)}m · AZ ${az}`;
        ctx.fillText(lib, cote > 0 ? x+s+16 : x-s-76, y-s-13);
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
