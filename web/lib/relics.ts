import data from "@/data/relics.json";

export type Rarity = "normal" | "rare" | "superRare";
export type RelicKind = "standard" | "curse" | "secret";

export interface Theme {
  id: string;
  /** EN name: official for EN-server themes, otherwise from data/translations.json */
  name: string;
  nameZh: string;
  /** only released on the CN server */
  cnOnly: boolean;
  /** CN-only themes: whether `name` is the official EN title */
  nameOfficial?: boolean;
}

export interface RelicText {
  name: string;
  effect: string;
  flavor: string | null;
  unlock: string | null;
}

export interface Relic extends RelicText {
  id: string;
  theme: string;
  no: number;
  rarity: Rarity;
  kind: RelicKind;
  special: boolean;
  /** CN name (all relics), for display and search */
  nameZh?: string;
  /** CN-only themes: original Chinese text */
  zh?: RelicText;
  /**
   * CN-only themes: "official" = every field reuses official EN text from a reprint,
   * "fan" = some fields are fan translations, "partial" = some fields are still Chinese
   */
  translation?: "official" | "fan" | "partial";
  /** true when public/relics/<id>.webp exists */
  icon: boolean;
}

export interface RelicData {
  source: string;
  sourceCn: string;
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
 * Community IS numbering is one ahead of the game's internal ids: IS#1 was
 * Ceobe's Fungimist (CN-only, removed, never in the data), so rogue_1
 * (Phantom) is IS#2 … rogue_4 (Sarkaz) is IS#5.
 */
export const themeShort = (id: string) => `IS#${Number(id.replace(/\D/g, "")) + 1}`;
