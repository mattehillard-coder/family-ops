export const CATEGORIES = [
  "Family",
  "Kids",
  "Cars",
  "Home",
  "Rentals",
  "Pets",
  "Admin",
] as const;

export type Category = (typeof CATEGORIES)[number];
