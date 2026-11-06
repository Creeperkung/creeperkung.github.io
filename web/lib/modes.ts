import { mechanicData } from "@/lib/mechanics";
import { relicData } from "@/lib/relics";

/** A game mode with its own section of the site. Add new modes here; the home page lists them in this order. */
export interface Mode {
  id: string;
  name: string;
  /** section root, e.g. /is */
  href: string;
  blurb: string;
  /** card art under public/ */
  image?: string;
  /** short facts shown on the card */
  stats: string[];
}

const latestIs = relicData.themes[relicData.themes.length - 1];
const isEntries = Object.values(mechanicData.themes).reduce(
  (n, secs) => n + secs.reduce((m, s) => m + s.entries.length, 0),
  0,
);

export const MODES: Mode[] = [
  {
    id: "is",
    name: "Integrated Strategies",
    href: "/is",
    blurb: "The roguelike mode: every theme's relics, buffs, debuffs and special mechanic items, including CN-only themes.",
    image: latestIs && mechanicData.banners[latestIs.id] ? `/themes/${latestIs.id}.webp` : undefined,
    stats: [`${relicData.themes.length} themes`, `${relicData.relics.length} relics`, `${isEntries} effects & items`],
  },
];
