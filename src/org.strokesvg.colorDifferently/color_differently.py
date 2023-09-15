"""
Stupid sexy extension
"""
import math
import inkex
from inkex import Color

class ColorDifferentlyEffectExtension(inkex.EffectExtension):
    def add_arguments(self, pars):
        pars.add_argument("--baseColor", type=str,\
            help="base for all other colors")

    def effect(self):
        numColors = len(self.svg.selection)
        hueDiff = 32 // math.ceil(numColors / 8)

        _, rgb = Color.parse_str(self.options.baseColor)
        baseColor = Color(color=rgb)

        nextHue = baseColor.hue
        for elem in self.svg.selection:
            if nextHue >= 256:
                nextHue -= 256
            baseColor.hue = nextHue

            elem.style['fill'] = str(baseColor)
            nextHue = baseColor.hue + hueDiff

if __name__ == '__main__':
    ColorDifferentlyEffectExtension().run()
