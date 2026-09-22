/**
 * Takes the README screenshots.
 *
 *     node tools/mock-api.mjs &
 *     NEXT_PUBLIC_API_URL=http://localhost:5055 npm run build --workspace @sayserve/web
 *     NEXT_PUBLIC_API_URL=http://localhost:5055 npm run start --workspace @sayserve/web &
 *     node tools/screenshots.mjs
 *
 * The cart is seeded through localStorage rather than by clicking through the
 * flow: a screenshot script that depends on six interactions breaks every time
 * a button moves.
 */
import { mkdirSync } from "node:fs";
import puppeteer from "/home/claude/.npm-global/lib/node_modules/@mermaid-js/mermaid-cli/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3120";
const OUT = process.env.SHOT_OUT ?? "/tmp/shots";
const CHROME = "/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome";

const CART = [
  { key: "cheeseburger#burger-remove:No onions;burger-size:Single", slug: "cheeseburger",
    name: "Cheeseburger", quantity: 2,
    choices: { "burger-size": ["Single"], "burger-remove": ["No onions"] } },
  { key: "cola#drink-size:Large", slug: "cola", name: "Cola", quantity: 1,
    choices: { "drink-size": ["Large"] } },
];

const CHAT = [
  { role: "assistant", text: "Tell me what you'd like, in your own words. You can type or hold the mic." },
  { role: "user", text: "two cheeseburgers, no onions" },
  { role: "assistant", text: "Added. Anything else?", route: "fast_path", modelCalled: false, ms: 11 },
  { role: "user", text: "and a large coke" },
  { role: "assistant", text: "Added. Anything else?", route: "fast_path", modelCalled: false, ms: 9 },
];

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ["--no-sandbox", "--force-device-scale-factor=2"],
});

async function shot(name, url, { width = 1440, height = 900, full = false, cart = false,
                                 before = null, wait = 1400 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });

  if (cart) {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate((lines) => {
      localStorage.setItem("sayserve-cart",
        JSON.stringify({ state: { lines }, version: 1 }));
    }, CART);
  }

  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle0" });
  if (before) await before(page);
  await new Promise((r) => setTimeout(r, wait));
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log(`  ${name}.png`);
  await page.close();
}

console.log("taking screenshots");

await shot("landing", "/", { full: true });
await shot("menu", "/menu", { cart: true });
await shot("menu-mobile", "/menu", { width: 390, height: 844, cart: true });

await shot("customiser", "/menu", {
  before: async (page) => {
    await page.type('input[placeholder*="Search"]', "cheeseburger meal");
    await new Promise((r) => setTimeout(r, 500));
    const button = await page.$('button');
    const buttons = await page.$$("button");
    for (const b of buttons) {
      const text = await b.evaluate((el) => el.textContent ?? "");
      if (text.trim() === "Choose") { await b.click(); break; }
    }
  },
});

await shot("chat", "/chat", {
  cart: true,
  before: async (page) => {
    await page.evaluate((turns) => {
      // The assistant keeps its thread in component state, so put the words on
      // screen the only way a screenshot can: type the last one.
      const input = document.querySelector('input[placeholder*="Type"]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, "value").set;
        setter.call(input, "and a large coke");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, CHAT);
  },
});

await shot("checkout", "/checkout", { cart: true });
await shot("tracking", "/orders/order-1042", { cart: false });
await shot("kitchen", "/staff", { width: 1280, height: 900 });
await shot("dashboard", "/staff/dashboard", { full: true });

await browser.close();
console.log(`\ndone — ${OUT}`);
