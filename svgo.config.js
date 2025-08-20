const path = require("node:path");
const { querySelectorAll, querySelector } = require("svgo");

module.exports = {
  js2svg: {
    indent: 2,
    pretty: true,
  },
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          collapseGroups: false,
          convertPathData: {
            floatPrecision: 0,
          },
        },
      },
    },
    "removeDimensions", // height/width -> viewbox
    {
      name: "removeAttributesBySelector",
      params: {
        selectors: [
          {
            selector: "clipPath",
            attributes: "clipPathUnits",
          },
          {
            selector: "use",
            attributes: ["width", "height"],
          },
          {
            selector: "g",
            attributes: "style",
          },
          {
            selector: "path",
            attributes: "style",
          },
        ],
      },
    },
    {
      name: "prefixIds",
      params: {
        delim: "",
        prefixClassNames: false,
        prefix: (_, info) =>
          path.basename(info.path, ".svg").codePointAt(0).toString(16),
      },
    },
    {
      name: "pluginname",
      fn: (root, params, info) => {
        const svg = querySelector(root, "svg");
        // Overwrite attributes to enforce desired order
        svg.attributes = {
          "data-strokesvg": path.basename(info.path, ".svg"),
          viewBox: svg.attributes.viewBox,
          xmlns: "http://www.w3.org/2000/svg",
        };

        const nodes = querySelectorAll(root, "[xlink\\:href]");
        for (const node of nodes) {
          if (node.attributes["xlink:href"]) {
            node.attributes["href"] = node.attributes["xlink:href"];
            delete node.attributes["xlink:href"];
          }
        }

        const shadowG = querySelector(root, "svg > g:first-of-type");
        shadowG.attributes["data-strokesvg"] = "shadows";
        shadowG.attributes.style = "fill:var(--shadow,#ccc)";

        const strokeG = querySelector(root, "svg > g:last-of-type");
        strokeG.attributes["data-strokesvg"] = "strokes";
        strokeG.attributes.style =
          "stroke:var(--stroke,#000);fill:none;stroke-width:128;stroke-linecap:round";

        for (let i = 0; i < strokeG.children.length; i++) {
          // Create a new object so style is first attribute and easy to see
          strokeG.children[i].attributes = Object.assign(
            {
              style: `--i:${i}`,
            },
            strokeG.children[i].attributes
          );
        }

        return {};
      },
    },
  ],
};
