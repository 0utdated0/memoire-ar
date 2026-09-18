/* ============================================================
   Page projet.

   Chemin le plus court possible : on scanne le QR, la page ouvre,
   le bâtiment est déjà là, et UN seul bouton lance la réalité
   augmentée native.

   Le suivi d'image a été retiré : il imposait trois gestes, tremblait,
   et son ancrage sur une vignette imprimée était le maillon fragile
   de la chaîne. On s'appuie désormais sur ARKit via Quick Look sur
   iOS et sur ARCore via Scene Viewer sur Android, tous deux pilotés
   par model-viewer.

   Un tap reste obligatoire pour entrer en AR : les navigateurs
   l'exigent, c'est une sécurité du système. On le rend unique.

   Le modèle est mis à l'échelle DANS le GLB, sur ses nœuds racine :
   à sa taille réelle le bâtiment ferait deux cents mètres et se
   poserait comme une tour au milieu de la pièce. Réduit au 1/600, il
   devient une maquette de table de trente-trois centimètres.
   `ar-scale="fixed"` garantit qu'il garde cette taille.

   La page appelante ne déclare que :
     PROJET = { n, titre, glb, usdz, echelle, ancres, fiche, texte, photos }
   ============================================================ */
(function(){
  const P = window.PROJET;
  if(!P){ console.error('projet.js : objet PROJET absent'); return; }
  const num = String(P.n).padStart(2, '0');
  document.title = num + ' / ' + P.titre;

  document.body.insertAdjacentHTML('beforeend', `
<div class="lueur" aria-hidden="true"></div>
<div class="grain" aria-hidden="true"></div>
<div class="vignettage" aria-hidden="true"></div>
<div class="cadre" aria-hidden="true"><i></i><i></i><i></i><i></i></div>

<model-viewer id="mv"
  src="${P.glb}"
  ${P.usdz ? `ios-src="${P.usdz}"` : ''}
  ar ar-modes="webxr scene-viewer quick-look" ar-scale="fixed"
  camera-controls touch-action="pan-y"
  shadow-intensity="1" exposure="0.9"
  environment-image="neutral"
  alt="Maquette du projet ${num}">
  <div slot="progress-bar"></div>
  <button slot="ar-button" id="ar-natif" hidden></button>
  ${(P.ancres||[]).map((a,i) => `
  <button class="ancre" slot="hotspot-${i}"
          data-position="${a.p}" data-normal="0 1 0"
          data-visibility-attribute="visible">
    <span class="ancre-pt"></span>
    <span class="ancre-txt"><b>${a.t}</b>${a.d ? '<i>'+a.d+'</i>' : ''}</span>
  </button>`).join('')}
</model-viewer>

<header class="entete-projet">
  <a href="../index.html">← Archive</a>
  <span class="meta">${num}</span>
</header>

<div class="bas-projet">
  <p class="titre-projet">${P.titre}</p>
  ${(P.photos||[]).length ? `
  <div class="bande" id="bande">
    ${P.photos.map((ph,i) => `
    <button class="vign" data-i="${i}" aria-label="${ph.legende || 'Image ' + (i+1)}">
      <img src="${ph.src}" alt="" loading="lazy">
      <span class="vign-n">${String(i+1).padStart(2,'0')}</span>
    </button>`).join('')}
  </div>` : ''}
  <button class="action" id="voir">Voir le bâtiment dans la pièce</button>
  <button class="lien-fiche" id="ouvre-fiche">Relevé technique</button>
  <p class="note" id="note">${P.echelle ? 'Maquette au ' + P.echelle + ' · ' : ''}faites-la tourner du doigt.</p>
</div>

<section class="fiche" id="fiche" aria-hidden="true">
  <button class="ferme-fiche" id="ferme-fiche">Fermer</button>
  <h2>${P.titre}</h2>
  <dl>${(P.fiche||[]).map(([c,v]) => `<dt>${c}</dt><dd>${v}</dd>`).join('')}</dl>
  ${P.texte ? '<p class="fiche-texte">'+P.texte+'</p>' : ''}
</section>

<div class="visionneuse" id="visionneuse" aria-hidden="true">
  <button class="ferme-vis" id="ferme-vis" aria-label="Fermer">Fermer</button>
  <button class="nav-vis prec" id="prec" aria-label="Précédente">‹</button>
  <img id="vis-img" alt="">
  <button class="nav-vis suiv" id="suiv" aria-label="Suivante">›</button>
  <p class="vis-leg" id="vis-leg"></p>
</div>`);

  const mv   = document.getElementById('mv');
  const voir = document.getElementById('voir');
  const note = document.getElementById('note');

  // Le bouton de model-viewer est masqué : on le déclenche depuis le
  // nôtre, pour n'avoir qu'un seul élément à l'écran.
  voir.addEventListener('click', () => {
    if(mv.canActivateAR){ mv.activateAR(); return; }
    note.textContent = "Ce navigateur ne gère pas la réalité augmentée. "
                     + "Ouvrez la page dans Safari sur iPhone, ou Chrome sur Android.";
  });

  // Si l'appareil ne sait pas faire d'AR, autant le dire tout de suite
  // plutôt que de laisser toucher un bouton sans effet.
  mv.addEventListener('load', () => {
    if(!mv.canActivateAR){
      voir.textContent = 'Réalité augmentée indisponible ici';
      voir.classList.add('inactif');
      note.textContent = "Ouvrez cette page sur un téléphone pour poser "
                       + "le bâtiment dans la pièce.";
    }
  });

  mv.addEventListener('error', () => {
    note.textContent = "Le modèle n'a pas pu être chargé.";
  });

  // Relevé technique : il glisse depuis le bas, sans quitter la vue.
  const fiche = document.getElementById('fiche');
  const bascule = (ouvert) => {
    fiche.classList.toggle('visible', ouvert);
    fiche.setAttribute('aria-hidden', String(!ouvert));
  };
  document.getElementById('ouvre-fiche').addEventListener('click', () => bascule(true));
  document.getElementById('ferme-fiche').addEventListener('click', () => bascule(false));

  // Une ancre ouverte à la fois : sinon les libellés se chevauchent
  // dès qu'on tourne la maquette.
  for(const a of document.querySelectorAll('.ancre')){
    a.addEventListener('click', (e) => {
      e.stopPropagation();
      const etait = a.classList.contains('ouverte');
      document.querySelectorAll('.ancre.ouverte').forEach(o => o.classList.remove('ouverte'));
      if(!etait) a.classList.add('ouverte');
    });
  }
  mv.addEventListener('click', () => {
    document.querySelectorAll('.ancre.ouverte').forEach(o => o.classList.remove('ouverte'));
  });

  /* ---- Galerie ----
     Une bande de vignettes sous le titre, et une visionneuse plein
     écran au toucher. Une vignette dont l'image manque se retire
     d'elle-même : une case vide sur la page serait pire qu'une image
     en moins, et cela laisse ajouter les photos une par une. */
  const photos = (P.photos || []).slice();
  const bande  = document.getElementById('bande');
  if(bande){
    for(const v of bande.querySelectorAll('.vign')){
      const img = v.querySelector('img');
      img.addEventListener('error', () => v.remove());
      v.addEventListener('click', () => ouvre(+v.dataset.i));
    }
  }

  const vis = document.getElementById('visionneuse');
  const visImg = document.getElementById('vis-img');
  const visLeg = document.getElementById('vis-leg');
  let courante = 0;

  function ouvre(i){
    if(!photos[i]) return;
    courante = i;
    visImg.src = photos[i].src;
    visLeg.textContent = photos[i].legende || '';
    vis.classList.add('visible');
    vis.setAttribute('aria-hidden', 'false');
  }
  function ferme(){
    vis.classList.remove('visible');
    vis.setAttribute('aria-hidden', 'true');
  }
  function glisse(pas){
    if(!photos.length) return;
    ouvre((courante + pas + photos.length) % photos.length);
  }
  if(vis){
    document.getElementById('ferme-vis').addEventListener('click', ferme);
    document.getElementById('prec').addEventListener('click', e => { e.stopPropagation(); glisse(-1); });
    document.getElementById('suiv').addEventListener('click', e => { e.stopPropagation(); glisse(+1); });
    vis.addEventListener('click', e => { if(e.target === vis) ferme(); });
    addEventListener('keydown', e => {
      if(!vis.classList.contains('visible')) return;
      if(e.key === 'Escape') ferme();
      if(e.key === 'ArrowLeft')  glisse(-1);
      if(e.key === 'ArrowRight') glisse(+1);
    });
  }
})();
