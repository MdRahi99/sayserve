"""
Menu artwork.

Vector illustrations, one per item, drawn from a shared set of parts so the
whole menu looks like one hand made it. Nothing is a single flat colour: every
piece has a lit side and a shaded side, because that one difference is most of
what separates a drawing from a diagram.

    python3 tools/gen-menu-art.py

Writes apps/web/public/menu/<slug>.svg and points each item's imageUrl at it.
Add an item to the menu and the script names the slug it could not draw.
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MENU_JSON = ROOT / "docs" / "menu.json"
OUT = ROOT / "apps" / "web" / "public" / "menu"

W, H = 800, 560

BG = {
    "burgers": ("#F6EEE3", "#EFE3D2"), "chicken": ("#F7F0E2", "#F0E6D2"),
    "wraps": ("#F3F1E6", "#EBE7D8"), "sides": ("#F5F1E7", "#EDE7D8"),
    "drinks": ("#EEF1F3", "#E3E9ED"), "desserts": ("#F7EDEC", "#F0E1E0"),
    "meals": ("#F4F0E8", "#EBE5D9"), "breakfast": ("#F7F2E7", "#F0E9D8"),
    "kids": ("#F0F3EC", "#E5EBDF"),
}


def lg(id_, stops, x1=0, y1=0, x2=0, y2=1):
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<linearGradient id="{id_}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{s}</linearGradient>'


def rg(id_, stops, cx=0.5, cy=0.4, r=0.7):
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<radialGradient id="{id_}" cx="{cx}" cy="{cy}" r="{r}">{s}</radialGradient>'


GRADS = (
    lg("bunTop", [(0, "#F7D399"), (0.55, "#E3AB62"), (1, "#CE9048")]) +
    lg("bunBot", [(0, "#E9B770"), (1, "#C98B42")]) +
    lg("bunPale", [(0, "#F6E8CE"), (0.6, "#E8D3AE"), (1, "#D3BA8E")]) +
    lg("patty", [(0, "#7A4626"), (0.5, "#6A3A1D"), (1, "#4E2712")]) +
    lg("veg", [(0, "#8CA858"), (0.6, "#6E8B3C"), (1, "#54692B")]) +
    lg("cheese", [(0, "#FBCB63"), (1, "#EDA82F")]) +
    lg("cheeseSauce", [(0, "#F9C556"), (1, "#E09B28")]) +
    lg("lettuce", [(0, "#9FCB63"), (1, "#6E9B39")]) +
    lg("tomato", [(0, "#DE5B4C"), (1, "#B93A2E")]) +
    lg("fry", [(0, "#F7D97C"), (0.6, "#EDBF4F"), (1, "#D69C33")]) +
    lg("sweetFry", [(0, "#F3B172"), (0.6, "#E08E46"), (1, "#C4712E")]) +
    lg("carton", [(0, "#D94F42"), (1, "#B3392E")]) +
    lg("kraft", [(0, "#D6BE96"), (1, "#B99C71")]) +
    lg("cup", [(0, "#FFFFFF"), (0.5, "#F2F2F0"), (1, "#DEDEDA")]) +
    lg("cola", [(0, "#5A3320"), (1, "#3A1C0E")]) +
    lg("chick", [(0, "#EFC066"), (0.6, "#D89B3C"), (1, "#B87C26")]) +
    lg("chickDark", [(0, "#D79B41"), (1, "#A96F1E")]) +
    lg("shakePink", [(0, "#F6D6C8"), (1, "#E2A793")]) +
    lg("shakeChoc", [(0, "#A9714C"), (1, "#7C4A2C")]) +
    lg("tortilla", [(0, "#F0DCB4"), (0.6, "#E2C892"), (1, "#C9AA71")]) +
    lg("cream", [(0, "#FFFCF6"), (1, "#F0E4D2")]) +
    lg("choc", [(0, "#6B4026"), (1, "#3F2314")]) +
    lg("bowl", [(0, "#FBF8F1"), (1, "#DED6C6")]) +
    lg("plate", [(0, "#FFFFFF"), (1, "#E7E2D7")]) +
    lg("juice", [(0, "#FBB04A"), (1, "#E07C1B")]) +
    lg("water", [(0, "#DCEBF3"), (1, "#B4D2E2")]) +
    lg("lemon", [(0, "#F7EFC0"), (1, "#E3D584")]) +
    lg("coffee", [(0, "#7A4E2C"), (1, "#4A2C15")]) +
    lg("tea", [(0, "#D4913F"), (1, "#A96B22")]) +
    lg("berry", [(0, "#D0455C"), (1, "#97283C")]) +
    lg("box", [(0, "#E0D2B6"), (1, "#C0AB86")]) +
    lg("kidbox", [(0, "#8EB85E"), (1, "#5F8635")]) +
    rg("gloss", [(0, "#FFFFFF"), (1, "#FFFFFF00")], 0.35, 0.25, 0.6)
)

SHADOW = ('<filter id="soft" x="-30%" y="-30%" width="160%" height="160%">'
          '<feGaussianBlur stdDeviation="9"/></filter>')


def page(cat, body):
    top, bottom = BG.get(cat, ("#F4F2EA", "#EAE6DB"))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
        '<defs>'
        + lg("bg", [(0, top), (1, bottom)])
        + rg("vig", [(0, "#FFFFFF"), (0.65, "#FFFFFF00"), (1, "#00000012")], 0.5, 0.35, 0.75)
        + SHADOW + GRADS +
        '</defs>'
        f'<rect width="{W}" height="{H}" fill="url(#bg)"/>'
        f'<rect width="{W}" height="{H}" fill="url(#vig)"/>'
        '<ellipse cx="400" cy="452" rx="250" ry="30" fill="#6B5A44" opacity="0.18" filter="url(#soft)"/>'
        + body + '</svg>')


# ------------------------------------------------------------------ the parts
def bun_top(cx, y, w, h, seeds=True, grad="bunTop"):
    p = [f'<path d="M{cx - w/2} {y} a{w/2} {h} 0 0 1 {w} 0z" fill="url(#{grad})"/>',
         f'<path d="M{cx - w*0.32} {y - h*0.52} a{w*0.3} {h*0.42} 0 0 1 {w*0.42} -{h*0.08}" '
         f'stroke="#FFF0D6" stroke-width="7" fill="none" opacity="0.5" stroke-linecap="round"/>']
    if seeds:
        for dx, dy, r in ((-0.26, -0.5, 6), (-0.06, -0.72, 6.5), (0.18, -0.58, 6),
                          (-0.34, -0.22, 5.5), (0.3, -0.26, 5.5), (0.04, -0.34, 5.5),
                          (-0.16, -0.14, 5), (0.2, -0.06, 5)):
            p.append(f'<ellipse cx="{cx + w*dx}" cy="{y + h*dy}" rx="{r}" ry="{r*0.62}" fill="#FBEBCB"/>')
            p.append(f'<ellipse cx="{cx + w*dx}" cy="{y + h*dy - 1.4}" rx="{r*0.6}" ry="{r*0.3}" '
                     f'fill="#FFF8EC" opacity="0.8"/>')
    return "".join(p)


def bun_bottom(cx, y, w, h, grad="bunBot"):
    return (f'<path d="M{cx - w/2} {y} h{w} v{h*0.55} a{w/2} {h*0.7} 0 0 1 -{w} 0z" fill="url(#{grad})"/>'
            f'<path d="M{cx - w/2} {y} h{w} v5 h-{w}z" fill="#C4883F" opacity="0.3"/>')


def patty(cx, y, w, h, grad="patty"):
    return (f'<rect x="{cx - w/2}" y="{y}" width="{w}" height="{h}" rx="{h*0.42}" fill="url(#{grad})"/>'
            + "".join(f'<ellipse cx="{cx - w*0.36 + i*w*0.09}" cy="{y + h*0.3 + (i%3)*4}" '
                      f'rx="{5 + (i%3)}" ry="3" fill="#3F2212" opacity="0.4"/>' for i in range(9))
            + f'<rect x="{cx - w/2}" y="{y + h*0.62}" width="{w}" height="{h*0.38}" rx="{h*0.2}" '
              f'fill="#3A1F10" opacity="0.24"/>')


def crumbed_fillet(cx, y, w, h):
    p = [f'<path d="M{cx - w/2} {y + h} v-{h*0.5} q0 -{h*0.6} {w*0.16} -{h*0.6} '
         f'h{w*0.68} q{w*0.16} 0 {w*0.16} {h*0.6} v{h*0.5}z" fill="url(#chick)"/>']
    for i in range(7):
        p.append(f'<circle cx="{cx - w*0.36 + i*w*0.12}" cy="{y + h*0.45 + (i%3)*5}" r="{5 - (i%2)}" '
                 f'fill="#B87C26" opacity="0.45"/>')
    p.append(f'<path d="M{cx - w*0.34} {y + h*0.22} q{w*0.34} -10 {w*0.68} 0" '
             f'stroke="#FFE2A8" stroke-width="6" fill="none" opacity="0.5"/>')
    return "".join(p)


def cheese(cx, y, w):
    return (f'<path d="M{cx - w/2 - 8} {y} h{w + 16} l-14 22 h-16 l-11 -11 h-20 l-12 15 h-18 '
            f'l-13 -16 h-20 l-12 13 h-22z" fill="url(#cheese)"/>'
            f'<path d="M{cx - w/2 - 8} {y} h{w + 16} v5 h-{w + 16}z" fill="#FFE39B" opacity="0.6"/>')


def lettuce(cx, y, w):
    return (f'<path d="M{cx - w/2 - 10} {y} q26 -18 48 -2 q24 -18 48 -2 q24 -18 48 -2 q24 -16 46 0 '
            f'v14 h-{w + 20}z" fill="url(#lettuce)"/>'
            f'<path d="M{cx - w/2 - 10} {y + 8} q26 -14 48 -2 q24 -14 48 -2 q24 -14 48 -2" '
            f'stroke="#A7C56A" stroke-width="3" fill="none" opacity="0.7"/>')


def tomato(cx, y, w):
    p = []
    for dx in (-0.22, 0.2):
        x = cx + w * dx
        p.append(f'<ellipse cx="{x}" cy="{y}" rx="{w*0.22}" ry="10" fill="url(#tomato)"/>')
        p.append(f'<ellipse cx="{x}" cy="{y - 2}" rx="{w*0.15}" ry="5" fill="#E8695A" opacity="0.7"/>')
    return "".join(p)


def jalapenos(cx, y, w):
    return "".join(f'<g transform="rotate({-20 + i*25} {cx + w*dx} {y})">'
                   f'<ellipse cx="{cx + w*dx}" cy="{y}" rx="13" ry="9" fill="#6E9B39"/>'
                   f'<ellipse cx="{cx + w*dx}" cy="{y}" rx="7" ry="4" fill="#A7C56A"/></g>'
                   for i, dx in enumerate((-0.24, -0.02, 0.2)))


def sauce_drip(cx, y, w, colour="#8E2C22"):
    return (f'<path d="M{cx - w/2 - 6} {y} h{w + 12} v10 q-20 18 -40 4 q-24 22 -48 2 '
            f'q-26 20 -50 -2 q-22 16 -44 -4z" fill="{colour}" opacity="0.92"/>')


# ------------------------------------------------------------------- burgers
def burger(*, seeds=True, double=False, cheese_on=True, protein="beef",
           spicy=False, sauce=None, pale_bun=False, veg_patty=False):
    cx, w = 400, 300
    y = 380
    grad_bot = "bunPale" if pale_bun else "bunBot"
    grad_top = "bunPale" if pale_bun else "bunTop"
    p = [bun_bottom(cx, y, w, 40, grad_bot)]
    y -= 6
    p.append(lettuce(cx, y, w))
    y -= 18
    p.append(tomato(cx, y, w))
    y -= 12
    if cheese_on:
        p.append(cheese(cx, y, w))
        y -= 8

    if protein == "chicken":
        p.append(crumbed_fillet(cx, y - 52, w, 54))
        y -= 56
    elif protein == "fish":
        p.append(f'<rect x="{cx - w/2 + 6}" y="{y - 46}" width="{w - 12}" height="46" rx="10" '
                 f'fill="url(#chick)"/>')
        for i in range(8):
            p.append(f'<circle cx="{cx - w*0.36 + i*w*0.1}" cy="{y - 24 + (i%2)*8}" r="4" '
                     f'fill="#C08A2C" opacity="0.5"/>')
        y -= 50
    elif protein == "halloumi":
        p.append(f'<rect x="{cx - w/2 + 10}" y="{y - 40}" width="{w - 20}" height="40" rx="8" '
                 f'fill="#F3E6C8"/>')
        for i in range(5):
            p.append(f'<path d="M{cx - w*0.3 + i*w*0.15} {y - 36} l14 32" stroke="#D9C49A" '
                     f'stroke-width="6" opacity="0.8"/>')
        y -= 44
    else:
        grad = "veg" if veg_patty else "patty"
        p.append(patty(cx, y - 44, w, 46, grad))
        y -= 50
        if double:
            if cheese_on:
                p.append(cheese(cx, y, w))
                y -= 8
            p.append(patty(cx, y - 42, w, 44, grad))
            y -= 46

    if spicy:
        p.append(jalapenos(cx, y + 4, w))
    if sauce:
        p.append(sauce_drip(cx, y, w, sauce))
        y -= 6

    p.append(bun_top(cx, y, w + 14, 96, seeds, grad_top))
    return page("burgers", "".join(p))


# ------------------------------------------------------------------- chicken
def nuggets(count=5, popcorn=False, carton=True, grad="carton"):
    p = []
    if carton:
        p.append(f'<path d="M250 292 h300 l-28 150 q-3 14 -18 14 h-208 q-15 0 -18 -14z" fill="url(#{grad})"/>')
        p.append('<path d="M250 292 h300 l-6 26 h-288z" fill="#FFFFFF" opacity="0.2"/>')
    spots = [(320, 262, -16, 1.0), (400, 232, 6, 1.1), (474, 258, 20, 1.0),
             (356, 318, -8, 0.95), (446, 320, 12, 0.95)]
    if popcorn:
        spots = [(x + (i % 3 - 1) * 12, y + (i % 2) * 14, r, 0.5)
                 for i, (x, y, r, _) in enumerate(spots * 2)]
    for x, y, rot, s in spots[:count if not popcorn else 10]:
        p.append(f'<g transform="translate({x} {y}) rotate({rot}) scale({s})">'
                 f'<path d="M-52 0 q4 -36 40 -34 q40 -4 44 30 q4 32 -40 32 q-48 0 -44 -28z" fill="url(#chick)"/>'
                 f'<path d="M-40 -14 q30 -12 66 -4" stroke="#FFE2A8" stroke-width="7" fill="none" '
                 f'opacity="0.55" stroke-linecap="round"/>'
                 f'<path d="M-34 12 q32 12 66 -2" stroke="#9E6418" stroke-width="5" fill="none" opacity="0.35"/>'
                 f'</g>')
    return page("chicken", "".join(p))


def wings(many=False):
    spots = [(300, 316, -22), (400, 268, 4), (500, 318, 22), (350, 380, -10), (452, 382, 12)]
    if many:
        spots += [(400, 200, 0), (312, 232, -18), (490, 234, 18)]
    p = []
    if many:
        p.insert(0, '<path d="M240 300 h320 l-30 148 q-3 14 -18 14 h-224 q-15 0 -18 -14z" fill="url(#carton)"/>')
    for x, y, rot in spots:
        p.append(f'<g transform="rotate({rot} {x} {y})">'
                 f'<path d="M{x - 8} {y - 34} q46 0 46 36 q0 34 -46 34 q-40 0 -40 -34 q0 -36 40 -36z" '
                 f'fill="url(#chickDark)"/>'
                 f'<path d="M{x - 22} {y - 14} q26 -12 48 -2" stroke="#D9503C" stroke-width="8" '
                 f'fill="none" opacity="0.7" stroke-linecap="round"/>'
                 f'<circle cx="{x + 4}" cy="{y + 12}" r="5" fill="#8A5613" opacity="0.5"/>'
                 f'<rect x="{x - 58}" y="{y - 8}" width="30" height="16" rx="8" fill="#F6ECD6"/>'
                 f'<circle cx="{x - 60}" cy="{y - 6}" r="9" fill="#FFF8EC"/>'
                 f'<circle cx="{x - 60}" cy="{y + 6}" r="9" fill="#FFF8EC"/></g>')
    return page("chicken", "".join(p))


def tenders(box=False):
    p = []
    if box:
        p.append('<path d="M232 316 h336 l-28 130 q-3 14 -18 14 h-244 q-15 0 -18 -14z" fill="url(#box)"/>')
        p.append('<path d="M232 316 h336 l-5 22 h-326z" fill="#FFFFFF" opacity="0.25"/>')
    for x, y, rot in ((330, 268, -22), (470, 262, 20), (296, 346, -12),
                      (400, 330, 4), (508, 348, 24)):
        p.append(f'<g transform="rotate({rot} {x} {y})">'
                 f'<rect x="{x - 78}" y="{y - 26}" width="156" height="52" rx="26" fill="url(#chick)"/>'
                 f'<rect x="{x - 62}" y="{y - 14}" width="124" height="12" rx="6" fill="#FFE2A8" opacity="0.5"/>'
                 f'<path d="M{x - 52} {y + 10} q52 14 104 -4" stroke="#A96F1E" stroke-width="5" '
                 f'fill="none" opacity="0.4"/></g>')
    return page("chicken", "".join(p))


def grilled_fillet():
    p = ['<ellipse cx="400" cy="330" rx="210" ry="106" fill="url(#plate)"/>',
         '<ellipse cx="400" cy="330" rx="176" ry="86" fill="#F4EFE4" opacity="0.7"/>',
         '<path d="M262 322 q10 -78 138 -78 q128 0 138 78 q-12 72 -138 72 q-126 0 -138 -72z" fill="url(#chick)"/>']
    for i in range(5):
        p.append(f'<path d="M{296 + i*42} 268 l26 86" stroke="#8A5613" stroke-width="9" '
                 f'opacity="0.55" stroke-linecap="round"/>')
    p.append('<path d="M300 372 q46 18 100 10" stroke="#6E9B39" stroke-width="8" fill="none" '
             'stroke-linecap="round" opacity="0.8"/>')
    return page("chicken", "".join(p))


# --------------------------------------------------------------------- sides
def fries(grad="fry", carton="carton", curly=False, loaded=False):
    p = []
    if curly:
        for dx in (-0.28, -0.14, 0, 0.14, 0.28):
            x = 400 + 300 * dx
            p.append(f'<path d="M{x} 330 q-26 -30 6 -50 q32 -20 4 -48 q-26 -26 14 -42" '
                     f'stroke="url(#{grad})" stroke-width="22" fill="none" stroke-linecap="round"/>')
    else:
        for dx, lean, hgt in ((-0.30, -13, 200), (-0.17, -7, 232), (-0.04, -2, 246),
                              (0.09, 3, 236), (0.22, 9, 210), (0.33, 15, 184)):
            x = 400 + 300 * dx
            p.append(f'<g transform="rotate({lean} {x} 330)">'
                     f'<rect x="{x - 15}" y="{330 - hgt}" width="30" height="{hgt}" rx="8" fill="url(#{grad})"/>'
                     f'<rect x="{x - 15}" y="{330 - hgt}" width="10" height="{hgt}" rx="5" fill="#FFF0C2" opacity="0.45"/>'
                     f'<rect x="{x + 5}" y="{330 - hgt}" width="9" height="{hgt}" rx="4" fill="#B9801F" opacity="0.3"/>'
                     f'</g>')
    p.append(f'<path d="M262 300 h276 l-30 150 q-3 14 -18 14 h-180 q-15 0 -18 -14z" fill="url(#{carton})"/>')
    p.append('<path d="M262 300 h276 l-6 30 h-264z" fill="#FFFFFF" opacity="0.22"/>')
    if loaded:
        p.append('<path d="M272 302 q40 40 78 8 q40 42 80 4 q30 30 56 -6 l-12 48 h-190z" fill="url(#cheeseSauce)"/>')
        for x in (320, 390, 458):
            p.append(f'<path d="M{x} 330 q18 22 36 4" stroke="#6B4026" stroke-width="9" '
                     f'fill="none" stroke-linecap="round" opacity="0.75"/>')
    return page("sides", "".join(p))


def rings():
    p = []
    for x, y, r in ((312, 334, 72), (492, 330, 68), (400, 240, 64), (400, 396, 56)):
        p.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#chick)"/>')
        p.append(f'<circle cx="{x}" cy="{y}" r="{r - 28}" fill="#F0E7D6"/>')
        p.append(f'<circle cx="{x}" cy="{y}" r="{r - 28}" fill="#C9A15A" opacity="0.25"/>')
        p.append(f'<path d="M{x - r + 6} {y - 14} a{r - 6} {r - 6} 0 0 1 {r*0.8} -{r*0.55}" '
                 f'stroke="#FFE2A8" stroke-width="9" fill="none" opacity="0.5" stroke-linecap="round"/>')
    return page("sides", "".join(p))


def sticks(pull=True, grad="chick"):
    p = []
    for x, rot in ((300, -12), (366, -4), (434, 4), (500, 12)):
        p.append(f'<g transform="rotate({rot} {x} 330)">'
                 f'<rect x="{x - 30}" y="200" width="60" height="212" rx="28" fill="url(#{grad})"/>'
                 f'<rect x="{x - 16}" y="220" width="16" height="172" rx="8" fill="#FFECC4" opacity="0.5"/>'
                 f'</g>')
    if pull:
        p.append('<path d="M330 208 q38 -56 84 -12 q40 -50 78 -4" stroke="#F4C452" stroke-width="14" '
                 'fill="none" stroke-linecap="round"/>')
    return page("sides", "".join(p))


def salad_bowl():
    p = ['<path d="M230 296 h340 q-18 152 -170 152 q-152 0 -170 -152z" fill="url(#bowl)"/>']
    for x, y, r, c in ((316, 292, 54, "#7FA34A"), (400, 272, 62, "#93B95A"),
                       (486, 294, 50, "#6E8B3C"), (356, 320, 44, "#A7C56A"),
                       (452, 324, 40, "#7FA34A")):
        p.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>')
        p.append(f'<path d="M{x - r*0.5} {y - r*0.4} q{r*0.5} -{r*0.3} {r} 0" stroke="#C3DA90" '
                 f'stroke-width="6" fill="none" opacity="0.6"/>')
    p.append('<circle cx="348" cy="330" r="20" fill="url(#tomato)"/>')
    p.append('<circle cx="462" cy="342" r="17" fill="url(#tomato)"/>')
    p.append('<ellipse cx="400" cy="296" rx="170" ry="26" fill="#FFFFFF" opacity="0.18"/>')
    return page("sides", "".join(p))


def slaw():
    p = ['<path d="M240 306 h320 q-16 144 -160 144 q-144 0 -160 -144z" fill="#DAD3C4"/>',
         '<ellipse cx="400" cy="306" rx="160" ry="30" fill="#C9C1B0"/>',
         '<path d="M252 308 q34 -96 148 -96 q114 0 148 96 q-34 50 -148 50 q-114 0 -148 -50z" fill="url(#cream)"/>']
    for i in range(18):
        x = 280 + (i % 9) * 30
        y = 254 + (i // 9) * 40
        col = ("#8CA858", "#E7DCC6", "#EDBF4F")[i % 3]
        p.append(f'<path d="M{x} {y} q18 14 -4 30" stroke="{col}" stroke-width="8" fill="none" '
                 f'stroke-linecap="round" opacity="0.9"/>')
    return page("sides", "".join(p))


def corn():
    p = ['<g transform="rotate(-20 400 300)">',
         '<rect x="330" y="150" width="140" height="290" rx="70" fill="url(#fry)"/>']
    for r in range(9):
        for c in range(4):
            p.append(f'<ellipse cx="{356 + c*30}" cy="{186 + r*30}" rx="12" ry="11" '
                     f'fill="#D69C33" opacity="0.5"/>')
    p.append('<path d="M330 402 q70 50 140 0 v38 h-140z" fill="#6E9B39"/></g>')
    p.append('<rect x="372" y="392" width="56" height="30" rx="12" fill="url(#cream)"/>')
    return page("sides", "".join(p))


def bread_slices():
    p = []
    for x, y, rot in ((300, 350, -12), (366, 320, -4), (434, 320, 4), (500, 350, 12)):
        p.append(f'<g transform="rotate({rot} {x} {y})">'
                 f'<path d="M{x - 62} {y + 70} v-72 q0 -54 62 -54 q62 0 62 54 v72z" fill="url(#bunTop)"/>'
                 f'<path d="M{x - 48} {y + 58} v-60 q0 -42 48 -42 q48 0 48 42 v60z" fill="#F6E6C4"/>'
                 f'<circle cx="{x - 16}" cy="{y}" r="7" fill="#7FA34A" opacity="0.85"/>'
                 f'<circle cx="{x + 20}" cy="{y + 20}" r="6" fill="#7FA34A" opacity="0.85"/>'
                 f'<circle cx="{x + 2}" cy="{y + 34}" r="5" fill="#6E8B3C" opacity="0.7"/></g>')
    return page("sides", "".join(p))


# --------------------------------------------------------------------- drinks
def cup(liquid="cola", ice=True, straw="#D94F42", lid=True):
    p = [f'<path d="M300 150 h200 l-26 290 q-2 14 -17 14 h-114 q-15 0 -17 -14z" fill="url(#cup)"/>',
         f'<path d="M310 176 h180 l-22 250 h-136z" fill="url(#{liquid})"/>']
    if ice:
        for cx, cy, r in ((352, 240, 22), (420, 218, 26), (388, 292, 24), (444, 300, 20), (364, 340, 18)):
            p.append(f'<rect x="{cx - r}" y="{cy - r}" width="{r*2}" height="{r*2}" rx="6" '
                     f'fill="#FFFFFF" opacity="0.24" transform="rotate({r} {cx} {cy})"/>')
    if lid:
        p.append('<rect x="286" y="126" width="228" height="34" rx="12" fill="#37332F"/>')
        p.append('<rect x="286" y="126" width="228" height="12" rx="6" fill="#4B4640"/>')
    if straw:
        p.append(f'<rect x="392" y="40" width="26" height="100" rx="12" fill="{straw}" transform="rotate(13 405 90)"/>')
        p.append(f'<rect x="392" y="40" width="9" height="100" rx="5" fill="#FFFFFF" opacity="0.3" '
                 f'transform="rotate(13 405 90)"/>')
    p.append('<path d="M318 180 q10 120 18 240" stroke="#FFFFFF" stroke-width="10" fill="none" opacity="0.26"/>')
    return page("drinks", "".join(p))


def bottle(fill="water", sparkle=False):
    p = ['<rect x="376" y="88" width="48" height="40" rx="8" fill="#C9C4BA"/>',
         '<rect x="372" y="74" width="56" height="26" rx="9" fill="#5C574F"/>',
         f'<path d="M370 122 q-28 26 -28 74 v190 q0 26 26 26 h64 q26 0 26 -26 v-190 q0 -48 -28 -74z" '
         f'fill="url(#{fill})"/>',
         '<rect x="340" y="216" width="120" height="66" rx="8" fill="#FFFFFF" opacity="0.9"/>',
         '<rect x="356" y="232" width="88" height="10" rx="5" fill="#B4D2E2"/>',
         '<rect x="356" y="252" width="60" height="8" rx="4" fill="#DCEBF3"/>',
         '<path d="M356 150 q-8 60 -6 200" stroke="#FFFFFF" stroke-width="10" fill="none" opacity="0.5"/>']
    if sparkle:
        for cx, cy, r in ((364, 316, 7), (430, 330, 6), (398, 360, 5), (420, 296, 5)):
            p.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#FFFFFF" opacity="0.65"/>')
    return page("drinks", "".join(p))


def glass(liquid="juice", garnish=None, ice=False):
    p = ['<path d="M322 148 h156 l-22 268 q-2 14 -16 14 h-80 q-14 0 -16 -14z" fill="url(#cup)"/>',
         f'<path d="M332 186 h136 l-18 218 h-100z" fill="url(#{liquid})"/>']
    if ice:
        for cx, cy in ((366, 240), (426, 224), (398, 296)):
            p.append(f'<rect x="{cx - 18}" y="{cy - 18}" width="36" height="36" rx="6" '
                     f'fill="#FFFFFF" opacity="0.28" transform="rotate(16 {cx} {cy})"/>')
    if garnish:
        p.append(f'<circle cx="470" cy="168" r="30" fill="{garnish}"/>')
        p.append('<circle cx="470" cy="168" r="30" fill="#FFFFFF" opacity="0.15"/>')
        p.append('<path d="M470 138 v60" stroke="#FFFFFF" stroke-width="4" opacity="0.6"/>')
    p.append('<path d="M342 196 q8 100 14 200" stroke="#FFFFFF" stroke-width="9" fill="none" opacity="0.32"/>')
    return page("drinks", "".join(p))


def shake(colour="shakePink"):
    return page("drinks", "".join([
        '<path d="M312 170 h176 l-24 268 q-2 14 -16 14 h-96 q-14 0 -16 -14z" fill="url(#cup)"/>',
        f'<path d="M322 208 h156 l-20 214 h-116z" fill="url(#{colour})"/>',
        '<path d="M306 172 q20 -40 56 -26 q14 -46 58 -30 q38 -22 62 22 q20 24 -10 34z" fill="url(#cream)"/>',
        '<path d="M330 156 q22 -28 50 -16" stroke="#FFFFFF" stroke-width="8" fill="none" opacity="0.8"/>',
        '<circle cx="404" cy="108" r="17" fill="url(#berry)"/>',
        '<circle cx="399" cy="103" r="6" fill="#E9798A" opacity="0.8"/>',
        '<path d="M404 92 q10 -22 30 -24" stroke="#6E8F3A" stroke-width="6" fill="none"/>',
        '<rect x="452" y="60" width="24" height="130" rx="11" fill="#D94F42" transform="rotate(16 464 120)"/>',
        '<path d="M330 214 q10 100 16 200" stroke="#FFFFFF" stroke-width="9" fill="none" opacity="0.3"/>',
    ]))


def hot_cup(liquid="coffee", cream_top=False):
    p = ['<ellipse cx="400" cy="424" rx="180" ry="36" fill="url(#plate)"/>',
         '<path d="M292 208 h216 l-20 170 q-3 22 -28 22 h-120 q-25 0 -28 -22z" fill="#FFFFFF"/>',
         '<path d="M292 208 h216 l-4 30 h-208z" fill="#EFEBE2"/>',
         f'<ellipse cx="400" cy="212" rx="106" ry="26" fill="url(#{liquid})"/>']
    if cream_top:
        p.append('<ellipse cx="400" cy="206" rx="84" ry="20" fill="url(#cream)"/>')
        p.append('<ellipse cx="400" cy="202" rx="52" ry="12" fill="#FFFFFF" opacity="0.8"/>')
    p.append('<path d="M508 246 q70 0 70 50 q0 50 -66 50" stroke="#FFFFFF" stroke-width="24" fill="none"/>')
    p.append('<path d="M508 246 q70 0 70 50 q0 50 -66 50" stroke="#E4DFD4" stroke-width="10" fill="none"/>')
    for x, d in ((358, 0), (400, 10), (442, 4)):
        p.append(f'<path d="M{x} {162 - d} q16 -26 0 -48" stroke="#FFFFFF" stroke-width="7" '
                 f'fill="none" opacity="0.7" stroke-linecap="round"/>')
    return page("drinks", "".join(p))


# ------------------------------------------------------------------- desserts
def sundae(sauce="#6B4026"):
    return page("desserts", "".join([
        '<path d="M328 214 h144 l-26 210 q-2 14 -16 14 h-60 q-14 0 -16 -14z" fill="url(#cup)"/>',
        '<path d="M328 214 q72 -96 144 0z" fill="url(#cream)"/>',
        f'<path d="M340 210 q60 -74 120 0z" fill="{sauce}" opacity="0.85"/>',
        '<circle cx="400" cy="140" r="20" fill="url(#berry)"/>',
        '<path d="M400 124 q16 -26 40 -26" stroke="#6E8F3A" stroke-width="7" fill="none"/>',
        '<path d="M344 236 q8 90 14 178" stroke="#FFFFFF" stroke-width="8" fill="none" opacity="0.35"/>',
    ]))


def pie():
    p = ['<path d="M232 412 l64 -168 q12 -28 44 -28 h120 q32 0 44 28 l64 168z" fill="url(#bunTop)"/>',
         '<path d="M262 402 l56 -140 h164 l56 140z" fill="#D79B41" opacity="0.5"/>']
    for i in range(4):
        p.append(f'<path d="M{336 + i*44} 266 l-16 124" stroke="#F6E6C4" stroke-width="11" '
                 f'opacity="0.75" stroke-linecap="round"/>')
    p.append('<path d="M232 404 h336 v28 q0 12 -14 12 h-308 q-14 0 -14 -12z" fill="#C4883F"/>')
    return page("desserts", "".join(p))


def brownie():
    return page("desserts", "".join([
        '<path d="M264 250 h272 v150 q0 20 -22 20 h-228 q-22 0 -22 -20z" fill="url(#choc)"/>',
        '<path d="M264 250 h272 l-30 -36 h-212z" fill="#7C4A2C"/>',
        '<path d="M296 226 q40 26 80 0 q40 26 80 0" stroke="#F0E4D2" stroke-width="8" fill="none" opacity="0.4"/>',
        '<circle cx="330" cy="310" r="13" fill="#8A5A38"/>',
        '<circle cx="440" cy="346" r="11" fill="#8A5A38"/>',
        '<circle cx="482" cy="296" r="9" fill="#8A5A38"/>',
        '<path d="M282 388 h236" stroke="#2C1810" stroke-width="10" opacity="0.3"/>',
    ]))


def cookies():
    p = []
    for x, y, r in ((330, 326, 96), (492, 300, 82)):
        p.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="url(#bunTop)"/>')
        p.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#B9801F" opacity="0.12"/>')
        for dx, dy, cr in ((-0.34, -0.2, 14), (0.2, -0.38, 13), (0.38, 0.16, 12),
                           (-0.12, 0.3, 13), (0.02, -0.04, 11), (-0.46, 0.18, 10)):
            p.append(f'<circle cx="{x + r*dx}" cy="{y + r*dy}" r="{cr}" fill="url(#choc)"/>')
            p.append(f'<circle cx="{x + r*dx - cr*0.3}" cy="{y + r*dy - cr*0.3}" r="{cr*0.3}" '
                     f'fill="#FFFFFF" opacity="0.2"/>')
    return page("desserts", "".join(p))


def donut():
    p = ['<circle cx="400" cy="310" r="148" fill="url(#bunTop)"/>',
         '<circle cx="400" cy="304" r="140" fill="#F3C9CE"/>',
         '<circle cx="400" cy="304" r="140" fill="url(#gloss)" opacity="0.5"/>',
         '<circle cx="400" cy="310" r="50" fill="#F1E7DA"/>',
         '<circle cx="400" cy="310" r="56" fill="none" stroke="#E3AB62" stroke-width="18"/>']
    for i, (dx, dy, rot) in enumerate(((-0.5, -0.4, 20), (0.1, -0.62, -30), (0.52, 0.1, 40),
                                       (-0.46, 0.34, -20), (0.06, 0.58, 10), (-0.66, -0.02, 70),
                                       (0.36, -0.42, -55), (0.3, 0.46, 25))):
        col = ("#EDBF4F", "#7FA34A", "#D94F42", "#7FB0D0")[i % 4]
        x, y = 400 + 130 * dx, 306 + 130 * dy
        p.append(f'<rect x="{x}" y="{y}" width="30" height="11" rx="5" fill="{col}" '
                 f'transform="rotate({rot} {x} {y})"/>')
    return page("desserts", "".join(p))


def churros():
    p = []
    for x, rot in ((300, -14), (362, -5), (424, 5), (486, 14)):
        p.append(f'<g transform="rotate({rot} {x} 300)">'
                 f'<rect x="{x - 22}" y="160" width="44" height="256" rx="22" fill="url(#bunTop)"/>')
        for j in range(6):
            p.append(f'<path d="M{x - 22} {198 + j*38} h44" stroke="#C4883F" stroke-width="7" opacity="0.55"/>')
        p.append(f'<rect x="{x - 22}" y="160" width="14" height="256" rx="7" fill="#FFECC4" opacity="0.35"/>')
        p.append('</g>')
    p.append('<path d="M540 300 h108 v88 q0 22 -22 22 h-64 q-22 0 -22 -22z" fill="url(#choc)"/>')
    p.append('<ellipse cx="594" cy="300" rx="54" ry="14" fill="#8A5A38"/>')
    return page("desserts", "".join(p))


def cheesecake():
    return page("desserts", "".join([
        '<path d="M262 416 l46 -190 h184 l46 190z" fill="url(#cream)"/>',
        '<path d="M262 416 h276 v26 q0 12 -14 12 h-248 q-14 0 -14 -12z" fill="url(#bunTop)"/>',
        '<path d="M308 226 h184 l10 34 h-204z" fill="url(#berry)"/>',
        '<circle cx="346" cy="216" r="18" fill="#C0384E"/>',
        '<circle cx="404" cy="208" r="16" fill="#D0455C"/>',
        '<circle cx="456" cy="218" r="15" fill="#B02E44"/>',
        '<path d="M286 300 q16 80 22 108" stroke="#FFFFFF" stroke-width="8" fill="none" opacity="0.4"/>',
    ]))


# ---------------------------------------------------------------- breakfast
def muffin_stack(veg=False):
    p = ['<path d="M262 292 h276 a20 20 0 0 1 0 40 h-276 a20 20 0 0 1 0 -40z" fill="url(#bunTop)"/>',
         '<path d="M266 292 q28 -32 68 -14 q34 -34 74 -10 q38 -24 64 24z" fill="url(#cream)"/>',
         '<circle cx="400" cy="272" r="24" fill="url(#cheese)"/>',
         f'<rect x="272" y="332" width="256" height="40" rx="16" fill="url(#{"fry" if veg else "patty"})"/>',
         '<path d="M258 372 h284 l-14 30 h-256z" fill="url(#cheese)"/>',
         '<path d="M258 402 h284 a20 20 0 0 1 -18 30 h-248 a20 20 0 0 1 -18 -30z" fill="url(#bunBot)"/>',
         bun_top(400, 258, 290, 92, True)]
    return page("breakfast", "".join(p))


def pancakes():
    p = ['<ellipse cx="400" cy="424" rx="200" ry="34" fill="url(#plate)"/>']
    for i, y in enumerate((388, 330, 272)):
        w = 176 - i * 6
        p.append(f'<ellipse cx="400" cy="{y}" rx="{w}" ry="42" fill="url(#bunTop)"/>')
        p.append(f'<ellipse cx="400" cy="{y - 8}" rx="{w}" ry="38" fill="#F6E6C4"/>')
    p.append('<path d="M244 258 q44 62 156 58 q112 4 156 -58 q18 56 -34 82 q-118 40 -244 0 q-52 -26 -34 -82z" '
             'fill="#C4863A" opacity="0.92"/>')
    p.append('<rect x="362" y="200" width="76" height="40" rx="10" fill="url(#cream)"/>')
    return page("breakfast", "".join(p))


def porridge():
    p = ['<path d="M228 292 h344 q-18 156 -172 156 q-154 0 -172 -156z" fill="url(#bowl)"/>',
         '<ellipse cx="400" cy="294" rx="172" ry="42" fill="#F1E3C6"/>',
         '<ellipse cx="400" cy="288" rx="150" ry="34" fill="#F8EEDB"/>']
    for cx, cy, r, c in ((346, 280, 18, "#C0384E"), (410, 268, 16, "#D0455C"),
                         (462, 288, 15, "#B02E44"), (384, 300, 13, "#C4863A")):
        p.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{c}"/>')
    p.append('<path d="M470 254 q50 -44 86 -20" stroke="#E2B860" stroke-width="12" fill="none" '
             'stroke-linecap="round"/>')
    return page("breakfast", "".join(p))


def hash_browns():
    p = []
    for x, y, rot in ((330, 330, -12), (480, 306, 10)):
        p.append(f'<g transform="rotate({rot} {x} {y})">'
                 f'<path d="M{x - 104} {y - 52} h208 a30 30 0 0 1 0 104 h-208 a30 30 0 0 1 0 -104z" '
                 f'fill="url(#fry)"/>')
        for i in range(6):
            p.append(f'<path d="M{x - 80 + i*32} {y - 36} v72" stroke="#D69C33" stroke-width="8" opacity="0.5"/>')
        p.append(f'<path d="M{x - 84} {y - 30} h168" stroke="#FFECC4" stroke-width="8" opacity="0.4"/>')
        p.append('</g>')
    return page("breakfast", "".join(p))


# -------------------------------------------------------------------- meals
def combo(main_svg_parts, cat="meals"):
    """A tray: the main thing, a carton of fries and a cup, sized to read small."""
    return page(cat, "".join([
        f'<g transform="translate(-118 84) scale(0.58)">{main_svg_parts}</g>',
        '<g transform="translate(238 130) scale(0.46)">'
        + "".join(f'<g transform="rotate({lean} {400 + 300*dx} 330)">'
                  f'<rect x="{400 + 300*dx - 15}" y="{330 - hgt}" width="30" height="{hgt}" rx="8" fill="url(#fry)"/>'
                  f'</g>' for dx, lean, hgt in ((-0.2, -8, 210), (-0.05, -2, 236), (0.1, 4, 224), (0.25, 10, 196)))
        + '<path d="M262 300 h276 l-30 150 q-3 14 -18 14 h-180 q-15 0 -18 -14z" fill="url(#carton)"/>'
          '<path d="M262 300 h276 l-6 30 h-264z" fill="#FFFFFF" opacity="0.22"/></g>',
        '<g transform="translate(400 108) scale(0.52)">'
        '<path d="M300 150 h200 l-26 290 q-2 14 -17 14 h-114 q-15 0 -17 -14z" fill="url(#cup)"/>'
        '<path d="M310 176 h180 l-22 250 h-136z" fill="url(#cola)"/>'
        '<rect x="286" y="126" width="228" height="34" rx="12" fill="#37332F"/>'
        '<rect x="392" y="40" width="26" height="100" rx="12" fill="#D94F42" transform="rotate(13 405 90)"/></g>',
    ]))


def burger_parts(**kw):
    """The burger drawing alone, for putting on a tray."""
    cx, w = 400, 300
    y = 380
    p = [bun_bottom(cx, y, w, 40), lettuce(cx, y - 6, w), tomato(cx, y - 24, w)]
    y -= 36
    if kw.get("cheese_on", True):
        p.append(cheese(cx, y, w))
        y -= 8
    if kw.get("protein") == "chicken":
        p.append(crumbed_fillet(cx, y - 52, w, 54))
        y -= 56
    else:
        p.append(patty(cx, y - 44, w, 46, "veg" if kw.get("veg_patty") else "patty"))
        y -= 50
    p.append(bun_top(cx, y, w + 14, 96, kw.get("seeds", True)))
    return "".join(p)


def wrap_parts():
    return ('<g transform="rotate(-18 400 300)">'
            '<rect x="430" y="196" width="118" height="228" rx="59" fill="#D9BE8C"/>'
            '<rect x="266" y="152" width="170" height="272" rx="85" fill="url(#tortilla)"/>'
            '<ellipse cx="351" cy="158" rx="85" ry="30" fill="#D3B587"/>'
            '<ellipse cx="351" cy="156" rx="70" ry="23" fill="#F0E0C0"/>'
            '<ellipse cx="330" cy="152" rx="34" ry="15" fill="url(#chick)"/>'
            '<ellipse cx="372" cy="162" rx="28" ry="13" fill="url(#lettuce)"/></g>')


def nugget_parts():
    return "".join(
        f'<g transform="translate({x} {y}) rotate({rot})">'
        f'<path d="M-52 0 q4 -36 40 -34 q40 -4 44 30 q4 32 -40 32 q-48 0 -44 -28z" fill="url(#chick)"/></g>'
        for x, y, rot in ((330, 300, -16), (410, 268, 6), (480, 300, 20), (370, 352, -8)))


def family_box():
    p = ['<path d="M180 260 h440 l-36 180 q-3 16 -20 16 h-328 q-17 0 -20 -16z" fill="url(#carton)"/>',
         '<path d="M180 260 h440 l-8 34 h-424z" fill="#FFFFFF" opacity="0.22"/>',
         # the food sits IN the box, which means measuring where the drawing
         # actually lands once it is scaled rather than eyeballing the offset
         f'<g transform="translate(120 186) scale(0.38)">{burger_parts()}</g>',
         f'<g transform="translate(360 186) scale(0.38)">{burger_parts(protein="chicken", cheese_on=False)}</g>',
         '<g transform="translate(272 272) scale(0.3)">'
         + "".join(f'<rect x="{400 + 300*dx - 15}" y="110" width="30" height="220" rx="8" fill="url(#fry)"/>'
                   for dx in (-0.15, 0, 0.15))
         + '<path d="M262 300 h276 l-30 150 q-3 14 -18 14 h-180 q-15 0 -18 -14z" fill="#B3392E"/></g>',
         '<text x="400" y="424" font-family="Inter, Helvetica, Arial, sans-serif" font-size="26" '
         'fill="#FFFFFF" text-anchor="middle" opacity="0.9" letter-spacing="3">SHARE</text>']
    return page("meals", "".join(p))


def kids_box(veg=False, burger_kid=False):
    inner = (burger_parts(veg_patty=veg) if (burger_kid or veg) else nugget_parts())
    p = ['<path d="M252 282 h296 v148 q0 20 -22 20 h-252 q-22 0 -22 -20z" fill="url(#kidbox)"/>',
         '<path d="M252 282 h296 l-20 -32 h-256z" fill="#5F8635"/>',
         '<path d="M356 250 q44 -52 88 0" stroke="#5F8635" stroke-width="16" fill="none"/>',
         f'<g transform="translate(196 214) scale(0.34)">{inner}</g>',
         '<g transform="translate(346 238) scale(0.3)">'
         '<path d="M322 148 h156 l-22 268 q-2 14 -16 14 h-80 q-14 0 -16 -14z" fill="url(#cup)"/>'
         '<path d="M332 186 h136 l-18 218 h-100z" fill="url(#juice)"/></g>']
    return page("kids", "".join(p))


# ---------------------------------------------------------------- the mapping
DRAW = {
    "cheeseburger": lambda: burger(),
    "classic-hamburger": lambda: burger(cheese_on=False, seeds=False),
    "bbq-stack-burger": lambda: burger(double=True, sauce="#8E2C22"),
    "crispy-chicken-burger": lambda: burger(protein="chicken", cheese_on=False),
    "spicy-chicken-burger": lambda: burger(protein="chicken", cheese_on=False, spicy=True, sauce="#C0392B"),
    "veggie-burger": lambda: burger(veg_patty=True, cheese_on=False),
    "plant-deluxe-burger": lambda: burger(veg_patty=True, double=True),
    "fish-burger": lambda: burger(protein="fish", seeds=False, pale_bun=True),
    "halloumi-burger": lambda: burger(protein="halloumi", cheese_on=False),
    "smash-double": lambda: burger(double=True),
    "chilli-cheese-burger": lambda: burger(spicy=True, sauce="#B8432B"),

    "chicken-nuggets": lambda: nuggets(),
    "chicken-wings": lambda: wings(),
    "chicken-tenders": lambda: tenders(),
    "popcorn-chicken": lambda: nuggets(popcorn=True),
    "grilled-chicken-fillet": grilled_fillet,
    "hot-wings-bucket": lambda: wings(many=True),
    "chicken-strips-box": lambda: tenders(box=True),

    "chicken-wrap": lambda: wrap_page(),
    "spicy-wrap": lambda: wrap_page(spicy=True),
    "grilled-chicken-wrap": lambda: wrap_page(fill="#C08A3A"),
    "falafel-wrap": lambda: wrap_page(fill="#6E8B3C", veg=True),
    "halloumi-wrap": lambda: wrap_page(fill="#F3E6C8", veg=True),

    "fries": lambda: fries(),
    "curly-fries": lambda: fries(curly=True),
    "sweet-potato-fries": lambda: fries(grad="sweetFry", carton="kraft"),
    "onion-rings": rings,
    "mozzarella-sticks": lambda: sticks(),
    "side-salad": salad_bowl,
    "coleslaw": slaw,
    "corn-on-the-cob": corn,
    "loaded-fries": lambda: fries(loaded=True),
    "garlic-bread": bread_slices,
    "mac-bites": lambda: sticks(pull=False, grad="cheese"),

    "cola": lambda: cup(),
    "diet-cola": lambda: cup(liquid="cola", straw="#7FB0D0"),
    "lemonade": lambda: cup(liquid="lemon"),
    "orange-juice": lambda: glass(garnish="#EE9B3C"),
    "bottled-water": lambda: bottle(),
    "sparkling-water": lambda: bottle(sparkle=True),
    "milkshake": lambda: shake("shakeChoc"),
    "iced-coffee": lambda: cup(liquid="tea", straw="#8A5A38"),
    "coffee": lambda: hot_cup(),
    "tea": lambda: hot_cup(liquid="tea"),
    "hot-chocolate": lambda: hot_cup(liquid="choc", cream_top=True),
    "apple-juice": lambda: glass(liquid="lemon", garnish="#7FA34A"),
    "iced-tea": lambda: glass(liquid="tea", garnish="#E3D584", ice=True),

    "ice-cream-sundae": lambda: sundae(),
    "apple-pie": pie,
    "chocolate-brownie": brownie,
    "cookies": cookies,
    "glazed-donut": donut,
    "churros": churros,
    "cheesecake": cheesecake,

    "cheeseburger-meal": lambda: combo(burger_parts()),
    "bbq-stack-meal": lambda: combo(burger_parts()),
    "chicken-burger-meal": lambda: combo(burger_parts(protein="chicken", cheese_on=False)),
    "nugget-meal": lambda: combo(nugget_parts()),
    "veggie-meal": lambda: combo(burger_parts(veg_patty=True, cheese_on=False)),
    "wrap-meal": lambda: combo(wrap_parts()),
    "family-bundle": family_box,

    "breakfast-muffin": lambda: muffin_stack(),
    "breakfast-wrap": lambda: wrap_page(fill="#EDA82F", cat="breakfast"),
    "veggie-breakfast-muffin": lambda: muffin_stack(veg=True),
    "hash-browns": hash_browns,
    "pancakes": pancakes,
    "porridge": porridge,

    "kids-nugget-meal": lambda: kids_box(),
    "kids-burger-meal": lambda: kids_box(burger_kid=True),
    "kids-veggie-meal": lambda: kids_box(veg=True),
}


def wrap_page(fill="#D89B3C", spicy=False, veg=False, cat="wraps"):
    p = ['<g transform="rotate(-18 400 300)">',
         '<rect x="430" y="196" width="118" height="228" rx="59" fill="#D9BE8C"/>',
         '<rect x="430" y="196" width="118" height="228" rx="59" fill="#000000" opacity="0.1"/>',
         '<rect x="266" y="152" width="170" height="272" rx="85" fill="url(#tortilla)"/>']
    for y in (222, 282, 342):
        p.append(f'<path d="M274 {y} q78 22 154 0" stroke="#C9A972" stroke-width="5" fill="none" opacity="0.5"/>')
    p += ['<ellipse cx="351" cy="158" rx="85" ry="30" fill="#D3B587"/>',
          '<ellipse cx="351" cy="156" rx="70" ry="23" fill="#F0E0C0"/>',
          f'<ellipse cx="330" cy="152" rx="34" ry="15" fill="{fill}"/>',
          '<ellipse cx="372" cy="162" rx="28" ry="13" fill="url(#lettuce)"/>',
          '<ellipse cx="352" cy="146" rx="16" ry="8" fill="url(#tomato)"/>']
    if spicy:
        p.append('<ellipse cx="316" cy="160" rx="12" ry="7" fill="#C0392B"/>')
    if veg:
        p.append('<circle cx="318" cy="164" r="9" fill="#6E8B3C"/>')
    p.append('</g>')
    return page(cat, "".join(p))


def main() -> int:
    menu = json.loads(MENU_JSON.read_text())
    OUT.mkdir(parents=True, exist_ok=True)

    missing = []
    for item in menu["items"]:
        draw = DRAW.get(item["slug"])
        if not draw:
            missing.append(item["slug"])
            continue
        (OUT / f"{item['slug']}.svg").write_text(draw())
        item["imageUrl"] = f"/menu/{item['slug']}.svg"

    MENU_JSON.write_text(json.dumps(menu, indent=2, ensure_ascii=False) + "\n")

    drawn = len(menu["items"]) - len(missing)
    total = sum((OUT / f).stat().st_size for f in os.listdir(OUT) if f.endswith(".svg"))
    print(f"{drawn} of {len(menu['items'])} drawn, {total / 1024:.0f} KB in total")
    if missing:
        print("No drawing for:", ", ".join(missing))
        print("Add one to the DRAW map in this file.")
        return 1
    print("\nNow run:  npm run seed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
