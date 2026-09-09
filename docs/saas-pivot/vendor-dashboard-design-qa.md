# Merchant Products Dashboard Design QA

- Source visual truth: `C:\Users\hp\AppData\Local\Temp\codex-clipboard-ee53b811-4d2e-4cc0-89e7-5229d0964f11.png`
- Implementation: `http://127.0.0.1:5175/?demo=1`
- Implementation screenshot: `C:\Users\hp\.codex\visualizations\2026\08\05\019fd0e1-7f38-7ff0-ad43-f1ff31f83509\merchant-dashboard-redesign-1280x720.png`
- Responsive screenshot: `C:\Users\hp\.codex\visualizations\2026\08\05\019fd0e1-7f38-7ff0-ad43-f1ff31f83509\merchant-dashboard-redesign-mobile.png`
- Combined comparison: `C:\Users\hp\.codex\visualizations\2026\08\05\019fd0e1-7f38-7ff0-ad43-f1ff31f83509\merchant-dashboard-side-by-side.png`
- Source pixels: 1536 × 1024 px
- Browser implementation pixels and CSS viewport: 1280 × 720 px at device scale 1
- Responsive viewport: 390 × 844 px at device scale 1
- Density normalization: the source's top 1536 × 864 first-viewport region was resized to 1280 × 720 and placed beside the browser capture. The in-app browser is capped at 1280 × 720, so native 1536 × 1024 capture remains a P3 verification gap, not a visible layout blocker.
- State: authenticated merchant, Products selected, first Product open in the editor

## Full-view comparison evidence

The reference and browser implementation were opened individually and together in one normalized comparison image. The outer frame, right navigation rail, full-width utility header, center Product workspace, left Product editor, bottom footer, metric strip, filters, dense table, and active blue navigation treatment align with the reference composition. The implementation keeps the page itself fixed to the viewport and moves overflow into the table/editor regions on short screens.

## Focused region comparison evidence

- Fonts and typography: Cairo Variable is bundled locally. Arabic heading, control, table, and editor weights follow the reference hierarchy without browser-default typography.
- Spacing and layout rhythm: native desktop tracks are 198 px for the right rail and 438 px for the editor, matching the source proportions. The responsive 1280 px capture reduces them proportionally to 165 px and 360 px. Header, footer, metrics, filter bar, and table radii and gaps follow the reference.
- Colors and visual tokens: near-black navy, blue-grey borders, electric-blue actions, muted secondary text, green published status, and low-glow selected navigation match the source palette.
- Image quality and asset fidelity: the supplied LabibTech logo asset is used in the rail lockup. Real project Product imagery is reused for thumbnails, and all UI icons come from the installed Phosphor family rather than drawn placeholders.
- Copy and content: Product-screen chrome and Arabic labels match the reference. Counts, Product names, prices, stock wording, domains, and account text remain data-bound so the real merchant dashboard does not present fake business data.
- Icon treatment: sidebar, topbar, metrics, filters, row actions, pagination, and editor controls use one consistent outlined/duotone icon family with reference-matched optical sizing.

## Comparison history

### Pass 1 — blocked

- P2: at 1280 px the table retained a small horizontal overflow because desktop editor/sidebar tracks did not compress early enough.
- P2: the Product editor heading actions were mirrored relative to the reference.
- P2: the square source logo rendered too small inside the horizontal sidebar slot, and the selected-navigation marker appeared on the wrong edge.

Fixes: added the 1360 px track reduction, removed the fixed table minimum width, corrected editor-header direction, built a compact lockup from the real LabibTech mark, and moved the active marker to the physical left edge.

### Pass 2 — passed

The revised browser capture has zero page overflow and zero Product-table horizontal overflow at 1280 × 720. The combined comparison shows no actionable P0, P1, or P2 design mismatch. Remaining differences are intentional live-data content and the P3 native-capture limitation described above.

## Browser verification

- Page identity: `http://127.0.0.1:5175/?demo=1`, title `لوحة البائع`.
- Meaningful DOM: Products heading, table, navigation, and Product editor rendered.
- Framework overlay: none.
- Console warnings/errors: none.
- Interaction proof: Product search filtered to the requested Product and removed unrelated rows; Create Product changed the editor into creation mode; Cancel restored the selected Product editor.
- Desktop overflow: 1280 × 720 page width/height exactly matched the viewport; table horizontal overflow was 0.
- Responsive proof: 390 × 844 rendered the mobile navigation, heading, create action, metrics, and filters without page-level horizontal overflow. The dense table retains a small internal horizontal scroll by design.
- Production check: `npm.cmd run build --workspace @dtc/vendor-dashboard` passed after the final changes.

## Final result

final result: passed
