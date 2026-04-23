# X-Glass

Browse, filter, and compare every Fujifilm X-mount lens side by side — native Fujifilm and all major third-party brands.

**English**：[xglass.sentacraft.com/en](https://xglass.sentacraft.com/en)

**简体中文**：[xglass.sentacraft.com/zh](https://xglass.sentacraft.com/zh)


If you find X-Glass useful, a ⭐ on this repo goes a long way — and if you'd like to support the project: [donate](https://xglass.sentacraft.com/en/about#donation) · [打赏](https://xglass.sentacraft.com/zh/about#donation)

**Desktop**

![Lens browser](https://github.com/user-attachments/assets/107d9263-cf2a-4ab1-905b-ed9b6d56d523)

![Lens browser](https://github.com/user-attachments/assets/256ed68d-ccde-4961-9303-19f3899f5b36)

**Mobile**

![Mobile](https://github.com/user-attachments/assets/0d0953c5-5ed4-4f5d-88c9-38f4fd8f279e)

---

## Features

- **Growing lens database** — 8 major brands covered in the first release (Fujifilm, Sigma, Tamron, Viltrox, TTArtisan, 7Artisans, Brightin Star, SG Image), with more brands on the roadmap
- **Clean, focused UI** — distraction-free interface designed around the comparison workflow
- **Filter and sort** — multi-axis filtering (focal length, aperture, AF, OIS, weather resistance, specialty tags) combined with flexible sorting
- **Side-by-side comparison** of up to 4 lenses
- **Normalized data** — specs from different manufacturers use inconsistent formats and terminology; X-Glass maps everything to a consistent schema so comparisons are fair and objective
- **Pipeline-backed accuracy** — every spec originates from official manufacturer sources and goes through a staged pipeline with human review at every step
- **Shareable comparison posters**
- **Progressive Web App (PWA)** — X-Glass is a web app at its core, but installs and runs like a native app. Add it to your home screen (iOS / Android) or dock (macOS) for instant, full-screen access — no App Store required
- **English + Chinese** (中文)

## Install

X-Glass is a web app — open it in any browser and start using it right away.

It also supports installation as a **Progressive Web App (PWA)**: add it to your home screen (iOS / Android) or dock (macOS) for full-screen access, offline support, and a more native feel — no App Store required.

**[Get the app →](https://xglass.sentacraft.com/en/get)**

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Deployment | Vercel |
| i18n | next-intl |
| Data Validation | Zod |

## Data Pipeline

For a lens comparison tool, data accuracy isn't a nice-to-have — it's the product. To keep specs accurate and up to date while minimizing AI hallucination during collection and parsing, X-Glass is backed by a purpose-built, multi-stage data pipeline:

Lens data and images are maintained in a private pipeline repo and written into `src/data/lenses.json`.

```mermaid
flowchart TD
  subgraph pipeline["x-glass-pipeline (private)"]
    SOURCES[("sources.yaml")]

    S0["<b>Stage 0 · Index</b><br/>Discovers X-mount lenses from brand listing pages"]

    subgraph s1["Stage 1 · Collect"]
      S1p1["<b>Phase 1 · Locate & Image</b><br/>Detail page URLs + main product image"]
      S1p2["<b>Phase 2 · Fetch Raw Content</b><br/>Retrieves spec text, product descriptions, and feature images"]
      S1r["<b>Maintainer · Review</b>"]
      S1h["<b>Maintainer · Manual Fetch</b>"]
      S1b["<b>AI Agent · Read & Merge</b><br/>Vision on spec images + text merge<br/>No field extraction"]
      S1out(["High-recall product description"])
    end

    S2a["<b>Stage 2a · Derive</b><br/>AI extracts semantic fields from rawSpecs"]
    S2b["<b>Stage 2b · Compute</b><br/>Script derives deterministic fields"]
    S2c["<b>Stage 2c · Image Processing</b><br/>Normalizes product images"]
    SR["<b>Stage R · Human Review</b><br/>Maintainer inspects and applies corrections"]

    subgraph sp["Stage P · Publish Gate"]
      SP1["<b>Zod schema validation</b><br/>Intra-lens + cross-lens checks"]
      SP2["<b>Normalization + version stamp</b>"]
    end
  end

  SOURCES -->|"aliases + listing URLs"| S0
  SOURCES -->|"listing URLs"| S1p1
  SOURCES -->|"spec extraction sources"| S1p2
  S0 -->|"discovered lens list"| S1p1
  S1p1 --> S1p2
  S1p2 --> S1r
  S1r -->|"quality OK"| S1b
  S1r -->|"insufficient"| S1h
  S1h --> S1b
  S1b --> S1out
  S1out --> S2a & S2c
  S2a --> S2b
  S2b & S2c --> SR
  SR --> SP1
  SP1 --> SP2
  SP2 -->|"writes src/data/lenses.json"| DB[("x-glass<br/>(this repo)")]

  classDef script fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
  classDef agent fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef human fill:#dcfce7,stroke:#16a34a,color:#14532d
  classDef gate fill:#f3e8ff,stroke:#9333ea,color:#3b0764
  classDef config fill:#f1f5f9,stroke:#64748b,color:#1e293b

  class S0,S2b,S2c script
  class S1p1,S1p2,S1b,S2a agent
  class S1r,S1h,SR human
  class SP1,SP2 gate
  class SOURCES config
```

**Key principles:**
- Every spec originates from official manufacturer sources, with human review at every stage
- Deterministic fields are computed in code — never inferred by LLM
- Stage isolation: each step may only build on facts confirmed in the prior step

## Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Fill in GITHUB_TOKEN and GITHUB_FEEDBACK_REPO

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Contributing

This project does not accept code contributions at this time.

To report a data issue (wrong spec, broken image) or suggest a missing lens, use the feedback links inside the app, or open a [GitHub Issue](https://github.com/sentacraft/x-glass/issues).

## Forking for Other Mounts

X-Glass currently focuses on the Fujifilm X mount, with the Fujifilm GF mount as a possible future expansion. Beyond Fujifilm, there are no plans to cover other systems — so if you'd like to build something similar for Sony E, Nikon Z, Canon RF, L-mount, or any other system, I'd genuinely love to see it happen. The code is MIT-licensed and you're very welcome to fork it; no permission needed. The notes below are meant to save you time, not to gatekeep.

**What's in the box, and what isn't.**
- ✅ **Source code** is MIT-licensed. Fork, modify, deploy, ship commercially — all fine. Just keep the `LICENSE` file and copyright notice intact.
- ✅ **Schema and field design** (`src/lib/types.ts`, Zod schemas, UI taxonomy) are part of the MIT code and free to reuse.
- ❌ **Lens data** (`src/data/lenses.json`) is under a separate proprietary license and isn't transferable — please don't copy it or use it as seed data, even for a different mount. See [`LICENSE-DATA`](LICENSE-DATA).
- ❌ **The data pipeline** (`x-glass-pipeline`) is a separate private repository and isn't part of this fork. You'll need to build your own collection and review workflow.

**Why the pipeline isn't open source (yet).** I get asked this a lot, so to be upfront about it:

1. **It's still rough.** The pipeline is evolving quickly and has plenty of sharp edges. Open-sourcing it in this state would create more confusion than value.
2. **It's overfit to the brands currently covered.** The extraction logic, prompts, and review steps are tuned to a specific set of manufacturers and page layouts — they aren't generic enough to be useful as a reference implementation for someone else. This is also why the diagram above stays at the workflow level and doesn't go deeper: I'd rather show the shape than publish details that would mislead.
3. **Legal exposure around scraped content.** The pipeline pulls raw product descriptions and images from many manufacturer sites. Even if the final published data is carefully curated, open-sourcing the intermediate scraping layer would put that raw material in public view, which I'm not comfortable with.

If the pipeline matures and those concerns ease over time, I'm open to revisiting. Until then, building your own collection layer is genuinely the right call — your mount, your source sites, your edge cases.

**Expect some refactoring.** The codebase has Fujifilm-specific assumptions baked in: APS-C ×1.5 equivalent focal length math, X-mount flange distance, generation-versioning conventions, and a few mount-specific field shapes. Supporting a full-frame or different-crop system means abstracting these, not just swapping constants. It's not a huge lift, but worth planning for.

**A few small asks around branding.**
- Please pick a distinct project name — something other than "X-Glass" or close variants like "E-Glass" / "Z-Glass". I'd like to keep that name scoped to the Fujifilm project, and a fresh name will also help your project build its own identity.
- A short note in your README saying your project is an independent fork, not affiliated with or endorsed by X-Glass or SentaCraft, would be appreciated.
- Mount names (X, E, Z, RF, L) and manufacturer names are trademarks of their respective owners. Nominative use like "a tool for Sony E-mount lenses" is totally fine; just avoid using brand logos as your own project logo.

**Staying in sync is optional.** I'm not committing to ongoing coordination, but if you make improvements that aren't mount-specific — better schema abstractions, shared UI primitives, accessibility fixes, performance wins — PRs back upstream are very welcome. A quick issue first to align on scope helps both of us avoid wasted effort.

Questions about licensing, collaboration, or anything else: [xglass@sentacraft.com](mailto:xglass@sentacraft.com). Good luck — really hope to see your project out in the wild.

## Acknowledgments

Built with significant help from [Claude Code](https://claude.ai/code) (architecture and engineering) and [Google Gemini](https://gemini.google.com) (UX design).

Built on the shoulders of great open source work: [Base UI](https://base-ui.com), [Motion](https://motion.dev), [Lucide](https://lucide.dev), [next-intl](https://next-intl.dev), [Zod](https://zod.dev), [Tailwind CSS](https://tailwindcss.com), [modern-screenshot](https://github.com/qq15725/modern-screenshot), [qrcode.react](https://github.com/zpao/qrcode.react), [Geist](https://vercel.com/font).

## License

**Source code** — [MIT](LICENSE) © 2026 SentaCraft

**Lens data** (`src/data/lenses.json`) — [Proprietary](LICENSE-DATA) © 2026 SentaCraft
Available for personal reference only. Redistribution, commercial use, and bulk scraping are not permitted.

**Product images and brand trademarks** are the property of their respective owners.
X-Glass is an independent third-party tool, not affiliated with or endorsed by any manufacturer.
Rights holders may contact [xglass@sentacraft.com](mailto:xglass@sentacraft.com) for takedown requests.
