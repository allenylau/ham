# Selected Work

Drop work media into this folder.

Supported file types:

- `.jpg`
- `.jpeg`
- `.png`
- `.gif`
- `.webp`
- `.mp4`

Then run:

```bash
npm run refresh-work
```

The script will rebuild `manifest.json` and the homepage will populate the Selected Work grid in filename order.

You can edit the hover caption for each item directly in `manifest.json` by changing the `label` value. Running the refresh script again will keep existing labels for matching files.

Examples:

- `01-brand.gif`
- `02-campaign.mp4`
- `03-packaging.jpg`
