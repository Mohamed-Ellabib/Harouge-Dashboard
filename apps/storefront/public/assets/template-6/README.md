# Template 6 — welcome artwork

## Explore assets — 2026-09-06

The fifth Design2 screen uses six separately generated category photos and
`explore-fresh-finds-v2.webp`. Versioned PNG originals and the first banner
iteration are retained. Full source crops, exact prompts and provenance:
[EXPLORE-ASSETS.md](./EXPLORE-ASSETS.md). Category banners are saved independently
from home creator images; the Fresh Finds banner has independent editor fields.

## Cart assets — 2026-09-06

Reference: `C:/Users/hp/Desktop/design2/5b7de16c-c9f7-490a-ab64-b565a6e3e0b7.png`
(870 × 1808), supplied by owner. Built-in ImageGen, one reference-guided call
per photograph, both inspected. Originals retained at 1024 square; runtime
WebP derivatives are 640 square, quality 88, together 76,976 bytes.
`Template6CartPage` uses these alternate campaign crops only in standalone DEV
reference mode; saved Store thumbnails remain authoritative. Existing generated
ZARA logo and pale-aqua background are reused, not regenerated.

- `cart-premium-hoodie-v1.png` / `cart-premium-hoodie-v1.webp` (23,912 bytes WebP).
  ImageGen origin: `C:/Users/hp/.codex/generated_images/01a075f1-3ba3-7053-b064-14a7b1cad799/exec-be15617c-6bd7-4c63-a812-33815ab5a4f3.png`.
- `cart-urban-jacket-v1.png` / `cart-urban-jacket-v1.webp` (53,064 bytes WebP).
  ImageGen origin: `C:/Users/hp/.codex/generated_images/01a07495-5c1b-7260-81e7-418d7ca4a71a/exec-c93afcdd-46b0-431f-81b6-72f9f22e53a8.png`.

### Exact cart prompts

Premium Hoodie:

> Use case: photorealistic-natural. Asset type: ONE standalone ecommerce product fashion photo, square 1024x1024. Input image is exact visual reference. Use ONLY the first cart item's photo, approximately x58 y410 width322 height318 in the 870px-wide screenshot. Recreate that photo faithfully, full-bleed square with no rounded corners and no UI. An adult blonde woman with straight bangs and shoulder-length blonde hair wearing a plain black pullover hoodie, hood down behind her neck, black drawstrings, both hands tucked into the front kangaroo pocket. She stands waist-up, body facing front and head tilted slightly upward and toward image-right, cool calm editorial expression. Muted pale sage-green textured studio wall fills entire background. Preserve the source's exact model size, relaxed pose, soft directional daylight, black fabric folds, natural skin texture and slightly windswept hair. Head nearly touches top with small margin; crop at hip/bottom of hoodie. No graphics on hoodie, no text, no product labels, no price, no icons, no border, no extra objects or people, no watermark.

Urban Jacket:

> Use case: photorealistic-natural. Asset type: one square fashion product photograph for the Urban Jacket item in Template6CartPage. Input image: supplied 870x1808 screenshot is a visual reference. Recreate ONLY the SECOND cart product photo, bounds approximately x58 y776 width322 height317, showing the man in the black jacket. Ignore the blonde woman and all interface content. Primary request: one photorealistic waist-up portrait of the same styled adult man with olive/tan skin, short dark curly hair and subtle stubble. He wears black rectangular sunglasses, a black leather shirt-style jacket with pointed collar, two flap chest pockets, visible metal snaps and natural leather folds, over a plain white crew-neck t-shirt. Both hands rest naturally in the jacket's side pockets. His torso is mostly facing the camera while his head turns toward the RIGHT of the image, looking off-frame right with a calm expression. Match the reference's face proportions, clothing, silhouette and pose closely. Scene/backdrop: green horizontally ribbed metal shop shutter across the left and most of the background; a vertical strip of pale light gray concrete at the right. Soft natural outdoor daylight with gently warm skin tones, realistic matte leather texture, no studio backdrop. Composition/framing: square 1024x1024 full-bleed image, close waist-up framing as in the source, a small amount of room above the dark curls, jacket hem and waist near the lower edge. Man centered slightly left, pale concrete occupies the rightmost fifth. Constraints: one adult man only; no UI, no text, no prices, no logos, no icons, no borders, no rounded corners, no collage, no watermark. Only the standalone square product photograph.

---

Source reference: `C:/Users/hp/Desktop/design2/c5e4e439-6b63-482c-9bc8-7d1cf9704368.png` (863 × 1823), supplied by the owner.

`welcome-scene-v1.png`: 864 × 1821, generated 2026-09-06 with built-in ImageGen **edit mode**, one generation, visually inspected. The source composition is preserved; heading, body, progress pills and CTA were removed so the page can render real editable HTML over the photograph. Fashion annotations remain part of the artwork. The picture is a design asset, not a customer/product record or a screenshot used as the whole page.

## Exact generation prompt

Use case: precise-object-edit. Asset type: photographic background for an editable mobile storefront welcome page. Input image 1 is the EDIT TARGET, not a loose style reference. Produce one image in the same very tall portrait composition and aspect ratio as the input, approximately 1024 x 2160. CHANGE ONLY these foreground UI elements: remove the large white three-line heading 'DISCOVER BEST / DEALS ITEMS / NEARBY'; remove the entire smaller white paragraph beginning 'A smarter marketplace'; remove the three pagination pills just below that paragraph; remove the full yellow-lime GET STARTED button including its label. Replace all removed areas with seamless matching turquoise/cyan background and underlying photographic haze. Keep the original photograph, fashion woman, pose, sunglasses, daisy, clothing and composition as unchanged as possible. Keep the adult blonde woman in multicolor oversized pink/blue/green/yellow sunglasses, white daisy at mouth, face angled upward, red graphic shirt, draped worn black denim jacket, low camera perspective, sunlit photoreal skin/hair/fabric texture. Her head begins at about 34% down the canvas and remains in the lower-right/lower-middle composition exactly as the input; do NOT move or enlarge her into the upper blank space. Preserve the empty upper third as original clean turquoise backdrop. KEEP the small rotated decorative white annotations 'TRENDING' at right near the glasses, 'LET’S EXPLORE' at right beside her shoulder, 'FIND FASHION' at left beside her body, and the lime handdrawn looping arrow at the right. Keep the soft cyan haze over the bottom. No new subjects, no new text, no new buttons, no device frame, no UI, no watermark. Aim for exact edit fidelity to the supplied image, not a reinterpretation.

## Typography and preview

- Barlow Condensed ExtraBold from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/barlowcondensed), bundled locally with its SIL Open Font License in `fonts/OFL.txt`. It is a close available font, not a claim to possess the reference's original font.
- Studio thumbnail `apps/platform-dashboard/public/assets/admin/templates/template-6-welcome.jpg` is an actual 432 × 912 rendered page capture, not a second implementation.
- Preview: `http://127.0.0.1:5176/?preview=1&template=template-6`.
- Original scope was the first welcome screen. Three reference progress marks remain decorative; the next supplied design is the separate home page below. No customer-account, UAE/GCC commerce or marketplace authority is added.

## Discovery home — 2026-09-06

Source: `C:/Users/hp/Desktop/design2/910a0536-ac33-4ef0-8334-aa697ba4169a.png`, 864 × 1821.
Built-in ImageGen reference-guided, separate images, inspected by asset workers.
PNG originals are retained. Runtime WebP derivatives preserve aspect ratio and
use quality 90, at 864px photo width, 280px avatar width, and 160px hand width.
Ten runtime assets total 490,440 bytes. Do not serve the rejected checkerboard
`wave-v1.png`; the clean solid-white `wave-v2.webp` uses multiply blending.

| Asset stem | Original pixels | Generation direction |
| --- | --- | --- |
| hoodie-foreign-v1 | 1125 × 1398 | Upper-left photo: sunglasses man in grey/navy track jacket and red-haired woman in matching sports shirt, green shutter/concrete pillar, same poses and daylight. Remove heart and price UI; reconstruct underlying clothes, full-bleed photo only. |
| premium-hoodie-v1 | 1409 × 1116 | Upper-right photo: navy bucket-hat man seated left, pale-pink sweatshirt man standing right, cream cafe; preserve composition and light, no UI. |
| urban-jacket-v1 | 1562 × 1007 | Lower-left photo: dark jacket/white-T man and East Asian man in ivory hoodie/backpack, looking in opposite directions, warm cafe, head-to-midtorso crop, no UI. |
| everyday-essentials-v1 | 1303 × 1207 | Lower-right photo: seated auburn-haired woman in dark green/beige, sunglasses man in white/tan, green wall/pillar/shutter, natural daylight, no UI. |
| profile-avatar-v1 | 1254 × 1254 | Upper-right smiling clean-cut man, white open-collar shirt, close head/shoulders, electric blue/purple studio background; square photo without UI. |
| creator-alex-v1 | 1254 × 1254 | Red knit beanie, grey hoodie/dark jacket, adult man looking up-left, soft forest backdrop, no ring/badge/name. |
| creator-david-v1 | 1254 × 1254 | Smiling man grey beanie/hoodie, raised hand behind head, downward-left gaze, soft green outdoor background, no ring/badge/name. |
| creator-you-v1 | 1254 × 1254 | Brown-cap woman with long brown hair looking up-right, warm blurred olive-green outdoors, remove plus/ring/name. |
| home-background-v1 | 864 × 1821 | Empty pale icy-cyan/white surface, diffuse stronger upper-right/bottom cyan glow, near-white middle. Remove all people/cards/type/icons; no objects, shapes or grain. |
| wave-v2 | 1254 × 1254 | Fresh golden waving hand with grey motion strokes, tight square framing, solid pure-white background. Source hand only; no UI. Earlier alpha attempts were rejected. |

The four product images seed ordinary Store-owned products only for newly created
drafts; never use these products as a missing-live-catalog fallback. Social names,
sample verification/rating/location labels and AED formatting stay standalone DEV-only.
Home `/` is separate from welcome `/welcome` and both preserve shared navigation.

Fredoka (600) from Google Fonts, `fonts/Fredoka-Variable.ttf` and its OFL license,
matches the rounded greeting. Arial is used for body/UI. Earlier Lilita One is an
unused font exploration, retained locally. Icons are Phosphor and Tabler through
the existing react-icons dependency; no custom SVG drawings.

## Product details — 2026-09-06

Reference: `C:/Users/hp/Desktop/design2/07759ca9-af83-4ce4-a5f0-586664f4c85b.png`
(886 × 1776). Built-in ImageGen reference-guided production, one call per asset;
generated PNG originals retained. Runtime derivatives use WebP quality 90, 1100 ×
1023 for photographs and 240 × 240 for the logo (479,738 bytes total). These are
separate assets, not a screenshot used as the interactive page. UI uses the existing
Barlow Condensed ExtraBold/Arial, Phosphor icons and Lucide's matching PackageSearch.

| Asset | Purpose |
| --- | --- |
| `product-premium-main-v1.png` / `.webp` | Main sunlit blonde/denim portrait, 1300 × 1209 original. |
| `product-premium-side-v1.png` / `.webp` | Alternate portrait angle, 1300 × 1209 original. |
| `product-premium-fabric-v1.png` / `.webp` | Denim cuff/necklace/garment close-up, 1300 × 1209 original. |
| `zara-logo-v1.png` / `.webp` | Reference-only white wordmark on black; never installed as live Store branding. |

### Generation prompts

Main: Use case photorealistic-natural. ONE recreated ecommerce editorial photograph,
rectangle aspect 886:824, approximately 1100×1024. Use only the TOP photograph of
the reference (x0..886, y0..824). Preserve original identity, pose, light and framing:
adult blonde woman with straight eyebrow-length bangs, shoulder-length hair,
centered head around x450 y300 and approximately 130px sky above crown. Eyes toward
camera, real sunlit skin, magenta lips, raised right-side hand beside mouth/chin.
Layered silver necklaces over black graphic T-shirt with pale abstract curved emblem;
blue denim jacket draped right shoulder/arm, visible cuff. Tight sky-to-chest crop,
slightly low camera angle, warm daylight and cyan sky. Remove heading, buttons, dots,
cube icon and rounded clipping; reconstruct sky and garments. Photo only, square
corners, no text, icons, extra people or watermark.

Side: Same adult blonde with full straight bangs, pink lipstick, subtle winged makeup,
black crew-neck graphic tee, blue denim draped shoulder and layered necklaces. Chest-up
slightly side-facing secondary camera view, entire head visible and sky margin. Vivid
cyan cloudless sky, strong natural sunlight, realistic skin/cotton/denim, loose hairs.
Nearly square 886:824, slightly low camera. No UI, labels, overlays, border or watermark.

Fabric: Complementary near-square editorial close-up of the reference clothing:
tactile blue denim sleeve/cuff, brass button and gold topstitching in right foreground;
black graphic cotton shirt, neckline and layered fine silver necklaces left/center;
part of adult blonde woman's upper torso and relaxed hand, cropped below chin; bright
cyan sky and crisp natural sunlight. 886:824, full-bleed photograph, no UI, words,
badges, rounded corners or watermark.

Logo: Use case logo-brand. Supplied screenshot is a reference. Produce only the
small ZARA shop logo from its seller card: pure black square with elegant overlapping,
tightly kerned white high-fashion serif ZARA centered. No blue circular rim (UI adds
the border), white card or page UI. Square asset, sharp typography, match reference.

Only new creation drafts receive the Premium Hoodie gallery and description. Existing
drafts/stores are not reseeded. Home thumbnail remains `premium-hoodie-v1.webp`.
