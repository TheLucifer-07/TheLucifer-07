# README Design Notes

## Visual direction

The supplied monochrome reference establishes the visual language: a framed identity treatment, moonlit developer scene, distant skyline, desk objects, editorial panels, landscape divider, and compact connection footer. The README rebuilds those cues as original line art and readable text. It uses white space, dots, dashes, and geometric borders to suggest silver/gray tonal range without depending on a background color.

## Typography and hero composition

The hero pairs a moonlit developer silhouette with a custom 3x5 ASCII title treatment for `THE LUCIFER 07`, full name, and role. A generated FIGlet title, a built-in Python 5x5 title, and a framed CLI logo were compared. The paired 60-column version was chosen because it keeps the character scene and identity visible together on a narrow GitHub page. The portrait uses a headphone band and earcup framing, expressive face, and shoulders; the accompanying skyline, laptop, coffee cup, and cat extend the scene below it.

The title and artwork remain plain ASCII. There are no ANSI color sequences, custom fonts, CSS, or JavaScript. Alternative title treatments were inspected locally and omitted from the published assets; the README keeps only the selected title treatment.

## ASCII generation methods

Image conversion experiments used two independent converters on crops of the supplied reference. Their 52-column results lost the portrait silhouette or became visually noisy, so they were not used as final art. The final hero and supporting scenes are original hand-composed ASCII, refined after visual inspection. The technology table, section-frame templates, and banner alternatives also went through their respective installed skill utilities. `assets/ascii/` keeps the source scenes and data layouts editable; the README embeds the selected artwork directly for GitHub reliability.

## Section layout

The README follows the reference's order: hero, `whoami`, philosophy, technology, current focus, desk and status, landscape, then connections. Compact panels use `+ - |` borders. The technology list is a two-column text table. Sections below the hero are stacked vertically, avoiding a wide desktop-only grid. The portfolio, GitHub, LinkedIn, and email are functional Markdown links.

## GitHub compatibility

The profile uses standard Markdown headings, blockquotes, links, and fenced `<pre>`-style text blocks. It has no local image dependency, external badge/icon service, HTML layout, animation, CSS, JavaScript, or terminal escape sequence. All final code blocks are limited to 60 characters per line so they fit the most constrained requested viewport.

## Review passes

1. **Composition:** Compared the reference's portrait/title balance with the generated title candidates. Kept the portrait and identity in a paired 60-column masthead and moved the remaining sections into a vertical sequence.
2. **Artwork:** Inspected rendered previews of the hand-composed hero, skyline/workspace, desk, and landscape. Rejected converter noise and dense logo candidates; refined the portrait frame and the hero divider alignment.
3. **Engineering:** Checked the Markdown structure, code fences, line widths, ASCII-only content, links, section completeness, and GitHub-safe content. The repeatable checks and their results are in `README_VALIDATION_REPORT.md`.
