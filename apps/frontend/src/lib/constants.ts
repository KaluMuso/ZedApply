const rawSite =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) || "https://www.zedcv.com";

export const SITE_URL = rawSite.replace(/\/$/, "");

export const ZAMBIAN_CITIES = [
  "Lusaka",
  "Kitwe",
  "Ndola",
  "Livingstone",
  "Kabwe",
  "Chipata",
  "Solwezi",
  "Kasama",
  "Mansa",
  "Mongu",
  "Chingola",
  "Mufulira",
  "Choma",
  "Remote",
] as const;

export const FEATURE_JOBS: string[] = ["All types", "Full-time", "Part-time", "Contract", "Graduate", "Remote"];

export const TIER_INFO = {
  mwana: { name: "Mwana", bemba: "Child / starter (free plan)", priceLabel: "K0", sub: "Free" },
  mwezi: { name: "Mwezi", bemba: "The moon (middle path)", priceLabel: "K49", sub: "Most popular" },
  bwino: { name: "Bwino", bemba: "The very best (full access)", priceLabel: "K99", sub: "Premium" },
} as const;
