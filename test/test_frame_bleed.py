import importlib.util
from pathlib import Path
import unittest

from PIL import Image, ImageDraw


SPEC = importlib.util.spec_from_file_location('clean_frame_bleed', Path(__file__).parents[1] / 'scripts' / 'clean_frame_bleed.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class FrameBleedTest(unittest.TestCase):
    def test_removes_only_small_boundary_component(self):
        image = Image.new('RGBA', (100, 100))
        draw = ImageDraw.Draw(image)
        draw.ellipse((25, 20, 75, 80), fill='white')
        draw.rectangle((35, 8, 55, 12), fill='red')

        cleaned, components, pixels = MODULE.clean_image(image, padding=8)

        self.assertEqual(components, 1)
        self.assertGreater(pixels, 0)
        self.assertEqual(cleaned.getpixel((40, 8))[3], 0)
        self.assertEqual(cleaned.getpixel((50, 50))[3], 255)

    def test_preserves_large_component_that_reaches_boundary(self):
        image = Image.new('RGBA', (100, 100))
        ImageDraw.Draw(image).rectangle((8, 20, 80, 80), fill='white')

        cleaned, components, pixels = MODULE.clean_image(image, padding=8)

        self.assertEqual((components, pixels), (0, 0))
        self.assertEqual(cleaned.getpixel((8, 40))[3], 255)

    def test_removes_residual_peripheral_island_inside_boundary(self):
        image = Image.new('RGBA', (100, 100))
        draw = ImageDraw.Draw(image)
        draw.ellipse((25, 25, 75, 80), fill='white')
        draw.rectangle((35, 14, 55, 18), fill='red')

        cleaned, components, _ = MODULE.clean_image(image, padding=8)

        self.assertEqual(components, 1)
        self.assertEqual(cleaned.getpixel((40, 15))[3], 0)


if __name__ == '__main__':
    unittest.main()
