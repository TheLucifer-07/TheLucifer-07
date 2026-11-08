# Artwork generation

## Regenerate the profile assets

Requirements: Node.js 20 or newer and npm.

1. Install the locked renderer dependency with npm ci.
2. Run npm run art from the repository root.

The script writes assets/hero-ascii.png, assets/footer-landscape.png, and ten small PNG technology icons under assets/icons/. Output uses a fixed seed, so running it again with the same code produces repeatable artwork.

The hero and footer are hand-composed Canvas2D scenes rendered through the same cell engine used for image conversion. Source SVGs for the technology marks remain beside their PNG exports.

## Convert an image

Run the script with an input image. For example:

    npm run art -- --input /path/to/photo.png --output assets/custom-ascii.png --style braille --cell-size 8

The renderer accepts locally readable PNG, JPEG, WebP, and SVG images supported by the Canvas2D image loader. Missing or invalid files produce an error and a nonzero exit code.

When no output path is provided, conversions are saved as assets/converted-ascii.png. The default fit mode is cover; use --fit contain to preserve the full source image inside the canvas.

## Styles

Available styles: characters, dots, braille, mosaic, pixel, cross, diamond, mixed, lines, diagonal, rings, stars, hexagons, triangles, and halfblocks.

The profile hero uses characters. The footer uses dots. Image conversion defaults to characters. Static PNG is the only export format; this profile does not need animation.

## Controls

All numeric values are validated before rendering.

| Option | Range | Purpose |
| --- | --- | --- |
| width, height | 64–4096 | Output canvas dimensions |
| cell-size | 3–64 | Sampling grid scale |
| density | 0.1–2.5 | Brightness-to-mark mapping |
| coverage | 0.05–1 | Mark size within each cell |
| brightness | -1–1 | Lift or lower sampled brightness |
| contrast | 0–3 | Adjust tonal separation |
| saturation | 0–2 | Adjust color intensity |
| grayscale | flag | Reduce source to monochrome |
| invert | flag | Invert sampled brightness |
| edge-emphasis | 0–1 | Add Sobel edge strength to cells |
| background-opacity | 0–1 | Set the output background alpha |
| blur | 0–20 | Blur the source before sampling |
| tint | six-digit hex | Colorize sampled brightness |
| bloom | 0–1 | Add glow around marks |
| vignette | 0–1 | Darken the image edges |
| chromatic-aberration | 0–20 | Offset red and blue sampling |
| film-grain | 0–1 | Add deterministic cell-level grain |
| scanlines | 0–1 | Add subtle horizontal scanlines |
| glitch | 0–1 | Add deterministic horizontal row offsets |
| lighting | 0–1 | Add a top-left illumination bias |
| fit | cover or contain | Fit behavior for the source image |
| seed | integer | Repeatable grain and glitch pattern |

Boolean options are enabled with --grayscale or --invert and disabled with --no-grayscale or --no-invert. The default seed is 7.
