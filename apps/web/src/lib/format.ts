export const money = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

/** "+£0.60" for an option, and nothing at all when it is free. */
export const delta = (n: number) => (n === 0 ? "" : `+${money(n)}`);

export const TAG_STYLES: Record<string, string> = {
  halal: "bg-ok-bg text-ok",
  vegetarian: "bg-accent-bg text-accent",
  vegan: "bg-accent-bg text-accent",
  spicy: "bg-bad-bg text-bad",
  healthy: "bg-accent-bg text-accent",
  bestseller: "bg-sun-bg text-warn",
  sharing: "bg-brand-50 text-brand-700",
};

/** A colour per category, so the menu rail reads at a glance. */
export const CATEGORY_DOTS: Record<string, string> = {
  burgers: "bg-brand", chicken: "bg-sun", wraps: "bg-ok",
  sides: "bg-warn", drinks: "bg-accent", desserts: "bg-brand-400",
  meals: "bg-brand-600", breakfast: "bg-sun", kids: "bg-ok",
};

export const TAG_LABELS: Record<string, string> = {
  halal: "Halal",
  vegetarian: "Veggie",
  vegan: "Vegan",
  spicy: "Spicy",
  healthy: "Lighter",
  bestseller: "Popular",
  sharing: "To share",
};

export const CATEGORY_LABELS: Record<string, string> = {
  burgers: "Burgers",
  chicken: "Chicken",
  wraps: "Wraps",
  sides: "Sides",
  drinks: "Drinks",
  desserts: "Desserts",
  meals: "Meals",
  breakfast: "Breakfast",
  kids: "Kids",
};
