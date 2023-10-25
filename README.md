# strokesvg

WIP SVGs with animatable strokes for Japanese hiragana/katakana based on [Klee One](https://fonts.google.com/specimen/Klee+One).

## TODO

- [x] configure svgo
  - [x] write plugin
- [ ] hiragana
- [ ] katakana
- [x] automate somehow?
  - [x] semi automated with inkscape extension
- [x] website
  - [x] search
  - [x] use same font
  - [ ] usable offline -> replace svg loader lib

## Alternatives

There are great open source projects in this area, but they didn't fit my needs. I highly recommend these.

- [KanjiVG](https://github.com/KanjiVG/kanjivg)
- [AnimCJK](https://github.com/parsimonhi/animCJK)

## Files

### /dist

This folder contains optimized svg files with animatable strokes for the given character.

### /src

This is where the raw unoptimized svg files are stored and directly edited using Inkscape/whatever.

These files should NOT be used as is.

## Usage

The shadows and strokes have a default color which you can override using CSS variables.

```css
/* default colors */
svg[data-strokesvg] {
  --shadow: #ccc;
  --stroke: #000;
}
```

For more specific customization, you can just change the `fill`, `stroke`, and anything else directly.

```css
svg[data-strokesvg] > g[data-strokesvg="shadows"] > :nth-child(2) {
  fill: blue;
}

svg[data-strokesvg] > g[data-strokesvg="strokes"] > :nth-child(2) {
  stroke: red;
}
```

Here is some CSS to have the stroke animation automatically start on page load. This is loosely based on the CSS from [AnimCJK](https://github.com/parsimonhi/animCJK). However, by itself, this only runs on page load.

```css
svg[data-strokesvg] > g[data-strokesvg="strokes"] > * {
  --time: 0.7s; /* time to draw a "max length stroke" */
  --gap: 0.7s; /* time between stroke starts */
  --delay: 0.5s; /* time before first stroke */
  animation: s var(--time) linear forwards calc(
      var(--i) * var(--gap) + var(--delay)
    );
  stroke-dasharray: 3333;
  stroke-dashoffset: 3333;
}

@keyframes s {
  to {
    stroke-dashoffset: 0;
  }
}
```

You can add javascript to restart the CSS animation programmatically, but you can also just control the `stroke-dasharray` and `stroke-dashoffset` properties without using the CSS animation.

See `strokeAnimator` in [`index.js`](./index.js) for an overengineered example. Feel free to use it.

## Format

The first `<g>` element contains `<path>` elements representing shadows for each stroke/stroke section. These are visible while the strokes are animated. These are also used as clip masks for the strokes.

The second `<g>` element contains `<path>` elements representing each stroke. These can be animated using the `stroke-dasharray` and `stroke-dashoffset` css properties. The stroke order is represented by the element order and duplicated via the `--i` css variable (useful for the CSS snippet).

Some strokes self intersect, like in loops, so they are created from multiple stroke "shadows" and corresponding strokes so that the clipping works correctly. In these cases, parts of the same stroke are grouped together.

## Generating Optimized SVGs

```sh
pnpm run build
```

### SVG Creation Workflow

Steps 1, 2, and 4 can be automated using the Inkscape extension at `src/org.strokesvg.helper`.

#### Step 1: Text to shapes

- Create an SVG document with the desired size (1024 x 1024 px).
- Make a text element with the desired font-family (Klee One) and font-size (1024px). Ensure the character is placed correctly on the page. In Inkscape, this is done by creating a flow text element with the top left corner snapped to the page's top left corner.
- Convert the text element to an object (path) and then separate the shape into stroke shapes.

#### Step 2: Colorize shapes

- Place strokes in stroke order, then give each stroke shape a distinct color (for clarity).

#### Step 3: Manually draw stroke paths

- Use default stroke settings, except width is 128px.
- Draw straight lines that cover each stroke shape.
- If a stroke unavoidably self-intersects, do the following.
  - Duplicate the drawn stroke. Adjust the path of the second so that it doesn't self intersect, but remains the same length.
  - Duplicate the stroke shape too.

#### Step 4: Clip to shapes

- For each stroke, clone the shape and use it as a clip path for the drawn stroke.
- Make sure the strokes are above the shapes at the end.

### Misc Mysteries

- `performance.now()` can return an earlier timestamp than a `requestAnimationFrame` called after it.
- `stroke-dasharray` and `stroke-dashoffset` act weird
  - setting `stroke-dashoffset` equal to `stroke-dasharray` triggers some superposition edge case where the stroke should? be invisible but is visible? or maybe the reverse. I address this by adding an small epsilon.
  - in SOME situations if a stroke with `stroke-linecap: round` is offset, it won't start rendering at all until it suddenly pops into view, no matter what offset I choose. I address this by adding a 128px buffer to the start of every stroke (in the svg) instead of using `stroke-dashoffset`.
    - I know this happens if I place the strokes so that they are contained within `stroke-linecap: butt`, so maybe it's a rendering optimization? that culls invisible nodes, except that makes no sense either
