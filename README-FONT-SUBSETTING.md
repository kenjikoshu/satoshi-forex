# Font Subsetting for OG Image Generation

This project uses subsetted fonts for Open Graph (OG) image generation to reduce the size of font files and avoid hitting edge function size limits in Vercel.

## Implementation

### 1. Font Subsetting

The Montserrat fonts were subsetted using FontTools (Python) to include only the specific characters needed for the OG image. This reduced the total font size by approximately 65%.

Original fonts:
- Montserrat-Bold.ttf: 31 KB
- Montserrat-Light.ttf: 31 KB
- **Total: 62 KB**

Subsetted fonts:
- Montserrat-Bold.subset.ttf: 11 KB
- Montserrat-Light.subset.ttf: 11 KB
- **Total: 22 KB**

### 2. Subsetting Script

The fonts were subsetted using a Python script (`scripts/subset_fonts.py`) that uses FontTools. This script:

1. Takes the original font files from `public/fonts/`
2. Creates subsetted versions that only include the characters needed for the OG image
3. Saves the subsetted fonts to `public/fonts/subset/`

To run the script:

```bash
python3 scripts/subset_fonts.py
```

### 3. OG Image Generation

The OG image generation code in `src/app/api/og/route.tsx` was updated to use these subsetted fonts instead of the original fonts:

```typescript
// Load the subsetted Montserrat fonts
const montserratBold = await fetch(
  new URL('../../../../public/fonts/subset/Montserrat-Bold.subset.ttf', import.meta.url)
).then((res) => res.arrayBuffer());

const montserratLight = await fetch(
  new URL('../../../../public/fonts/subset/Montserrat-Light.subset.ttf', import.meta.url)
).then((res) => res.arrayBuffer());
```

## Testing

You can test the OG image generation with the subsetted fonts by running:

```bash
node scripts/test-og.js
```

This will verify that the subsetted fonts exist and report on the size reduction achieved.

## Updating Character Set

If you need to update the OG image to include additional characters, you'll need to:

1. Update the `text` variable in `scripts/subset_fonts.py` to include the new characters
2. Re-run the subsetting script: `python3 scripts/subset_fonts.py`
3. Deploy the updated subsetted fonts

## Requirements

- Python 3.x
- FontTools: `pip install fonttools brotli zopfli` 