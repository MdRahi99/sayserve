# Screenshots for the README

Six images. Take them on the deployed site, not on localhost — a URL bar saying
`sayserve.vercel.app` is worth more than one saying `localhost:3000`.

Seed the demo first so nothing is empty: sign in as staff, press **Simulate a
rush**, and place one real order so a customer view has something in it.

| File | Shot | Size |
| --- | --- | --- |
| `landing.png` | The landing page hero, desktop | 1440 × 900 |
| `assistant.gif` | Typing "2 cheeseburgers, no onions and a large coke" and the cart filling. **The most important one** | 900 wide |
| `menu-mobile.png` | The menu on a phone, cart bar visible | 390 × 844 |
| `customiser.png` | A meal with "Choose a drink" marked Required and Add blocked | desktop modal |
| `kitchen.png` | The kitchen board with orders in all three columns and a timer gone red | 1194 × 834 |
| `dashboard.png` | The dashboard, showing the share handled without a model | 1440 × 900 |

## Taking them

**Stills:** Chrome DevTools, `Ctrl/Cmd+Shift+M` for device mode, then
`Ctrl/Cmd+Shift+P` → "Capture screenshot". Gives a clean shot with no window
chrome.

**The GIF:** [ScreenToGif](https://www.screentogif.com) on Windows, Kap on Mac.
Keep it under eight seconds and under 5 MB or GitHub will not play it inline.
Start with an empty cart, type the sentence, stop once the cart has filled and
the "no model call" line appears. That line is the point of the whole project —
make sure it is legible.

## Putting them in

Save to `docs/screenshots/`, then in the README:

```markdown
![The assistant filling the cart](docs/screenshots/assistant.gif)
```

Put the GIF directly under the opening paragraph. Recruiters look at one image,
and that is the one that should be it.
