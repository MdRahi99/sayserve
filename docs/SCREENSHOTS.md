# Screenshots

Taken automatically, so they can be regenerated after any change to the UI
rather than hunted down and retaken by hand.

```bash
node tools/mock-api.mjs &
NEXT_PUBLIC_API_URL=http://localhost:5055 npm run build:web
NEXT_PUBLIC_API_URL=http://localhost:5055 npm run start --workspace @sayserve/web &
node tools/screenshots.mjs
```

Then shrink them into the repo:

```bash
python3 -c "
from PIL import Image; import os
for f in os.listdir('/tmp/shots'):
    im = Image.open(f'/tmp/shots/{f}').convert('RGB')
    im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    im.quantize(colors=256).save(f'docs/screenshots/{f}', optimize=True)
"
```

## Why a mock API

The real API needs MongoDB, a seeded menu and orders in the kitchen. That is a
lot of setup to photograph a page, and a screenshot of an empty board shows
nothing. [`tools/mock-api.mjs`](../tools/mock-api.mjs) serves the endpoints the
web app calls, with data shaped exactly like the real thing — so these are
photographs of the real components, not a mock-up of them.

The cart is seeded through `localStorage` rather than by clicking through the
flow. A screenshot script that depends on six interactions breaks every time a
button moves.

## The shots

| File | What |
| --- | --- |
| `landing.png` | The full landing page |
| `menu.png` | The menu with the cart panel, desktop |
| `menu-mobile.png` | The menu on a phone |
| `customiser.png` | A meal with both required groups open |
| `chat.png` | The assistant beside the cart |
| `checkout.png` | Collection, details and payment |
| `tracking.png` | The live order timeline |
| `kitchen.png` | The board with all three columns busy |
| `dashboard.png` | Sales, hours, top items, assistant stats |

## Still worth doing by hand

**A GIF of the chat filling the cart.** Nothing beats it for a README, and it
cannot be captured as a still. [ScreenToGif](https://www.screentogif.com) on
Windows, Kap on Mac. Under eight seconds and under 5 MB, or GitHub will not play
it inline. Start with an empty cart, type the sentence, stop once the cart has
filled.
