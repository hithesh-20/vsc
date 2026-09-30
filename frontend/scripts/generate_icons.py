"""
VendorSaathi PWA icon generator — pure Python (numpy + zlib), no Pillow needed.

Draws the brand mark (orange gradient + white mic + amber AI dot) with signed
distance fields, anti-aliased, and encodes PNGs directly.

Run from repo root:  python frontend/scripts/generate_icons.py
Outputs into:        frontend/public/icons/
"""
import os
import struct
import zlib

import numpy as np

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")

# ---------------------------------------------------------------- PNG encode --
def write_png(path: str, rgba: np.ndarray) -> None:
    h, w, _ = rgba.shape
    raw = b"".join(b"\x00" + rgba[y].tobytes() for y in range(h))  # filter 0 per row
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print(f"  wrote {os.path.basename(path)}  ({w}x{h})")


def smoothstep(edge0: float, edge1: float, x) -> np.ndarray:
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------- drawing --
def seg_dist(px, py, ax, ay, bx, by):
    """Distance from point (px,py) to segment (a)->(b). Vectorized."""
    abx, aby = bx - ax, by - ay
    t = ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)
    t = np.clip(t, 0.0, 1.0)
    dx, dy = px - (ax + t * abx), py - (ay + t * aby)
    return np.sqrt(dx * dx + dy * dy)


def render(size: int, glyph_scale: float) -> np.ndarray:
    """RGBA array of the icon. glyph_scale 1.0 = full-bleed mic; smaller = padding."""
    # y-up coordinates in [-1, 1]
    ys, xs = np.mgrid[0:size, 0:size]
    x = (xs + 0.5) / size * 2 - 1
    y = 1 - (ys + 0.5) / size * 2

    # --- background: orange gradient (top light, bottom deep) + soft glow ---
    t = smoothstep(-1.0, 1.0, y)
    bg_r = 0xFB + (0xC2 - 0xFB) * t
    bg_g = 0x92 + (0x4A - 0x92) * t
    bg_b = 0x3C + (0x0C - 0x3C) * t
    cx, cy = x * 0.62, (y - 0.55) * 0.62          # radial highlight near top
    glow = np.exp(-(cx * cx + cy * cy) * 2.2) * 0.10
    img = np.stack([bg_r + glow * 255, bg_g + glow * 255, bg_b + glow * 255,
                    np.full_like(x, 255.0)], axis=-1)

    px, py = x * glyph_scale, y * glyph_scale

    # --- mic glyph (white), anti-aliased masks ---
    aa = 1.6 * glyph_scale * 2 / size
    capsule = seg_dist(px, py, 0.0, 0.60, 0.0, 0.20) - 0.205   # bulb
    ring = np.abs(np.sqrt(px * px + (py - 0.20) ** 2) - 0.385) - 0.048
    arc = np.where(py <= 0.20, ring, np.inf)                    # cradle arc
    stem = seg_dist(px, py, 0.0, -0.185, 0.0, -0.30) - 0.052
    base = seg_dist(px, py, -0.30, -0.325, 0.30, -0.325) - 0.052
    glyph = np.minimum(np.minimum(capsule, arc), np.minimum(stem, base))
    gmask = smoothstep(-aa, aa, glyph)                          # 0 inside glyph
    white = np.array([255.0, 255.0, 255.0, 255.0])
    img = img * gmask[..., None] + white * (1 - gmask[..., None])

    # --- amber "AI" badge dot, top-right ---
    dot = np.sqrt((px - 0.52) ** 2 + (py - 0.52) ** 2) - 0.17
    dmask = smoothstep(-aa, aa, dot)
    amber = np.array([0xFB, 0xBF, 0x24, 255.0])
    ring_d = np.abs(np.sqrt((px - 0.52) ** 2 + (py - 0.52) ** 2) - 0.19) - 0.025
    rmask = smoothstep(-aa, aa, ring_d) * (1 - dmask)           # white ring around dot
    img = img * (dmask * (1 - rmask))[..., None] + amber * dmask[..., None] + white * rmask[..., None]

    return np.clip(img, 0, 255).astype(np.uint8)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    jobs = [
        ("pwa-192.png", 192, 0.66),
        ("pwa-512.png", 512, 0.66),
        ("pwa-maskable-192.png", 192, 0.46),   # safe zone: glyph well inside
        ("pwa-maskable-512.png", 512, 0.46),
        ("apple-touch-icon.png", 180, 0.62),
        ("favicon-32.png", 32, 0.70),
    ]
    print("Generating VendorSaathi PWA icons…")
    for name, size, scale in jobs:
        write_png(os.path.join(OUT_DIR, name), render(size, scale))
    print("Done ->", os.path.abspath(OUT_DIR))


if __name__ == "__main__":
    main()
