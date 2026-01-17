# Terreno Club Web Style Guide

This document captures the current visual system defined in the Terreno Club static site.

## Concept & Narrative
- **Mediterranean members' retreat:** The experience pairs sunlit photography with warm neutrals and deep greens to convey a resort-like sanctuary where sport and leisure co-exist.
- **Story-driven scrolling:** Full-bleed hero images anchor each section, alternating with content blocks that unpack memberships, facilities, and policies in an editorial sequence.
- **Clarity for prospective members:** Information-dense areas such as pricing tables, invitations, and policies use structured typography and alternating backgrounds to keep details scannable.

## Design Principles
- **Warm modernism:** A creamy base (`--bg`) contrasted with charcoal text (`--ink`) and mustard accents (`--accent`) establishes an upscale yet relaxed tone.
- **Layered branding:** Fixed navigation, title graphics, and hero typography float over photography to create a branded narrative without obstructing imagery.
- **Consistent tokenization:** Core colors and spacing rely on CSS custom properties and clamp-based values to maintain consistency across breakpoints.

## Color Palette
All core colors live in `:root` variables for re-use across the layout:

| Token | Hex | Usage |
| --- | --- | --- |
| `--bg` | `#f3e7b0` | Primary background, also used for menu lettering and contrast against deep accents. |
| `--ink` | `#1c1a17` | Base body copy and footer background when inverted. |
| `--muted` | `#4f4a3d` | Secondary text such as table headings and muted paragraphs. |
| `--accent` | `#d3a63b` | Highlight color for links in the footer and subtle accents throughout. |
| `--content` | `#f8f3d9` | Light sand background for standard content cards. |
| `--content-alt` | `#b18a44` | Deep ochre background for alternating content blocks with reversed typography. |
| `--menu` | `#f3e7b0` | Header navigation lettering that sits over imagery. |
| `--line` | `rgba(0, 0, 0, 0.12)` | Soft divider for tables and subtle separators. |
| `--teal` | `#2b5f5a` | Animated underline for navigation focus states. |
| `--brown` | `#5c3b23` | Accent for emphasized text within content blocks. |
| `--section1` | `#4289b9` | Bold azure background for the introductory membership overview. |
| `--sectionpadel` | `#3f4728` | Olive green background for padel-specific storytelling. |

## Typography
- **Primary stack:** Custom “Futura” (`@font-face`) with `"Inter", sans-serif` fallback establishes the geometric voice of the club.
- **Body copy:** Defaults to 1.6 line-height for comfortable reading across long-form sections.
- **Navigation:** Uppercase, 13px sizing, and 0.12em tracking reinforce a premium, compact menu floating above content.
- **Hero headline:** The opening message uses responsive clamp sizing, tight letter spacing, and a cinematic text shadow to sit comfortably on photography.
- **Tables and labels:** Table headers rely on uppercase, 0.78rem sizing, and extended tracking for an understated, structured look.

## Layout & Spacing
- **Global box-sizing:** Everything uses `border-box` for predictable sizing.
- **Fixed header overlay:** A 72px, pointer-event-disabled header remains fixed; interactive child elements re-enable pointer events to keep navigation usable over imagery.
- **Full-bleed hero frames:** `.section-media` figures occupy the full viewport height with centered crops and optional brightness tweaks per section.
- **Stacked narrative:** `main` and each `section` stack vertically with no gaps, letting imagery butt against content cards for a continuous scroll.
- **Content blocks:** `.content-block` cards use clamp-based padding and swap backgrounds via modifiers (`.alt`, section-specific colors) to create rhythm.
- **Feature layout:** `.feature-layout` shifts from column on mobile to split media/text on larger screens, with controlled aspect ratios and shadowed imagery.

## Key Components
- **Navigation bar:** Fixed logo plus anchor list; hover/focus underline animates using a scaling pseudo-element.
- **Hero intro:** The first section replaces the SVG title with a typographic hero block centered within the media overlay.
- **Title graphics:** Subsequent sections display SVG title plates centered within `.title-graphic`, each casting a soft shadow to stand out from photography.
- **Feature blocks:** Combined card layout (`.feature-block`) wraps an optional SVG title, media container, and rich text paragraphs for storytelling-heavy sections.
- **Pricing table:** Alternating backgrounds with reversed text maintain legibility, while borders use the translucent line token to remain subtle.
- **Footer:** Dark inversion with accent-colored links anchors the page and provides contact details.

## Imagery & Graphics
- Photography fills the viewport with `object-fit: cover` to maintain composition across devices, while overlays stay centered via flex alignment.
- Drop shadows on logos, title graphics, and media frames add depth without heavy borders.
- Section-specific brightness filters keep hero photography readable when combined with overlaid typography.

## Interaction & Motion
- Navigation links animate a teal underline on hover or keyboard focus, reinforcing interactive affordances.
- Title graphics reveal with a fade-and-rise motion triggered via `IntersectionObserver`, ensuring motion respects scroll position.

## Responsiveness
A `@media (max-width: 900px)` query reflows the fixed header into a stacked layout, compacts navigation gaps, and tightens hero overlay spacing. The hero typography scales down while maintaining readable sizing. Feature layouts switch to a side-by-side arrangement at `768px` and above.

## Accessibility Considerations
- The document language is set to Spanish (`lang="es"`), and navigation exposes an `aria-label` for assistive clarity.
- Section headings use `h2` elements hidden with the `.visually-hidden` utility so branded graphics do not break semantic structure.
- All imagery includes descriptive `alt` text; decorative overlays are flagged with `aria-hidden="true"` where appropriate.
- Keyboard focus remains visible via animated underlines, and scroll positioning respects the fixed header through `scroll-margin-top`.

## Utilities
- `.visually-hidden` implements the standard accessible hiding pattern, keeping content available to assistive technologies.

Update this guide whenever the design system evolves beyond the current single-page narrative.
