#!/usr/bin/env python3
"""Detect or remove neighboring-cell fragments from sliced animation frames."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path
import sys

from PIL import Image


def connected_components(alpha: Image.Image, threshold: int) -> list[list[tuple[int, int]]]:
    width, height = alpha.size
    pixels = alpha.load()
    seen = bytearray(width * height)
    components: list[list[tuple[int, int]]] = []
    for y in range(height):
        for x in range(width):
            offset = y * width + x
            if seen[offset] or pixels[x, y] <= threshold:
                continue
            seen[offset] = 1
            queue = deque([(x, y)])
            component: list[tuple[int, int]] = []
            while queue:
                px, py = queue.popleft()
                component.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    neighbor = ny * width + nx
                    if seen[neighbor] or pixels[nx, ny] <= threshold:
                        continue
                    seen[neighbor] = 1
                    queue.append((nx, ny))
            components.append(component)
    return components


def bleed_components(
    image: Image.Image,
    *,
    padding: int = 8,
    alpha_threshold: int = 8,
    max_area_ratio: float = 0.05,
    protected_center_ratio: float = 0.5,
) -> list[list[tuple[int, int]]]:
    alpha = image.getchannel('A')
    width, height = image.size
    center_margin_x = round(width * (1 - protected_center_ratio) / 2)
    center_margin_y = round(height * (1 - protected_center_ratio) / 2)
    center = (center_margin_x, center_margin_y, width - center_margin_x - 1, height - center_margin_y - 1)
    max_area = width * height * max_area_ratio
    result = []
    for component in connected_components(alpha, alpha_threshold):
        xs = [point[0] for point in component]
        ys = [point[1] for point in component]
        left, top, right, bottom = min(xs), min(ys), max(xs), max(ys)
        intersects_center = not (right < center[0] or left > center[2] or bottom < center[1] or top > center[3])
        if not intersects_center and len(component) <= max_area:
            result.append(component)
    return result


def clean_image(image: Image.Image, **options: object) -> tuple[Image.Image, int, int]:
    cleaned = image.convert('RGBA')
    components = bleed_components(cleaned, **options)
    pixels = cleaned.load()
    removed = 0
    for component in components:
        for x, y in component:
            pixels[x, y] = (0, 0, 0, 0)
            removed += 1
    return cleaned, len(components), removed


def frame_paths(roots: list[Path]) -> list[Path]:
    return sorted(path for root in roots for path in root.rglob('frame-*.webp'))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('roots', nargs='+', type=Path)
    parser.add_argument('--write', action='store_true', help='replace affected WebP files atomically')
    parser.add_argument('--padding', type=int, default=8)
    parser.add_argument('--alpha-threshold', type=int, default=8)
    parser.add_argument('--max-area-ratio', type=float, default=0.05)
    parser.add_argument('--quality', type=int, default=90)
    args = parser.parse_args()

    affected = components_removed = pixels_removed = 0
    for path in frame_paths(args.roots):
        with Image.open(path) as source:
            cleaned, component_count, pixel_count = clean_image(
                source.convert('RGBA'),
                padding=args.padding,
                alpha_threshold=args.alpha_threshold,
                max_area_ratio=args.max_area_ratio,
            )
        if not component_count:
            continue
        affected += 1
        components_removed += component_count
        pixels_removed += pixel_count
        print(f'{path}\tcomponents={component_count}\tpixels={pixel_count}')
        if args.write:
            temporary = path.with_suffix('.tmp.webp')
            cleaned.save(temporary, 'WEBP', quality=args.quality, method=6)
            temporary.replace(path)

    mode = 'write' if args.write else 'check'
    print(f'frame_bleed_{mode}=affected:{affected} components:{components_removed} pixels:{pixels_removed}')
    if affected and not args.write:
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
