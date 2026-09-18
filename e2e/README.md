# End-to-end tests

One order, the whole way through, in a real browser: menu, customiser, cart,
checkout, tracking, and the kitchen board moving it to completed — with the
customer's page updating over the socket as it happens.

Everything else is tested where it lives. This catches the thing unit tests
cannot: the wiring between the pieces coming apart.

## Running them

Three terminals, because the tests do not start anything themselves. A test that
quietly seeds its own database is a test that lies about what it proved.

```bash
npm run dev:api      # 1
npm run dev:web      # 2
npm run test:e2e     # 3
```

First time only:

```bash
npx playwright install chromium
```

`npm run test:e2e:ui` opens the Playwright inspector, which is the fastest way to
see where something went wrong.

**On a cold start**, the first test can be slow: Next compiles each route the
first time it is requested in dev, which takes ten or twenty seconds. The tests
allow for it. Visiting `/menu` and `/chat` in a browser first makes the run
quicker, and running against a production build (`npm run build:web` then
`npm run start --workspace @sayserve/web`) removes the wait entirely.

## Not in CI, and why

These need two servers, a database and a browser. Standing all that up in CI is
possible but slow, and a flaky end-to-end job teaches everyone to ignore red
builds — which costs more than it catches. CI runs the typecheck, the unit tests,
the integration suite and the assistant eval, which together cover the logic.
These run before a deploy.
