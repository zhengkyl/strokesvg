"""
Stupid sexy extension
"""
from tempfile import TemporaryDirectory
from lxml import etree
import inkex
from inkex import Rectangle, FlowRoot, FlowPara, FlowRegion, command, SVG_PARSER

class TextToShapesEffectExtension(inkex.EffectExtension):
    def add_arguments(self, pars):
        pars.add_argument("--text", type=str,\
            help="text to convert to shapes")

    def effect(self):
        parentnode = self.svg.get_current_layer()

        text_root = parentnode.add(FlowRoot())
        text_root.style = {
            "font-size": "1024px",
            "font-style": "normal",
            "font-weight": "normal",
            "line-height": "1",
            "fill": "#000000",
            "fill-opacity": 1,
            "stroke": "none",
            "font-family": "Noto Sans JP"
        }

        region = text_root.add(FlowRegion())
        rect = region.add(Rectangle())
        rect.set("height", 1337)
        rect.set("width", 1337)

        newspan = text_root.add(FlowPara())
        newspan.text = self.options.text

        cmds = [
            "select-by-element:flowRoot",
            "object-to-path",
            "path-break-apart",
            "vacuum-defs", # remove rect defs for flow text
            "export-do"
        ]

        with TemporaryDirectory(prefix="inkscape-command") as tmpdir:
            svg_file = command.write_svg(self.document, tmpdir, "input.svg")
            out = command.inkscape(svg_file, actions=";".join(cmds))
            with open(svg_file, 'r') as updated:
                doc = etree.parse(updated, parser=SVG_PARSER)

                self.document = doc

if __name__ == '__main__':
    TextToShapesEffectExtension().run()
