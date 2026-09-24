import { MenuBrowser } from "@/components/MenuBrowser";
import { getMenu } from "@/lib/menu.server";

export const metadata = { title: "Menu — SayServe" };

/**
 * Rebuilt every few minutes rather than on every visit, so the 70 items are
 * already in the HTML when someone arrives — including someone who landed here
 * directly from a link, before anything has had a chance to wake the API.
 */
// Next reads this at build time, so it has to be a literal — an imported
// constant is rejected. Keep it in step with MENU_REVALIDATE_SECONDS.
export const revalidate = 300;

export default async function MenuPage() {
  return <MenuBrowser initial={await getMenu()} />;
}
