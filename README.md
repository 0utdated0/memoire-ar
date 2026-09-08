# Archive des futurs non construits

Chaîne : Blender → GLB → GitHub Pages → vignette imprimée → maquette ancrée sur la page.

```
index.html               accueil, bâtiment filaire animé
assets/holo.css          palette, typographie, mise en page
assets/holo.js           moteur de rendu WebGL, sans bibliothèque
assets/filaire-01.js     arêtes extraites du modèle 3D
projets/projet-01.html   gabarit à dupliquer
modeles/                 les .glb
cibles/                  les .mind compilés
qr/                      les QR générés
outils/generer-qr.py
```

## Le bâtiment de la page d'accueil

Il n'est pas dessiné à la main : ses arêtes sont **extraites d'un GLB**
par angle dièdre. On ne garde une arête que si les deux faces qui la
partagent forment un angle marqué, ou si elle est longue. Les arêtes
internes des surfaces planes et les micro-facettes disparaissent ainsi
d'elles-mêmes.

Pour changer de bâtiment, il faut régénérer `assets/filaire-01.js` à
partir du nouveau GLB.

## Le rendu

WebGL, écrit pour ce projet, sans bibliothèque. Trois passes :

1. les segments, transformés en bandeaux par le processeur graphique,
   avec la profondeur de champ calculée **par pixel** à partir du
   cercle de confusion de chaque extrémité ;
2. les étiquettes, cuites dans une texture puis affichées comme des
   quadrilatères dans la scène ;
3. l'aberration chromatique, appliquée à l'image entière par décalage
   radial des trois canaux.

Les réglages du flou sont regroupés dans `holo.js`, chercher `uDemi`.
La géométrie animée est réécrite dans un tableau réutilisé et envoyée
par `bufferSubData` : réallouer à chaque image faisait perdre le
contexte WebGL au bout de quelques secondes.

## Une page par projet

Les quatre pages sont identiques à leurs données près. Tout le
balisage et toute la logique sont dans `assets/projet.js` : une
correction s'y fait une seule fois, pas quatre.

Chaque `projets/projet-0N.html` ne contient qu'un bloc `window.PROJET`
avec son titre, ses chemins et la pose de son modèle. C'est le seul
endroit à modifier.

## Mettre un projet en service

1. Poser le GLB dans `modeles/projet-0N.glb`
2. Dessiner la vignette, la compiler, poser le `.mind` dans `cibles/`
3. Me renvoyer le GLB pour que j'en extraie `assets/filaire-0N.js`,
   puis pointer `filaire: FILAIRE_0N` dans la page
4. Régler `rotation`, `echelle` et `position` dans le même bloc
5. Passer l'état de À VENIR à PRÊT dans `index.html`

## Ancien mode d'emploi

1. Copier `projets/projet-01.html` en `projet-02.html`
2. Y remplacer le titre, les chemins vers le `.glb` et le `.mind`
3. **Changer la graine** dans `holo(document.getElementById('scene'), 4021)` : chaque nombre engendre un bâtiment filaire différent, ce qui donne son identité à la page
4. Décommenter la ligne correspondante dans `index.html`

## Régler la pose du modèle

Sur `<a-gltf-model>`, dans la page projet :

- `rotation="90 0 0"` dresse le bâtiment hors de la page. S'il part derrière, passer à `-90`.
- `scale` = hauteur voulue (cm) ÷ largeur de la vignette (cm) ÷ hauteur du modèle en unités
- `position="0 0 0"` si l'origine du modèle est au sol, ce qui est la règle à tenir dans Blender

## Régler le suivi

Sur `<a-scene>`, paramètre `filterBeta` : 1000 est très réactif et tremble, 0.1 est très stable et traîne. Descendre jusqu'à ce que le tremblement passe, puis remonter d'un cran.

`filterMinCF` : baisser réduit le tremblement. `warmupTolerance` : monter évite les faux ancrages. `missTolerance` : monter évite le clignotement.

## Préparer un modèle dans Blender

- 1 unité = 1 mètre, échelle réelle
- origine au centre de l'emprise, **au niveau du sol**
- `Objet ▸ Appliquer ▸ Toutes les transformations` avant export
- moins de 100 000 triangles, textures à 2048 px maximum
- export glTF 2.0 binaire (`.glb`)

Puis alléger, obligatoire au-delà de quelques mégaoctets :

```bash
npm install -g @gltf-transform/cli
gltf-transform optimize brut.glb modeles/projet-01.glb \
  --compress draco --texture-compress webp --texture-size 2048
```

Viser moins de 10 Mo, idéalement 3 à 5.

## Dessiner une vignette

- 8 à 10 cm minimum, sinon le suivi décroche à plus de 30 cm
- graphisme **asymétrique**, sans cadre carré ni symétrie d'ensemble : sinon le modèle saute entre plusieurs orientations
- contraste franc, détail à plusieurs échelles, rien de répétitif
- chaque vignette visuellement distincte des autres
- papier **mat**, jamais brillant
- page qui s'ouvre à plat, ou vignette loin du pli

Compiler ensuite sur <https://hiukim.github.io/mind-ar-js-doc/tools/compile>, puis déposer le `.mind` dans `cibles/`.

Le compilateur affiche les points de suivi détectés : c'est le seul indicateur fiable avant impression.

## Publier

```bash
git add .
git commit -m "mise à jour"
git push
```

**Nom de domaine.** À prendre avant l'impression, jamais après : les QR imprimés sont figés pour toujours. Une adresse courte se recopie à la main si le scan échoue, ce qu'une adresse `github.io` ne permet pas.

## Technologies citables

glTF 2.0 (Khronos Group), MindAR, A-Frame (MIT), `<model-viewer>` (Apache 2.0). Formats ouverts, hébergement autonome, aucune dépendance à un éditeur qui peut fermer, comme Adobe Aero l'a fait fin 2025.
