# Deploying SayServe

Three services, all on free tiers: the database on MongoDB Atlas, the API on
Render, the web app on Vercel. About an hour end to end, most of it waiting.

Do them in this order. The web app needs the API's URL, the API needs the web
app's URL, so there is one step where you come back and fill in the other half.

---

## 1. The database — MongoDB Atlas

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. **Build a Database → M0 (free)**. Pick a region near you, `eu-west-1` for the UK.
3. **Database Access → Add New Database User.** Username and a generated password.
   Copy the password now; it is not shown again.
4. **Network Access → Add IP Address → Allow access from anywhere** (`0.0.0.0/0`).

   Render's outbound addresses are not fixed, so an allow-list of one is not an
   option on the free tier. The database is still protected by the user and
   password; just never commit them.
5. **Connect → Drivers** and copy the connection string. It looks like:

   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

   Put your real password in, and add the database name before the `?`:

   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/sayserve?retryWrites=true&w=majority
   ```

### Seed it

From your own machine, pointing at Atlas rather than your local database:

```bash
MONGODB_URI="your-atlas-string" npm run seed
```

You should see 70 items and 24 option groups. Nothing else in this guide works
until this does.

---

## 2. The API — Render

The API cannot go on Vercel: the kitchen board holds a websocket open, and
Vercel's free tier runs short-lived functions.

1. [render.com](https://render.com) → **New → Web Service** → connect your GitHub repo.
2. Settings:

   | Field | Value |
   | --- | --- |
   | Root Directory | *(leave empty — it is a workspace repo)* |
   | Runtime | Node |
   | Build Command | `npm ci && npm run build:api` |
   | Start Command | `npm run start:api` |
   | Instance Type | Free |

3. **Environment** — add these:

   | Key | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | your Atlas string |
   | `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
   | `CORS_ORIGIN` | your Vercel URL — fill in after step 3 |
   | `PUBLIC_WEB_URL` | the same URL |
   | `GROQ_API_KEY` | optional |
   | `VOYAGE_API_KEY` | optional |
   | `STRIPE_SECRET_KEY` | optional, `sk_test_…` |
   | `STRIPE_WEBHOOK_SECRET` | optional, filled in at step 4 |

4. Deploy. When it finishes, check it:

   ```bash
   curl https://your-api.onrender.com/api/health
   ```

   You want `{"ok":true,...}`. Copy that URL.

**The free tier sleeps** after fifteen minutes idle, and the next request takes
about thirty seconds. The landing page pings `/api/health` on load so the API is
usually awake by the time anyone presses anything. Do not paper over it beyond
that — a cron job pinging your own service every ten minutes is against the
spirit of a free tier, and hosts notice.

---

## 3. The web app — Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → the same repo.
2. Settings:

   | Field | Value |
   | --- | --- |
   | Framework | Next.js |
   | Root Directory | `apps/web` |
   | Build Command | *(default)* |

3. **Environment Variables:**

   | Key | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | `https://your-api.onrender.com` — no trailing slash |

4. Deploy, then copy the URL, for example `https://sayserve.vercel.app`.

5. **Go back to Render** and set `CORS_ORIGIN` and `PUBLIC_WEB_URL` to that URL.
   Render redeploys itself. Until you do this, the browser blocks every API call
   and the site looks broken with nothing in the logs to explain it.

---

## 4. Payments — Stripe

Skip this and the card option hides itself; the shop takes payment on collection.

1. [dashboard.stripe.com](https://dashboard.stripe.com), **Test mode** on.
2. **Developers → API keys** → copy the secret key into Render as `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint**:

   | Field | Value |
   | --- | --- |
   | Endpoint URL | `https://your-api.onrender.com/api/stripe/webhook` |
   | Events | `checkout.session.completed`, `checkout.session.expired` |

4. Copy the **Signing secret** (`whsec_…`) into Render as `STRIPE_WEBHOOK_SECRET`.

The local `stripe listen` secret does not work in production; this is a different
one. Test with card `4242 4242 4242 4242`.

---

## 5. Make yourself the owner

Demo accounts are staff, deliberately: an admin could delete the menu for every
visitor. Promote your own account after registering on the live site.

Atlas → **Browse Collections → users**, find yourself, edit `role` to `admin`.
Or with `mongosh`:

```bash
mongosh "your-atlas-string" --eval 'db.users.updateOne({email:"you@example.com"},{$set:{role:"admin"}})'
```

Sign out and back in.

---

## 6. Check it properly

Run through it as a stranger would, on a phone if you can:

- [ ] The landing page loads and the hero preview animates
- [ ] `/menu` shows 70 items with categories
- [ ] Add something, check out with pay on collection, land on tracking
- [ ] In another browser, **Try as staff** — the board fills with simulated orders
- [ ] Accept the real order; the customer's page moves on its own within a second
- [ ] Mark an item sold out; it greys out on the customer menu
- [ ] The assistant: `2 cheeseburgers no onions and a large coke` says "no model call"
- [ ] `a cheeseburger meal` asks which drink
- [ ] Sign out from the account menu

If the socket does not connect, it is nearly always `CORS_ORIGIN` on Render not
exactly matching the Vercel URL — no trailing slash, and `https`.

---

## What each one costs

| Service | Free tier | The catch |
| --- | --- | --- |
| Atlas M0 | 512 MB | Plenty for this |
| Render | 750 hours a month | Sleeps after 15 minutes idle |
| Vercel Hobby | Generous | Non-commercial use only |
| Groq | Free tier | Rate limited per minute and per day |
| Voyage | Free allowance | The menu is embedded once at startup |
| Stripe test mode | Free | Test cards only, no real money |

Nothing here needs a card.

---

## When something breaks

| Symptom | Cause |
| --- | --- |
| Every API call fails in the browser, nothing in the API logs | `CORS_ORIGIN` does not match the Vercel URL exactly |
| Signing in appears to work but you are signed out on the next page | `NODE_ENV` is not `production` on Render, so the cookie is not `secure` and cross-site |
| The board never updates | The socket is blocked — same CORS cause |
| The menu is empty | The seed was never run against Atlas |
| First visit takes 30 seconds | Render waking up. Expected |
| Card payment does nothing | `STRIPE_SECRET_KEY` missing; the option should be hidden, so check the deploy picked up the variable |
| Orders stay unpaid after paying | The webhook secret is wrong, or the endpoint URL has a typo. Stripe's dashboard shows the failed deliveries |
