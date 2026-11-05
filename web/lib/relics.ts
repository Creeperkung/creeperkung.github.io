import data from "@/data/relics.json";

export type Rarity = "normal" | "rare" | "superRare";
export type RelicKind = "standard" | "curse" | "secret";

export interface Theme {
  id: string;
  name: string;
}

export interface Relic {
  id: string;
  theme: string;
  no: number;
  name: string;
  effect: string;
  flavor: string;
  rarity: Rarity;
  kind: RelicKind;
  special: boolean;
  unlock: string | null;
  /** true when public/relics/<id>.webp exists */
  icon: boolean;
}

export interface RelicData {
  source: string;
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

/** "rogue_4" → "IS#4" */
export const themeShort = (id: string) => `IS#${id.replace(/\D/g, "")}`;
