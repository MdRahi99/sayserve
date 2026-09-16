/**
 * The Phase 1 checkpoint, as a test.
 *
 * Places a real order through the HTTP API and drives it to Completed, then
 * proves the illegal paths are actually closed. Runs against an in-memory
 * MongoDB, so it needs no database of your own — the first run downloads a
 * mongod binary, which takes a minute.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/placeholder";
process.env.JWT_SECRET ??= "test-secret-that-is-long-enough-x";
process.env.NODE_ENV = "test";

const { createApp } = await import("../../src/app.js");
const { MenuItem } = await import("../../src/models/MenuItem.js");
const { OptionGroup } = await import("../../src/models/OptionGroup.js");
const { Settings } = await import("../../src/models/Settings.js");

const app = createApp();

/**
 * Two ways to get a database:
 *   - MONGO_TEST_URI set (CI uses a mongo service container) — use it
 *   - otherwise spin up an in-memory mongod locally
 * Same tests either way.
 */
let mongod: MongoMemoryServer | undefined;

const agent = () => request.agent(app);

beforeAll(async () => {
  if (process.env.MONGO_TEST_URI) {
    await mongoose.connect(process.env.MONGO_TEST_URI);
    await mongoose.connection.dropDatabase();
  } else {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }

  await OptionGroup.insertMany([
    {
      groupId: "meal-drink", name: "Choose a drink", min: 1, max: 1,
      options: [
        { name: "Cola", priceDelta: 0, default: true },
        { name: "Milkshake", priceDelta: 1.6 },
      ],
    },
    {
      groupId: "burger-remove", name: "Remove anything?", min: 0, max: 3,
      options: [
        { name: "No onions", priceDelta: 0 },
        { name: "No pickles", priceDelta: 0 },
        { name: "No cheese", priceDelta: 0 },
      ],
    },
  ]);
  await MenuItem.insertMany([
    {
      slug: "cheeseburger", name: "Cheeseburger", category: "burgers",
      basePrice: 4.49, optionGroups: ["burger-remove"], available: true,
    },
    {
      slug: "cheeseburger-meal", name: "Cheeseburger Meal", category: "meals",
      basePrice: 7.29, optionGroups: ["meal-drink"], available: true,
    },
  ]);
  await Settings.create({ key: "store" });
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

async function staffAgent() {
  const a = agent();
  await a.post("/api/auth/demo").send({ role: "staff" }).expect(201);
  return a;
}

const checkout = (key: string, extra: Record<string, unknown> = {}) => ({
  lines: [
    { slug: "cheeseburger", quantity: 2, choices: { "burger-remove": ["No onions"] } },
    { slug: "cheeseburger-meal", quantity: 1, choices: { "meal-drink": ["Milkshake"] } },
  ],
  fulfilment: "collection",
  customer: { name: "Aisha", phone: "07700900123" },
  paymentMethod: "on_collection",
  idempotencyKey: key,
  ...extra,
});

describe("menu", () => {
  it("returns items with the option groups they need", async () => {
    const res = await request(app).get("/api/menu").expect(200);
    expect(res.body.count).toBe(2);
    expect(res.body.optionGroups.map((g: any) => g.groupId).sort())
      .toEqual(["burger-remove", "meal-drink"]);
  });
});

describe("quoting a cart", () => {
  it("prices what the customer chose", async () => {
    const res = await request(app).post("/api/orders/quote").send({
      lines: [{ slug: "cheeseburger", quantity: 2 }],
    }).expect(200);
    expect(res.body.subtotal).toBe(8.98);
    expect(res.body.complete).toBe(true);
  });

  it("asks for the drink instead of guessing", async () => {
    const res = await request(app).post("/api/orders/quote").send({
      lines: [{ slug: "cheeseburger-meal", quantity: 1 }],
    }).expect(200);
    expect(res.body.complete).toBe(false);
    expect(res.body.problems[0]).toMatchObject({
      kind: "missing_choice", groupName: "Choose a drink",
    });
  });

  it("ignores a price the client tries to send", async () => {
    const res = await request(app).post("/api/orders/quote").send({
      lines: [{ slug: "cheeseburger", quantity: 1, unitPrice: 0.01 }],
    }).expect(200);
    expect(res.body.subtotal).toBe(4.49);
  });
});

describe("the whole order lifecycle", () => {
  let orderId = "";
  let guestToken = "";

  it("places an order", async () => {
    const res = await request(app).post("/api/orders")
      .send(checkout("key-lifecycle-1")).expect(201);

    orderId = res.body.order.id;
    guestToken = res.body.order.guestToken;

    expect(res.body.order.status).toBe("placed");
    expect(res.body.order.total).toBe(17.87);
    // The very first order must be 1001, not 1: an upsert with $inc writes the
    // field itself, so a schema default on that field would never apply.
    expect(res.body.order.orderNumber).toBe(1001);
    expect(res.body.order.statusHistory).toHaveLength(1);
  });

  it("shows up on the kitchen board", async () => {
    const staff = await staffAgent();
    const res = await staff.get("/api/orders/kitchen/board").expect(200);
    expect(res.body.columns.new.map((o: any) => o.id)).toContain(orderId);
  });

  it("refuses to skip straight to ready", async () => {
    const staff = await staffAgent();
    const res = await staff.post(`/api/orders/${orderId}/status`)
      .send({ to: "ready" }).expect(409);
    expect(res.body.code).toBe("not_allowed");
  });

  it("refuses a rejection with no reason", async () => {
    const staff = await staffAgent();
    const res = await staff.post(`/api/orders/${orderId}/status`)
      .send({ to: "rejected" }).expect(409);
    expect(res.body.code).toBe("needs_reason");
  });

  it("refuses a status change from a customer", async () => {
    const customer = agent();
    await customer.post("/api/auth/demo").send({ role: "customer" }).expect(201);
    await customer.post(`/api/orders/${orderId}/status`).send({ to: "accepted" }).expect(403);
  });

  it("refuses a status change from nobody at all", async () => {
    await request(app).post(`/api/orders/${orderId}/status`)
      .send({ to: "accepted" }).expect(401);
  });

  it("accepts, prepares, readies and completes", async () => {
    const staff = await staffAgent();
    for (const to of ["accepted", "preparing", "ready", "completed"]) {
      const res = await staff.post(`/api/orders/${orderId}/status`).send({
        to, ...(to === "accepted" ? { readyInMinutes: 15 } : {}),
      }).expect(200);
      expect(res.body.order.status).toBe(to);
    }
  });

  it("records every step with who did it", async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}?token=${guestToken}`).expect(200);
    const history = res.body.order.statusHistory;
    expect(history.map((h: any) => h.to))
      .toEqual(["placed", "accepted", "preparing", "ready", "completed"]);
    expect(history.at(-1).actor).toBe("staff");
    expect(history.at(-1).label).toBe("Collected");
  });

  it("will not move a completed order again", async () => {
    const staff = await staffAgent();
    const res = await staff.post(`/api/orders/${orderId}/status`)
      .send({ to: "preparing" }).expect(409);
    expect(res.body.code).toBe("terminal");
  });
});

describe("cancelling", () => {
  it("lets the customer cancel before the kitchen accepts", async () => {
    const created = await request(app).post("/api/orders")
      .send(checkout("key-cancel-1")).expect(201);
    const { id, guestToken } = created.body.order;

    const res = await request(app).post(`/api/orders/${id}/cancel`)
      .send({ token: guestToken }).expect(200);
    expect(res.body.order.status).toBe("cancelled");
  });

  it("stops the customer cancelling once the kitchen has started", async () => {
    const created = await request(app).post("/api/orders")
      .send(checkout("key-cancel-2")).expect(201);
    const { id, guestToken } = created.body.order;

    const staff = await staffAgent();
    await staff.post(`/api/orders/${id}/status`).send({ to: "accepted" }).expect(200);

    const res = await request(app).post(`/api/orders/${id}/cancel`)
      .send({ token: guestToken }).expect(409);
    expect(res.body.code).toBe("not_allowed");
    expect(res.body.error).toMatch(/already started/i);
  });

  it("says plainly when an order was already cancelled", async () => {
    const created = await request(app).post("/api/orders")
      .send(checkout("key-cancel-3")).expect(201);
    const { id, guestToken } = created.body.order;

    await request(app).post(`/api/orders/${id}/cancel`)
      .send({ token: guestToken }).expect(200);
    const again = await request(app).post(`/api/orders/${id}/cancel`)
      .send({ token: guestToken }).expect(409);
    expect(again.body.code).toBe("terminal");
  });

  it("gives every order its own number", async () => {
    const a = await request(app).post("/api/orders").send(checkout("key-num-a")).expect(201);
    const b = await request(app).post("/api/orders").send(checkout("key-num-b")).expect(201);
    expect(b.body.order.orderNumber).toBe(a.body.order.orderNumber + 1);
  });
});

describe("checkout guards", () => {
  it("refuses an order with a missing required choice", async () => {
    const res = await request(app).post("/api/orders").send({
      ...checkout("key-incomplete"),
      lines: [{ slug: "cheeseburger-meal", quantity: 1 }],
    }).expect(422);
    expect(res.body.problems[0].kind).toBe("missing_choice");
  });

  it("refuses an item that is not on the menu", async () => {
    const res = await request(app).post("/api/orders").send({
      ...checkout("key-ferrari"),
      lines: [{ slug: "ferrari", quantity: 1 }],
    }).expect(422);
    expect(res.body.problems[0].kind).toBe("not_found");
  });

  it("makes a repeated checkout return the same order, not a second one", async () => {
    const first = await request(app).post("/api/orders")
      .send(checkout("key-double-tap")).expect(201);
    const second = await request(app).post("/api/orders")
      .send(checkout("key-double-tap")).expect(200);

    expect(second.body.idempotentReplay).toBe(true);
    expect(second.body.order.id).toBe(first.body.order.id);
    expect(second.body.order.orderNumber).toBe(first.body.order.orderNumber);
  });

  it("needs an address for delivery", async () => {
    const res = await request(app).post("/api/orders").send({
      ...checkout("key-no-address"),
      fulfilment: "delivery", paymentMethod: "card",
    }).expect(400);
    expect(res.body.error).toMatch(/address/i);
  });

  it("makes delivery orders pay by card", async () => {
    await request(app).post("/api/orders").send({
      ...checkout("key-delivery-cash"),
      fulfilment: "delivery",
      address: { line1: "14 High Street", postcode: "SS1 1AA" },
    }).expect(422);
  });

  it("freezes prices into the order", async () => {
    const created = await request(app).post("/api/orders")
      .send(checkout("key-frozen")).expect(201);
    const before = created.body.order.total;

    await MenuItem.updateOne({ slug: "cheeseburger" }, { basePrice: 9.99 });
    const after = await request(app)
      .get(`/api/orders/${created.body.order.id}?token=${created.body.order.guestToken}`)
      .expect(200);

    expect(after.body.order.total).toBe(before);
    await MenuItem.updateOne({ slug: "cheeseburger" }, { basePrice: 4.49 });
  });

  it("refuses everything while the store is closed", async () => {
    await Settings.updateOne({ key: "store" }, { isOpen: false });
    await request(app).post("/api/orders").send(checkout("key-closed")).expect(409);
    await Settings.updateOne({ key: "store" }, { isOpen: true });
  });
});

describe("access", () => {
  it("keeps one customer out of another customer's order", async () => {
    const created = await request(app).post("/api/orders")
      .send(checkout("key-privacy")).expect(201);

    const nosy = agent();
    await nosy.post("/api/auth/demo").send({ role: "customer" }).expect(201);
    await nosy.get(`/api/orders/${created.body.order.id}`).expect(403);
  });

  it("keeps a customer off the kitchen board", async () => {
    const customer = agent();
    await customer.post("/api/auth/demo").send({ role: "customer" }).expect(201);
    await customer.get("/api/orders/kitchen/board").expect(403);
  });
});

describe("accounts", () => {
  it("registers, signs out, signs back in", async () => {
    const a = agent();
    await a.post("/api/auth/register").send({
      name: "Rahi", email: "rahi@example.com", password: "long-enough-pw",
    }).expect(201);

    const me = await a.get("/api/auth/me").expect(200);
    expect(me.body.user.role).toBe("customer");

    await a.post("/api/auth/logout").expect(200);
    await a.get("/api/auth/me").expect(401);

    await a.post("/api/auth/login").send({
      email: "rahi@example.com", password: "long-enough-pw",
    }).expect(200);
    await a.get("/api/auth/me").expect(200);
  });

  it("refuses a duplicate email", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Someone else", email: "rahi@example.com", password: "another-password",
    }).expect(409);
  });

  it("gives the same message for a wrong email and a wrong password", async () => {
    const wrongPw = await request(app).post("/api/auth/login")
      .send({ email: "rahi@example.com", password: "not-the-password" }).expect(401);
    const noUser = await request(app).post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "not-the-password" }).expect(401);
    expect(wrongPw.body.error).toBe(noUser.body.error);
  });

  it("lists a signed-in customer's own orders", async () => {
    const a = agent();
    await a.post("/api/auth/demo").send({ role: "customer" }).expect(201);
    await a.post("/api/orders").send(checkout("key-mine-1")).expect(201);

    const res = await a.get("/api/orders/mine").expect(200);
    expect(res.body.orders).toHaveLength(1);
  });
});
