#!/usr/bin/env python3
"""Validate a chroma-key sprite sheet before any slicing or asset replacement."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

from PIL import Image


KEY = (0, 255, 0)


def is_key(pixel: tuple[int, ...], tolerance: int = 24) -> bool:
    return sum((pixel[index] - KEY[index]) ** 2 for index in range(3)) <= tolerance ** 2


def validate(image: Image.Image, columns: int = 4, rows: int = 8) -> list[str]:
    has_alpha = 'A' in image.getbands()
    source = image.convert('RGBA' if has_alpha else 'RGB')
    width, height = source.size
    pixels = source.load()
    def foreground(x: int, y: int) -> bool:
        pixel = pixels[x, y]
        return pixel[3] > 8 if has_alpha else not is_key(pixel)
    failures = []
    if width < columns * 64 or height < rows * 64:
        failures.append(f'sheet too small: {width}x{height}')
        return failures

    gutter_radius = max(2, round(min(width / columns, height / rows) * 0.012))
    for boundary in range(1, columns):
        x = round(boundary * width / columns)
        sample = [(sx, y) for sx in range(max(0, x - gutter_radius), min(width, x + gutter_radius + 1)) for y in range(height)]
        clear_ratio = sum(not foreground(sx, y) for sx, y in sample) / len(sample)
        if clear_ratio < 0.97:
            failures.append(f'vertical gutter {boundary} clear_ratio={clear_ratio:.3f}')
    for boundary in range(1, rows):
        y = round(boundary * height / rows)
        sample = [(x, sy) for sy in range(max(0, y - gutter_radius), min(height, y + gutter_radius + 1)) for x in range(width)]
        clear_ratio = sum(not foreground(x, sy) for x, sy in sample) / len(sample)
        if clear_ratio < 0.97:
            failures.append(f'horizontal gutter {boundary} clear_ratio={clear_ratio:.3f}')

    for row in range(rows):
        top = round(row * height / rows)
        bottom = round((row + 1) * height / rows)
        for column in range(columns):
            left = round(column * width / columns)
            right = round((column + 1) * width / columns)
            foreground_pixels = [(x, y) for y in range(top, bottom) for x in range(left, right) if foreground(x, y)]
            index = row * columns + column
            area = (right - left) * (bottom - top)
            occupancy = len(foreground_pixels) / area
            if occupancy < 0.04:
                failures.append(f'cell {index} empty occupancy={occupancy:.3f}')
                continue
            if occupancy > 0.65:
                failures.append(f'cell {index} overcrowded occupancy={occupancy:.3f}')
            xs = [point[0] for point in foreground_pixels]
            ys = [point[1] for point in foreground_pixels]
            margin_x = max(3, round((right - left) * 0.025))
            margin_y = max(3, round((bottom - top) * 0.025))
            if min(xs) < left + margin_x or max(xs) >= right - margin_x or min(ys) < top + margin_y or max(ys) >= bottom - margin_y:
                failures.append(f'cell {index} foreground touches safety margin')
    return failures


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('sheet', type=Path)
    parser.add_argument('--columns', type=int, default=4)
    parser.add_argument('--rows', type=int, default=8)
    args = parser.parse_args()
    with Image.open(args.sheet) as image:
        failures = validate(image, args.columns, args.rows)
    for failure in failures:
        print(f'FAIL {failure}', file=sys.stderr)
    if failures:
        print(f'generated_sheet_check=fail failures={len(failures)}', file=sys.stderr)
        return 1
    print(f'generated_sheet_check=pass cells={args.columns * args.rows}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
