/**
 * Seed the menu from docs/menu.json.
 *
 * Runs the same integrity checks the menu generator does, so a broken
 * linkedItem or an impossible min/max is caught before it reaches the database
 * rather than surfacing as a mysterious pricing bug later.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB, disconnectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { MenuItem } from "../models/MenuItem.js";
import { OptionGroup } from "../models/OptionGroup.js";
import { Settings } from "../models/Settings.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const MENU_PATH = path.resolve(here, "../../../../docs/menu.json");

type Menu = {
  restaurant: string;
  optionGroups: { groupId: string; name: string; min: number; max: number; options: { name: string; priceDelta: number; linkedItem?: string; default?: boolean }[] }[];
  items: { slug: string; name: string; optionGroups: string[] }[];
};

function check(menu: Menu) {
  const problems: string[] = [];
  const slugs = new Set(menu.items.map((i) => i.slug));
  const groupIds = new Set(menu.optionGroups.map((g) => g.groupId));

  if (slugs.size !== menu.items.length) problems.push("duplicate item slug");
  if (groupIds.size !== menu.optionGroups.length) problems.push("duplicate groupId");

  for (const g of menu.optionGroups) {
    if (g.min > g.max) problems.push(`${g.groupId}: min > max`);
    if (g.max > g.options.length) problems.push(`${g.groupId}: max exceeds option count`);
    if (g.options.filter((o) => o.default).length > 1) {
      problems.push(`${g.groupId}: more than one default`);
    }
    for (const o of g.options) {
      if (o.linkedItem && !slugs.has(o.linkedItem)) {
        problems.push(`${g.groupId}: linkedItem ${o.linkedItem} does not exist`);
      }
    }
  }
  for (const i of menu.items) {
    for (const gid of i.optionGroups) {
      if (!groupIds.has(gid)) problems.push(`${i.slug}: unknown option group ${gid}`);
    }
  }
  return problems;
}

async function seed() {
  const menu: Menu = JSON.parse(await readFile(MENU_PATH, "utf8"));
  console.log(`Read ${menu.items.length} items and ${menu.optionGroups.length} option groups.`);

  const problems = check(menu);
  if (problems.length) {
    console.error("The menu file has problems — fix these before seeding:");
    problems.forEach((p) => console.error(" -", p));
    process.exit(1);
  }
  console.log("Integrity check passed.");

  await connectDB(env.MONGODB_URI);
  await OptionGroup.deleteMany({});
  await MenuItem.deleteMany({});
  await OptionGroup.insertMany(menu.optionGroups);
  await MenuItem.insertMany(menu.items);
  await Settings.findOneAndUpdate({ key: "store" }, { key: "store" }, { upsert: true });

  console.log(`Seeded ${await MenuItem.countDocuments()} items, ${await OptionGroup.countDocuments()} groups.`);
  await disconnectDB();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
