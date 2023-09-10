const path = require("node:path");
const { querySelectorAll, querySelector } = require("svgo/lib/xast.js");

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
            selector: "svg",
            attributes: "xmlns:xlink",
          },
          {
            selector: "clipPath",
            attributes: "clipPathUnits",
          },
          {
            selector: "use",
            attributes: ["width", "height"],
          },
          {
            selector: "g > path",
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
      fn: (root) => {
        const nodes = querySelectorAll(root, "[xlink\\:href]");
        for (const node of nodes) {
          if (node.attributes["xlink:href"]) {
            node.attributes["href"] = node.attributes["xlink:href"];
            delete node.attributes["xlink:href"];
          }
        }

        const shadowG = querySelector(root, "g:first-of-type");
        shadowG.attributes.style = "fill:#ccc";

        const strokeG = querySelector(root, "g:last-of-type");
        strokeG.attributes.style = "fill:none;stroke:#000;stroke-width:128";

        let i = 0;
        for (let j = 0; j < strokeG.children.length; j++) {
          // If prefix/suffix overlap, then its a part of the same stroke
          if (
            j > 0 &&
            strokeG.children[j].attributes.d.slice(0, 16) !==
              strokeG.children[j - 1].attributes.d.slice(0, 16) &&
            strokeG.children[j].attributes.d.slice(-16) !==
              strokeG.children[j - 1].attributes.d.slice(-16)
          ) {
            i++;
          }

          // Create a new object so style is first attribute and easy to see
          strokeG.children[j].attributes = Object.assign(
            {
              style: `--i:${i}`,
            },
            strokeG.children[j].attributes
          );
        }

        return {};
      },
    },
  ],
};
