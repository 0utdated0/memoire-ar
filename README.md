# Réalité augmentée du mémoire - marche à suivre

Chaîne : Blender → GLB optimisé → GitHub Pages → vignette imprimée avec QR → maquette ancrée sur la page.

Aucune dépendance à une entreprise tierce hors hébergement, aucun compte à créer pour le lecteur, aucune application à installer.

---

## Arborescence

```
memoire-ar/
├── index.html              sommaire des projets
├── projets/
│   ├── projet-01.html      gabarit à dupliquer
│   ├── projet-02.html
│   └── projet-03.html
├── modeles/
│   ├── projet-01.glb       modèle pour le web et Android
│   └── projet-01.usdz      modèle pour iOS Quick Look (repli seulement)
├── cibles/
│   ├── projet-01.mind      cible de suivi compilée
│   └── sources/
│       └── projet-01.png   la vignette telle qu'imprimée
└── qr/
    └── projet-01.svg       QR code à placer dans la vignette
```

---

## 1. Préparer le modèle dans Blender

- **Échelle réelle.** 1 unité Blender = 1 mètre. Le bâtiment doit être modélisé à sa taille réelle, sinon le mode « poser dans la pièce » sera absurde.
- **Origine au sol, centrée.** Place le point d'origine de l'objet au centre de l'emprise, au niveau du sol. C'est ce point qui viendra se poser sur la vignette.
- **Applique toutes les transformations** avant export : `Objet ▸ Appliquer ▸ Toutes les transformations`.
- **Orientation.** Le +Z de Blender est la verticale. L'export glTF bascule automatiquement en Y-up, ce que le gabarit compense avec `rotation="-90 0 0"`.
- **Budget géométrie.** Vise moins de 100 000 triangles par bâtiment. Un décimate à 0,3 sur les volumes secondaires passe inaperçu en AR.
- **Textures en 2048 px maximum**, 1024 suffit largement pour une maquette vue à 30 cm.
- **Pas de modificateurs non appliqués**, pas de lumières, pas de caméra dans la scène exportée.

Export : `Fichier ▸ Exporter ▸ glTF 2.0 (.glb)`, format **glTF binaire**, cocher *Sélection uniquement*.

Pour le USDZ (repli iOS) : `Fichier ▸ Exporter ▸ USD`, extension `.usdz`. Disponible depuis Blender 4.2.

---

## 2. Alléger le GLB

C'est l'étape que tout le monde saute et qui fait échouer la démonstration devant le jury. Un GLB de 200 Mo ne se chargera pas.

```bash
npm install -g @gltf-transform/cli

gltf-transform optimize projet-01-brut.glb modeles/projet-01.glb \
  --compress draco \
  --texture-compress webp \
  --texture-size 2048
```

Objectif : **moins de 10 Mo par bâtiment**, idéalement 3 à 5 Mo. Vérifie le poids final avant de passer à la suite.

---

## 3. Dessiner la vignette

C'est la partie DA, et c'est elle qui détermine si le suivi fonctionne.

**Ce qui marche :**
- 8 à 10 cm de côté minimum. En dessous, le suivi décroche au-delà de 30 cm.
- Le QR code au centre, entouré de graphisme **unique et non répétitif** : un fragment de plan, un cartouche, le numéro et le titre du projet, une texture asymétrique.
- Du contraste franc, des détails à plusieurs échelles.
- Chaque vignette doit être visuellement **différente** des autres, sinon le suivi confond les projets.

**Ce qui ne marche pas :**
- Un QR code nu. Motif trop répétitif, le suivi patine.
- Une trame régulière, un dégradé, un aplat, une symétrie parfaite.
- Un dessin très épuré avec peu de traits.

**À l'impression :**
- Papier **mat**. Un couché brillant renvoie la lumière du plafond et fait décrocher le suivi.
- Reliure qui s'ouvre à plat, ou vignette placée loin du pli. Une page bombée déforme la cible.
- Imprime l'URL en clair sous le QR, en petit corps, comme secours.

---

## 4. Générer les QR codes

```bash
pip install "qrcode[pil]"
python outils/generer-qr.py
```

Le script produit un SVG par projet dans `qr/`, en correction d'erreur haute, prêt à placer dans la maquette InDesign.

---

## 5. Compiler les cibles de suivi

1. Exporte chaque vignette **telle qu'elle sera imprimée**, en PNG, largeur 1024 px.
2. Ouvre <https://hiukim.github.io/mind-ar-js-doc/tools/compile>
3. Charge les images, clique sur *Start*, télécharge le fichier `targets.mind`.
4. Renomme-le et place-le dans `cibles/`.

Le compilateur affiche des points de suivi sur chaque image. **Si une vignette en montre peu, ou concentrés au même endroit, retravaille le graphisme avant d'aller plus loin.** C'est le seul indicateur fiable dont tu disposes avant l'impression.

Tu peux compiler plusieurs vignettes dans un seul `.mind` : le `targetIndex` du gabarit désigne alors la position dans la liste.

---

## 6. Régler la pose du modèle

Dans `projets/projet-01.html`, sur la balise `<a-gltf-model>` :

- `scale` : `1` correspond à la largeur de la vignette. Une maquette à `0.6` fera 60 % de cette largeur. Ajuste jusqu'à obtenir une maquette crédible posée sur la page.
- `position` : le troisième nombre décolle le modèle du papier si besoin.
- `rotation` : `-90 0 0` dresse le bâtiment perpendiculairement à la page. Le deuxième nombre le fait pivoter sur lui-même.

---

## 7. Publier sur GitHub Pages

```bash
git init
git add .
git commit -m "Modèles AR du mémoire"
git branch -M main
git remote add origin https://github.com/TON-PSEUDO/memoire-ar.git
git push -u origin main
```

Puis `Settings ▸ Pages ▸ Source: Deploy from a branch ▸ main / (root)`.

HTTPS est fourni d'office, ce qui est **obligatoire** pour que le navigateur accepte d'ouvrir la caméra.

### Nom de domaine : la seule dépense à faire

Tes QR codes seront imprimés, donc figés pour toujours. S'ils pointent vers `ton-pseudo.github.io`, tu es lié à ce compte à vie. Un nom de domaine à 10-15 € par an te permet de changer d'hébergeur sans qu'aucun exemplaire imprimé ne devienne caduc.

`Settings ▸ Pages ▸ Custom domain`, puis chez ton registrar un enregistrement CNAME vers `ton-pseudo.github.io`.

C'est aussi, très exactement, la leçon de la fermeture d'Aero.

---

## 8. Tester avant d'envoyer à l'imprimeur

À faire impérativement **sur les épreuves papier réelles**, pas à l'écran :

- [ ] Le QR se scanne à 20 cm, en lumière ambiante normale
- [ ] La page s'ouvre sur iPhone (Safari) **et** sur Android (Chrome)
- [ ] La demande d'autorisation caméra apparaît au clic sur le bouton
- [ ] Le bâtiment s'ancre en moins de 2 secondes
- [ ] Il tient quand on tourne autour à 45°
- [ ] Il tient sous un néon et près d'une fenêtre
- [ ] Le chargement passe en 4G, sans wifi
- [ ] Chaque vignette appelle le bon bâtiment

---

## Pour la partie méthodologique du mémoire

Technologies mobilisées, toutes ouvertes et citables :

- **glTF 2.0 / GLB** - Khronos Group, norme ouverte de transmission de scènes 3D
- **MindAR** - bibliothèque de suivi d'image en JavaScript, open source (hiukim)
- **A-Frame** - cadre de scène déclaratif pour le web, sous licence MIT
- **`<model-viewer>`** - composant web de Google, Apache 2.0, pour le mode de pose libre

L'arrêt d'Adobe Aero le 6 novembre 2025, et la disparition des scènes `.real` le 3 décembre suivant, constituent en eux-mêmes un objet de réflexion : la représentation numérique de l'architecture spéculative est ici plus fragile que le papier sur lequel elle est imprimée. Adosser le dispositif à des formats ouverts et à un hébergement que tu contrôles n'est pas seulement une contrainte technique, c'est une position.
