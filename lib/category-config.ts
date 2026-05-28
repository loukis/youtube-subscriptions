export const CATEGORIES = ["Code", "Economy", "Music", "Sports", "News", "Gaming", "Construction", "Ecology", "Energy", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];
