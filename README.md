# strokesvg

WIP SVGs with animatable strokes for Japanese hiragana/katakana based on Noto Sans Japanese.

## TODO

- [ ] configure svgo
  - [ ] write plugin
- [ ] hiragana
- [ ] katakana
- [ ] automate somehow?
  - [ ] how tf did they do it for thousands of characters
- [ ] website

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

## Format

The first `<g>` element contains `<path>` elements representing shadows for each stroke/stroke section. These are visible while the strokes are animated. These are also used as clip masks for the strokes.

The second `<g>` element contains `<path>` elements representing each stroke. These can be animated using the `stroke-dasharray` and `stroke-dashoffset` css properties.

Some strokes self intersect, like in loops, so they are created from multiple stroke "shadows" and corresponding strokes so that the clipping works correctly. In these cases, parts of the same stroke are grouped under another `<g>` element.

## Generating Optimized SVGs

```sh
pnpm run build
```
