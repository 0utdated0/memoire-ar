# -*- coding: utf-8 -*-
"""Vignette imprimée : un QR, un cartouche, une élévation schématique.

Le suivi d'image ayant été abandonné, la vignette n'a plus à être
lisible par un algorithme de suivi : elle n'est plus qu'une page du
mémoire. Les contraintes de trame et d'asymétrie tombent, restent
celles de l'impression et de la lisibilité du QR.
"""
import qrcode

BLEU, NOIR, CLAIR, GRIS, CYAN = "#1e5fa8", "#07090d", "#d2d8e0", "#4e5966", "#38bcd8"


def vignette(url, numero, titre, sous_titre, elevation, cote=100.0,
             qr_cote=40.0, qr_x=53.0, qr_y=11.0):
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=0)
    q.add_data(url); q.make(fit=True)
    M = q.get_matrix(); N = len(M)
    pas = qr_cote / N

    mods = []
    for r in range(N):
        c = 0
        while c < N:
            if M[r][c]:
                d0 = c
                while c < N and M[r][c]: c += 1
                mods.append(f'<rect x="{qr_x+d0*pas:.3f}" y="{qr_y+r*pas:.3f}" '
                            f'width="{(c-d0)*pas:.3f}" height="{pas:.3f}"/>')
            else:
                c += 1
    QR = "\n      ".join(mods)

    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{cote}mm" height="{cote}mm" viewBox="0 0 {cote} {cote}">
<!-- ============================================================
     VIGNETTE {numero} - imprimer à 100 %, format {cote/10:.0f} x {cote/10:.0f} cm.
     QR sombre sur pavé clair : un QR inversé n'est pas lu de façon
     fiable. Papier mat, page bien à plat.
     QR : {N} x {N} modules, {pas:.2f} mm par module.
     ============================================================ -->

  <rect width="{cote}" height="{cote}" fill="{BLEU}"/>

  <!-- Trame, cantonnée au quadrant bas gauche et interrompue -->
  <g stroke="{CLAIR}" stroke-width="0.5" opacity="0.5">
    <path d="M6 58 H44 M6 65 H44 M6 72 H44 M6 79 H44 M6 86 H44 M6 93 H44"/>
    <path d="M6 58 V94 M13 58 V94 M20 58 V94 M27 58 V94 M34 58 V94 M41 58 V94"/>
  </g>
  <g fill="{NOIR}">
    <rect x="9"  y="61" width="17" height="11"/>
    <rect x="29" y="75" width="13" height="9"/>
    <rect x="14" y="87" width="9"  height="6"/>
  </g>

  <!-- Équerre d'angle, une seule occurrence -->
  <path d="M5 18 V5 H18" fill="none" stroke="{CLAIR}" stroke-width="1.8"/>

  <!-- Élévation schématique du bâtiment -->
  <g fill="none" stroke="{CLAIR}" stroke-width="1.7">{elevation}</g>

  <!-- Croix de visée -->
  <circle cx="86" cy="62" r="6" fill="none" stroke="{CLAIR}" stroke-width="1.7"/>
  <path d="M86 53 V59 M86 65 V71 M77 62 H83 M89 62 H95" stroke="{CLAIR}" stroke-width="1.7"/>

  <!-- Triangle plein -->
  <path d="M80 95 L96 95 L88 84 Z" fill="{CLAIR}"/>

  <!-- Cartouche : rectangles emboîtés -->
  <g fill="none" stroke="{CLAIR}" stroke-width="1.7">
    <rect x="49" y="72" width="24" height="20"/>
    <rect x="53" y="76" width="16" height="12"/>
  </g>
  <rect x="56" y="79" width="10" height="6" fill="{CLAIR}"/>

  <!-- Pavé clair et QR sombre -->
  <rect x="{qr_x-5:.1f}" y="{qr_y-5:.1f}" width="{qr_cote+10:.1f}" height="{qr_cote+10:.1f}" fill="{CLAIR}"/>
  <g fill="{NOIR}">
      {QR}
  </g>

  <g font-family="monospace" fill="{CLAIR}">
    <text x="6" y="13" font-size="4.4" letter-spacing="0.4">PROJET {numero}</text>
    <text x="6" y="19.5" font-size="2.4">{titre}</text>
    <text x="6" y="23.5" font-size="2.4">{sous_titre}</text>
    <text x="49" y="68" font-size="2.4">SCANNEZ CETTE PAGE</text>
  </g>
</svg>
'''
