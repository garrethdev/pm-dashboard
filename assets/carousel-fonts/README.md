# Renderer font assets

Unmodified static Bold faces selected in `docs/CAROUSEL-RENDERER-PORT-SPEC.md`
section C.1. Each font's original SIL Open Font License 1.1 is included alongside
the binary. Neither font is sold separately. No Apple/Microsoft fonts are bundled.

| File | Upstream release | SHA-256 |
|---|---|---|
| inter/Inter-Bold.ttf | [Inter 4.1](https://github.com/rsms/inter/releases/tag/v4.1), `extras/ttf/Inter-Bold.ttf` | `288316099b1e0a47a4716d159098005eef7c0066921f34e3200393dbdb01947f` |
| liberation/LiberationSans-Bold.ttf | [Liberation 2.1.5](https://github.com/liberationfonts/liberation-fonts/releases/tag/2.1.5), `liberation-fonts-ttf-2.1.5/LiberationSans-Bold.ttf` | `788abee4c806d660e8aee46689dd8540cd4bb98da03dcc9d171ce3efd99a9173` |

Downloaded from the official release links on September 26, 2026:

- https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip
- https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz

`loadTemplateCaptionFonts` resolves template font keys through a fixed catalog
and checks hashes. Pass the returned map to `renderCaptionedDeck`; raw template
paths are never opened. Next's carousel API tracing includes these assets and
licenses. A local Webpack build on September 26 listed both font binaries and
licenses in the carousel `types` route's `.nft.json`; no deployment was performed.

Runtime shaping uses pinned fontkit 2.0.4. The first real Inter smoke test exposed
an unsupported GSUB lookup in opentype.js 2.0.0; no font features were disabled to
hide it. The latter remains used by synthetic test-fixture generation.

This does not establish visual parity with SF Pro/Arial source renders. Inter
replacement wrap points may differ. Noto emoji and bitmap-run support remain open.
