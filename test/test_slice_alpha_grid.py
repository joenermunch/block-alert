import importlib.util
from pathlib import Path
import unittest

from PIL import Image, ImageDraw


SPEC = importlib.util.spec_from_file_location('slice_alpha_grid', Path(__file__).parents[1] / 'scripts' / 'slice_alpha_grid.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class SliceAlphaGridTest(unittest.TestCase):
    def test_detects_shifted_gutter_instead_of_cutting_subject(self):
        image = Image.new('RGBA', (100, 100))
        draw = ImageDraw.Draw(image)
        draw.rectangle((15, 10, 85, 57), fill='white')
        draw.rectangle((15, 65, 85, 95), fill='white')

        cuts = MODULE.detect_cuts(MODULE.projection(image.getchannel('A'), 'y'), 2)
        frames = MODULE.slice_grid(image, 1, 2, 0, 0)

        self.assertGreaterEqual(cuts[1], 58)
        self.assertLessEqual(cuts[1], 64)
        self.assertEqual(frames[0].getbbox(), (15, 10, 86, 58))
        self.assertEqual(frames[1].getbbox()[1], 5)

    def test_supports_true_seven_row_source_sheet(self):
        image = Image.new('RGBA', (80, 140))
        draw = ImageDraw.Draw(image)
        for row in range(7):
            draw.rectangle((10, row * 20 + 3, 70, row * 20 + 16), fill='white')

        frames = MODULE.slice_grid(image, 1, 7, 1, 2)

        self.assertEqual(len(frames), 7)
        self.assertTrue(all(frame.getbbox() for frame in frames))


if __name__ == '__main__':
    unittest.main()
