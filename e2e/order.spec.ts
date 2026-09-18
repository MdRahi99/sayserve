import { expect, test, type Page } from "@playwright/test";

/**
 * Next compiles each route the first time it is requested in dev, which can
 * take ten or twenty seconds on a cold start. Waiting on something that only
 * exists once the page is interactive — rather than on a heading that is
 * desktop-only — keeps the first test from failing for a reason that has
 * nothing to do with the code.
 */
const COLD_START = 40_000;

async function openMenu(page: Page) {
  await page.goto("/menu");
  await expect(page.getByPlaceholder(/search/i)).toBeVisible({ timeout: COLD_START });
  // The grid is populated from the API, so wait for a real item rather than
  // the loading skeleton.
  await expect(page.getByRole("button", { name: /choose|^add$/i }).first())
    .toBeVisible({ timeout: COLD_START });
}

/**
 * One order, the whole way through, in a real browser.
 *
 * Everything else is tested where it lives: pricing in unit tests, the state
 * machine over HTTP, the assistant in the eval. This exists to catch the thing
 * none of those can — the wiring between them coming apart.
 *
 * It needs the API, the web app and a database running. See e2e/README.md.
 */

test.describe("ordering", () => {
  test.beforeEach(async ({ context }) => {
    // A cart left in localStorage from a previous run would poison the totals.
    await context.clearCookies();
  });

  test("a customer can order, and the kitchen can complete it", async ({ page, browser }) => {
    // ---------------------------------------------------------- customer
    await openMenu(page);

    // Something with no required choices, so this test is about the flow.
    await page.getByPlaceholder(/search/i).fill("cheeseburger");
    await page.getByRole("button", { name: /choose|add/i }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /^add ·/i }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole("link", { name: /checkout/i }).click();
    await expect(page).toHaveURL(/\/checkout/);

    await page.getByPlaceholder("Name").fill("Playwright");
    await page.getByPlaceholder("Phone").fill("07700900123");
    await page.getByRole("button", { name: /pay on collection/i }).click();
    await page.getByRole("button", { name: /place order/i }).click();

    await expect(page).toHaveURL(/\/orders\//);
    const heading = page.getByRole("heading", { name: /order #\d+/i });
    await expect(heading).toBeVisible();

    const orderNumber = (await heading.textContent())!.match(/#(\d+)/)![1]!;

    // The status badge and the timeline both say the same words. Everything
    // below means the timeline, so name it once.
    const timeline = page.getByRole("list", { name: /order progress/i });
    await expect(timeline.getByText(/order placed/i)).toBeVisible();

    // ------------------------------------------------------------- staff
    // A second browser context, because the two sign-ins share cookies otherwise.
    const staffContext = await browser.newContext();
    const staff = await staffContext.newPage();

    await staff.goto("/staff/signin");
    await expect(staff.getByRole("button", { name: /try as staff/i }))
      .toBeVisible({ timeout: COLD_START });
    await staff.getByRole("button", { name: /try as staff/i }).click();
    await expect(staff).toHaveURL(/\/staff/);

    const card = staff.locator("article", { hasText: `#${orderNumber}` });
    await expect(card).toBeVisible({ timeout: 15_000 });

    await card.getByRole("button", { name: /^accept$/i }).click();
    // The customer's page must move on its own: this is the socket working.
    await expect(timeline.getByText(/accepted by the kitchen/i)).toBeVisible({ timeout: 15_000 });

    await card.getByRole("button", { name: /start preparing/i }).click();
    await card.getByRole("button", { name: /mark ready/i }).click();
    await expect(timeline.getByText(/ready to collect/i)).toBeVisible({ timeout: 15_000 });

    await card.getByRole("button", { name: /collected/i }).click();
    await staffContext.close();
  });

  /**
   * If this one fails with the dialog closing, the database is stale: run
   * `npm run seed`. "Choose a drink" used to carry a default, which meant the
   * meal never asked — the behaviour this whole test exists to protect.
   */
  test("a meal cannot be added until the drink is chosen", async ({ page }) => {
    await openMenu(page);
    await page.getByPlaceholder(/search/i).fill("cheeseburger meal");
    await page.getByRole("button", { name: /choose/i }).first().click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /^add ·/i }).click();

    // The dialog stays open, because a required group is unanswered. The badge
    // on the group and the message at the bottom both say "please choose"; the
    // message is the one that tells the customer what to do.
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("alert")).toContainText(/choose a drink/i);

    await dialog.getByRole("button", { name: /^cola$/i }).click();
    await dialog.getByRole("button", { name: /^add ·/i }).click();
    await expect(dialog).toBeHidden();
  });

  test("the assistant fills the same cart", async ({ page }) => {
    await page.goto("/chat");
    await expect(page.getByPlaceholder(/type your order/i))
      .toBeVisible({ timeout: COLD_START });
    await page.getByPlaceholder(/type your order/i).fill("2 cheeseburgers no onions");
    await page.getByRole("button", { name: /^send$/i }).click();

    // Both the reply and the cart say "2 × Cheeseburger", so be specific: the
    // point of this test is that the cart filled, not that the reply claimed it.
    const cart = page.getByRole("region", { name: /your cart/i });
    await expect(cart.getByText(/2 × cheeseburger/i)).toBeVisible({ timeout: 15_000 });
    await expect(cart.getByText(/no onions/i)).toBeVisible();

    // The claim the README makes, checked in a browser.
    await expect(page.getByText(/no model call/i)).toBeVisible();
  });
});
