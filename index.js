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

  const epsilon = 0.1;

  strokes.forEach((stroke, i) => {
    const length =
      stroke instanceof SVGGElement
        ? stroke.children[0].getTotalLength()
        : stroke.getTotalLength();

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

    console.log(time - currPrevTime);
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
