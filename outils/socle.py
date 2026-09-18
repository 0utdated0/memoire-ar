# -*- coding: utf-8 -*-
"""
Fabrique le socle d'une maquette et l'ajoute à un GLB.

Le texte n'est PAS modélisé en lettres : il est cuit dans une image
posée sur une plaquette de deux triangles. Des lettres en volume
accrochent la lumière et deviennent baveuses, coûtent des dizaines de
milliers de triangles, et obligent à mesurer leur longueur pour qu'elles
tiennent dans leur cadre. Une image se lit nettement à toute distance,
se modifie sans toucher à la géométrie, et pèse quelques kilo-octets.
"""
import io, json, math, struct, subprocess, tempfile, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import trimesh

MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-ExtraLight.ttf"
SANSB = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

CLAIR = (214, 220, 228, 255)
GRIS  = (132, 146, 164, 255)
CYAN  = (86, 198, 222, 255)
FOND  = (9, 16, 28, 255)

# La maquette fait toujours cette hauteur une fois posée sur la table,
# et on veut des chiffres de cette taille-là dessus. Tout le corps du
# texte de la réglette se déduit de ces deux nombres.
TAILLE_MAQUETTE = 0.202     # mètres, hauteur de la maquette imprimée
TEXTE_MM        = 3.0       # millimètres, hauteur visée des nombres


# ----------------------------------------------------------------------
#  Images
# ----------------------------------------------------------------------
def image_cartouche(titre, lignes, mention, largeur_px=2048, hauteur_px=448):
    """Le cartouche posé à plat sur le socle, devant le bâtiment."""
    im = Image.new('RGBA', (largeur_px, hauteur_px), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    k = largeur_px / 2048
    f_tit = ImageFont.truetype(SANS, int(116 * k))
    f_don = ImageFont.truetype(MONO, int(46 * k))
    f_pet = ImageFont.truetype(MONO, int(33 * k))
    M = int(52 * k)
    L = largeur_px - 2 * M

    d.text((M, int(26 * k)), titre, font=f_tit, fill=CLAIR)
    y = int(174 * k)
    d.line([(M, y), (M + L, y)], fill=(120, 140, 166, 255), width=max(1, int(3 * k)))

    # Les colonnes sont réparties d'après la largeur MESURÉE de chaque
    # texte : un partage à parts égales les faisait se chevaucher dès
    # qu'un libellé était plus long que les autres.
    y = int(212 * k)
    if lignes:
        larg = [d.textlength(t, font=f_don) for t in lignes]
        libre = L - sum(larg)
        gap = max(int(26 * k), libre / max(1, len(lignes) - 1)) if len(lignes) > 1 else 0
        if sum(larg) + gap * (len(lignes) - 1) > L:      # trop long : on recadre
            f_don = ImageFont.truetype(MONO, int(46 * k * L / (sum(larg) + gap * (len(lignes) - 1))))
            larg = [d.textlength(t, font=f_don) for t in lignes]
            libre = L - sum(larg)
            gap = libre / max(1, len(lignes) - 1)
        x = M
        for i, t in enumerate(lignes):
            d.text((x, y), t, font=f_don, fill=CLAIR)
            if i < len(lignes) - 1:
                cx = x + larg[i] + gap / 2
                d.text((cx, y + int(22 * k)), "·", font=f_pet, fill=(110, 126, 148, 255), anchor="mm")
            x += larg[i] + gap

    y = int(292 * k)
    d.line([(M, y), (M + L, y)], fill=(120, 140, 166, 255), width=max(1, int(2 * k)))
    d.text((M, int(324 * k)), mention, font=f_pet, fill=GRIS)
    d.text((M + L, int(324 * k)), "ÉTAT · NON BÂTI", font=f_pet, fill=CYAN, anchor="ra")
    return im


X_ETIQ = 0.26          # début des nombres, en fraction de la largeur


def image_reglette(hauteur_reelle, pas_m, largeur_px=256, hauteur_px=2048,
                   corps_px=None):
    """Graduations et altitudes RÉELLES, lues de bas en haut.

    `hauteur_reelle` est la hauteur du bâtiment en mètres, pas la
    hauteur du modèle dans ses propres unités : une maquette dessinée
    à 1/5409 dans un fichier où le bâtiment mesure 201 unités doit
    quand même être graduée jusqu'à 1082.

    `hauteur_px` doit respecter le rapport de la plaquette qui portera
    l'image, sans quoi les chiffres sont étirés dans un sens.
    """
    im = Image.new('RGBA', (largeur_px, hauteur_px), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    n = int(hauteur_reelle // pas_m)

    # Le corps est réduit jusqu'à ce que le plus long nombre tienne :
    # « 1000 » déborde là où « 100 » passe.
    lmax = max((len(f"{i * pas_m:.0f}") for i in range(2, n + 1, 2)), default=1)
    dispo = largeur_px * (1 - X_ETIQ)
    corps = int(corps_px or largeur_px * 0.30)
    while corps > 8 and ImageFont.truetype(MONO, corps).getlength('0' * lmax) > dispo:
        corps -= 2
    f = ImageFont.truetype(MONO, corps)

    for i in range(n + 1):
        z = i * pas_m
        y = hauteur_px - 1 - (z / hauteur_reelle) * (hauteur_px - 1)
        grand = (i % 2 == 0)
        lg = largeur_px * (0.22 if grand else 0.13)
        ep = max(2, int(largeur_px * (0.035 if grand else 0.022)))
        d.rectangle([0, y - ep / 2, lg, y + ep / 2], fill=CYAN if grand else GRIS)
        if grand and i:
            d.text((largeur_px * X_ETIQ, y), f"{z:.0f}", font=f, fill=CLAIR, anchor="lm")
    return im


# ----------------------------------------------------------------------
#  Géométrie
# ----------------------------------------------------------------------
def _plaquette(l, h, image, plan='xz'):
    """Un rectangle texturé : deux triangles, rien de plus."""
    if plan == 'xz':
        v = np.array([[-l/2, 0, h/2], [l/2, 0, h/2], [l/2, 0, -h/2], [-l/2, 0, -h/2]], float)
    else:
        v = np.array([[-l/2, -h/2, 0], [l/2, -h/2, 0], [l/2, h/2, 0], [-l/2, h/2, 0]], float)
    f = np.array([[0, 1, 2], [0, 2, 3]])
    # trimesh retourne le V à l'export glTF (convention bas-haut contre
    # haut-bas). Ces coordonnées sont donc écrites à l'envers EXPRÈS :
    # une fois retournées, le haut de l'image tombe du côté opposé à
    # l'observateur pour le cartouche posé à plat, et en haut du mât
    # pour la réglette. L'inverse donnait un texte en miroir et une
    # graduation dont le zéro était en l'air.
    uv = np.array([[0, 0], [1, 0], [1, 1], [0, 1]], float)
    m = trimesh.Trimesh(vertices=v, faces=f, process=False)
    m.visual = trimesh.visual.TextureVisuals(
        uv=uv, material=trimesh.visual.material.PBRMaterial(
            baseColorTexture=image, alphaMode='BLEND',
            metallicFactor=0.0, roughnessFactor=0.55,
            emissiveFactor=[0.55, 0.58, 0.62], name='cartouche'))
    return m


def _boite(lx, ly, lz, centre, couleur, biseau=0.0):
    m = trimesh.creation.box(extents=(lx, ly, lz))
    if biseau > 0:
        m = m.subdivide()
    m.apply_translation(centre)
    m.visual = trimesh.visual.TextureVisuals(
        material=trimesh.visual.material.PBRMaterial(
            baseColorFactor=couleur, metallicFactor=0.05,
            roughnessFactor=0.70, name='socle'))
    return m


def construire_socle(bbox_min, bbox_max, titre, lignes, mention,
                     pas_reglette=20.0, marge_avant=None, marge_cote=None,
                     hauteur_reelle=None):
    """Renvoie une scène trimesh : plaque, cartouche, réglette."""
    mn, mx = np.asarray(bbox_min, float), np.asarray(bbox_max, float)
    dim = mx - mn
    H = float(dim[1])
    emprise = max(float(dim[0]), float(dim[2]))
    cx, cz = (mn[0] + mx[0]) / 2, (mn[2] + mx[2]) / 2

    av = marge_avant if marge_avant else emprise * 0.34
    co = marge_cote if marge_cote else emprise * 0.14
    SX = dim[0] / 2 + co
    SZ = dim[2] / 2 + av / 2 + co / 2
    decal_z = (av - co) / 2          # la plaque déborde vers l'avant
    ep = max(H * 0.010, emprise * 0.012)

    sc = trimesh.Scene()
    sc.add_geometry(_boite(SX*2, ep, SZ*2, [cx, mn[1] - ep/2, cz + decal_z],
                           [0.035, 0.055, 0.098, 1.0]), node_name='socle_plaque')
    sc.add_geometry(_boite(SX*2*0.965, ep*0.12, SZ*2*0.965,
                           [cx, mn[1] + ep*0.02, cz + decal_z],
                           [0.055, 0.085, 0.145, 1.0]), node_name='socle_liseré')

    # cartouche, à plat devant le bâtiment
    larg = SX * 2 * 0.90
    haut = larg * (512 / 2048)
    img = image_cartouche(titre, lignes, mention)
    pl = _plaquette(larg, haut, img, plan='xz')
    zc = mx[2] + (SZ + decal_z - dim[2] / 2) * 0.52
    pl.apply_translation([cx, mn[1] + ep * 0.12, zc])
    sc.add_geometry(pl, node_name='cartouche')

    # Réglette : un mât fin et une bande graduée, dans la bande libre
    # entre le flanc droit du bâtiment et le bord de la plaque. Elle
    # occupe TOUTE cette bande : plus elle est large, plus les nombres
    # peuvent être gros sans être étirés.
    HR = float(hauteur_reelle or H)      # mètres réels du bâtiment
    jeu = emprise * 0.006
    ep_mat = emprise * 0.004
    x_droite = cx + SX - jeu
    x_mat = mx[0] + jeu * 2
    x_gauche = x_mat + ep_mat
    lr = max(emprise * 0.05, x_droite - x_gauche)

    sc.add_geometry(_boite(ep_mat, H, ep_mat,
                           [x_mat + ep_mat/2, mn[1] + H/2, cz],
                           [0.18, 0.62, 0.74, 1.0]),
                    node_name='reglette_mat')

    # L'image suit le rapport de la plaquette, et le corps du texte est
    # posé d'après une hauteur visée SUR LA MAQUETTE, pas en pixels.
    LARG_PX = 256
    haut_px = max(512, int(round(LARG_PX * H / lr)))
    corps = TEXTE_MM * haut_px / (TAILLE_MAQUETTE * 1000.0)
    imr = image_reglette(HR, pas_reglette, LARG_PX, haut_px, corps_px=corps)
    pr = _plaquette(lr, H, imr, plan='xy')
    pr.apply_translation([x_gauche + lr/2, mn[1] + H/2, cz])
    sc.add_geometry(pr, node_name='reglette')
    return sc


# ----------------------------------------------------------------------
#  Fusion glTF
# ----------------------------------------------------------------------
def fusionner(glb_modele, glb_socle, sortie, echelle=None):
    """Fusionne deux GLB dans UNE scène, et met le tout à l'échelle."""
    tmp = tempfile.mktemp(suffix='.glb')
    subprocess.run(['gltf-transform', 'merge', glb_modele, glb_socle, tmp],
                   check=True, capture_output=True)
    d = open(tmp, 'rb').read()
    off = 12; chunks = []
    while off < len(d):
        cl, ct = struct.unpack('<II', d[off:off+8])
        chunks.append([ct, d[off+8:off+8+cl]]); off += 8 + cl
    g = json.loads(chunks[0][1].decode('utf-8'))

    # merge crée une scène par modèle : on les réunit
    racines = []
    for s in g['scenes']:
        racines += s.get('nodes', [])
    g['scenes'] = [{'name': 'MAQUETTE', 'nodes': racines}]
    g['scene'] = 0

    if echelle:
        g['nodes'].append({'name': 'ECHELLE',
                           'scale': [echelle, echelle, echelle],
                           'children': racines})
        g['scenes'][0]['nodes'] = [len(g['nodes']) - 1]

    js = json.dumps(g, separators=(',', ':')).encode('utf-8')
    js += b' ' * ((4 - len(js) % 4) % 4)
    bn = chunks[1][1] + b'\x00' * ((4 - len(chunks[1][1]) % 4) % 4)
    out = b'glTF' + struct.pack('<II', 2, 12 + 8 + len(js) + 8 + len(bn))
    out += struct.pack('<II', len(js), 0x4E4F534A) + js
    out += struct.pack('<II', len(bn), 0x004E4942) + bn
    open(sortie, 'wb').write(out)
    os.unlink(tmp)
    return sortie
