const fs = require("fs").promises;
const path = require("path");
const { JSDOM } = require("jsdom");

const comboKana = [
  [
    { hira: "きゃ", kata: "キャ", romaji: ["kya"] },
    { hira: "きゅ", kata: "キュ", romaji: ["kyu"] },
    { hira: "きょ", kata: "キョ", romaji: ["kyo"] },
  ],
  [
    { hira: "しゃ", kata: "シャ", romaji: ["sha"] },
    { hira: "しゅ", kata: "シュ", romaji: ["shu"] },
    { hira: "しょ", kata: "ショ", romaji: ["sho"] },
  ],
  [
    { hira: "ちゃ", kata: "チャ", romaji: ["cha"] },
    { hira: "ちゅ", kata: "チュ", romaji: ["chu"] },
    { hira: "ちょ", kata: "チョ", romaji: ["cho"] },
  ],
  [
    { hira: "にゃ", kata: "ニャ", romaji: ["nya"] },
    { hira: "にゅ", kata: "ニュ", romaji: ["nyu"] },
    { hira: "にょ", kata: "ニョ", romaji: ["nyo"] },
  ],
  [
    { hira: "ひゃ", kata: "ヒャ", romaji: ["hya"] },
    { hira: "ひゅ", kata: "ヒュ", romaji: ["hyu"] },
    { hira: "ひょ", kata: "ヒョ", romaji: ["hyo"] },
  ],
  [
    { hira: "みゃ", kata: "ミャ", romaji: ["mya"] },
    { hira: "みゅ", kata: "ミュ", romaji: ["myu"] },
    { hira: "みょ", kata: "ミョ", romaji: ["myo"] },
  ],
  [
    { hira: "りゃ", kata: "リャ", romaji: ["rya"] },
    { hira: "りゅ", kata: "リュ", romaji: ["ryu"] },
    { hira: "りょ", kata: "リョ", romaji: ["ryo"] },
  ],
  [
    { hira: "ぎゃ", kata: "ギャ", romaji: ["gya"] },
    { hira: "ぎゅ", kata: "ギュ", romaji: ["gyu"] },
    { hira: "ぎょ", kata: "ギョ", romaji: ["gyo"] },
  ],
  [
    { hira: "じゃ", kata: "ジャ", romaji: ["ja", "jya"] },
    { hira: "じゅ", kata: "ジュ", romaji: ["ju", "jyu"] },
    { hira: "じょ", kata: "ジョ", romaji: ["jo", "jyo"] },
  ],
  [
    { hira: "びゃ", kata: "ビャ", romaji: ["bya"] },
    { hira: "びゅ", kata: "ビュ", romaji: ["byu"] },
    { hira: "びょ", kata: "ビョ", romaji: ["byo"] },
  ],
  [
    { hira: "ぴゃ", kata: "ピャ", romaji: ["pya"] },
    { hira: "ぴゅ", kata: "ピュ", romaji: ["pyu"] },
    { hira: "ぴょ", kata: "ピョ", romaji: ["pyo"] },
  ],
];

async function getSvg(mode, char) {
  const filePath = path.join(__dirname, "dist", mode, `${char}.svg`);
  try {
    const text = await fs.readFile(filePath, "utf-8");
    const dom = new JSDOM(text, { contentType: "text/xml" });
    return dom.window.document.querySelector("svg");
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err.message);
    return null;
  }
}

async function createComboSvg(mode, kana) {
  const svg = await getSvg(mode, kana[0]);
  if (!svg) return null;

  if (kana.length === 2) {
    svg.setAttribute("viewBox", "0 0 1824 1024");

    const next = await getSvg(mode, kana[1]);
    if (!next) return null;

    const defs = svg.querySelector("defs");
    const nextClipPaths = next.querySelectorAll("clipPath");
    defs.append(...nextClipPaths);

    const nextShadows = next.querySelector('g[data-strokesvg="shadows"]');
    const nextStrokes = next.querySelector('g[data-strokesvg="strokes"]');

    if (nextShadows) nextShadows.setAttribute("transform", "translate(800, 0)");
    if (nextStrokes) {
      nextStrokes.setAttribute("transform", "translate(800, 0)");

      // Get stroke count from first character to offset --i values
      const firstStrokes = svg.querySelector('g[data-strokesvg="strokes"]');
      const firstStrokeCount = firstStrokes
        ? firstStrokes.querySelectorAll('path[style*="--i"]').length
        : 0;

      // Update --i values for second character strokes
      const nextPaths = nextStrokes.querySelectorAll('path[style*="--i"]');
      nextPaths.forEach((path) => {
        const currentStyle = path.getAttribute("style");
        const newStyle = currentStyle.replace(/--i:\s*(\d+)/, (match, i) => {
          return `--i:${parseInt(i) + firstStrokeCount}`;
        });
        path.setAttribute("style", newStyle);
      });
    }

    if (nextShadows) svg.appendChild(nextShadows);
    if (nextStrokes) svg.appendChild(nextStrokes);
  }

  return svg;
}

async function generateComboFiles() {
  // Create output directories
  const hiraDir = path.join(__dirname, "combo", "hiragana");
  const kataDir = path.join(__dirname, "combo", "katakana");

  await fs.mkdir(hiraDir, { recursive: true });
  await fs.mkdir(kataDir, { recursive: true });

  for (const group of comboKana) {
    for (const combo of group) {
      // Generate hiragana combo
      const hiraSvg = await createComboSvg("hiragana", combo.hira);
      if (hiraSvg) {
        const hiraPath = path.join(hiraDir, `${combo.hira}.svg`);
        await fs.writeFile(hiraPath, hiraSvg.outerHTML);
        console.log(`Created: ${hiraPath}`);
      }

      // Generate katakana combo
      const kataSvg = await createComboSvg("katakana", combo.kata);
      if (kataSvg) {
        const kataPath = path.join(kataDir, `${combo.kata}.svg`);
        await fs.writeFile(kataPath, kataSvg.outerHTML);
        console.log(`Created: ${kataPath}`);
      }
    }
  }

  console.log("Done generating combo SVG files!");
}

generateComboFiles().catch(console.error);
