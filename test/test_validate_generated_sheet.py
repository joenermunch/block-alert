import importlib.util
from pathlib import Path
import unittest

from PIL import Image, ImageDraw


SPEC = importlib.util.spec_from_file_location('validate_generated_sheet', Path(__file__).parents[1] / 'scripts' / 'validate_generated_sheet.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def fixture(gutter_color=(0, 255, 0)):
    image = Image.new('RGB', (400, 800), (0, 255, 0))
    draw = ImageDraw.Draw(image)
    for row in range(8):
        for column in range(4):
            left, top = column * 100, row * 100
            draw.ellipse((left + 25, top + 20, left + 75, top + 80), fill=(240, 240, 255))
    if gutter_color != (0, 255, 0):
        draw.rectangle((198, 0, 202, 799), fill=gutter_color)
    return image


class ValidateGeneratedSheetTest(unittest.TestCase):
    def test_accepts_isolated_four_by_eight_grid(self):
        self.assertEqual(MODULE.validate(fixture()), [])

    def test_rejects_non_chroma_gutter(self):
        failures = MODULE.validate(fixture((255, 255, 255)))
        self.assertTrue(any('vertical gutter 2' in failure for failure in failures))

    def test_rejects_boundary_crossing_subject(self):
        image = fixture()
        ImageDraw.Draw(image).rectangle((0, 10, 30, 50), fill='white')
        failures = MODULE.validate(image)
        self.assertTrue(any('cell 0 foreground touches safety margin' in failure for failure in failures))


if __name__ == '__main__':
    unittest.main()
