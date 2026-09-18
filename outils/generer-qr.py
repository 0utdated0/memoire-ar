#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère les QR codes à imprimer dans le mémoire.

Un QR par projet, nu : noir sur blanc, vectoriel, à la taille
physique voulue. Le dessin qui l'entourait servait au suivi d'image,
abandonné depuis ; le QR n'a plus qu'à ouvrir une page.

    python3 outils/generer-qr.py

À RÉGLER AVANT L'IMPRESSION
    DOMAINE doit être l'adresse définitive. Un QR imprimé est figé :
    si l'adresse change ensuite, tous les codes du mémoire sont morts.
"""
import pathlib
import qrcode
import qrcode.image.svg

# ----------------------------------------------------------------------
DOMAINE = "https://0utdated0.github.io/memoire-ar"

PROJETS = [
    ("projet-01", "Titre du projet 01"),
    ("projet-02", "Titre du projet 02"),
]

COTE_MM = 40.0      # côté du QR seul, hors marge blanche
MARGE   = 4         # marge blanche, en modules. 4 est le minimum de la
                    # norme : en dessous, beaucoup de lecteurs échouent.

# Correction d'erreur. M plutôt que L : pour cette longueur d'adresse
# les deux tiennent dans 33 modules, mais M supporte 15 % de casse au
# lieu de 7 %. Même taille, deux fois plus robuste.
CORRECTION = qrcode.constants.ERROR_CORRECT_M
# ----------------------------------------------------------------------

RACINE = pathlib.Path(__file__).resolve().parent.parent
SORTIE = RACINE / "qr"
SORTIE.mkdir(exist_ok=True)


def svg_qr(url, chemin, cote_mm=COTE_MM, marge=MARGE):
    q = qrcode.QRCode(error_correction=CORRECTION, border=0)
    q.add_data(url)
    q.make(fit=True)
    M = q.get_matrix()
    n = len(M)
    pas = cote_mm / n
    total = cote_mm + 2 * marge * pas

    # les modules voisins d'une même ligne sont fusionnés : le fichier
    # est plus court et l'impression n'y laisse aucun liseré
    rects = []
    for r in range(n):
        c = 0
        while c < n:
            if M[r][c]:
                d = c
                while c < n and M[r][c]:
                    c += 1
                rects.append(
                    f'<rect x="{marge*pas + d*pas:.4f}" y="{marge*pas + r*pas:.4f}" '
                    f'width="{(c-d)*pas:.4f}" height="{pas:.4f}"/>')
            else:
                c += 1

    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" '
           f'width="{total:.2f}mm" height="{total:.2f}mm" '
           f'viewBox="0 0 {total:.4f} {total:.4f}" shape-rendering="crispEdges">\n'
           f'  <title>{url}</title>\n'
           f'  <rect width="{total:.4f}" height="{total:.4f}" fill="#ffffff"/>\n'
           f'  <g fill="#000000">\n    ' + "\n    ".join(rects) + '\n  </g>\n</svg>\n')
    chemin.write_text(svg)
    return n, pas, total


if __name__ == "__main__":
    print(f"Domaine : {DOMAINE}\n")
    if "github.io" in DOMAINE:
        print("  ATTENTION : adresse GitHub Pages. Si vous prenez un nom de")
        print("  domaine, faites-le AVANT d'imprimer : les QR seront figés.\n")

    for slug, titre in PROJETS:
        url = f"{DOMAINE}/projets/{slug}.html"
        n, pas, total = svg_qr(url, SORTIE / f"qr-{slug}.svg")
        print(f"  qr/qr-{slug}.svg")
        print(f"      {url}")
        print(f"      {n}x{n} modules · {pas:.2f} mm par module · {total:.1f} mm avec la marge")
