/* ============================================================
   Beyond Blueprint - relevé d'un bâtiment non construit.
   Rendu WebGL.

   La profondeur de champ est calculée par le processeur graphique,
   pixel par pixel. Chaque segment est transformé en bandeau ; à
   chaque extrémité on calcule son cercle de confusion, c'est-à-dire
   le rayon de flou qu'un objectif produirait à cette distance du
   plan de netteté. La valeur est interpolée le long du trait, et le
   shader de fragment s'en sert pour étaler le bord du trait.
   Résultat : un flou continu, sans calque ni palier.

   L'aberration chromatique est appliquée ensuite, sur l'image
   entière, par décalage radial des trois canaux.

   Écrit pour ce projet, sans bibliothèque.
   ============================================================ */

function holo(hote, graine){
  if(!hote) return null;

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

  /* ---------------------------------------------------------
     ORBON INTELLIGENCE - construit en PLAQUES.

     Le bâtiment n'est pas fait de volumes mais de panneaux minces
     découpés, décalés en profondeur, qui laissent voir la machinerie
     entre eux. Chaque plaque est donc décrite par son PROFIL découpé
     puis extrudée de deux à trois mètres seulement.

     Cotes : 128 m de haut, 62 de large, 38 de profondeur.
     Coordonnées en mètres, converties à la fin.
     --------------------------------------------------------- */
  const SOL = -1.15, M = 1/40, Y0 = SOL;
  const mx = (x) => x*M, my = (y) => SOL + y*M, mz = (z) => z*M;

  const lumieres = [], neons = [];
  const fermer = (idx, c) => { for(let k=0;k<idx.length;k++) sg(c, idx[k], idx[(k+1)%idx.length]); };

  /* Une plaque : un profil découpé, extrudé d'une faible épaisseur.
     'axe' vaut 'z' pour un panneau de face, 'x' pour une joue. */
  const plaque = (profil, axe, pos, ep, opts={}) => {
    const p3 = (u, v, w) => axe === 'z' ? pt(mx(u), my(v), mz(w))
                                        : pt(mx(w), my(v), mz(u));
    const A = profil.map(([u,v]) => p3(u, v, pos));
    const B = profil.map(([u,v]) => p3(u, v, pos + ep));
    fermer(A, porteur); fermer(B, porteur);
    for(let k=0;k<A.length;k++) sg(porteur, A[k], B[k]);
    if(opts.neon !== false){
      neons.push(A.concat([A[0]]).map(k => P[k]));
      neons.push(B.concat([B[0]]).map(k => P[k]));
    }
    // Calepinage : lignes de panneaux sur la face visible
    const vs = profil.map(q => q[1]), us = profil.map(q => q[0]);
    const v0 = Math.min(...vs), v1 = Math.max(...vs);
    const u0 = Math.min(...us), u1 = Math.max(...us);
    const dedans = (u, v) => {          // test d'appartenance au profil
      let d = false;
      for(let a=0, b=profil.length-1; a<profil.length; b=a++){
        const [xa,ya] = profil[a], [xb,yb] = profil[b];
        if((ya>v) !== (yb>v) && u < (xb-xa)*(v-ya)/(yb-ya)+xa) d = !d;
      }
      return d;
    };
    const pasV = opts.pasV || 8, pasU = opts.pasU || 7;
    for(let v = v0+pasV; v < v1; v += pasV){
      let dep = null;
      for(let u = u0; u <= u1; u += .6){
        if(dedans(u, v)){ if(dep === null) dep = u; }
        else if(dep !== null){ sg(resille, p3(dep, v, pos), p3(u-.6, v, pos)); dep = null; }
      }
      if(dep !== null) sg(resille, p3(dep, v, pos), p3(u1, v, pos));
    }
    for(let u = u0+pasU; u < u1; u += pasU){
      let dep = null;
      for(let v = v0; v <= v1; v += .6){
        if(dedans(u, v)){ if(dep === null) dep = v; }
        else if(dep !== null){ sg(resille, p3(u, dep, pos), p3(u, v-.6, pos)); dep = null; }
      }
      if(dep !== null) sg(resille, p3(u, dep, pos), p3(u, v1, pos));
    }
    return { A, B };
  };

  /* ============ LES PANNEAUX DE FACE ============
     Profils relevés sur l'image, en mètres. */

  // Avant gauche : le panneau au logo. Son arête intérieure descend
  // droit, rentre en biais vers 60 % de hauteur, puis ressort en pied.
  const PAG = [ [-31,16], [-31,113], [-10,113], [-10,74],
                [-18,60], [-18,34], [-26,16] ];
  plaque(PAG, 'z', -19, 3, { pasV:9, pasU:8 });

  // Avant droit : plus haut, il porte le texte vertical.
  const PAD = [ [10,20], [10,128], [31,128], [31,26], [24,12], [14,12] ];
  plaque(PAD, 'z', -19, 3, { pasV:9, pasU:8 });

  // Arrière gauche et droit, en retrait : ils ferment le canyon.
  plaque([[-31,16],[-31,106],[-12,106],[-12,30],[-24,16]], 'z', 15, 3, { pasV:11, pasU:9 });
  plaque([[12,18],[12,120],[31,120],[31,24],[22,12]],      'z', 15, 3, { pasV:11, pasU:9 });

  /* ============ LES JOUES LATÉRALES ============ */
  plaque([[-19,16],[-19,113],[18,113],[18,22],[10,12],[-14,12]], 'x', -31, 3, { pasV:10, pasU:9 });
  plaque([[-19,20],[-19,128],[18,128],[18,26],[8,12],[-12,12]],  'x',  28, 3, { pasV:10, pasU:9 });

  /* ============ LE GRAND PORTAIL, façade droite ============ */
  {
    const ch = 5;
    const cadre = [ [14,40+ch], [14+ch,40], [29-ch,40], [29,40+ch],
                    [29,110-ch], [29-ch,110], [14+ch,110], [14,110-ch] ];
    const ext = cadre.map(([x,y]) => pt(mx(x), my(y), mz(-19.6)));
    const int = cadre.map(([x,y]) => pt(mx(20 + (x-20)*.86), my(75 + (y-75)*.93), mz(-19.6)));
    fermer(ext, porteur); fermer(int, resille);
    for(let k=0;k<8;k++) sg(resille, ext[k], int[k]);
    neons.push(ext.concat([ext[0]]).map(k => P[k]));
    // ce qu'on aperçoit derrière
    for(let m=0;m<11;m++){
      const y = 44 + m*6;
      sg(resille, pt(mx(15), my(y), mz(-13)), pt(mx(28), my(y), mz(-13)));
      if(m%3===0) lumieres.push([mx(21), my(y), mz(-13)]);
    }
  }

  /* ============ L'ANNEAU HEXAGONAL BLANC ============ */
  {
    const cx = 4, cy = 46, r = 9;
    const h1=[], h2=[];
    for(let k=0;k<6;k++){
      const a = k/6*Math.PI*2 + Math.PI/6;
      h1.push(pt(mx(cx+Math.cos(a)*r),     my(cy+Math.sin(a)*r*1.15),     mz(-16)));
      h2.push(pt(mx(cx+Math.cos(a)*r*.72), my(cy+Math.sin(a)*r*1.15*.72), mz(-16)));
    }
    fermer(h1, porteur); fermer(h2, porteur);
    neons.push(h1.concat([h1[0]]).map(k=>P[k]));
    neons.push(h2.concat([h2[0]]).map(k=>P[k]));
  }

  /* ============ LE CANYON : machinerie à nu ============ */
  for(let i=0;;i++){
    const y = 22 + i*6.5;
    if(y > 118) break;
    const zr = 11 + 3*Math.sin(i*.7);
    fermer([pt(mx(-9),my(y),mz(-zr)), pt(mx(9),my(y),mz(-zr)),
            pt(mx(9),my(y),mz(zr)),   pt(mx(-9),my(y),mz(zr))], dalles);
    if(i%2===0){
      const cx=((i*7)%3-1)*3.5, cz=((i*11)%5-2)*3.5;
      const b=[],h=[];
      for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
        b.push(pt(mx(cx+sx*2.4), my(y+.6), mz(cz+sz*2.2)));
        h.push(pt(mx(cx+sx*2.4), my(y+5),  mz(cz+sz*2.2)));
      }
      fermer(b,resille); fermer(h,resille);
      for(let k=0;k<4;k++) sg(resille,b[k],h[k]);
    }
    if(i%4===1){                       // réservoir cylindrique traversant
      const cz=((i*5)%5-2)*3, r=3.2, a=[],b=[];
      for(let k=0;k<10;k++){
        const an=k/10*Math.PI*2;
        a.push(pt(mx(-9), my(y+3+Math.sin(an)*r), mz(cz+Math.cos(an)*r)));
        b.push(pt(mx( 9), my(y+3+Math.sin(an)*r), mz(cz+Math.cos(an)*r)));
      }
      fermer(a,resille); fermer(b,resille);
      for(let k=0;k<10;k+=2) sg(resille,a[k],b[k]);
      lumieres.push([0, my(y+3), mz(cz)]);
    }
    if(i%3===2){                       // conduite horizontale
      const z=((i*3)%7-3)*2.5;
      sg(porteur, pt(mx(-9),my(y+2),mz(z)), pt(mx(9),my(y+2),mz(z)));
      neons.push([[mx(-9),my(y+2),mz(z)],[mx(9),my(y+2),mz(z)]]);
    }
    if(i%5===0) lumieres.push([mx(((i*3)%5-2)*3), my(y+3), mz(-8)]);
  }

  /* ============ LE SOCLE, en porte-à-faux sous la tour ============ */
  const terrasses = [];
  for(let k=0;k<3;k++){
    const y = k*8, g = 1 - k*.04;
    const lx = 40*g, lz = 21*g, c2 = 6*g;
    const c = [[-lx+c2,-lz],[lx-c2,-lz],[lx,-lz+c2],[lx,lz-c2],
               [lx-c2,lz],[-lx+c2,lz],[-lx,lz-c2],[-lx,-lz+c2]]
              .map(([x,z]) => pt(mx(x), my(y), mz(z)));
    fermer(c, dalles);
    const gc = c.map(m => pt(P[m][0]*.97, my(y+1.4), P[m][2]*.97));
    fermer(gc, resille);
    for(let m=0;m<8;m++) sg(resille, c[m], gc[m]);
    if(k) for(let m=0;m<8;m++) sg(porteur, terrasses[k-1][m], c[m]);
    neons.push(c.concat([c[0]]).map(m=>P[m]));
    if(k) for(let m=0;m<8;m++){
      const A=P[terrasses[k-1][m]], B=P[terrasses[k-1][(m+1)%8]];
      for(let w=1;w<8;w++){
        const t=w/8;
        sg(resille, pt(A[0]+(B[0]-A[0])*t, A[1], A[2]+(B[2]-A[2])*t),
                    pt(A[0]+(B[0]-A[0])*t, my(y), A[2]+(B[2]-A[2])*t));
      }
    }
    terrasses.push(c);
  }

  /* ============ ESCALATORS OBLIQUES ============ */
  for(const [x0,x1,zz] of [[-30,-6,-4],[26,6,-2],[-14,2,4]]){
    const z0=-24, z1=zz, y0=2, y1=18, lg=3.5;
    const A1=pt(mx(x0-lg),my(y0),mz(z0)), B1=pt(mx(x1-lg),my(y1),mz(z1));
    const A2=pt(mx(x0+lg),my(y0),mz(z0)), B2=pt(mx(x1+lg),my(y1),mz(z1));
    sg(porteur,A1,B1); sg(porteur,A2,B2); sg(porteur,A1,A2); sg(porteur,B1,B2);
    for(let m=0;m<=14;m++){
      const t=m/14;
      const u=pt(mx(x0-lg+(x1-x0)*t), my(y0+(y1-y0)*t), mz(z0+(z1-z0)*t));
      const v=pt(mx(x0+lg+(x1-x0)*t), my(y0+(y1-y0)*t), mz(z0+(z1-z0)*t));
      sg(resille,u,v);
      if(m%4===0){
        sg(resille,u,pt(P[u][0],P[u][1]+mz(3),P[u][2]));
        sg(resille,v,pt(P[v][0],P[v][1]+mz(3),P[v][2]));
      }
    }
    neons.push([[mx(x0-lg),my(y0+3),mz(z0)],[mx(x1-lg),my(y1+3),mz(z1)]]);
    neons.push([[mx(x0+lg),my(y0+3),mz(z0)],[mx(x1+lg),my(y1+3),mz(z1)]]);
  }

  /* ============ PAVILLON DÉTACHÉ, à gauche ============ */
  for(let k=0;k<3;k++){
    const y = 2 + k*7;
    const c = [ pt(mx(-72),my(y),mz(-14)), pt(mx(-44),my(y),mz(-18)),
                pt(mx(-42),my(y),mz(12)),  pt(mx(-74),my(y),mz(16)) ];
    fermer(c, dalles);
    neons.push(c.concat([c[0]]).map(m=>P[m]));
    if(k){
      for(let m=0;m<4;m++) sg(porteur, pt(P[c[m]][0], my(y-7), P[c[m]][2]), c[m]);
      for(let m=0;m<4;m++){
        const A=P[c[m]], B=P[c[(m+1)%4]];
        for(let w=1;w<6;w++){
          const t=w/6;
          sg(resille, pt(A[0]+(B[0]-A[0])*t, my(y-7), A[2]+(B[2]-A[2])*t),
                      pt(A[0]+(B[0]-A[0])*t, my(y),   A[2]+(B[2]-A[2])*t));
        }
      }
    }
    if(k===1) lumieres.push([mx(-58), my(y+3), mz(-16)]);
  }

  /* ============ COURONNEMENT ============ */
  for(const [cx, yy, lx] of [[-20, 113, 11], [20, 128, 10]]){
    const b=[],h=[];
    for(const [sx,sz] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
      b.push(pt(mx(cx+sx*lx), my(yy),   mz(sz*9)));
      h.push(pt(mx(cx+sx*lx), my(yy+5), mz(sz*9)));
    }
    fermer(b,porteur); fermer(h,porteur);
    for(let k=0;k<4;k++) sg(porteur,b[k],h[k]);
    neons.push(h.concat([h[0]]).map(k=>P[k]));
  }

  const feux = [[mx(-20), my(120), 0], [mx(20), my(135), 0]];
  const filsLumiere = neons;

  const REMARQUABLES = [];
  for(const [x,y,z] of [[-31,100,-19],[-18,50,-19],[31,120,-19],
                        [14,75,-19.6],[0,60,-11],[-40,16,-21]])
    REMARQUABLES.push(pt(mx(x), my(y), mz(z)));
  for(let i=0;i<REMARQUABLES.length;i++)
    ancres.push({ idx:REMARQUABLES[i], phase:alea()*6.28, n:i+1,
                  h:(P[REMARQUABLES[i]][1]-SOL)*40 });

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


  /* =========================================================
     PRÉPARATION DES SEGMENTS
     Les couches deviennent une liste plate : chaque segment porte
     ses deux extrémités, son épaisseur et son opacité.
     ========================================================= */
  const G4 = G / 2;
  const rayonSol = (a, b) =>
    Math.max(Math.hypot(P[a][0], P[a][2]), Math.hypot(P[b][0], P[b][2]));

  // famille 0 : le bâtiment. 1 : l'appareillage de relevé. 2 : les
  // éléments lumineux. Seul le bâtiment reste blanc.
  const statiques = [];
  const pousse = (liste, w, al, fam) => {
    for(const [a, b] of liste)
      statiques.push({ a:P[a], b:P[b], w, al, fam: fam || 0 });
  };
  for(const [a, b] of trame){
    const d = rayonSol(a, b);
    statiques.push({ a:P[a], b:P[b], w:.9, fam:1,
                     al: .26 * Math.max(.18, 1 - d / (G * 1.05)) });
  }
  pousse(resille, .8,  .22);
  pousse(dalles,  1.1, .50);
  pousse(porteur, 1.5, .70);

  // Cercles d'instrument et leurs graduations
  const CI = [0, SOL + .95, 0];
  for(const inst of instruments){
    const n = inst.pts.length;
    const i0 = inst.arc ? Math.floor(inst.arc[0]*n) : 0;
    const i1 = inst.arc ? Math.floor(inst.arc[1]*n) : n;
    for(let i = i0; i < i1; i++){
      if(inst.dash && (i % 4) > 1) continue;      // pointillé figé
      statiques.push({ a: inst.pts[i % n], b: inst.pts[(i+1) % n],
                       w: .9, al: inst.al * 1.7, fam: 1 });
    }
    if(inst.ticks){
      const pas = Math.max(1, Math.floor(n / inst.ticks));
      for(let i = i0; i < i1; i += pas){
        const p = inst.pts[i % n];
        const g = ((i/pas) % 5 === 0) ? 1.075 : 1.032;
        statiques.push({ a: p,
          b: [CI[0] + (p[0]-CI[0])*g, CI[1] + (p[1]-CI[1])*g, CI[2] + (p[2]-CI[2])*g],
          w: .8, al: inst.al * 1.4, fam: 1 });
      }
    }
    if(inst.arc){
      for(const i of [i0, i1 - 1]){
        const p = inst.pts[i % n], g = 1.11;
        statiques.push({ a: p,
          b: [p[0]*g, (p[1]-CI[1])*g + CI[1], p[2]*g],
          w: 1.3, al: inst.al * 2.4, fam: 1 });
      }
    }
  }

  // Gnomon
  for(const ax of axes) statiques.push({ a:P[ax.a], b:P[ax.b], w:1.3, al:.70, fam:1 });
  for(const [a, b] of gradAxes) statiques.push({ a:P[a], b:P[b], w:1.0, al:.66, fam:1 });

  /* =========================================================
     CONTEXTE WEBGL
     ========================================================= */
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  hote.appendChild(cv);

  // Calque texte : le GPU ne dessine pas de caractères.
  const tx = document.createElement('canvas');
  tx.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  hote.appendChild(tx);
  const t2 = tx.getContext('2d');

  const gl = cv.getContext('webgl', {
    alpha: true, premultipliedAlpha: true, antialias: false, depth: false
  });
  if(!gl){ console.warn('holo : WebGL indisponible'); return null; }

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
      console.error('holo shader :', gl.getShaderInfoLog(sh));
    return sh;
  };
  const lier = (vs, fs) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if(!gl.getProgramParameter(p, gl.LINK_STATUS))
      console.error('holo lien :', gl.getProgramInfoLog(p));
    return p;
  };

  /* ---------- Programme 1 : les traits ---------- */
  const VS_TRAIT = `
    precision highp float;
    attribute vec3  aA, aB;
    attribute vec2  aCoin;     // x : extrémité 0 ou 1, y : côté -1 ou +1
    attribute vec3  aStyle;    // x : épaisseur, y : opacité, z : famille

    uniform vec2  uTaille;     // largeur, hauteur en pixels
    uniform float uAngle, uTilt, uEch, uDecalY;
    uniform float uFocus, uDemi, uForce, uMaxCoC;

    varying vec3  vCol;    // teinte, selon la famille
    varying vec2  vP, vA, vB;   // fragment et extrémités, en pixels
    varying float vDemi;   // demi-épaisseur nette
    varying float vCoC;    // rayon de flou
    varying float vOp;

    // Reprend exactement la projection utilisée pour le texte.
    vec3 versEcran(vec3 p){
      float ca = cos(uAngle), sa = sin(uAngle);
      float x  = p.x*ca - p.z*sa;
      float z1 = p.x*sa + p.z*ca;
      float cb = cos(uTilt), sb = sin(uTilt);
      float y  = p.y*cb - z1*sb;
      float zz = p.y*sb + z1*cb;
      float f  = 9.0 / (9.0 + zz + 13.0);   // perspective douce
      return vec3(uTaille.x*0.5 + x*f*uEch,
                  uTaille.y*0.5 - y*f*uEch + uDecalY,
                  zz);
    }

    // Cercle de confusion : croît avec l'écart au plan de netteté.
    float coc(float zz){
      float d = min(2.0, abs(zz - uFocus) / uDemi);
      return min(uMaxCoC, pow(d, 1.55) * uForce);
    }

    void main(){
      vec3 ea = versEcran(aA);
      vec3 eb = versEcran(aB);
      vec2 dir = eb.xy - ea.xy;
      float lg = max(length(dir), 0.0001);
      vec2 nor = vec2(-dir.y, dir.x) / lg;

      float zz  = mix(ea.z, eb.z, aCoin.x);
      vCoC      = coc(zz);
      vDemi     = max(0.45, aStyle.x * 0.5);
      // Le bandeau doit être assez large pour contenir l'étalement.
      float rayon = vDemi + vCoC + 1.0;

      // Le bandeau déborde AUSSI dans le sens de la longueur, sinon
      // le flou est tranché net aux deux bouts du trait.
      vec2 dirN = dir / lg;
      vec2 pos = mix(ea.xy, eb.xy, aCoin.x)
               + dirN * (aCoin.x * 2.0 - 1.0) * rayon
               + nor  * aCoin.y * rayon;
      vP = pos; vA = ea.xy; vB = eb.xy;
      vOp = aStyle.y;

      // 0 le bâtiment, 1 l'appareillage de relevé, 2 les éclats.
      vCol = aStyle.z < 0.5 ? vec3(0.82, 0.85, 0.90)    // Blanc cassé
           : aStyle.z < 1.5 ? vec3(0.12, 0.37, 0.66)    // Bleu Blueprint
                            : vec3(0.22, 0.74, 0.85);   // Cyan léger

      gl_Position = vec4(pos.x / uTaille.x * 2.0 - 1.0,
                         1.0 - pos.y / uTaille.y * 2.0, 0.0, 1.0);
    }`;

  const FS_TRAIT = `
    precision highp float;
    varying vec3  vCol;
    varying vec2  vP, vA, vB;
    varying float vDemi, vCoC, vOp;
    void main(){
      // Distance au SEGMENT, pas à la droite : les extrémités
      // deviennent des demi-disques et se diffusent comme le reste.
      vec2 pa = vP - vA, ba = vB - vA;
      float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
      float d = length(pa - ba * h);
      float e = max(vCoC, 0.6);                    // largeur du dégradé
      // Bord franc quand le flou est nul, bord étalé quand il est fort.
      float a = 1.0 - smoothstep(max(vDemi - e, 0.0), vDemi + e, d);
      // Conservation de l'énergie : plus le trait s'étale, plus il
      // pâlit. À la lettre le rapport ferait disparaître le lointain,
      // on en prend la racine pour qu'il reste lisible.
      a *= sqrt(vDemi / (vDemi + vCoC));
      gl_FragColor = vec4(vCol * vOp * a, 1.0);
    }`;

  /* ---------- Programme 2 : aberration chromatique ---------- */
  const VS_PLEIN = `
    precision highp float;
    attribute vec2 aP;
    varying vec2 vUV;
    void main(){ vUV = aP*0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }`;

  const FS_CA = `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D uTex;
    uniform float uCA;
    void main(){
      vec2 c = vUV - 0.5;
      // Décalage radial : nul au centre, croissant vers les bords,
      // exactement comme une aberration latérale d'objectif.
      // Un terme quadratique pour les bords, un terme linéaire pour
      // que le décalage existe déjà à mi-champ.
      float r = uCA * (dot(c, c) + 0.22 * length(c));
      float R = texture2D(uTex, vUV + c * r).r;
      float V = texture2D(uTex, vUV        ).g;
      float B = texture2D(uTex, vUV - c * r).b;
      // Le noir doit rester transparent : la grille blueprint et la
      // lueur centrale sont dessinées derrière ce canvas.
      float a = clamp(max(R, max(V, B)), 0.0, 1.0);
      gl_FragColor = vec4(R, V, B, a);
    }`;

  const progTrait = lier(VS_TRAIT, FS_TRAIT);
  const progCA    = lier(VS_PLEIN, FS_CA);

  const A = {
    aA:    gl.getAttribLocation(progTrait, 'aA'),
    aB:    gl.getAttribLocation(progTrait, 'aB'),
    aCoin: gl.getAttribLocation(progTrait, 'aCoin'),
    aStyle:gl.getAttribLocation(progTrait, 'aStyle')
  };
  const U = {};
  for(const n of ['uTaille','uAngle','uTilt','uEch','uDecalY',
                  'uFocus','uDemi','uForce','uMaxCoC'])
    U[n] = gl.getUniformLocation(progTrait, n);
  const UCA = {
    tex: gl.getUniformLocation(progCA, 'uTex'),
    ca:  gl.getUniformLocation(progCA, 'uCA')
  };

  /* ---------- Tampons ---------- */
  const FLOTS = 11;                       // par sommet
  const remplir = (segs) => {
    const d = new Float32Array(segs.length * 6 * FLOTS);
    let k = 0;
    const coins = [[0,-1],[0,1],[1,-1],[1,-1],[0,1],[1,1]];
    for(const s of segs)
      for(const c of coins){
        d[k++] = s.a[0]; d[k++] = s.a[1]; d[k++] = s.a[2];
        d[k++] = s.b[0]; d[k++] = s.b[1]; d[k++] = s.b[2];
        d[k++] = c[0];   d[k++] = c[1];
        d[k++] = s.w;    d[k++] = s.al;  d[k++] = s.fam || 0;
      }
    return d;
  };

  const bufStat = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufStat);
  gl.bufferData(gl.ARRAY_BUFFER, remplir(statiques), gl.STATIC_DRAW);
  const nStat = statiques.length * 6;

  const bufDyn = gl.createBuffer();
  let nDyn = 0;

  const bufPlein = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufPlein);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);

  /* ---------- Cible intermédiaire ---------- */
  const texte = gl.createTexture();
  const fbo   = gl.createFramebuffer();
  gl.bindTexture(gl.TEXTURE_2D, texte);
  for(const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR],
                       [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
                       [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
                       [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]])
    gl.texParameteri(gl.TEXTURE_2D, p, v);

  /* =========================================================
     DIMENSIONS ET PILOTAGE
     ========================================================= */
  let L = 0, H = 0, DPR = 1;
  const redim = () => {
    DPR = Math.min(devicePixelRatio || 1, 2);
    L = hote.clientWidth || 1; H = hote.clientHeight || 1;
    for(const c of [cv, tx]){ c.width = L*DPR; c.height = H*DPR; }
    t2.setTransform(DPR, 0, 0, DPR, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texte);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, L*DPR, H*DPR, 0,
                  gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                            gl.TEXTURE_2D, texte, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  let angle = .70, tilt = .34, vivant = true, temps = 0;
  const lent = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AUTO = .0009;
  let vitesse = AUTO, tire = false, xP = 0, yP = 0;

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
  ['pointerup','pointercancel','pointerleave'].forEach(n => hote.addEventListener(n, fin));

  // Projection identique à celle du shader, pour placer le texte.
  const ECH = () => Math.min(L, H) * .55;
  const proj = (p) => {
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const x = p[0]*ca - p[2]*sa, z1 = p[0]*sa + p[2]*ca;
    const cb = Math.cos(tilt), sb = Math.sin(tilt);
    const y = p[1]*cb - z1*sb, zz = p[1]*sb + z1*cb;
    const f = 9.0 / (9.0 + zz + 13.0), e = ECH();   // identique au shader
    return [L/2 + x*f*e, H/2 - y*f*e + H*.03, zz];
  };

  /* =========================================================
     GÉOMÉTRIE RECALCULÉE À CHAQUE IMAGE
     ========================================================= */
  const dynamiques = () => {
    const S = [];

    // Champ de courbes de niveau
    for(let c = 0; c < 6; c++){
      const r0 = 1.28 + c*.15;
      let prec = null;
      for(let i = 0; i <= 96; i++){
        const a2 = i/96 * Math.PI*2;
        const r = r0
          + .085*Math.sin(3*a2 + temps*.0007 + c*.9)
          + .055*Math.sin(5*a2 - temps*.0005 + c*1.7)
          + .032*Math.sin(8*a2 + temps*.0009);
        const p = [Math.cos(a2)*r, SOL-.28, Math.sin(a2)*r];
        if(prec) S.push({ a:prec, b:p, w:.7, al:.16, fam:1 });
        prec = p;
      }
    }

    // Arêtes lumineuses : une onde remonte chaque spirale, comme les
    // lignes continues des références.
    for(let k = 0; k < filsLumiere.length; k++){
      const fil = filsLumiere[k], n = fil.length;
      for(let i = 0; i < n - 1; i++){
        const u = i/(n-1);
        const onde = Math.pow(Math.max(0, Math.sin(u*4.2 - temps*.0011 + k*2.1)), 3);
        S.push({ a: fil[i], b: fil[i+1],
                 w: .9 + 2.4*onde, al: .34 + 1.9*onde, fam: 2 });
      }
    }

    // Fenêtres allumées : chacune a son propre cycle, certaines
    // restent éteintes longtemps. C'est l'irrégularité qui fait vivant.
    for(let i = 0; i < lumieres.length; i++){
      const p = lumieres[i];
      const c = Math.sin(temps*.00035 + i*2.399) * .5 + .5;
      const on = Math.sin(temps*.00011 + i*1.73) > -.15;
      if(!on) continue;
      const g = .35 + .65*c, e = .022;
      S.push({ a:[p[0]-e, p[1], p[2]], b:[p[0]+e, p[1], p[2]],
               w: 2.4, al: .30 + 1.25*g, fam: 2 });
    }

    // Feux de balisage au sommet, battement lent et régulier
    for(let i = 0; i < feux.length; i++){
      const p = feux[i];
      const b = Math.pow(Math.max(0, Math.sin(temps*.0016 + i*2.1)), 6);
      if(b < .02) continue;
      S.push({ a:[p[0]-.012, p[1], p[2]], b:[p[0]+.012, p[1], p[2]],
               w: 3.4, al: .4 + 2.6*b, fam: 2 });
    }

    // Câbles, en pointillés qui défilent
    const ph = (temps * .0009) % 1;
    for(const [ia, ib] of cables){
      const a = P[ia], b = P[ib];
      for(let k = 0; k < 7; k++){
        const t0 = (k + ph) / 7, t1 = t0 + .052;
        if(t1 > 1) continue;
        S.push({
          a: [a[0]+(b[0]-a[0])*t0, a[1]+(b[1]-a[1])*t0, a[2]+(b[2]-a[2])*t0],
          b: [a[0]+(b[0]-a[0])*t1, a[1]+(b[1]-a[1])*t1, a[2]+(b[2]-a[2])*t1],
          w: .9, al: .34 });
      }
    }

    // Arcs spéculaires : la lumière glisse le long de l'anneau
    for(const arc of arcs){
      const n = arc.pts.length, LG = 15;
      // La course va de -LG à n : la lumière entre par un bout et
      // sort par l'autre. Aucun point n'est relié à travers le vide.
      const i0 = Math.floor(((temps*arc.v + arc.ph) % 1) * (n + LG)) - LG;
      for(let j = 0; j < LG; j++){
        const i = i0 + j;
        if(i < 0 || i + 1 >= n) continue;       // hors de l'arc : rien
        const g = Math.sin((j + .5)/LG * Math.PI);
        S.push({ a: arc.pts[i], b: arc.pts[i+1],
                 w: .9 + 2.6*g, al: .30 + 1.5*g, fam: 2 });
      }
      for(let i = 0; i + 1 < n; i += 2)
        S.push({ a: arc.pts[i], b: arc.pts[i+1], w:.8, al:.10, fam:2 });
    }

    // Les réticules ne sont plus ici : ils passent sur le calque 2D,
    // dans leur propre couleur, et restent nets.

    // Éclats prismatiques
    for(const e of eclats){
      const g = .35 + .65*Math.abs(Math.sin(temps*.0011 + e.ph));
      const l = e.l * .0022;
      S.push({ a:[e.p[0]-Math.cos(e.ang)*l, e.p[1]-Math.sin(e.ang)*l, e.p[2]],
               b:[e.p[0]+Math.cos(e.ang)*l, e.p[1]+Math.sin(e.ang)*l, e.p[2]],
               w: 2.6, al: .5 + 1.3*g, fam: 2 });
    }
    return S;
  };

  /* =========================================================
     CALQUE DE RELEVÉ
     Réticules, cotes et graduations chiffrées. Tout y est net et
     dans sa propre teinte, pour ne pas se confondre avec l'objet.
     ========================================================= */
  const CYAN  = '56,188,216';    // Cyan léger, la couleur des données
  const BLANC = '210,216,224';   // Blanc cassé, la couleur de l'objet

  // Chaque ancre mémorise son accrochage : 0 relâchée, 1 verrouillée.
  for(const an of ancres){ an.acq = 0; an.vis = false; }

  const dessineTexte = (dt) => {
    t2.clearRect(0, 0, L, H);
    t2.lineWidth = 1;

    // Graduations chiffrées de la couronne, très en retrait
    t2.font = '9px ui-monospace, "SFMono-Regular", monospace';
    t2.fillStyle = `rgba(${BLANC},1)`;
    for(const g of couronne){
      if(g.deg % 90) continue;
      const q = proj(g.q);
      t2.globalAlpha = .26;
      t2.fillText(String(g.deg).padStart(3,'0'), q[0]+3, q[1]-3);
    }

    // Lettres des axes
    t2.font = '11px ui-monospace, monospace';
    t2.globalAlpha = .48;
    for(const ax of axes){
      const q = proj(P[ax.b]);
      t2.fillText(ax.lab, q[0]+6, q[1]-5);
    }

    // ---- Ancres ----
    t2.font = '9px ui-monospace, "SFMono-Regular", monospace';
    for(const an of ancres){
      const q = proj(P[an.idx]);
      an.ecran = q;
      const visible = q[2] <= .28;
      an.vis = visible;

      // Accrochage progressif : la cible se verrouille en un tiers de
      // seconde, et se relâche un peu plus vite qu'elle ne s'accroche.
      const cible = visible ? 1 : 0;
      an.acq += (cible - an.acq) * Math.min(1, dt * (visible ? .009 : .014));
      if(an.acq < .012) continue;

      const bat = .5 + .5*Math.sin(temps*.0035 + an.phase);
      const A0  = an.acq;

      // Les crochets se resserrent en se verrouillant.
      const s  = 11 * (1 + (1 - A0) * 1.9);
      const br = 4.5;
      const x = q[0], y = q[1];

      t2.strokeStyle = `rgba(${CYAN},1)`;
      t2.globalAlpha = A0 * (.34 + .30*bat);
      t2.beginPath();
      for(const [sx, sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
        t2.moveTo(x + sx*s, y + sy*s - sy*br);
        t2.lineTo(x + sx*s, y + sy*s);
        t2.lineTo(x + sx*s - sx*br, y + sy*s);
      }
      t2.stroke();

      // Point de visée, seulement une fois verrouillé
      if(A0 > .55){
        t2.fillStyle = `rgba(${CYAN},1)`;
        t2.globalAlpha = (A0 - .55)/.45 * (.30 + .55*bat);
        t2.fillRect(x - 1, y - 1, 2, 2);
      }

      // Trait de rappel puis relevé, tracés de gauche à droite au
      // rythme de l'accrochage.
      const cote = (x > L*.66) ? -1 : 1;
      const lg = 26 * A0;
      t2.strokeStyle = `rgba(${CYAN},1)`;
      t2.globalAlpha = A0 * .28;
      t2.beginPath();
      t2.moveTo(x + cote*s, y - s);
      t2.lineTo(x + cote*(s + lg*.4), y - s - lg*.34);
      t2.lineTo(x + cote*(s + lg),    y - s - lg*.34);
      t2.stroke();

      if(A0 > .7){
        const X = (q[0]/L).toFixed(2), Y = (q[1]/H).toFixed(2);
        const Z = (1 - (q[2]+2.6)/5.2).toFixed(2);
        const etat = bat > .80 ? 'VERROU' : 'SUIVI';
        const lib = `P${String(an.n).padStart(2,'0')} · X${X} Y${Y} Z${Z} · ${etat}`;
        t2.fillStyle = `rgba(${CYAN},1)`;
        t2.globalAlpha = (A0 - .7)/.3 * (.42 + .28*bat);
        const lx = cote > 0 ? x + s + 30 : x - s - 30 - t2.measureText(lib).width;
        t2.fillText(lib, lx, y - s - 12);
      }
    }
    t2.globalAlpha = 1;
  };

  /* =========================================================
     BOUCLE
     ========================================================= */
  const posAttr = (loc, taille, decalage) => {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, taille, gl.FLOAT, false, FLOTS*4, decalage*4);
  };

  let ecoule = 16, tPrec = 0;
  const rendu = () => {
    const W = L*DPR, Ht = H*DPR;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, W, Ht);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);          // additif, comme des lumières

    gl.useProgram(progTrait);
    gl.uniform2f(U.uTaille, L, H);
    gl.uniform1f(U.uAngle, angle);
    gl.uniform1f(U.uTilt, tilt);
    gl.uniform1f(U.uEch, ECH());
    gl.uniform1f(U.uDecalY, H*.03);

    // ---- LES TROIS RÉGLAGES DE LA PROFONDEUR DE CHAMP ----
    // uDemi  : largeur de la zone nette. Monter pour élargir.
    // uForce : vitesse à laquelle le flou monte hors de cette zone.
    // uMaxCoC: rayon de flou maximal, en pixels.
    gl.uniform1f(U.uFocus, Math.sin(tilt) * (SOL + .95));  // centre du bâtiment
    gl.uniform1f(U.uDemi,   1.15);
    gl.uniform1f(U.uForce,  5.5);
    gl.uniform1f(U.uMaxCoC, 14.0);

    const tracer = (buf, n) => {
      if(!n) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      posAttr(A.aA, 3, 0); posAttr(A.aB, 3, 3);
      posAttr(A.aCoin, 2, 6); posAttr(A.aStyle, 3, 8);
      gl.drawArrays(gl.TRIANGLES, 0, n);
    };
    tracer(bufStat, nStat);

    const dyn = dynamiques();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufDyn);
    gl.bufferData(gl.ARRAY_BUFFER, remplir(dyn), gl.DYNAMIC_DRAW);
    nDyn = dyn.length * 6;
    tracer(bufDyn, nDyn);

    // Aberration chromatique sur l'image entière
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, Ht);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.useProgram(progCA);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texte);
    gl.uniform1i(UCA.tex, 0);
    gl.uniform1f(UCA.ca, .095);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufPlein);
    const ap = gl.getAttribLocation(progCA, 'aP');
    gl.enableVertexAttribArray(ap);
    gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    dessineTexte(ecoule);
  };

  const boucle = (t) => {
    if(!vivant) return;
    ecoule = tPrec ? Math.min(80, t - tPrec) : 16;
    tPrec = t;
    temps = t || 0;
    if(!tire && !lent){
      vitesse += (AUTO - vitesse) * .035;
      angle += vitesse;
    }
    rendu();
    requestAnimationFrame(boucle);
  };

  addEventListener('resize', () => { redim(); });
  redim();
  requestAnimationFrame(boucle);

  return {
    arrete(){ vivant = false; },
    reprend(){ if(!vivant){ vivant = true; requestAnimationFrame(boucle); } },
    stats(){ return { segmentsFixes: statiques.length, sommets: P.length }; }
  };
}
