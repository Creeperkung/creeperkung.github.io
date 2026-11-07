import data from "@/data/relics.json";

export type Rarity = "normal" | "rare" | "superRare";
export type RelicKind = "standard" | "curse" | "secret";
/** Text languages, named by server: en = EN server, ja = JP server, zh = CN server */
export type Lang = "en" | "ja" | "zh";

export const LANGS: { id: Lang; label: string; title: string; htmlLang: string }[] = [
  { id: "en", label: "EN", title: "English", htmlLang: "en" },
  { id: "ja", label: "JP", title: "日本語", htmlLang: "ja" },
  { id: "zh", label: "CN", title: "简体中文", htmlLang: "zh-CN" },
];

export interface Theme {
  id: string;
  /** en is always present (unofficial for CN-only themes, see enNameOfficial) */
  names: { en: string; ja?: string; zh: string };
  /** servers the theme has been released on */
  servers: Lang[];
  /** themes not on the EN server: whether names.en is the official title */
  enNameOfficial?: boolean;
}

export interface RelicText {
  name: string;
  effect: string;
  flavor: string | null;
  unlock: string | null;
}

export interface EnRelicText extends RelicText {
  /**
   * Only on relics not released on the EN server: "fan" = some fields are fan
   * translations, "partial" = some fields are still Chinese. Absent = all official.
   */
  tl?: "fan" | "partial";
}

export interface Relic {
  id: string;
  theme: string;
  no: number;
  rarity: Rarity;
  kind: RelicKind;
  special: boolean;
  text: { en: EnRelicText; ja?: RelicText; zh: RelicText };
  /** true when public/relics/<id>.webp exists */
  icon: boolean;
  /**
   * IS#4 on: stronger versions (-α/-β/-γ) that replace this relic from a difficulty grade up,
   * lowest grade first. Flavor and unlock are the base relic's.
   */
  upgrades?: RelicUpgrade[];
}

export interface UpgradeText {
  name: string;
  effect: string;
}

export interface RelicUpgrade {
  id: string;
  /** applies at this difficulty and above */
  grade: number;
  text: { en: UpgradeText & { tl?: "fan" | "partial" }; ja?: UpgradeText; zh: UpgradeText };
}

export interface RelicData {
  sources: Record<Lang, string>;
  generatedAt: string;
  themes: Theme[];
  relics: Relic[];
}

export const relicData = data as RelicData;

export const RARITY_LABEL: Record<Rarity, string> = {
  normal: "Normal",
  rare: "Rare",
  superRare: "Super Rare",
};

/**
 * The relic's text in `lang`. JP text doesn't exist for themes not yet on the JP
 * server; those fall back to English (`fallback: true`).
 */
export function pickText<T>(text: { en: T; ja?: T; zh: T }, lang: Lang): { text: T; lang: Lang; fallback: boolean } {
  if (lang === "ja" && !text.ja) return { text: text.en, lang: "en", fallback: true };
  return { text: text[lang] ?? text.en, lang, fallback: false };
}

export const relicText = (r: Relic, lang: Lang) => pickText<RelicText>(r.text, lang);

export const themeName = (t: Theme, lang: Lang) => t.names[lang] ?? t.names.en;

/**
 * Community IS numbering is one ahead of the game's internal ids: IS#1 was
 * Ceobe's Fungimist (CN-only, removed, never in the data), so rogue_1
 * (Phantom) is IS#2 … rogue_6 is IS#7.
 */
export const themeNo = (id: string) => Number(id.replace(/\D/g, "")) + 1;
export const themeShort = (id: string) => `IS#${themeNo(id)}`;
/** URL of a theme's page: /is/<community IS number> */
export const themeHref = (id: string) => `/is/${themeNo(id)}`;
export const themeIdFromNo = (no: string | number) => `rogue_${Number(no) - 1}`;
