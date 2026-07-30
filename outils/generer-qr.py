#!/usr/bin/env python3
"""
Génère un QR code SVG par projet, prêt à placer dans la maquette InDesign.

    pip install "qrcode[pil]"
    python outils/generer-qr.py

Le SVG est vectoriel : il reste net à n'importe quelle taille d'impression.
"""

import qrcode
import qrcode.image.svg
from pathlib import Path

# ---------------------------------------------------------------
# À RENSEIGNER : ton domaine, puis un couple (fichier, libellé)
# par projet.
# ---------------------------------------------------------------
DOMAINE = "https://ton-domaine.fr"

PROJETS = [
    ("projet-01", "Titre du premier projet"),
    ("projet-02", "Titre du deuxième projet"),
    ("projet-03", "Titre du troisième projet"),
]

SORTIE = Path(__file__).resolve().parent.parent / "qr"


def generer(identifiant: str, libelle: str) -> str:
    url = f"{DOMAINE}/projets/{identifiant}.html"

    qr = qrcode.QRCode(
        version=None,
        # Correction haute : le QR reste lisible même partiellement
        # masqué, sali, ou imprimé sur un fond graphique.
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        # Marge blanche obligatoire. En dessous de 4 modules,
        # beaucoup de téléphones refusent de lire le code.
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    image = qr.make_image(image_factory=qrcode.image.svg.SvgPathImage)
    chemin = SORTIE / f"{identifiant}.svg"
    image.save(str(chemin))

    print(f"  {identifiant}.svg   {libelle}")
    print(f"                     {url}")
    return url


def main() -> None:
    if "ton-domaine" in DOMAINE:
        print("Renseigne DOMAINE avant de générer les QR définitifs.")
        print("Les codes produits maintenant ne serviront qu'aux tests.\n")

    SORTIE.mkdir(parents=True, exist_ok=True)

    print(f"Génération dans {SORTIE}\n")
    urls = [generer(ident, lib) for ident, lib in PROJETS]

    print(f"\n{len(urls)} QR codes générés.")
    print("\nRappels pour l'impression :")
    print("  - 2 cm de côté minimum pour le QR seul")
    print("  - vignette de suivi de 8 à 10 cm autour")
    print("  - papier mat, jamais brillant")
    print("  - URL en clair sous le code, en secours")


if __name__ == "__main__":
    main()
