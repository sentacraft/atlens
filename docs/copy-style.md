# Atlens Copy Style Guide

This guide defines the unified voice and formatting rules for all user-facing copy in `src/messages/`, `src/data/collections.json`, `src/data/brands.json`, `src/data/curated-presets.json`, and documentation.

## Voice: Field Guide + Indie Craft

- **Base (Field Guide)**: Calm, literal, accurate. Explain lenses through physical facts, optical behavior, and practical trade-offs. Avoid filler, exclamation marks, and marketing clichés.
- **Accent (Indie Craft)**: Plain-spoken first-person honesty from one developer who also shoots Fujifilm. Light, dry humor is welcome in `About`, `Support`, `Feedback`, `Charts`, footer taglines, and empty states — never forced or self-congratulatory.
- **Intentional developer touches**: Keep `0 hallucination`, `lens.json loaded ✓`, and the browser console message as part of the site's identity.

## Pronouns

- **First person**: Use `我` / `I`, `me`, `my` in direct site copy (`About`, `Auth`, `Feedback`, `Profile`, `Support`, `DataSource`, `Compare`). Do not use corporate `我们` / `we` / `us` or third-person `作者` / `the author` on the site itself.
  - Exception: `src/lib/site-facts/handwritten.ts` stays in third person (`the author`) because Iris speaks about the maintainer.
- **Second person**: Always `你` / `you`. Never use stiff `您` or broadcast `大家`.
- **Iris**: Refer to Iris as `it` (or `Iris`) in English, never `she` or `her`.

## Formatting & Terminology

- **Aperture**: Always uppercase `F` with no slash: `F1.4`, `F2.8–4`, `F0.95`, `F2`.
  - Leave official manufacturer model strings as written by the maker (e.g., `Tamron 17-70mm F/2.8 Di III-A VC RXD`).
  - Keep search and manual-input parsers accepting `f/2.8` and `f2.8`.
- **Chinese lens counter**: Always `支` (never `只`, `款`, or `个` for lenses).
- **Chinese weather sealing**: Always `防滴防尘` (never `防尘防滴`).
- **Focal length convention label**: `焦距标准` / `Focal length convention` (avoid `焦距口径`).
- **Spec group header**: `对焦` / `Focus` (not `Autofocus`, since it includes minimum focus distance and magnification).

## Avoid

- **AI prose tropes**: Abstract buzzwords and inflated phrasing such as *focal excursion*, *depth-of-field governance*, *optical tolerance*, *clinical subject isolation*, *sub-narratives*, *delivers the iconic*, *market dynamics*, *whatsoever*, *please do verify*, *I kindly ask for your patience*.
- **Chinese marketing / social-media clichés**: `宝藏焦段`, `利器`, `控光利器`, `标杆`, `颠覆`, `天花板`, `回归纯粹`, `告别铁手练肌`, `剥离繁杂背景、拉近时空距离`, `带你窥探微观世界`, `值得玩味`, `快来看看 👀`, `超棒建议`.
- **Resume / PR self-praise**: Avoid melodramatic framing (`执念与热情`, `超凡的能力`, `时代的技术红利`, `最诚挚的感激`, `deep conviction`, `my deepest gratitude`). State what was built and why plainly.
