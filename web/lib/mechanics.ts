import data from "@/data/mechanics.json";
import type { Lang } from "@/lib/relics";

/** debuff / buff / mixed go under "Buffs & Debuffs"; item goes under "Special Items" */
export type MechanicKind = "debuff" | "buff" | "mixed" | "item";

export interface MechanicText {
  name: string;
  effect: string | null;
  flavor: string | null;
  /** escalating stages, e.g. Early / Middle / Late */
  levels?: { label: string | null; effect: string | null }[];
}

export interface MechanicEntry {
  id: string;
  group?: string;
  /** weather etc.: whether this one helps you */
  positive?: boolean;
  /** special/rare variant */
  sp?: boolean;
  /** numbers shown as badges (Stronghold: shop price, starting Life Points, operators needed) */
  stats?: { key: MechanicStat; value: number }[];
  text: { en: MechanicText & { tl?: "fan" | "partial" }; ja?: MechanicText; zh: MechanicText };
  /** true when public/mechanics/<id>.webp exists */
  icon: boolean;
  /** Stronghold: true when public/stronghold/portrait-<id>.webp (a leader's E2 art) exists */
  portrait?: boolean;
}

export type MechanicStat = "price" | "hp" | "need";

export const STAT_LABEL: Record<MechanicStat, Partial<Record<Lang, string>> & { en: string }> = {
  price: { en: "Price", zh: "售价" },
  hp: { en: "Life Points", zh: "目标生命值" },
  need: { en: "Activates at", zh: "激活人数" },
};

export interface MechanicSection {
  id: string;
  /** hand-written, in data/mechanics-config.json */
  title: string;
  kind: MechanicKind;
  summary: string | null;
  /** flavor text starts hidden behind a "show" button (boss lore) */
  hideFlavor?: boolean;
  /**
   * effect lines are skills ("[Name] text" becomes a heading + paragraph) and each level is a
   * collapsible block with its label above the text (boss abilities / Hidden Core)
   */
  skillLayout?: boolean;
  groups?: {
    id: string;
    name: Partial<Record<Lang, string>>;
    note?: Partial<Record<Lang, string>>;
    /** true when public/mechanics/group-<sectionId>-<groupId>.webp exists */
    icon?: boolean;
  }[];
  entries: MechanicEntry[];
}

export interface MechanicData {
  generatedAt: string;
  /** themeId → whether public/themes/<themeId>.webp exists */
  banners: Record<string, boolean>;
  themes: Record<string, MechanicSection[]>;
}

export const mechanicData = data as unknown as MechanicData;

export const KIND_LABEL: Record<MechanicKind, string> = {
  debuff: "Debuff",
  buff: "Buff",
  mixed: "Buff / Debuff",
  item: "Item",
};
