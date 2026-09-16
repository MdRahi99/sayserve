# SayServe wireframes

20 screens covering the whole journey on both phone and desktop, from opening the site to the kitchen marking an order collected.

## First, the honest bit

I can't hand you a `.fig` file. That format is closed — only Figma itself writes it, and there's no supported way to generate one outside the app. Anyone offering you a generated `.fig` is offering you a file Figma won't open.

What does work, and works well, is **SVG**. Figma imports SVG natively and turns it into real editable layers: every rectangle, every label, every button is a separate object you can select, move, restyle and group. That's what these files are.

## How to get them into Figma

**Everything at once**

1. Open a Figma file.
2. Drag `sayserve-all-screens.svg` onto the canvas.
3. All 20 screens land as one group, laid out in three labelled sections: customer on mobile, customer on desktop, staff and admin.
4. Right-click the group and choose **Ungroup** once to get the screens as separate layers.

**One screen at a time** — drag any of the numbered files in instead. Better if you want each screen as its own frame.

**To make a screen a real Figma frame:** select the imported screen, then press `Ctrl/Cmd + Alt + G` (frame selection). You can then set the frame size (390 × 844 phone, 1440 × 900 desktop, 1194 × 834 tablet) and rename it.

## Fonts

Text uses Inter, with Helvetica and Arial as fallbacks. If Figma warns about a missing font, install [Inter](https://fonts.google.com/specimen/Inter) (free) or let Figma substitute — nothing will break either way.

## The screens

| # | File | Frame |
| --- | --- | --- |
| 1 | `01-home.svg` | 390 × 844 |
| 2 | `02-menu.svg` | 390 × 844 |
| 3 | `03-item-customiser.svg` | 390 × 844 |
| 4 | `04-cart.svg` | 390 × 844 |
| 5 | `05-chat-and-voice.svg` | 390 × 844 |
| 6 | `06-checkout.svg` | 390 × 844 |
| 7 | `07-order-tracking.svg` | 390 × 844 |
| 8 | `08-order-history.svg` | 390 × 844 |
| 9 | `09-staff-sign-in.svg` | 390 × 844 |
| 10 | `10-order-detail.svg` | 390 × 844 |
| 11 | `11-kitchen-board.svg` | 1194 × 834 |
| 12 | `12-menu-manager.svg` | 1194 × 834 |
| 13 | `13-dashboard.svg` | 1194 × 834 |
| 14 | `14-checkout-delivery.svg` | 390 × 844 |
| D1 | `D1-desktop-home.svg` | 1440 × 900 |
| D2 | `D2-desktop-menu.svg` | 1440 × 900 |
| D3 | `D3-desktop-item-customiser.svg` | 1440 × 900 |
| D4 | `D4-desktop-chat.svg` | 1440 × 900 |
| D5 | `D5-desktop-checkout.svg` | 1440 × 900 |
| D6 | `D6-desktop-order-tracking.svg` | 1440 × 900 |

`sayserve-all-screens.svg` holds all 20 on one board (3120 × 8300).

## Mobile and desktop are not the same layout

Desktop is not the phone screen stretched wide. What changes:

| Screen | Phone | Desktop |
| --- | --- | --- |
| Menu | One column, cart hidden behind a sticky bottom bar | Three columns: category rail, item grid, cart panel always visible on the right |
| Item options | Full screen, back arrow | Modal over the menu with the photo beside the options, so you never lose your place |
| Assistant | Full screen, cart underneath the thread | Thread on the left, cart on the right, so you watch it fill as you type |
| Checkout | One column, scroll | Form on the left, order summary pinned on the right |
| Tracking | Vertical timeline | Horizontal timeline with the pickup address beside it |

The breakpoint is around 1024px. Between 640 and 1024 (tablets, small laptops) the phone layout stretches to two columns for the item grid and keeps the sticky cart bar, which needs no separate wireframe.

Staff and admin screens are drawn once, at tablet size (1194 × 834). A kitchen tablet is the harder case — bigger touch targets, readable from a step away — and the same layout works unchanged in a desktop browser, so there is no separate desktop version.

## The flow

```
Customer   1 Home → 2 Menu → 3 Customiser → 4 Cart → 6 Checkout → 7 Tracking → 8 History
                 ↘ 5 Chat and voice ↗        (fills the same cart)
           14 is checkout with delivery chosen (address entry)
           Desktop: D1 → D2 → D3 → D5 → D6, with D4 as the assistant

Staff      9 Sign in → 11 Kitchen board → 10 Order detail → accept → preparing → ready
Admin      9 Sign in → 12 Menu manager · 13 Dashboard and review queue
```

## Design decisions worth keeping when these become code

- **Sold-out items stay visible, greyed out.** People search for what they can't have; hiding it makes them hunt.
- **Required option groups are labelled "Required".** The badge comes from the data (`min: 1`), not from a designer's judgement, so the UI and the server can never disagree.
- **The cart holds incomplete lines.** A meal with no drink chosen sits there flagged and unpriced, and checkout stays locked. Nothing guesses on the customer's behalf.
- **"Matched directly · 22 ms" under a chat reply.** The fast path made visible. It's also the number the README leads with.
- **Order-age timers turn red.** Six minutes unaccepted is a problem the board should shout about.
- **Changes are red on the kitchen ticket.** "No onions" is the line that gets missed.
- **Cancel is dead once a kitchen has accepted.** The state machine says so, so the button says so too.
- **The desktop cart is always on screen.** On a phone it hides behind a bar; on desktop there is room, and a visible cart is what makes the assistant trustworthy — you watch it fill rather than trusting it did.

## Colours and type

| Token | Value |
| --- | --- |
| Page | `#EFEEE9` |
| Card | `#FFFFFF` |
| Surface | `#F6F5F1` |
| Border | `#E1DFD8` / `#C9C7BF` |
| Text | `#1F1E1C` / `#6B6A65` / `#9D9B95` |
| Accent | `#185FA5` on `#E6F1FB` |
| Success | `#3B6D11` on `#EAF3DE` |
| Warning | `#854F0B` on `#FAEEDA` |
| Danger | `#A32D2D` on `#FCEBEB` |

Type scale: 11 / 12 / 13 / 14 / 15 / 18 / 24 / 30. Two weights only, 400 and 500. Corner radius 8 for controls, 12 for cards.

These are wireframes: greys, boxes for photos, no brand identity yet. Colour is used only where it carries meaning (required, warning, overdue).
