#!/usr/bin/env python3
"""Original SVG ornaments for the candidate stylesheets (drawn here, no game
assets), and an assembler that inlines them as data URIs.

  assemble(["v2-base.css", "v2-crystal.css"]) -> CSS text

A token svg(name) in the CSS becomes url("data:image/svg+xml,...")."""
import re
from pathlib import Path

GOLD = "#e2c27c"
GOLD_DIM = "#8f733c"
NS = "xmlns='http://www.w3.org/2000/svg'"


def flip(svg_body: str, size: tuple, sx: int, sy: int) -> str:
    w, h = size
    tx = -w if sx < 0 else 0
    ty = -h if sy < 0 else 0
    return f"<g transform='scale({sx} {sy}) translate({tx} {ty})'>{svg_body}</g>"


def crystal_defs(prefix="c"):
    return (f"<linearGradient id='{prefix}l' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#c8f3ff'/>"
            f"<stop offset='1' stop-color='#2b7ee0'/></linearGradient>"
            f"<linearGradient id='{prefix}r' x1='1' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#f2feff'/>"
            f"<stop offset='1' stop-color='#4fa9f4'/></linearGradient>")


def crystal_shape(cx=22.0, top=1.0, scale=1.0, prefix="c"):
    """An elongated faceted crystal centred on cx (about 14 x 38 units at scale 1)."""
    s = scale
    p = lambda x, y: f"{cx + x * s:.2f} {top + y * s:.2f}"
    return (f"<path d='M{p(0,0)} L{p(7,11)} L{p(4.5,30)} L{p(0,38)} L{p(-4.5,30)} L{p(-7,11)} Z' fill='#0f3a7a'/>"
            f"<path d='M{p(0,3)} L{p(-5.4,11.6)} L{p(-3.2,29.4)} L{p(0,35)} Z' fill='url(#{prefix}l)'/>"
            f"<path d='M{p(0,3)} L{p(5.4,11.6)} L{p(3.2,29.4)} L{p(0,35)} Z' fill='url(#{prefix}r)'/>"
            f"<path d='M{p(0,3)} L{p(-5.4,11.6)} L{p(0,14)} L{p(5.4,11.6)} Z' fill='#f4feff' fill-opacity='.85'/>"
            f"<path d='M{p(0,14)} L{p(0,35)}' stroke='#ffffff' stroke-opacity='.45' stroke-width='{0.6 * s:.2f}'/>"
            f"<path d='M{p(-3.4,15)} L{p(-2.1,27)}' stroke='#ffffff' stroke-opacity='.8' stroke-width='{0.9 * s:.2f}' "
            f"stroke-linecap='round'/>")


def svg_crystal_mount():
    """A crystal on a short gold bar with bead ends (window ornament)."""
    bar = (f"<linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#f6e2a6'/>"
           f"<stop offset='1' stop-color='#a07a3a'/></linearGradient>")
    return (f"<svg {NS} viewBox='0 0 44 40'><defs>{crystal_defs()}{bar}</defs>"
            f"<path d='M3 21 L8 18.6 H36 L41 21 L36 23.4 H8 Z' fill='url(#g)' stroke='#5a4320' stroke-width='.6'/>"
            f"<circle cx='2' cy='21' r='1.6' fill='{GOLD}'/><circle cx='42' cy='21' r='1.6' fill='{GOLD}'/>"
            f"{crystal_shape()}</svg>")


def svg_crystal_crown():
    """Top-centre crown: gold scrolls either side of a crystal (120 x 30)."""
    left = (f"<path d='M50 12 C44 12 41 6 34 7.5 C28.5 8.7 27.5 15 21 15 C15 15 12 10 4 11.5' fill='none' "
            f"stroke='{GOLD}' stroke-width='1.5' stroke-linecap='round'/>"
            f"<path d='M48 16 C42 16.5 38 20 31 19' fill='none' stroke='{GOLD_DIM}' stroke-width='1.1' stroke-linecap='round'/>"
            f"<circle cx='34' cy='7.5' r='1.3' fill='{GOLD}'/><circle cx='21' cy='15' r='1.3' fill='{GOLD}'/>"
            f"<path d='M4 11.5 l-3 -2 l3 -2 l3 2 z' fill='{GOLD}'/>")
    right = flip(left, (120, 30), -1, 1)
    return (f"<svg {NS} viewBox='0 0 120 30'><defs>{crystal_defs()}</defs>{left}{right}"
            f"{crystal_shape(cx=60, top=-1, scale=0.8)}</svg>")


def svg_corner(kind="a"):
    """Window corner filigree (top left; flipped for the others)."""
    if kind == "a":
        # Stays within the frame band (about 7 px from the edges), so content never covers it.
        body = (f"<path d='M2.5 26 V9 Q2.5 2.5 9 2.5 H26' fill='none' stroke='{GOLD}' stroke-width='1.6'/>"
                f"<path d='M6.6 2.6 L10.6 6.6 L6.6 10.6 L2.6 6.6 Z' fill='{GOLD}' stroke='#3a2b14' stroke-width='.6'/>"
                f"<path d='M6.6 4.6 L8.6 6.6 L6.6 8.6 L4.6 6.6 Z' fill='#fff1c8' fill-opacity='.55'/>"
                f"<path d='M27 .6 L28.9 2.5 L27 4.4 L25.1 2.5 Z' fill='{GOLD}'/><path d='M.6 27 L2.5 25.1 L4.4 27 L2.5 28.9 Z' fill='{GOLD}'/>")
        size = (30, 30)
    else:  # ornate scrolls
        body = (f"<path d='M2 34 V10 Q2 2 10 2 H34' fill='none' stroke='{GOLD}' stroke-width='1.8'/>"
                f"<path d='M6.5 30 V13 Q6.5 6.5 13 6.5 H30' fill='none' stroke='{GOLD_DIM}' stroke-width='1'/>"
                f"<path d='M10 22 C10 15 15 10 22 10' fill='none' stroke='{GOLD}' stroke-width='1.2'/>"
                f"<path d='M14 14 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0' fill='none' stroke='{GOLD}' stroke-width='1.1'/>"
                f"<path d='M14 11.6 L16.4 14 L14 16.4 L11.6 14 Z' fill='{GOLD}'/>"
                f"<circle cx='34.5' cy='2' r='1.6' fill='{GOLD}'/><circle cx='2' cy='34.5' r='1.6' fill='{GOLD}'/>"
                f"<circle cx='22' cy='10' r='1.2' fill='{GOLD}'/><circle cx='10' cy='22' r='1.2' fill='{GOLD}'/>")
        size = (38, 38)
    w, h = size
    return {
        "tl": f"<svg {NS} viewBox='0 0 {w} {h}'>{body}</svg>",
        "tr": f"<svg {NS} viewBox='0 0 {w} {h}'>{flip(body, size, -1, 1)}</svg>",
        "bl": f"<svg {NS} viewBox='0 0 {w} {h}'>{flip(body, size, 1, -1)}</svg>",
        "br": f"<svg {NS} viewBox='0 0 {w} {h}'>{flip(body, size, -1, -1)}</svg>",
    }


def svg_panel_corner():
    body = (f"<path d='M1 11 V1 H11' fill='none' stroke='{GOLD}' stroke-width='1.4'/>"
            f"<path d='M4 4 h2.2 v2.2 h-2.2 z' fill='{GOLD}' transform='rotate(45 5.1 5.1)'/>")
    size = (12, 12)
    return {k: f"<svg {NS} viewBox='0 0 12 12'>{flip(body, size, sx, sy)}</svg>"
            for k, sx, sy in [("tl", 1, 1), ("tr", -1, 1), ("bl", 1, -1), ("br", -1, -1)]}


def gem(cx, cy, r, stroke=GOLD):
    p = lambda x, y: f"{cx + x * r:.2f} {cy + y * r:.2f}"
    return (f"<path d='M{p(0,-1)} L{p(1,0)} L{p(0,1)} L{p(-1,0)} Z' fill='#16488f' stroke='{stroke}' stroke-width='.9'/>"
            f"<path d='M{p(0,-.74)} L{p(.74,0)} L{p(0,0)} Z' fill='#d4f6ff'/>"
            f"<path d='M{p(0,-.74)} L{p(-.74,0)} L{p(0,0)} Z' fill='#7cc8ff'/>"
            f"<path d='M{p(-.74,0)} L{p(0,.74)} L{p(0,0)} Z' fill='#2c7ddf'/>"
            f"<path d='M{p(.74,0)} L{p(0,.74)} L{p(0,0)} Z' fill='#4ea2f1'/>")


def svg_plate():
    """Dictionary name plate for border-image: 22 left (point + gem), 10 right."""
    grad = ("<linearGradient id='p' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#614a25'/>"
            "<stop offset='.5' stop-color='#3d2d15'/><stop offset='1' stop-color='#2a1f0e'/></linearGradient>")
    return (f"<svg {NS} viewBox='0 0 60 24'><defs>{grad}</defs>"
            f"<path d='M.8 12 L6.4 1 H53.6 L59.2 12 L53.6 23 H6.4 Z' fill='url(#p)' stroke='{GOLD}' stroke-width='1'/>"
            f"<path d='M3.7 12 L7.7 3.7 H52.3 L56.3 12 L52.3 20.3 H7.7 Z' fill='none' stroke='#f3dc9c' stroke-opacity='.3' stroke-width='.6'/>"
            f"{gem(13.5, 12, 6)}</svg>")


def svg_plate_navy():
    """Navy ribbon with a gold edge and a crystal gem (tome direction)."""
    grad = ("<linearGradient id='p' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#2a426d'/>"
            "<stop offset='1' stop-color='#14223d'/></linearGradient>")
    return (f"<svg {NS} viewBox='0 0 60 24'><defs>{grad}{crystal_defs('k')}</defs>"
            f"<path d='M.8 12 L7 1 H53 L59.2 12 L53 23 H7 Z' fill='url(#p)' stroke='{GOLD}' stroke-width='1.1'/>"
            f"{crystal_shape(cx=13, top=1.5, scale=0.55, prefix='k')}</svg>")


def svg_gem():
    return f"<svg {NS} viewBox='0 0 14 14'>{gem(7, 7, 6.2)}</svg>"


def svg_book():
    return (f"<svg {NS} viewBox='0 0 16 16'><path d='M1 3.4 C3.4 2.4 5.9 2.7 7.4 3.9 V13.6 C5.9 12.5 3.4 12.3 1 13.1 Z "
            f"M15 3.4 C12.6 2.4 10.1 2.7 8.6 3.9 V13.6 C10.1 12.5 12.6 12.3 15 13.1 Z'/></svg>")


def svg_star():
    return (f"<svg {NS} viewBox='0 0 16 16'><path d='M8 .8 L10.1 5.6 L15.2 6 L11.3 9.4 L12.5 14.5 L8 11.8 L3.5 14.5 "
            f"L4.7 9.4 L.8 6 L5.9 5.6 Z'/></svg>")


def svg_rule():
    """Centre ornament for section rules: a filled diamond between two outlines."""
    return (f"<svg {NS} viewBox='0 0 48 12'>"
            f"<path d='M0 6 H15 M33 6 H48' stroke='{GOLD}' stroke-width='1'/>"
            f"<path d='M15.5 6 L18 3.5 L20.5 6 L18 8.5 Z M27.5 6 L30 3.5 L32.5 6 L30 8.5 Z' fill='none' stroke='{GOLD}' stroke-width='.9'/>"
            f"<path d='M24 1.2 L28.8 6 L24 10.8 L19.2 6 Z' fill='{GOLD}'/>"
            f"<path d='M24 3.4 L26.6 6 L24 8.6 L21.4 6 Z' fill='#5a4320'/></svg>")


def svg_castle():
    """A distant castle on a hill (original silhouette), drawn in white for low-alpha use."""
    towers = ("M0 120 L0 104 C30 98 52 100 70 94 L70 70 L74 64 L78 70 L78 92 L88 92 L88 58 L93 44 L98 58 L98 90 "
              "L108 90 L108 36 L112 26 L114 10 L116 26 L120 36 L120 88 L130 88 L130 52 L135 40 L140 52 L140 90 "
              "L150 90 L150 66 L154 58 L158 66 L158 94 C176 98 196 96 220 102 L220 120 Z")
    windows = "M112 46 h4 v8 h-4 z M91 66 h4 v6 h-4 z M133 62 h4 v6 h-4 z"
    return (f"<svg {NS} viewBox='0 0 220 120'><path d='{towers}' fill='#ffffff'/>"
            f"<path d='{windows}' fill='#000000' fill-opacity='.5'/></svg>")


def svg_banner():
    """A hanging crimson banner on a gold rod with an original emblem (22 x 118)."""
    cloth = ("<linearGradient id='b' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#5c1518'/>"
             "<stop offset='.45' stop-color='#8e2a2c'/><stop offset='1' stop-color='#4a1013'/></linearGradient>")
    emblem = (f"<circle cx='11' cy='50' r='6.4' fill='none' stroke='{GOLD}' stroke-width='1.2'/>"
              f"<path d='M11 41 L12.3 48.7 L20 50 L12.3 51.3 L11 59 L9.7 51.3 L2 50 L9.7 48.7 Z' fill='{GOLD}'/>"
              f"<circle cx='11' cy='50' r='1.6' fill='#5c1518'/>")
    return (f"<svg {NS} viewBox='0 0 22 118'><defs>{cloth}</defs>"
            f"<path d='M2 5 H20 V104 L11 116 L2 104 Z' fill='url(#b)'/>"
            f"<path d='M4 7 V102.6 L11 112 L18 102.6 V7' fill='none' stroke='{GOLD}' stroke-width='.8'/>"
            f"<path d='M0 3 H22 V6 H0 Z' fill='{GOLD}'/><circle cx='1' cy='4.5' r='1.6' fill='{GOLD}'/>"
            f"<circle cx='21' cy='4.5' r='1.6' fill='{GOLD}'/>{emblem}"
            f"<path d='M6 70 H16 M6 74 H16' stroke='{GOLD}' stroke-width='.7'/></svg>")


def svg_astrolabe():
    """Engraved astrolabe ring and eight-point star, for faint parchment decoration."""
    rays = " ".join(f"M60 60 L{60 + 52 * c:.1f} {60 + 52 * s:.1f}" for c, s in
                    [(1, 0), (-1, 0), (0, 1), (0, -1), (.707, .707), (-.707, .707), (.707, -.707), (-.707, -.707)])
    star = "M60 10 L66 54 L110 60 L66 66 L60 110 L54 66 L10 60 L54 54 Z"
    return (f"<svg {NS} viewBox='0 0 120 120' fill='none' stroke='#5a3d1c'>"
            f"<circle cx='60' cy='60' r='56' stroke-width='1.2'/><circle cx='60' cy='60' r='48' stroke-width='.7'/>"
            f"<circle cx='60' cy='60' r='30' stroke-width='.7'/><path d='{rays}' stroke-width='.4'/>"
            f"<path d='{star}' stroke-width='.9'/><circle cx='60' cy='60' r='4' stroke-width='.9'/>"
            f"<ellipse cx='60' cy='60' rx='56' ry='20' stroke-width='.6' transform='rotate(-25 60 60)'/></svg>")


def svg_noise(alpha=0.07):
    return (f"<svg {NS} width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' "
            f"numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 {alpha} 0'/>"
            f"</filter><rect width='160' height='160' filter='url(#n)'/></svg>")


def svg_castle_faint(alpha=0.07):
    return svg_castle().replace("fill='#ffffff'", f"fill='#ffffff' fill-opacity='{alpha}'").replace(
        "fill='#000000' fill-opacity='.5'", f"fill='#000000' fill-opacity='{alpha}'")


def svg_book_gold():
    return svg_book().replace("<path ", f"<path fill='{GOLD}' ")


def svg_astrolabe_faint(alpha=0.13):
    return svg_astrolabe().replace("stroke='#5a3d1c'>", f"stroke='#5a3d1c' stroke-opacity='{alpha}'>")


def svg_frame():
    """The whole window ornament in one image: four corners and the crystal.
    No viewBox, so it is drawn at the background's size; nested viewports at
    100% place the right and bottom corners without stretching them."""
    corner = svg_corner("a")["tl"].split(">", 1)[1].rsplit("</svg>", 1)[0]
    mount = svg_crystal_mount()
    defs = mount.split("<defs>", 1)[1].split("</defs>", 1)[0]
    crystal = mount.split("</defs>", 1)[1].rsplit("</svg>", 1)[0]
    nested = lambda attrs, body: f"<svg {attrs} overflow='visible'>{body}</svg>"
    return (f"<svg {NS}><defs>{defs}<g id='k'>{corner}</g></defs><use href='#k'/>"
            + nested("x='100%'", "<use href='#k' transform='scale(-1 1)'/>")
            + nested("y='100%'", "<use href='#k' transform='scale(1 -1)'/>")
            + nested("x='100%' y='100%'", "<use href='#k' transform='scale(-1 -1)'/>")
            + nested("x='100%'", f"<g transform='translate(-49 1)'>{crystal}</g>") + "</svg>")


def library():
    lib = {"frame": svg_frame(),"castle-faint": svg_castle_faint(), "book-gold": svg_book_gold(), "astrolabe-faint": svg_astrolabe_faint(),"crystal-mount": svg_crystal_mount(), "crystal-crown": svg_crystal_crown(), "plate": svg_plate(),
           "plate-navy": svg_plate_navy(), "gem": svg_gem(), "book": svg_book(), "star": svg_star(), "rule": svg_rule(),
           "castle": svg_castle(), "banner": svg_banner(), "astrolabe": svg_astrolabe(), "noise": svg_noise()}
    for kind in ["a", "b"]:
        for corner, svg in svg_corner(kind).items():
            lib[f"corner-{kind}-{corner}"] = svg
    for corner, svg in svg_panel_corner().items():
        lib[f"pc-{corner}"] = svg
    return lib


def data_uri(svg: str) -> str:
    svg = re.sub(r"\s+", " ", svg).strip()
    # Only % and # need escaping in a quoted data URL; < and > stay legible.
    encoded = svg.replace("%", "%25").replace("#", "%23").replace('"', "'")
    return f'url("data:image/svg+xml,{encoded}")'


def assemble(paths) -> str:
    lib = library()
    css = "\n".join(Path(path).read_text() for path in paths)
    missing = sorted(set(re.findall(r"svg\(([a-z0-9-]+)\)", css)) - set(lib))
    if missing:
        raise SystemExit(f"unknown ornaments: {missing}")
    return re.sub(r"svg\(([a-z0-9-]+)\)", lambda match: data_uri(lib[match.group(1)]), css)


if __name__ == "__main__":
    import sys
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for name, svg in library().items():
        (out / f"{name}.svg").write_text(svg)
    print(f"wrote {len(library())} ornaments to {out}")
