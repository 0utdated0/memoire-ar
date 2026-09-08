/* ============================================================
   Page projet, commune aux quatre modèles.

   Elle construit son propre balisage et branche la réalité
   augmentée à partir du seul objet PROJET déclaré par la page
   appelante. Dupliquer 200 lignes de HTML par projet obligeait à
   reporter chaque correction quatre fois.

   La page appelante doit définir, avant de charger ce fichier :
     PROJET = {
       n, titre, glb, mind, filaire, graine,
       rotation, echelle, position     // pose du modèle en AR
     }
   ============================================================ */
(function(){
  const P = window.PROJET;
  if(!P){ console.error('projet.js : objet PROJET absent'); return; }

  const num = String(P.n).padStart(2, '0');
  document.title = num + ' / ' + P.titre;

  document.body.insertAdjacentHTML('beforeend', `
<section id="accueil">
  <div class="scene" id="scene" aria-hidden="true"></div>
  <div class="lueur" aria-hidden="true"></div>
  <div class="grain" aria-hidden="true"></div>
  <div class="vignettage" aria-hidden="true"></div>
  <div class="cadre" aria-hidden="true"><i></i><i></i><i></i><i></i></div>

  <div class="releve g" aria-hidden="true">
    PRJ ${num}<br>REL 4.62.11<br>NIV 34 / 34<br><em>ÉTAT NON BÂTI</em>
  </div>

  <main class="hud">
    <div class="entete">
      <a href="../index.html">← Archive</a>
      <span class="meta">${num}</span>
    </div>
    <div class="pied">
      <p class="enonce">
        <b>${P.titre}</b><br>
        Autorisez la caméra, puis pointez à nouveau la vignette imprimée.
        Gardez-la dans le cadre : le bâtiment y reste accroché.
      </p>
      <button class="action" id="lancer">Lever le bâtiment</button>
      <a class="discret" href="#" id="vers-repli">Le poser dans la pièce à l'échelle réelle</a>
    </div>
  </main>
</section>

<a-scene
  mindar-image="imageTargetSrc: ${P.mind}; autoStart: false; uiLoading: no; uiError: no; uiScanning: no; filterMinCF: 0.0001; filterBeta: 10; warmupTolerance: 8; missTolerance: 15"
  color-space="sRGB"
  renderer="colorManagement: true, physicallyCorrectLights, antialias: true, alpha: true"
  vr-mode-ui="enabled: false"
  device-orientation-permission-ui="enabled: false">
  <a-assets><a-asset-item id="batiment" src="${P.glb}"></a-asset-item></a-assets>
  <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
  <a-entity id="cible" mindar-image-target="targetIndex: 0">
    <a-gltf-model src="#batiment"
      rotation="${P.rotation || '90 0 0'}"
      position="${P.position || '0 0 0'}"
      scale="${P.echelle || '0.6 0.6 0.6'}"></a-gltf-model>
    <a-light type="ambient" intensity="0.85"></a-light>
    <a-light type="directional" intensity="0.75" position="1 2 1"></a-light>
  </a-entity>
</a-scene>

<div id="etat">Pointez la vignette</div>
<button id="quitter">Fermer</button>

<div id="repli">
  <button id="retour">← Retour</button>
  <model-viewer src="${P.glb}" ar ar-modes="webxr scene-viewer quick-look"
    ar-scale="fixed" camera-controls shadow-intensity="1"
    alt="Maquette du projet ${num}"></model-viewer>
</div>`);

  const filaire = holo(document.getElementById('scene'), P.graine || 4021, P.filaire);

  const accueil = document.getElementById('accueil');
  const etat    = document.getElementById('etat');
  const quitter = document.getElementById('quitter');
  const repli   = document.getElementById('repli');
  const scene   = document.querySelector('a-scene');
  const cible   = document.getElementById('cible');

  // iOS n'ouvre la caméra qu'après un geste : c'est ce clic.
  document.getElementById('lancer').addEventListener('click', async () => {
    accueil.style.display = 'none';
    if(filaire) filaire.arrete();          // libère le processeur pour le suivi
    etat.classList.add('visible');
    quitter.classList.add('visible');
    try {
      await scene.systems['mindar-image-system'].start();
    } catch (e) {
      etat.innerHTML = "Caméra indisponible. Essayez « le poser dans la pièce ».";
    }
  });

  cible.addEventListener('targetFound', () => { etat.innerHTML = '<b>ANCRÉ</b>'; });
  cible.addEventListener('targetLost',  () => { etat.textContent = 'Pointez la vignette'; });

  quitter.addEventListener('click', () => {
    scene.systems['mindar-image-system'].stop();
    etat.classList.remove('visible');
    quitter.classList.remove('visible');
    accueil.style.display = 'block';
    if(filaire) filaire.reprend();
  });

  document.getElementById('vers-repli').addEventListener('click', (e) => {
    e.preventDefault();
    repli.classList.add('visible');
    if(filaire) filaire.arrete();
  });
  document.getElementById('retour').addEventListener('click', () => {
    repli.classList.remove('visible');
    if(filaire) filaire.reprend();
  });
})();
