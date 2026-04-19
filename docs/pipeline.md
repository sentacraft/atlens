# Data Pipeline — Detailed Reference

Full architecture of the `x-glass-pipeline` (private repo) that produces `src/data/lenses.json`.

```mermaid
flowchart TD
  subgraph pipeline["x-glass-pipeline (private)"]
    SOURCES[("<b>sources.yaml</b><br/>· Brand aliases<br/>· Listing URLs per brand<br/>· Spec extraction sources per brand")]

    S0["<b>Stage 0 · Index</b><br/>Discovers X-mount lenses from brand listing pages<br/>· Normalizes brand names via aliases<br/>· Deduplicates via generated lens ID"]

    subgraph s1["Stage 1 · Collect"]
      S1p1["<b>Phase 1 · Locate & Image</b>  (batch per brand)<br/>Navigates listing pages → records official detail page URLs<br/>Downloads main product image from listing thumbnails"]
      S1p2["<b>Phase 2 · Fetch Raw Content</b>  (per lens)<br/>Retrieves spec text, product descriptions, and feature images<br/>Tools: Jina Reader · Playwright · FireCrawl<br/>No parsing — raw material only"]
      S1r["<b>Maintainer · Review</b><br/>Inspects fetched text and image quality"]
      S1h["<b>Maintainer · Manual Fetch</b><br/>Hand-collects raw text and images<br/>if Agent recall is insufficient"]
      S1b["<b>AI Agent · Read & Merge</b><br/>Applies vision to extract text from feature images<br/>Merges with retrieved text into one high-recall product description<br/>No field extraction — structured parsing in Stage 2"]
      S1out(["Merged high-recall product description"])
    end

    S2a["<b>Stage 2a · Derive</b><br/>AI Agent reads rawSpecs to extract<br/>weight · dimensions · focus distance · lens formula · release year"]
    S2b["<b>Stage 2b · Compute</b><br/>Script applies brand rules to derive<br/>AF · OIS · WR · aperture ring · specialty tags"]
    S2c["<b>Stage 2c · Image Processing</b><br/>Script optimizes, crops, and normalizes<br/>product images for visual consistency"]
    SR["<b>Stage R · Human Review</b><br/>Maintainer inspects every record<br/>and applies corrections"]

    subgraph sp["Stage P · Publish Gate"]
      SP1["<b>Zod schema validation</b> against x-glass schema<br/>· Intra-lens: field formats, focal range, aperture ordering, lens formula integrity<br/>· Cross-lens: duplicate IDs, URLs, brand-models, and spec tuples (with known-distinct allowlist)"]
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
  SP2 -->|"writes src/data/lenses.json"| DB[("<b>x-glass</b><br/>(this repo)")]

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

## Stage notes

### sources.yaml

The single source of truth for all pipeline runs. Contains per-brand:
- **Brand aliases** — used by Stage 0 for name normalization and lens ID generation
- **Listing URLs (`official_pages`)** — used by Stage 0 (lens discovery) and Stage 1 Phase 1 (detail page URLs + main image download)
- **Spec extraction sources (`collect_sources`)** — used by Stage 1 Phase 2 only; may differ from official pages (e.g. a brand's Shopify store may have better spec text than their official site)

### Stage 1 · Collect

Two phases with a human review checkpoint between raw fetch and final merge:

- **Phase 1 (batch per brand):** navigates listing pages to record each lens's official detail page URL and downloads the main product image from the listing thumbnail. Run once per brand listing page.
- **Phase 2 (per lens):** fetches rawSpecs — all spec-relevant text from the configured extraction sources. No field parsing at this stage; raw material only.
- **Review:** maintainer inspects fetched quality. If sufficient, proceeds to Read & Merge. If not, maintainer manually collects raw content and re-enters at Read & Merge.
- **Read & Merge:** AI agent applies vision to extract text from spec images, merges with webpage text. Output is a single high-recall raw text block. No field extraction.

### Stage 2 · Derive → Compute → Image Processing

- **2a Derive** runs first: AI agent reads the raw text block and extracts semantic fields.
- **2b Compute** depends on Derive output: script applies deterministic brand rules to produce AF, OIS, WR, aperture ring, and specialty tag fields.
- **2c Image Processing** is independent of 2a/2b and runs in parallel: script normalizes product images for visual consistency.

### Stage P · Publish Gate

Runs `tsx scripts/validate-lenses.mts` which imports the Zod schema from the main x-glass repo. Validation covers:
- **Intra-lens:** field formats, focal length ordering, aperture ordering (maxAperture ≤ minAperture), lens formula integrity (groups ≤ elements), URL formats, officialLinks presence
- **Cross-lens:** duplicate IDs, duplicate official URLs, duplicate brand/model/generation combinations, duplicate spec tuples — with a known-distinct allowlist for confirmed edge cases
