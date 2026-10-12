# The degrade pass

Every picture an image model makes is re-made as a phone-camera JPEG before
it is stored or shown. Nothing downstream ever receives the raw render.
Source: *Degrade Pass Wiring Handover* (Garreth, 2026-10-12), which carries
the original script, `character-6/after-review/degrade.py`.

## What it removes, and what it does not

| Layer | Removed? |
|---|---|
| C2PA / Content Credentials manifest | Yes. The picture is decoded to pixels and saved fresh. |
| EXIF, XMP, ICC, IPTC, text labels (such as the AI-content label some models write into a PNG) | Yes, for the same reason. |
| A visible watermark in the pixels | No. Nothing in the pass looks for one. |
| SynthID or another invisible pixel watermark | **No. SynthID survives the pass** (checked 2026-10-12: the first live AI edit, after the pass, was flagged by Google's SynthID Detector at synthid.com as "made or edited with Google AI"). Every Gemini / Nano Banana picture carries it. The pass only removes what is written in the file. |

## Where it runs

- **AI edit** (`aiEdit` in `src/server/carousel/services/library-images.ts`).
  The model's picture is degraded before it is written as the pending file,
  so the preview is the degraded JPEG and the raw picture is never stored.
  **Keep** stores that JPEG as it is (`keepEdit`) and records
  `degraded = true` and `degrade_seed` (the pending file's id) on the
  `image_library_images` row.
- **Generate images (DEV-30), when it is built.** Same call, as the last
  step of downloading each render.
- **Every other library save** (uploads, black and white, cut-outs) is not
  degraded, but its file is checked for metadata (`assertNoMetadata`) before
  it is stored.

Not yet covered: pictures made outside the app and uploaded, and the images
already in storage. Both are in `BACKLOG.md`.

## The steps

`src/server/carousel/services/degrade.ts`, in the script's order and with
its numbers:

1. Down to 72 % of each side (Lanczos), back up to full size (bilinear).
2. Luminance grain, sigma 5.5, times (1.6 minus the pixel's brightness), so
   shadows get more; then colour grain, sigma 2.0.
3. Unsharp mask: radius 1.2, 45 %, threshold 2, rounded as Pillow does.
4. JPEG at quality 68, 4:2:0 colour, optimised coding, nothing kept.

Width and height never change. The seed is the id of the picture being made,
so the same picture and seed always give the same file and a retry is safe.
Change a number only as a deliberate decision for the whole set.

**It is a port, not the script.** The grain, resampling and JPEG encoder are
sharp's, not Pillow's and NumPy's, so the file is not byte-identical to what
`degrade.py` would write. Measured on five stored images (2026-10-12): file
sizes within 1 % of the script's, grain strength within 1 %, and the two
outputs differ from each other by 26–28.5 dB, about as much as the script's
own output differs from itself with another seed (27–29 dB). The difference
is the random grain.

## The checks, which stop the step rather than log

`assertDegraded`, run on every result inside `degrade()` and again at Keep:

- It is a JPEG with the quality-68 tables (the pass's fingerprint; a plain
  re-save, such as `finalize-batch.py`'s quality-90 copy, fails).
- Same width and height as the picture it was made from.
- No EXIF, XMP, ICC, IPTC, C2PA (APP11) or comment block.
- 50 to 350 KB per megapixel. That is the handover's 300 KB to 1.2 MB at
  1856 × 2304, widened.

exiftool and c2patool cannot run on Vercel, so the app reads the file's
blocks itself. For a human check on the first batch of a new kind of image:
Content Credentials Verify (contentcredentials.org/verify), a metadata viewer,
Google's SynthID detector, or a third-party AI-image detector. Always check the
JPEG, never the original.
