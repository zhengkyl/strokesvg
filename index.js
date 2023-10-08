export function strokeAnimator(
  svgEl,
  options = { time: 3000, gap: 400, delay: 300 }
) {
  const strokes = [];

  svgEl
    .querySelectorAll("[data-strokesvg] > g:last-of-type > *")
    .forEach((e) => {
      strokes.push(e);
    });

  strokes.forEach((stroke) => {
    const length =
      stroke instanceof SVGGElement
        ? stroke.children[0].getTotalLength()
        : stroke.getTotalLength();

    stroke.style.strokeDasharray = length.toString();
  });

  let strokeIndex = strokes.length;
  let requestFrameId = null;
  let timeoutId = null;

  function skipOne() {
    const stroke = strokes[strokeIndex];
    stroke.style.strokeDashoffset = "0";
    strokeIndex++;
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
      //   startNextStroke(options.delay);
      // }
      return;
    }

    if (strokeIndex === strokes.length) {
      // state = not started
      clearStrokes();
      startNextStroke(options.delay);
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
  }

  let currOffset;
  let currPrevTime;

  function startNextStroke(timeout) {
    const stroke = strokes[strokeIndex];

    currOffset = parseInt(stroke.style.strokeDashoffset);

    timeoutId = setTimeout(() => {
      timeoutId = null;
      currPrevTime = performance.now();
      requestFrameId = requestAnimationFrame(pathFrame);
    }, timeout);
  }

  const scale = svgEl.viewBox.baseVal.width;
  const speed = scale / options.time;

  function pathFrame(time) {
    const stroke = strokes[strokeIndex];

    currOffset = Math.max(currOffset - speed * (time - currPrevTime), 0);
    currPrevTime = time;

    stroke.style.strokeDashoffset = currOffset.toString();

    if (currOffset === 0) {
      requestFrameId = null;
      strokeIndex++;
      if (strokeIndex < strokes.length) startNextStroke(options.gap);
    } else {
      requestFrameId = requestAnimationFrame(pathFrame);
    }
  }

  return {
    play,
    stop,
    toggle,
    next,
    prev,
  };
}
