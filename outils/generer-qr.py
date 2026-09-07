#!/usr/bin/env python3
"""
Génère un QR code SVG par projet, prêt à placer dans la maquette.

    pip install "qrcode[pil]"
    python outils/generer-qr.py
"""

import qrcode
import qrcode.image.svg
from pathlib import Path

# À RENSEIGNER
DOMAINE = "https://ton-domaine.fr"

PROJETS = [
    ("projet-01", "Cube de test"),
    # ("projet-02", "Titre du deuxième projet"),
    # ("projet-03", "Titre du troisième projet"),
]

SORTIE = Path(__file__).resolve().parent.parent / "qr"


def generer(identifiant, libelle):
    url = f"{DOMAINE}/projets/{identifiant}.html"
    qr = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # lisible même sali
        box_size=10,
        border=4,  # marge obligatoire, sinon beaucoup de téléphones refusent
    )
    qr.add_data(url)
    qr.make(fit=True)
    qr.make_image(image_factory=qrcode.image.svg.SvgPathImage).save(
        str(SORTIE / f"{identifiant}.svg")
    )
    print(f"  {identifiant}.svg  {libelle}\n                    {url}")


def main():
    if "ton-domaine" in DOMAINE:
        print("Renseignez DOMAINE avant de générer les QR définitifs.\n")
    SORTIE.mkdir(parents=True, exist_ok=True)
    for ident, lib in PROJETS:
        generer(ident, lib)
    print("\nImpression : 2 cm minimum, papier mat, URL en clair dessous.")


if __name__ == "__main__":
    main()
