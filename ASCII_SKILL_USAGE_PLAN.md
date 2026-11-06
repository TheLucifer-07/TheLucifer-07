# ASCII Skill Usage Plan and Audit

All 15 installed `SKILL.md` files were read before implementation. Entries below distinguish skill inspection, experiments, and techniques that shaped committed project files. Temporary experiments live outside the repository unless noted. No color or terminal escape sequence is used in the README.

## Skill-by-skill record

### 1. `ascii-ansi-colorizer`
- **Capability/instructions:** Apply alignment-safe ANSI gradients to existing text; preserve a plain-text fallback and avoid coloring spaces.
- **Project contribution:** Check whether color could add tonal depth to the hero while keeping a GitHub-safe fallback.
- **Technique used:** Ran `scripts/colorize.py --mode gradient --direction lr` on `assets/ascii/hero-composite.txt`, then removed ANSI SGR sequences and compared the result byte-for-byte with the source.
- **Result:** ANSI experiment was created under `/tmp`; plain fallback matched the 60-column source exactly. The README uses the monochrome fallback and contains no ANSI.
- **Verification:** Passed; ANSI emitted in experiment, absent from README.

### 2. `ascii-cli-logo-banner-figletjs`
- **Capability/instructions:** Generate FIGlet banners using Node.js/figlet with width and font controls; keep output monochrome and within the selected width.
- **Project contribution:** Compare a conventional full-width masthead against the reference's compact framed title.
- **Technique used:** Generated a Standard-font `THE LUCIFER 07` title and identity copy with the skill script. Saved the candidate at `assets/ascii/candidates/figlet-standard.txt`.
- **Result:** Readable full-width alternative; not selected because the narrow, paired hero needed the portrait and identity visible together. The experiment remains local and is omitted from the published files.
- **Verification:** Generated and inspected; candidate retained for comparison.

### 3. `ascii-cli-logo-banner-python`
- **Capability/instructions:** Create dependency-light, copyable text banners using its built-in 5x5 font and compact output.
- **Project contribution:** Compare a small-font title treatment with FIGlet and the hand-built title in the hero.
- **Technique used:** Ran `scripts/generate_banner.py` for `THE LUCIFER 07`; saved the output at `assets/ascii/candidates/python-5x5.txt`.
- **Result:** The generated line was legible but consumed most of the 60-column budget, so the final paired masthead uses a manually composed 3x5 letter grid. The experiment remains local and is omitted from the published files.
- **Verification:** Generated, width-checked, and visually compared; not used verbatim.

### 4. `ascii-cli-logo-banner`
- **Capability/instructions:** Route banner work to the Python or FIGlet implementation based on dependency and layout needs.
- **Project contribution:** Guide the two-generator comparison for the identity title.
- **Technique used:** Applied its generator-selection guidance: compare the Node/FIGlet and built-in Python paths, then assess width, portability, and fit before choosing the custom title.
- **Result:** Both outputs were retained as candidates; the final title is hand-set ASCII so it stays inside the 60-column paired composition.
- **Verification:** Both candidate generators were run; final layout was checked at the target widths.

### 5. `ascii-diagram-boxflow`
- **Capability/instructions:** Render clear, aligned box-and-arrow process diagrams for simple linear flows.
- **Project contribution:** Explore the requested `Build > Learn > Repeat` status treatment.
- **Technique used:** Ran `scripts/boxflow.py` to produce a vertical flow, then reduced it to the requested concise status line to avoid an oversized diagram in the narrow information panel.
- **Result:** `Mode : Build > Learn > Repeat` appears in the README; generated flow retained only in the experiment record, not as extra decoration.
- **Verification:** Flow generated and inspected; final status line fits its frame.

### 6. `ascii-image-to-ascii`
- **Capability/instructions:** Convert cropped images to readable or detailed character renderings; tune contrast, crop, and width.
- **Project contribution:** Test whether the supplied reference's portrait could be translated directly into character shading.
- **Technique used:** Cropped the supplied image and generated both readable and detail renderings at 52 columns with the installed converter.
- **Result:** Both versions lost the face/headset silhouette and produced noisy texture at the target width. They were rejected in favor of original, manually composed line art inspired by the reference's moon, portrait, and workstation arrangement.
- **Verification:** Both candidates inspected in rendered previews; rejected for recognizability.

### 7. `ascii-mini-charts`
- **Capability/instructions:** Show small numeric series as bars, sparklines, or line charts without implying unsupported data.
- **Project contribution:** Compare the requested 60/70/75/80-column viewport budgets during layout planning.
- **Technique used:** Generated a compact width-capacity chart using those four width values; kept it in the QA experiment area rather than presenting the values as profile metrics.
- **Result:** Confirmed that 60 columns is the limiting design width and supported a single-column section flow below the hero.
- **Verification:** Chart generated and inspected; no chart or invented metric appears in the README.

### 8. `ascii-motd-profile-banner`
- **Capability/instructions:** Keep terminal welcome/profile banners short, quiet, and readable; avoid noisy output.
- **Project contribution:** Shape the identity block and its descriptive copy.
- **Technique used:** Applied its concise-banner guidance to the title, full-name, and role group; kept surrounding artwork separate from the identity copy and omitted terminal effects.
- **Result:** The identity copy is limited to the name and `Developer / Problem Solver / Builder`; the larger 23-line hero scene is treated as illustration, not MOTD text.
- **Verification:** Reviewed against the skill's brevity/readability guidance; no generator is supplied by this skill.

### 9. `ascii-progress-and-spinner`
- **Capability/instructions:** Provide TTY-aware progress/spinner output and static alternatives for logs.
- **Project contribution:** Evaluate terminal-like decorative motion for the focus panel.
- **Technique used:** Ran the demo to inspect spinner and progress-bar output; compared it with the user's explicit unchecked focus items.
- **Result:** Dynamic and quantitative progress was omitted because no progress values were supplied. The README uses the static `[ ]` checklist.
- **Verification:** Demo output inspected; README contains no spinner, animation, or fabricated completion state.

### 10. `ascii-table-renderer`
- **Capability/instructions:** Render structured rows into aligned plain-text tables with controlled width.
- **Project contribution:** Organize the ten requested technologies in a readable, text-only stack panel.
- **Technique used:** Rendered the technology/category rows through `scripts/render_table.py`; saved the result in `assets/ascii/technology-stack.txt` and used that table in the README.
- **Result:** Two-column technology table, maximum 25 characters per line.
- **Verification:** Generator output and README copy checked for balanced borders and width.

### 11. `ascii-terminal-animation-pack`
- **Capability/instructions:** Create terminal animations with a static-frame fallback; skip animation in non-interactive output.
- **Project contribution:** Decide how to use the reference's cinematic night/sunset transition without moving content.
- **Technique used:** Ran `scripts/matrix_demo.py` in non-interactive mode and reviewed its static-output safeguard; used a hand-authored, fixed landscape frame instead of motion.
- **Result:** A static moon, mountain, horizon, and water-reflection divider is in `assets/ascii/landscape.txt` and the README.
- **Verification:** Non-TTY animation was skipped as instructed; static landscape checked for width and readability.

### 12. `ascii-text-art-library`
- **Capability/instructions:** Generate reusable ASCII title, divider, and notice-box templates at a chosen width.
- **Project contribution:** Establish consistent section-frame geometry.
- **Technique used:** Ran `scripts/generate_templates.py` at 60 columns, inspected its box templates, and adapted the `+ - |` frame geometry into `assets/ascii/section-frames.txt` and the README panels.
- **Result:** Reusable monochrome frame samples and section panels with widths no greater than 60 columns.
- **Verification:** Generated template compared with final hand-refined panels; borders checked by the validator.

### 13. `cli-ascii-logo`
- **Capability/instructions:** Generate framed CLI logo treatments with optional ANSI styling.
- **Project contribution:** Provide another title treatment for comparison with the paired hero.
- **Technique used:** Ran `scripts/generate_logo.py` to create a framed logo candidate; saved it at `assets/ascii/candidates/cli-ascii-logo.txt`.
- **Result:** The candidate was dense, used box-drawing characters, and measured 61 columns; rejected for the ASCII-only 60-column layout. The experiment remains local and is omitted from the published files.
- **Verification:** Candidate generated, measured, and inspected; not included in README.

### 14. `ascii-skill`
- **Capability/instructions:** Compose detailed ASCII scenes and generate scene/image-based alternatives.
- **Project contribution:** Explore algorithmic scene alternatives before drawing the portrait and setting manually.
- **Technique used:** Ran multiple seeded `ascii_gen.py draw` candidates and its image conversion on the cropped reference; compared their silhouettes with the intended moon, person, skyline, and desk.
- **Result:** The generated forms did not preserve a recognizable person/workspace at the required width. Their structured composition approach informed the manually aligned scene; generated noisy candidates were rejected.
- **Verification:** Candidates inspected; final original art manually refined and rendered for visual review.

### 15. `ascii-art`
- **Capability/instructions:** Convert images to ASCII/Braille/block styles and export alternate renderings; setup uses a local virtual environment.
- **Project contribution:** Test classic and edge-based conversion of the reference image.
- **Technique used:** Ran its setup script in the skill directory, cropped the supplied image, and ran classic and edge conversions with the skill-local environment.
- **Result:** Classic output was too dense and edge output too noisy to retain the developer silhouette. Both experiments were rejected; no dependency was added to project runtime configuration.
- **Verification:** Setup and both converters completed; output previews inspected. Local venv is ignored by the skill's ignore rules.

## Shared implementation decisions

- Original source artwork is stored under `assets/ascii/`; README code blocks contain the rendered artwork directly so it works on GitHub without image paths.
- Every final code block is intended to fit a 60-column viewport, which also fits the requested 70, 75, and 80-column checks.
- ANSI color, animation, external icon services, CSS, and JavaScript were excluded from the profile README.
- Title and image-conversion alternatives were compared locally; the published assets contain only the selected artwork and reusable source files.
