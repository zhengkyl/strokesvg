export function strokeAnimator(
  svgEl,
  { time = 3000, gap = 400, delay = 300, progressCallback = () => {} } = {}
) {
  const strokes = [];

  svgEl
    .querySelectorAll("[data-strokesvg] > g:last-of-type > *")
    .forEach((e) => {
      strokes.push(e);
    });

  const strokeLengthsPrefixSum = [0];

  strokes.forEach((stroke, i) => {
    const length =
      stroke instanceof SVGGElement
        ? stroke.children[0].getTotalLength()
        : stroke.getTotalLength();

    strokeLengthsPrefixSum.push(strokeLengthsPrefixSum[i] + length);

    stroke.style.strokeDasharray = length.toString();
  });

  const totalStrokeLength = strokeLengthsPrefixSum[strokes.length];

  let strokeIndex = strokes.length;
  let requestFrameId = null;
  let timeoutId = null;

  function skipOne() {
    const stroke = strokes[strokeIndex];
    stroke.style.strokeDashoffset = "0";
    strokeIndex++;

    progressCallback(strokeLengthsPrefixSum[strokeIndex] / totalStrokeLength);
  }

  function prev() {
    stop();

    if (strokeIndex === strokes.length) {
      strokeIndex--;
    } else if (
      strokes[strokeIndex].style.strokeDashoffset ===
      strokes[strokeIndex].style.strokeDasharray
    ) {
      if (strokeIndex === 0) return;
      strokeIndex--;
    }

    const stroke = strokes[strokeIndex];
    stroke.style.strokeDashoffset = stroke.style.strokeDasharray;

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
      stroke.style.strokeDashoffset = stroke.style.strokeDasharray;
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
      currPrevTime = performance.now();
      requestFrameId = requestAnimationFrame(pathFrame);
    }, timeout);
  }

  const scale = svgEl.viewBox.baseVal.width;
  const speed = scale / time;

  function pathFrame(time) {
    const stroke = strokes[strokeIndex];

    currOffset = Math.max(currOffset - speed * (time - currPrevTime), 0);
    currPrevTime = time;

    stroke.style.strokeDashoffset = currOffset.toString();

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
      stroke.style.strokeDashoffset = stroke.style.strokeDasharray;

      strokeIndex--;
      lowerBound = strokeLengthsPrefixSum[strokeIndex];
    }

    let upperBound = strokeLengthsPrefixSum[strokeIndex + 1];
    while (upperBound <= strokeProgress) {
      const stroke = strokes[strokeIndex];
      stroke.style.strokeDashoffset = (0).toString();

      strokeIndex++;
      if (strokeIndex === strokes.length) return;
      upperBound = strokeLengthsPrefixSum[strokeIndex + 1];
    }

    const stroke = strokes[strokeIndex];
    stroke.style.strokeDashoffset = (upperBound - strokeProgress).toString();
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
