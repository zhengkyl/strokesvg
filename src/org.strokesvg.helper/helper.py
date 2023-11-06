"""
Stupid sexy extension
"""
import math
from tempfile import TemporaryDirectory
from lxml import etree
import inkex
from inkex import Color, Rectangle, FlowRoot, FlowPara, FlowRegion, command, SVG_PARSER


class HelperEffectExtension(inkex.EffectExtension):
    def add_arguments(self, pars):
        pars.add_argument("--page", type=str, help="page representing svg creation step")
        pars.add_argument("--text", type=str, help="text to convert to shapes")
        pars.add_argument("--fontSize", type=str, help="text font size")
        pars.add_argument("--fontWeight", type=int, help="text font weight")
        pars.add_argument("--fontFamily", type=str, help="text font family")
        pars.add_argument("--baseColor", type=str, help="base for all other colors")

    def effect(self):
        match self.options.page:
            case "one":
                self.textToShapes()
            case "two":            
                self.colorizeShapes()
            case "three":            
                self.clipToShapes()

    def textToShapes(self):
        if not self.options.text or not self.options.fontSize or not self.options.fontFamily:
            inkex.errormsg("Option not set.")
            return

        parentnode = self.svg.get_current_layer()

        text_root = parentnode.add(FlowRoot())
        text_root.style = {
            "font-size": "{}px".format(self.options.fontSize),
            "font-style": "normal",
            "font-weight": self.options.fontWeight,
            "line-height": 1,
            "fill": "#000000",
            "fill-opacity": 1,
            "stroke": "none",
            "font-family": self.options.fontFamily,
        }

        region = text_root.add(FlowRegion())
        rect = region.add(Rectangle())
        rect.set("height", self.options.fontSize)
        rect.set("width", self.options.fontSize)

        newspan = text_root.add(FlowPara())
        newspan.text = self.options.text

        cmds = [
            "select-by-element:flowRoot",
            "object-to-path",
            "path-break-apart",
            "vacuum-defs",  # remove rect defs for flow text
            "export-do",
        ]

        with TemporaryDirectory(prefix="inkscape-command") as tmpdir:
            svg_file = command.write_svg(self.document, tmpdir, "input.svg")
            out = command.inkscape(svg_file, actions=";".join(cmds))
            with open(svg_file, "r") as updated:
                doc = etree.parse(updated, parser=SVG_PARSER)

                self.document = doc

    def colorizeShapes(self):
        # :root > svg > g path
        paths = self.document.xpath('/svg:svg/svg:g//svg:path', namespaces=inkex.NSS)
        if not len(paths):
            inkex.errormsg("Can't find paths to colorize. Are they in a group?")
            return

        numColors = len(paths)
        hueDiff = 32 // math.ceil(numColors / 8)

        _, rgb = Color.parse_str(self.options.baseColor)
        baseColor = Color(color=rgb)

        nextHue = baseColor.hue
        for path in paths:
            if nextHue >= 256:
                nextHue -= 256
            baseColor.hue = nextHue

            path.style["fill"] = str(baseColor)
            nextHue = baseColor.hue + hueDiff
    
    def clipToShapes(self):
        # :root > svg > g[i] path
        shapes = self.document.xpath('/svg:svg/svg:g[1]//svg:path', namespaces=inkex.NSS)
        strokes = self.document.xpath('/svg:svg/svg:g[2]//svg:path', namespaces=inkex.NSS)

        if not len(strokes):
            inkex.errormsg("No strokes found. Are they in a group?")
            return
        
        if len(shapes) != len(strokes):
            inkex.errormsg("Different number of strokes and shapes.")
            return

        # a closed path indicates a shape, not a stroke
        if strokes[0].get("d")[-1] in ["z", "Z"]:
            strokes, shapes = shapes, strokes

            # ensure strokes are on top of shapes
            # can't use get parent b/c might be nested
            shapesParent = self.document.xpath(
                "/svg:svg/svg:g[2]", namespaces=inkex.NSS
            )[0]
            strokesParent = self.document.xpath(
                "/svg:svg/svg:g[1]", namespaces=inkex.NSS
            )[0]
            strokesParent.delete()
            shapesParent.addnext(strokesParent)
         
        defs = self.document.xpath('//svg:defs', namespaces=inkex.NSS)[0]

        for i in range((len(shapes))):
            clipUse = etree.Element('use', {
                "id":self.svg.get_unique_id("clone"),
                inkex.addNS("href","xlink"):shapes[i].get_id(1),
            })
            clipPath = etree.Element("clipPath", {
                "id":self.svg.get_unique_id("clipPath"),
            })
            clipPath.append(clipUse)
            defs.append(clipPath)
            
            strokes[i].set("clip-path", "url(#{})".format(clipPath.attrib["id"]))

if __name__ == "__main__":
    HelperEffectExtension().run()
