# URBX assets

## Product detail, 2026-09-06

Built-in Image Gen produced these independent gallery images using the owner's
`C:/Users/hp/Desktop/Design1/fbd0745a-7103-4aef-b329-276125f65475.png`
and the existing CHAOS garment as visual references. Each native output was opened
and inspected. The screenshot itself is not rendered as the page.

| Output | Native size | Prompt / art direction |
| --- | --- | --- |
| `detail-chaos-back-v1.png` | 1054 × 1492 | Photoreal main product hero: raised black hood, rear three-quarter model facing right, oversized heavy matte cotton, white dripping CHAOS lettering, lime NO RULES JUST ENERGY, X-eye smiley and crowns, sleeve URBX marks; dark rooftop skyline and soft side lighting. Preserve garment details; no UI, text overlay, prices, borders or thumbnails. |
| `detail-chaos-front-v1.png` | 1142 × 1378 | Match the second reference thumbnail: full front of the black hoodie, obscured face, kangaroo pocket, small white NO RULES / JUST ENERGY chest print, white/lime sleeve artwork, smoky charcoal studio. No large CHAOS chest print and no interface elements. |
| `detail-chaos-side-v1.png` | 1140 × 1380 | Match the third thumbnail: hooded model facing left, side/slightly rear view, near shoulder and sleeve crown/URBX/lime marks, edge of the back print, dim rooftop skyline. Crisp heavy cotton, no UI. |
| `detail-chaos-print-v1.png` | 1141 × 1379 | Macro black cotton print detail matching the fourth thumbnail: lime X-eye round smiley, crown and drips; white elongated paint and CHAOS fragments above. Ink embedded in fabric, shallow folds and soft side lighting. No faces, new garments or UI. |

Target gallery is approximately 864 × 1044, with photography placed at natural
aspect ratio and faded into the canvas. Catalog thumbnails remain independent.
Only the standalone preview and newly created URBX starter catalogs receive these
four defaults. Existing drafts/stores keep their saved images. The creation editor
can replace/add/remove gallery photos (1–8) without changing the catalog thumbnail.

## Categories, 2026-09-06

Generated using the image-generation skill and built-in Image Gen, with the
owner's category screenshot supplied as visual grounding:
`C:/Users/hp/Desktop/Design1/6d1974eb-8659-44e6-a38c-8f3783b9a671.png`.
The four native PNG files below are used by `UrbxCategoriesPage`; each was opened
and visually inspected. No reference screenshot is used as the live page.

| Output (relative to this folder) | Target slot | Generation prompt / constraints |
| --- | --- | --- |
| `categories-hoodies-v1.png` | 810 × 402 | Recreate only the Hoodies category photograph. Use the existing CHAOS garment: rear-facing black-capped model on the right of a photoreal nighttime rooftop; white/lime CHAOS graffiti hoodie; dark skyline left negative space; GOOD PEOPLE BETTER STREETS wall at right. No UI headings, counts, arrows or borders. |
| `categories-tshirts-v1.png` | 810 × 382 | Generate only the T-Shirts category photograph. Back-facing young adult man at right with messy dark curly hair, off-white oversized tee, large black dry-brush URBX and crown print, black pants at bottom. Dim gritty concrete parking garage, fluorescent lights, column at left with SAME STREETS DIFFERENT MINDS graffiti/crown; left 45% dark negative space. Neutral blacks, no UI or borders. |
| `categories-bottoms-v1.png` | 397 × 329 | Recreate only the Bottoms product photograph using the supplied existing cargo product and category reference. Full black cargo trousers and black/white sneakers in the right 48%, center x73%, 92% height; exact pocket and lime X details. Left 48% empty charcoal space, smoky dark studio and floor. No torso, face, UI text, arrows or borders. |
| `categories-accessories-v1.png` | 396 × 329 | Photoreal URBX accessories still life: black six-panel curved-brim cap upper-left with white hand-drawn crown and tiny lime URBX label, compact black nylon utility crossbody bag at right, stacked pockets/webbing, lime zip pulls and white/lime URBX patch. Dark veined stone, smoky charcoal studio, dramatic soft light, lower-left negative space. No UI, counts, arrows or borders. |

These banners are independent of `category-*-v1.png` home tiles. Merchant banner
edits persist in `brands.items[].banner_image_url`. Product counts are not burned
into the photography and always come from the current catalog.

Generated with built-in Image Gen from the owner's supplied URBX page references.
Reference home: `C:/Users/hp/Desktop/Design1/ffeb6201-79f5-42e0-89ba-be533d19a78f.png`.
Artwork is separate from HTML copy, navigation, controls, catalog records and prices.

## Home, 2026-09-06

| Asset | Native size | Art direction |
| --- | --- | --- |
| home-hero-v1.png | 1212 × 1298 | Rear-three-quarter model at right, black CHAOS hoodie with white/lime graffiti, dark left negative space, small lime crown and white arrow; no UI. |
| limited-drop-v1.png | 1994 × 789 | Rear black hoodie with distressed white X at right, black smoke, lime paint spray and white curved arrow; no headline/UI. |
| category-hoodies-v1.png | 1254 × 1254 | Complete raised-hood gray pullover, minimal small chest marks, black background. |
| category-tshirts-v1.png | 1254 × 1254 | Complete white oversized tee with black CHAOS lettering and lime smiley, black background. |
| category-bottoms-v1.png | 1254 × 1254 | Complete gray cargo trousers, pocket details and cinched ankles, no shoes/model. |
| category-accessories-v1.png | 1254 × 1254 | Black cap, left-facing brim, white crown embroidery and tiny lime side label. |
| type-distress-v1.png | 1254 × 1254 | Fine irregular charcoal wear on white, clipped by real HTML headline text. |

`home-hero-v2.png` is an unused generated composition experiment; v1 is selected.
Previously generated catalog assets: oversized-tee-v1, no-rules-hoodie-v1,
x-cargo-pants-v1, chaos-hoodie-v1. Welcome assets remain separate.
No source screenshot is rendered as the page or sliced into pretend controls.

Fonts are self-hosted: Anton, Permanent Marker, Barlow Condensed, and Roboto
Condensed. Their licenses are in `fonts/`. Roboto Condensed and its license were
obtained from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/robotocondensed).

Commerce records install these relative image paths into each independent store.
The Accessories starter category is intentionally empty, not a fabricated product.

## Order confirmation package — 2026-09-06

- Asset: `order-package-v1.png`, 1774 × 887 PNG, generated with the built-in Image Gen tool and inspected against `C:/Users/hp/Desktop/Design1/92edb992-957e-4efe-8f38-2bbaf42fd312.png`.
- Consumed by `UrbxOrderConfirmationPage` in a 75cqw × 37.4cqw hero slot. Existing wordmark, brush underline, distress texture and generated product photographs are reused separately.
- Final prompt: “Recreate only the reference’s standalone package artwork in a wide 2:1 composition on seamless near-black #070807. Photoreal matte black textured carton in front-right perspective, lime tape with repeating URBX, large white URB and lime X on front, handdrawn crown with ‘URBAN VIBES. REAL YOU.’ front-left, ‘GOOD THINGS INSIDE.’ right face. Lime confirmation badge and black check upper-right, lime splatters behind box, white chalk rays. No page UI, external logo, headings, controls or additional objects.”
- Natural texture and handwritten lettering vary slightly from the reference. No screenshot-as-interface or simulated controls are used.
