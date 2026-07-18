#!/usr/bin/env python3
"""Slice an alpha spritesheet at detected transparent gutters."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def projection(alpha: Image.Image, axis: str, threshold: int = 8) -> list[int]:
    width, height = alpha.size
    pixels = alpha.load()
    if axis == 'x':
        return [sum(pixels[x, y] > threshold for y in range(height)) for x in range(width)]
    return [sum(pixels[x, y] > threshold for x in range(width)) for y in range(height)]


def detect_cuts(values: list[int], cells: int, search_ratio: float = 0.35, band: int = 2) -> list[int]:
    length = len(values)
    pitch = length / cells
    cuts = [0]
    for index in range(1, cells):
        expected = round(index * pitch)
        radius = max(2, round(pitch * search_ratio))
        lower = max(cuts[-1] + 1, expected - radius)
        upper = min(length - 1, expected + radius)
        best = min(
            range(lower, upper + 1),
            key=lambda point: (sum(values[max(0, point - band):min(length, point + band + 1)]), abs(point - expected)),
        )
        cuts.append(best)
    cuts.append(length)
    return cuts


def slice_grid(image: Image.Image, columns: int, rows: int, inset: int, padding: int) -> list[Image.Image]:
    source = image.convert('RGBA')
    alpha = source.getchannel('A')
    x_cuts = detect_cuts(projection(alpha, 'x'), columns)
    y_cuts = detect_cuts(projection(alpha, 'y'), rows)
    frames = []
    for row in range(rows):
        for column in range(columns):
            left, right = x_cuts[column], x_cuts[column + 1]
            top, bottom = y_cuts[row], y_cuts[row + 1]
            crop = source.crop((left + inset, top + inset, right - inset, bottom - inset))
            frame = Image.new('RGBA', (crop.width + padding * 2, crop.height + padding * 2))
            frame.alpha_composite(crop, (padding, padding))
            frames.append(frame)
    return frames


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--columns', type=int, default=4)
    parser.add_argument('--rows', type=int, default=8)
    parser.add_argument('--inset', type=int, default=5)
    parser.add_argument('--padding', type=int, default=8)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    with Image.open(args.input) as image:
        frames = slice_grid(image, args.columns, args.rows, args.inset, args.padding)
    for index, frame in enumerate(frames):
        frame.save(args.output / f'frame-{index}.png')


if __name__ == '__main__':
    main()
