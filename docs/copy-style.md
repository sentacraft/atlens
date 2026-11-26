# Atlens Copy Style Guide

This guide defines the unified voice and formatting rules for all user-facing copy in `src/messages/`, `src/data/collections.json`, `src/data/brands.json`, `src/data/curated-presets.json`, and documentation.

## Voice: Field Guide + Indie Craft

- **Base (Field Guide)**: Honest, grounded, and accurate on facts and trade-offs. Explain lenses through physical behavior, handling, and real shooting compromises. Do not inflate claims, fabricate specs, or fall back on pseudo-academic filler.
- **Accent (Indie Craft)**: Keep the rhythm and character of one Fujifilm shooter talking to another. Warmth, concrete imagery, and light dry humor belong in `brands.json`, `collections.json`, `About`, `Support`, `Feedback`, `Charts`, footer taglines, and empty states. Calm objectivity governs **truthfulness**, not flattening every sentence into a dry spec sheet.
- **Taglines (`shortDescription`)**: As noted in `src/data/collections.md`, `shortDescription` is a punchy, memorable tagline with character — not a mechanical restatement of filter criteria.
- **Length & Depth (SEO)**: Collection and brand descriptions render as primary editorial copy under `<h1>` and feed structured data. Keep them substantial (~340–460 chars English, ~110–155 chars Chinese) by adding real optical, handling, and selection trade-offs — never shrink them into bare 1–2 sentence summaries, and never pad them with empty buzzwords.
- **Intentional developer touches**: Keep `0 hallucination`, `lens.json loaded ✓`, and the browser console message as part of the site's identity.

### Keep (Good Voice)

- Conversational shooter judgment: `"plays nicest with the body"`, `"XF 加 XC，原厂原味"`, `"别家不太愿意做的，铭匠常常做"`, `"老蛙比的是谁更广、谁更近"`.
- Light, concrete humor: `"Pat the bag. Still there."` / `"摸摸包，镜头还在"`, `"Takes a pep talk to pack"`.

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

- **AI prose tropes**: Abstract buzzwords and inflated phrasing such as *focal excursion*, *depth-of-field governance*, *optical tolerance*, *clinical subject isolation*, *sub-narratives*, *delivers the iconic*, *market dynamics*, *seamlessly*, *whatsoever*, *please do verify*, *I kindly ask for your patience*.
- **Chinese marketing / social-media clichés**: `宝藏焦段`, `控光利器`, `颠覆`, `天花板`, `回归纯粹`, `告别铁手练肌`, `剥离繁杂背景、拉近时空距离`, `带你窥探微观世界`, `值得玩味`, `快来看看 👀`, `超棒建议`.
- **Listicle / self-referential page pointers**: `看这一组就够`, `都在这里`, `都在这页`, `就在这儿`, `从这里挑`, `本页收录`, `应有尽有`, `Here's every...`, `This page collects...`. Describe the lenses directly instead of gesturing at the page.
- **Resume / PR self-praise**: Avoid melodramatic framing (`执念与热情`, `超凡的能力`, `时代的技术红利`, `最诚挚的感激`, `deep conviction`, `my deepest gratitude`). State what was built and why plainly.
