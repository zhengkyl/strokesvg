export function strokeAnimator(
  svgEl,
  { time = 500, gap = 300, delay = 300, progressCallback = () => {} } = {}
) {
  const strokes = [];

  svgEl
    .querySelectorAll('svg[data-strokesvg] > g[data-strokesvg="strokes"] > *')
    .forEach((e) => {
      strokes.push(e);
    });

  const strokeLengthsPrefixSum = [0];

  // This fixes stroke flickering in/out of view when stroke-dashoffset == stroke length
  const epsilon = 0.1;

  strokes.forEach((stroke, i) => {
    let length;

    // All strokes in a group should be the same length, but precision is lost during optimization
    // For large errors, strokes will not offset fully, so here we minimize max error for any stroke
    if (stroke instanceof SVGGElement) {
      let sum = 0;
      for (const child of stroke.children) {
        sum += child.getTotalLength();
      }
      length = sum / stroke.children.length;
    } else {
      length = stroke.getTotalLength();
    }

    strokeLengthsPrefixSum.push(strokeLengthsPrefixSum[i] + length);

    stroke.style.strokeDasharray = `${length}`;
  });

  const totalStrokeLength = strokeLengthsPrefixSum[strokes.length];

  let strokeIndex = strokes.length;
  let requestFrameId = null;
  let timeoutId = null;

  function skipOne() {
    const stroke = strokes[strokeIndex];
    stroke.style.strokeDashoffset = 0;
    strokeIndex++;

    progressCallback(strokeLengthsPrefixSum[strokeIndex] / totalStrokeLength);
  }

  function prev() {
    stop();

    if (strokeIndex === strokes.length) {
      strokeIndex--;
    } else if (
      parseFloat(strokes[strokeIndex].style.strokeDasharray) -
        parseFloat(strokes[strokeIndex].style.strokeDashoffset) <
      2 * epsilon
    ) {
      if (strokeIndex === 0) return;
      strokeIndex--;
    }

    const stroke = strokes[strokeIndex];
    stroke.style.strokeDashoffset =
      parseFloat(stroke.style.strokeDasharray) - epsilon;

    progressCallback(strokeLengthsPrefixSum[strokeIndex] / totalStrokeLength);
  }

  function next() {
    stop();
    if (strokeIndex < strokes.length) {
      skipOne();
    }
  }

  function stop() {
    if (timeoutId != null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    } else if (requestFrameId != null) {
      cancelAnimationFrame(requestFrameId);
      requestFrameId = null;
    }
  }

  function toggle() {
    if (timeoutId != null || requestFrameId != null) {
      stop();
    } else {
      play();
    }
  }

  function play() {
    if (timeoutId != null || requestFrameId != null) {
      // state = playing
      //
      // uncomment to let play() immediately finish current stroke, good for one tap controls
      // stop();
      // skipOne();
      // if (strokeIndex < strokes.length) {
      //   startNextStroke(delay);
      // }
      return;
    }

    if (strokeIndex === strokes.length) {
      // state = not started
      clearStrokes();
      startNextStroke(delay);
    } else {
      // state = stopped
      startNextStroke(0);
    }
  }

  function clearStrokes() {
    strokes.forEach((stroke) => {
      stroke.style.strokeDashoffset =
        parseFloat(stroke.style.strokeDasharray) - epsilon;
    });
    strokeIndex = 0;

    // equivalent to progressCallback(strokeLengthsPrefixSum[strokeIndex] / totalStrokeLength);
    progressCallback(0);
  }

  let currOffset;
  let currPrevTime;

  function startNextStroke(timeout) {
    const stroke = strokes[strokeIndex];

    currOffset = parseFloat(stroke.style.strokeDashoffset);

    timeoutId = setTimeout(() => {
      timeoutId = null;
      currPrevTime = null;
      requestFrameId = requestAnimationFrame(pathFrame);
    }, timeout);
  }

  const scale = svgEl.viewBox.baseVal.width;
  const speed = scale / time;

  function pathFrame(time) {
    // a performance.now() called before requestAnimationFrame may give a LATER time
    // which causes a negative time step and may be one cause of stroke flickering
    // I don't really understand it except browser implementation of scheduling
    // therefore, we must use a single source of time and skip the first frame
    if (!currPrevTime) {
      currPrevTime = time;
      requestFrameId = requestAnimationFrame(pathFrame);
      return;
    }

    const stroke = strokes[strokeIndex];

    currOffset = Math.max(currOffset - speed * (time - currPrevTime), 0);
    currPrevTime = time;

    stroke.style.strokeDashoffset = currOffset;

    progressCallback(
      (strokeLengthsPrefixSum[strokeIndex + 1] - currOffset) / totalStrokeLength
    );

    if (currOffset === 0) {
      requestFrameId = null;
      strokeIndex++;
      if (strokeIndex < strokes.length) startNextStroke(gap);
    } else {
      requestFrameId = requestAnimationFrame(pathFrame);
    }
  }

  function setProgress(t) {
    stop();

    const strokeProgress = t * totalStrokeLength;

    if (strokeIndex === strokes.length) strokeIndex--;

    let lowerBound = strokeLengthsPrefixSum[strokeIndex];
    while (lowerBound > strokeProgress) {
      const stroke = strokes[strokeIndex];

      stroke.style.strokeDashoffset =
        parseFloat(stroke.style.strokeDasharray) - epsilon;

      strokeIndex--;
      lowerBound = strokeLengthsPrefixSum[strokeIndex];
    }

    let upperBound = strokeLengthsPrefixSum[strokeIndex + 1];
    while (upperBound <= strokeProgress) {
      const stroke = strokes[strokeIndex];
      stroke.style.strokeDashoffset = 0;

      strokeIndex++;
      if (strokeIndex === strokes.length) return;
      upperBound = strokeLengthsPrefixSum[strokeIndex + 1];
    }

    const stroke = strokes[strokeIndex];
    stroke.style.strokeDashoffset = upperBound - strokeProgress;
  }

  return {
    play,
    stop,
    toggle,
    next,
    prev,
    setProgress,
  };
}

export function svgLoader(svg) {
  let controller;
  async function load(url) {
    // Don't bother checking if same URL b/c a proper return promise is annoying
    if (controller != null) controller.abort();

    controller = new AbortController();
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) {
      throw "SVG does not exist yet. :/";
    }
    controller = null;

    const text = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    const newSvg = doc.querySelector("svg");

    for (const { name, value } of newSvg.attributes) {
      // Just blindly apply b/c we know no clashes or leftover attributes
      // If used outside this project, make sure only the original attributes + these are applied
      svg.setAttribute(name, value);
    }

    svg.replaceChildren(...newSvg.childNodes);
  }

  return {
    load,
  };
}

// first romaji matches unicode name
export const kanaChart = [
  [
    { hiragana: "あ", katakana: "ア", romaji: ["a"] },
    { hiragana: "い", katakana: "イ", romaji: ["i"] },
    { hiragana: "う", katakana: "ウ", romaji: ["u"] },
    { hiragana: "え", katakana: "エ", romaji: ["e"] },
    { hiragana: "お", katakana: "オ", romaji: ["o"] },
  ],
  [
    { hiragana: "か", katakana: "カ", romaji: ["ka"] },
    { hiragana: "き", katakana: "キ", romaji: ["ki"] },
    { hiragana: "く", katakana: "ク", romaji: ["ku"] },
    { hiragana: "け", katakana: "ケ", romaji: ["ke"] },
    { hiragana: "こ", katakana: "コ", romaji: ["ko"] },
  ],
  [
    { hiragana: "が", katakana: "ガ", romaji: ["ga"] },
    { hiragana: "ぎ", katakana: "ギ", romaji: ["gi"] },
    { hiragana: "ぐ", katakana: "グ", romaji: ["gu"] },
    { hiragana: "げ", katakana: "ゲ", romaji: ["ge"] },
    { hiragana: "ご", katakana: "ゴ", romaji: ["go"] },
  ],
  [
    { hiragana: "さ", katakana: "サ", romaji: ["sa"] },
    { hiragana: "し", katakana: "シ", romaji: ["si", "shi"] },
    { hiragana: "す", katakana: "ス", romaji: ["su"] },
    { hiragana: "せ", katakana: "セ", romaji: ["se"] },
    { hiragana: "そ", katakana: "ソ", romaji: ["so"] },
  ],
  [
    { hiragana: "ざ", katakana: "ザ", romaji: ["za"] },
    { hiragana: "じ", katakana: "ジ", romaji: ["zi", "ji"] },
    { hiragana: "ず", katakana: "ズ", romaji: ["zu"] },
    { hiragana: "ぜ", katakana: "ゼ", romaji: ["ze"] },
    { hiragana: "ぞ", katakana: "ゾ", romaji: ["zo"] },
  ],
  [
    { hiragana: "た", katakana: "タ", romaji: ["ta"] },
    { hiragana: "ち", katakana: "チ", romaji: ["ti", "chi"] },
    { hiragana: "つ", katakana: "ツ", romaji: ["tu", "tsu"] },
    { hiragana: "て", katakana: "テ", romaji: ["te"] },
    { hiragana: "と", katakana: "ト", romaji: ["to"] },
  ],
  [
    { hiragana: "だ", katakana: "ダ", romaji: ["da"] },
    { hiragana: "ぢ", katakana: "ヂ", romaji: ["di", "ji", "zi"] },
    { hiragana: "づ", katakana: "ヅ", romaji: ["du", "zu"] },
    { hiragana: "で", katakana: "デ", romaji: ["de"] },
    { hiragana: "ど", katakana: "ド", romaji: ["do"] },
  ],
  [
    { hiragana: "な", katakana: "ナ", romaji: ["na"] },
    { hiragana: "に", katakana: "ニ", romaji: ["ni"] },
    { hiragana: "ぬ", katakana: "ヌ", romaji: ["nu"] },
    { hiragana: "ね", katakana: "ネ", romaji: ["ne"] },
    { hiragana: "の", katakana: "ノ", romaji: ["no"] },
  ],
  [
    { hiragana: "は", katakana: "ハ", romaji: ["ha"] },
    { hiragana: "ひ", katakana: "ヒ", romaji: ["hi"] },
    { hiragana: "ふ", katakana: "フ", romaji: ["hu", "fu"] },
    { hiragana: "へ", katakana: "ヘ", romaji: ["he"] },
    { hiragana: "ほ", katakana: "ホ", romaji: ["ho"] },
  ],
  [
    { hiragana: "ば", katakana: "バ", romaji: ["ba"] },
    { hiragana: "び", katakana: "ビ", romaji: ["bi"] },
    { hiragana: "ぶ", katakana: "ブ", romaji: ["bu"] },
    { hiragana: "べ", katakana: "ベ", romaji: ["be"] },
    { hiragana: "ぼ", katakana: "ボ", romaji: ["bo"] },
  ],
  [
    { hiragana: "ぱ", katakana: "パ", romaji: ["pa"] },
    { hiragana: "ぴ", katakana: "ピ", romaji: ["pi"] },
    { hiragana: "ぷ", katakana: "プ", romaji: ["pu"] },
    { hiragana: "ぺ", katakana: "ペ", romaji: ["pe"] },
    { hiragana: "ぽ", katakana: "ポ", romaji: ["po"] },
  ],
  [
    { hiragana: "ま", katakana: "マ", romaji: ["ma"] },
    { hiragana: "み", katakana: "ミ", romaji: ["mi"] },
    { hiragana: "む", katakana: "ム", romaji: ["mu"] },
    { hiragana: "め", katakana: "メ", romaji: ["me"] },
    { hiragana: "も", katakana: "モ", romaji: ["mo"] },
  ],
  [
    { hiragana: "や", katakana: "ヤ", romaji: ["ya"] },
    null,
    { hiragana: "ゆ", katakana: "ユ", romaji: ["yu"] },
    null,
    { hiragana: "よ", katakana: "ヨ", romaji: ["yo"] },
  ],
  [
    { hiragana: "ら", katakana: "ラ", romaji: ["ra"] },
    { hiragana: "り", katakana: "リ", romaji: ["ri"] },
    { hiragana: "る", katakana: "ル", romaji: ["ru"] },
    { hiragana: "れ", katakana: "レ", romaji: ["re"] },
    { hiragana: "ろ", katakana: "ロ", romaji: ["ro"] },
  ],
  [
    { hiragana: "わ", katakana: "ワ", romaji: ["wa"] },
    null,
    null,
    null,
    { hiragana: "を", katakana: "ヲ", romaji: ["wo", "o"] },
  ],
  [
    { hiragana: "ん", katakana: "ン", romaji: ["n"] },
    { hiragana: null, katakana: "ヴ", romaji: ["vu"] },
    { hiragana: null, katakana: "ー", romaji: ["prolonged sound mark", "-"] },
    null,
    null,
  ],
  [
    { hiragana: "ぁ", katakana: "ァ", romaji: ["small a", "a"] },
    { hiragana: "ぃ", katakana: "ィ", romaji: ["small i", "i"] },
    { hiragana: "ぅ", katakana: "ゥ", romaji: ["small u", "u"] },
    { hiragana: "ぇ", katakana: "ェ", romaji: ["small e", "e"] },
    { hiragana: "ぉ", katakana: "ォ", romaji: ["small o", "o"] },
  ],
  [
    { hiragana: "ゃ", katakana: "ャ", romaji: ["small ya", "ya"] },
    null,
    { hiragana: "ゅ", katakana: "ュ", romaji: ["small yu", "yu"] },
    null,
    { hiragana: "ょ", katakana: "ョ", romaji: ["small yo", "yo"] },
  ],
];
