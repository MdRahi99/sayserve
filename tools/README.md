# tools

## gen-menu-art.py

Draws the illustration for every item in `docs/menu.json`.

```bash
python3 tools/gen-menu-art.py
npm run seed
```

Writes `apps/web/public/menu/<slug>.svg` and points each item's `imageUrl` at
it. Seventy files, about 550 KB in total — less than one photograph.

Everything is built from shared parts: one burger function with arguments for
cheese, a second patty, a chicken fillet, jalapeños. That is what keeps seventy
drawings looking like one hand made them, and it means a new item usually costs
one line.

Add a menu item and the script names the slug it could not draw. Add an entry to
the `DRAW` map in the same file.

Swapping in photographs later means pointing `imageUrl` at them instead —
nothing else in the code changes.
