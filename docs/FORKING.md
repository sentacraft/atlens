# Forking Atlens for Other Mounts

Atlens covers both the Fujifilm X mount (APS-C) and the Fujifilm G mount (GFX medium format). Beyond Fujifilm, there are no plans to cover other systems — so if you'd like to build something similar for Sony E, Nikon Z, Canon RF, L-mount, or any other system, I'd genuinely love to see it happen. The code is MIT-licensed and you're very welcome to fork it; no permission needed. The notes below are meant to save you time, not to gatekeep.

**What's in the box, and what isn't.**
- ✅ **Source code** is MIT-licensed. Fork, modify, deploy, ship commercially — all fine. Just keep the `LICENSE` file and copyright notice intact.
- ✅ **Schema and field design** (`src/lib/types.ts`, Zod schemas, UI taxonomy) are part of the MIT code and free to reuse.
- ❌ **Lens data** is under a separate proprietary license and isn't transferable — please don't copy it or use it as seed data, even for a different mount. See [`LICENSE-DATA`](../LICENSE-DATA).
- ❌ **The data pipeline** (`atlens-pipeline`) is a separate private repository and isn't part of this fork. You'll need to build your own collection and review workflow.

**Why the pipeline isn't open source (yet).** I get asked this a lot, so to be upfront about it:

1. **It is not a reusable general extractor yet.** The prompts, review steps, and edge cases are tuned to the brands currently covered.
2. **The intermediate inputs are not meant to be redistributed.** The published data is curated, but the collection layer touches manufacturer text and images that should not be republished as raw material.
3. **The workflow is still evolving.** The pipeline diagram in the README shows the shape of the system without presenting it as a stable reference implementation.

If the pipeline matures and those concerns ease over time, I'm open to revisiting. Until then, building your own collection layer is genuinely the right call — your mount, your source sites, your edge cases.

**Expect some refactoring.** The codebase has Fujifilm-specific assumptions baked in: per-mount crop factor math (APS-C ×1.5 for X, medium format for GFX), mount flange distances, generation-versioning conventions, and a few mount-specific field shapes. Supporting a non-Fujifilm system means abstracting these, not just swapping constants. It's not a huge lift, but worth planning for.

**A few small asks around branding.**
- Please pick a distinct project name — something other than "Atlens" or a close variant. I'd like to keep that name scoped to the Fujifilm project, and a fresh name will also help your project build its own identity.
- A short note in your README saying your project is an independent fork, not affiliated with or endorsed by Atlens or SentaCraft, would be appreciated.
- Mount names (X, E, Z, RF, L) and manufacturer names are trademarks of their respective owners. Nominative use like "a tool for Sony E-mount lenses" is totally fine; just avoid using brand logos as your own project logo.

**Staying in sync is optional.** I'm not committing to ongoing coordination, but if you make improvements that aren't mount-specific — better schema abstractions, shared UI primitives, accessibility fixes, performance wins — PRs back upstream are very welcome. A quick issue first to align on scope helps both of us avoid wasted effort.

Questions about licensing, collaboration, or anything else: [me@atlens.app](mailto:me@atlens.app). Good luck — really hope to see your project out in the wild.
