# SayServe

**Say it. We serve it.** A takeaway ordering system where tapping, typing and speaking all fill the same cart — and the server decides everything that involves money.

> Most orders never reach a language model. The ones that do cannot invent an item or a price.

[Plan and architecture](docs/PLAN.md) · [Testing walkthrough](docs/TESTING.md) · [Wireframes](docs/wireframes/) · [Menu data](docs/menu.json)

---

## Where this is up to

| Phase | What | Status |
| --- | --- | --- |
| 0 | Plan, menu data, wireframes | Done |
| 1 | Auth and roles, menu API, pricing engine, order state machine, idempotent checkout | Done |
| 2 | Customer web: menu, customiser, cart, checkout, tracking, history | Done |
| 3a | Live kitchen board over sockets | Done |
| 3b | Menu manager, store settings, dashboard | Next |
| 4 | The assistant: safety gate, parser, embeddings, chat, voice, eval harness | |
| 5 | Stripe, refunds, demo mode, accessibility | |
| 6 | Deploy and write up | |

## The two ideas worth reading the code for

**1. One rule sets every price.**

```
unitPrice = basePrice + sum(priceDelta of every chosen option)
lineTotal = unitPrice × quantity
```

Customers and the assistant may only say *which* options were chosen. Every number comes from the menu document. A client that sends its own `unitPrice` is ignored, and there is a test that proves it.

Option groups carry `min` and `max`, which is also how "incomplete" is decided. A meal needing exactly one drink is data, not an opinion, so an unfinished order comes back as `missing_choice` naming the group — which is what lets the UI (and later the assistant) ask one specific question instead of "could you clarify?".

See [`src/lib/pricing.ts`](apps/api/src/lib/pricing.ts).

**2. One table defines every legal status move.**

Nothing else in the codebase assigns `order.status`. A route asks `canTransition` first, and anything unlisted is a `409`. Each move also records who may make it, so "customer cancels" and "staff rejects" are different transitions even though both end an order. A customer can cancel before the kitchen accepts and not after — in the API, not just in the button.

See [`src/lib/orderState.ts`](apps/api/src/lib/orderState.ts).

**3. The browser never holds a price.**

The cart in `localStorage` stores *which* item and *which* options, and nothing about money. Every figure on screen comes back from `POST /api/orders/quote`. A tampered cart changes which items get quoted and nothing else, and a stale price cannot be displayed because there is no price to go stale.

The same rule makes the UI honest about incomplete orders: a meal with no drink chosen sits in the cart flagged and unpriced, and the Checkout button is disabled because the server said `complete: false` — not because the client worked it out.

See [`apps/web/src/lib/cart.ts`](apps/web/src/lib/cart.ts) and [`CartPanel.tsx`](apps/web/src/components/CartPanel.tsx).

**4. One idempotency key per visit to checkout, not per click.**

If the connection drops after the server created the order but before the reply arrives, pressing Pay again sends the same key and the API returns the order it already made. A fresh key per click would create a duplicate — which is the bug the key exists to prevent, so generating it in the click handler would quietly defeat it.

See [`CheckoutForm.tsx`](apps/web/src/components/CheckoutForm.tsx).

## API

| Method | Route | Who |
| --- | --- | --- |
| POST | `/api/auth/register` · `/login` · `/logout` · `/demo` | Anyone |
| GET · PATCH | `/api/auth/me` | Signed in |
| GET | `/api/menu` · `/api/menu/categories` · `/api/menu/:slug` | Anyone |
| POST | `/api/orders/quote` | Anyone |
| POST | `/api/orders` | Anyone (guest or signed in) |
| GET | `/api/orders/mine` | Signed in |
| GET | `/api/orders/:id` | Owner, guest with token, or staff |
| POST | `/api/orders/:id/cancel` | Owner or guest with token |
| GET | `/api/orders/kitchen/board` | Staff, admin |
| POST | `/api/orders/:id/status` | Staff, admin |

Auth is a JWT in an httpOnly cookie. Guests get a token at checkout so they can watch their order without an account.

## Running it

You need Node 20+ and a MongoDB connection string (a free Atlas M0 cluster works).

```bash
git clone https://github.com/YOUR-USERNAME/sayserve.git
cd sayserve
npm install

cp apps/api/.env.example apps/api/.env   # fill in MONGODB_URI and JWT_SECRET
cp apps/web/.env.example apps/web/.env.local
npm run seed                             # loads 70 items and 24 option groups

npm run dev:api                          # http://localhost:5000
npm run dev:web                          # http://localhost:3000  (second terminal)
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Check it is alive:

```bash
curl http://localhost:5000/api/health
curl -X POST http://localhost:5000/api/orders/quote \
  -H 'Content-Type: application/json' \
  -d '{"lines":[{"slug":"cheeseburger-meal","quantity":1}]}'
```

That second call comes back incomplete, naming the drink group. Add `"choices":{"meal-drink":["Cola"]}` and it prices.

## Tests

```bash
npm run test:unit   # pricing and the state machine — pure, instant
npm test            # everything, including the full order lifecycle over HTTP
```

The integration suite places a real order and drives it to Completed, then proves the closed paths are closed: skipping a step, rejecting without a reason, a customer accepting their own order, cancelling after the kitchen started, a double-tapped Pay button, and one customer reading another's order. It uses an in-memory MongoDB, so it needs no database of your own — the first run downloads a `mongod` binary.

CI runs the typecheck and both suites on every push, against a MongoDB service container.

To walk through it by hand — ordering as a customer, accepting as staff, and trying to break it — see [docs/TESTING.md](docs/TESTING.md).

## The web app

`apps/web` is Next.js with the App Router and Tailwind, using the palette from the wireframes so the drawing and the build match.

The customiser is generated entirely from option group data. There is no special case for "size" or for meals — a meal is just an item with a group whose `min` is 1, so the same code that renders "Remove anything?" renders "Choose a drink" and blocks Add until it is answered.

The pricing and order-status *types* are imported straight from the API source (`@api/lib/pricing`, `@api/lib/orderState`). Both files import nothing at all, so this costs the bundle nothing and there is one definition of the contract instead of two that drift. This is the main practical reason both apps live in one repository.

## Guests are first-class

There is no sign-up wall. Checkout takes a name and a phone number, and the API hands back a token that the browser keeps, so a guest can watch their order and cancel it without an account. Signing in only adds history across devices.

Tracking rides the same socket the kitchen board uses, so the timeline moves the moment the kitchen taps Accept. Polling stays as a slow safety net for a dropped connection or a proxy that will not hold a websocket open, and both stop once the order is finished.

## Real-time

Socket.io, with rooms rather than broadcasts. Staff join `kitchen` on connect and see every order. A customer joins only the room for an order they can prove is theirs — by owning it, or by holding the guest token from checkout. Without that check, anyone could listen to the whole shop by guessing an id.

Routes never import the socket server. They call `emitOrderNew` in [`lib/events.ts`](apps/api/src/lib/events.ts), which does nothing at all when no socket is attached — which is exactly how the tests run.

## Menu data

70 items across nine categories, 24 shared option groups, 201 aliases including UK slang ("chips", "nuggs", "cuppa", "dirty fries"). Allergens and dietary tags on every item; breakfast carries a serving window.

Option groups are defined once and referenced by id, so "Choose a drink" is edited in one place and every meal updates. The seed script re-checks integrity before writing: duplicate ids, broken `linkedItem` references, impossible `min`/`max`, more than one default per group.

One ambiguity is deliberate: "brew" maps to both Coffee and Tea. It stays as a permanent test that the assistant asks rather than guesses.

## Stack

TypeScript everywhere. Node, Express, Mongoose, Zod and JWT on the API. Next.js and Tailwind on the web app (Phase 2). Socket.io for the kitchen board (Phase 3). One hosted LLM and one hosted embedding model (Phase 4). Stripe in test mode (Phase 5). Vitest and Supertest for tests, GitHub Actions for CI.

No Python and no trained model. The embeddings come from an API, so there is nothing to train and nothing to host; a folder of machine learning that did no work would be decoration. If logged traffic later justifies a trained fast-path model, it comes back then, with real data behind it.

## Background

SayServe grew out of [fronter](https://github.com/MdRahi99), my MSc research project, which compared four LLM ordering architectures on a 210-order benchmark. Three ideas from it survived: only deterministic rules may refuse a request, the database owns every price, and validation happens last against live data. The rest was rebuilt — in particular the intent classifier, which answered the wrong question and has been replaced by checking the actual cart.

## Licence

MIT
