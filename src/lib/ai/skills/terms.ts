/**
 * How to read Atlens spec fields and lens model names: only what a model can't know on its own.
 * General photography terms are left to the model. `{Namespace.key}` placeholders become the site's
 * own labels in the user's language.
 */
export const TERMS_SKILL = {
  sources: ["src/lib/types.ts", "src/lib/lens/lens.ts"],
  text: `# Reading Atlens specs and lens names

Use your own knowledge for general terms (what a T-stop is, what tilt-shift does), explaining the principle only: never state a specific lens's specs unless a tool returned them. Use the site's labels in quotes as written here.

## Spec page conventions

General
- "-" means the manufacturer has not published that spec; it does not mean the lens lacks the feature.
- "N/A" means the spec does not apply: a prime has no power zoom, a manual-focus lens has no focus motor, a fisheye without a front thread has no filter size.
- Specs come from official sites; the rare field filled from other published sources at review may carry a note.

Optics
- "{LensDetail.focalLengthEquiv}": focal length times the crop factor, 1.5 for "{MountSwitcher.x}" (APS-C) and 0.79 for "{MountSwitcher.gfx}" (GFX medium format), rounded.
- "{LensDetail.angleOfView}": diagonal. The manufacturer's figure when published; otherwise computed from focal length on a 28.3 mm APS-C diagonal and marked as an estimate, which can differ slightly from a measured value.
- "{LensDetail.maxTStop}": only for lenses rated in T-stops, mostly cine lenses, whose f-number fields may be empty.
- "{LensDetail.apertureBladeCount}": "N/A" for lenses with no adjustable diaphragm.
- "{LensDetail.lensConfiguration}": groups and elements as the manufacturer states them, with special elements (aspherical, ED, Super ED, SLD, FLD, high-refractive) listed by name and count. Brands name special glass differently; Atlens does not convert between them.

Focus
- "{LensDetail.focusMotor}": Atlens's class first, then the manufacturer's own label. "{LensDetail.motorLinear}" covers LM, HLA, VXD, VCM (voice coil), HyperVCM, and anything called linear; "{LensDetail.motorStepping}" covers STM, RXD, and stepping/stepper motors; "{LensDetail.motorDc}" covers DC and coreless DC motors and Fujifilm's older "High-Precision Motor"; "{LensDetail.motorOther}" is anything else. Note that voice coil motors count as linear here. The field is empty when the manufacturer names no motor, which is normal for older Fujifilm XF and XC lenses.
- "{LensDetail.internalFocusing}": shown only when the manufacturer states it; its absence does not mean the lens extends to focus.
- "{LensDetail.minFocusDist}": measured from the sensor (focal) plane — not the front of the lens, and not the mount flange — so the gap between the front element and the subject is shorter. For zooms it is the closest across the range, with per-focal-length values listed; a dedicated macro mode is listed separately.
- "{LensDetail.maxMagnification}": for zooms, the highest across the range, with per-focal-length values listed.
- "{SpecialtyBadge.macro}" badge: lenses the manufacturer markets as macro, usually 0.5× or more. There is no separate badge above 1×; the magnification field shows it.

Stabilization
- "{LensDetail.ois}": in-lens stabilization only, with the rated number of stops when published. In-body stabilization is a camera feature and is not part of lens specs.

Build
- "{LensDetail.weight}": the lens alone, without hood, caps, or other detachable parts. A range means versions differ (for example by mount) and comes with a note.
- "{LensDetail.dimensions}": maximum diameter × length. Length runs from the mount flange to the front of the barrel, without hood or caps; extending zooms list "{LensDetail.lengthRetracted}", "{LensDetail.lengthWide}", and "{LensDetail.lengthTele}" lengths.
- "{LensDetail.filterSize}": front filter thread diameter; "N/A" when there is none, with a note when an external holder or rear filter is needed.
- "{LensDetail.lensMaterial}" and "{LensDetail.accessories}": as the manufacturer words them.

Features
- "{LensDetail.wr}": a plain yes means full weather sealing; "{LensDetail.partial}" means some protection only (dust-only, splash-only, mount gasket), always with a note saying how much.
- "{LensDetail.powerZoom}" and "{LensDetail.internalZoom}": "N/A" for primes. Internal zoom means the barrel length does not change while zooming.
- "{LensDetail.releaseYear}": the year the manufacturer first announced the lens.

Special-type badges
Set from the manufacturer's marketing and model name; independent, and a lens can carry several: "{SpecialtyBadge.cine}", "{SpecialtyBadge.anamorphic}", "{SpecialtyBadge.tilt}", "{SpecialtyBadge.shift}", "{SpecialtyBadge.macro}", "{SpecialtyBadge.fisheye}", "{SpecialtyBadge.probe}".
- Tilt and shift are separate badges because some lenses only tilt, some only shift, and some do both.
- Probe describes the barrel form (long and thin, to reach into tight spaces) and is independent of macro capability.
- Anamorphic lenses are almost always cine lenses, so the two badges usually appear together.

## Reading lens model names

When a model name holds a code not listed here, say you are not sure what it stands for and describe the lens from its specs instead.

Fujifilm (official explainer: fujifilm-x.com "Lens Names Explained")
Pattern: series + focal length + aperture + feature codes. XF 18-55mm F2.8-4 R LM OIS is an XF zoom, 18-55mm, f/2.8 at wide to f/4 at tele, with an aperture ring, a linear motor, and optical stabilization.
- Series: XF is the main X-mount line, built and rendered to a higher standard. XC is the lighter, cheaper X-mount line, without aperture rings. GF lenses are for G mount (GFX medium format). MKX is the X-mount cine zoom line, rated in T-stops (MKX18-55mmT2.9).
- Codes: R has an aperture ring; LM linear motor; OIS optical stabilization; WR weather resistant; PZ power zoom; APD apodization filter, which smooths out-of-focus transitions at the cost of some light (only the XF 56mm F1.2 R APD so far); T/S tilt-shift (GF); Macro; II second generation.
- The red badge on some zooms is not part of the name; it is an informal mark for professional constant-aperture, weather-sealed zooms.

Sigma (e.g. 18-50mm F2.8 DC DN | Contemporary)
- DC: designed for APS-C. DG: designed for full frame, also usable on APS-C.
- DN: designed for mirrorless cameras.
- OS: Sigma's optical stabilization.
- After the bar, the line: Contemporary (compact), Art (image quality first), Sports (action and telephoto).

Tamron (e.g. 17-70mm F/2.8 Di III-A VC RXD)
- Di III: designed for mirrorless cameras; Di III-A: the APS-C ones among them.
- VC: Tamron's optical stabilization.
- VXD: Tamron's linear focus motor; RXD: its stepping focus motor.
- Tamron began simplifying its names in 2026, so newer lenses may drop these codes.

Viltrox (e.g. AF 75mm F1.2 Pro)
- AF: autofocus.
- Autofocus lines from top to bottom: LAB, PRO, EVO, AIR. LAB and PRO use voice coil motors; EVO and AIR use stepping motors. EVO has a declicked aperture ring; AIR has no aperture ring and no weather sealing.

Laowa
- CF: designed for APS-C; FF: full frame.
- Macro 2X: 2× maximum magnification. Probe: probe lens. Shift or TS: shift or tilt-shift. Zoom: a zoom lens. APO: apochromatic design.
- C-Dreamer, D-Dreamer, CA-Dreamer: product line names whose meaning Laowa does not explain; say you are not sure.
- Argus: Laowa's fast-aperture line, named after a figure from Greek myth.

Common across other brands
- MF / AF (7Artisans, TTArtisan, Brightin Star, SG-Image, Sirui and others): manual / auto focus.
- APS-C / FF (TTArtisan, Sirui and others): the format a lens is designed for; FF is full frame.
- II, III, IV: generation.
- Macro 2X: 2× maximum magnification.
- ASPH: uses aspherical elements.
- Hope (7Artisans), Air / Pro / Neo (Meike, TTArtisan and others), Nokton / Ultron / Skopar (Voigtländer): product line names whose positioning is not verified here; say you are not sure and describe the lens from its specs.`,
} as const;
