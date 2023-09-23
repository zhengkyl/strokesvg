export function strokeAnimator(
  svgEl,
  options = { time: 300, gap: 400, delay: 300 }
) {
  const strokes = [];

  svgEl
    .querySelectorAll("[data-strokesvg] > g:last-of-type > path")
    .forEach((e) => {
      const index = parseInt(getComputedStyle(e).getPropertyValue("--i"));
      if (index == strokes.length) {
        strokes.push([]);
      }
      strokes[index].push(e);
    });

  strokes.forEach((strokePaths) => {
    strokePaths.forEach((path) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = length.toString();
    });
  });

  let strokeIndex = strokes.length;
  let requestFrameId = null;
  let timeoutId = null;

  function skipOne() {
    const strokePaths = strokes[strokeIndex];
    strokePaths.forEach((path) => {
      path.style.strokeDashoffset = "0";
    });
    strokeIndex++;
  }

  function prev() {
    stop();

    if (strokeIndex === strokes.length) {
      strokeIndex--;
    } else if (
      strokes[strokeIndex][0].style.strokeDashoffset ===
      strokes[strokeIndex][0].style.strokeDasharray
    ) {
      if (strokeIndex === 0) return;
      strokeIndex--;
    }

    const strokePaths = strokes[strokeIndex];

    strokePaths.forEach((path) => {
      path.style.strokeDashoffset = path.style.strokeDasharray;
    });
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
    strokes.forEach((strokePaths) => {
      strokePaths.forEach((path) => {
        path.style.strokeDashoffset = path.style.strokeDasharray;
      });
    });
    strokeIndex = 0;
  }

  let currOffset;
  let currPrevTime;

  function startNextStroke(timeout) {
    const strokePaths = strokes[strokeIndex];

    currOffset = parseInt(strokePaths[0].style.strokeDashoffset);

    timeoutId = setTimeout(() => {
      timeoutId = null;
      currPrevTime = performance.now();
      requestFrameId = requestAnimationFrame(pathFrame);
    }, timeout);
  }

  const scale = svgEl.viewBox.baseVal.width;
  const speed = scale / options.time;

  function pathFrame(time) {
    const strokePaths = strokes[strokeIndex];

    currOffset = Math.max(currOffset - speed * (time - currPrevTime), 0);
    currPrevTime = time;

    strokePaths.forEach((path) => {
      path.style.strokeDashoffset = currOffset.toString();
    });

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
