import data from "@/data/stronghold.json";
import type { MechanicSection } from "@/lib/mechanics";
import type { Lang } from "@/lib/relics";

/** One run of a season on one server, unix seconds. */
export interface RunDates {
  start: number;
  end: number;
}

/** A Stronghold Protocol season (e.g. 盟约 / Alliance), made of one or more event runs. */
export interface Season {
  /** URL slug, /stronghold/<id> */
  id: string;
  names: Partial<Record<Lang, string>> & { zh: string };
  /** servers the season has run on */
  servers: Lang[];
  runs: { id: string; dates: Partial<Record<Lang, RunDates>> }[];
  /** true when public/stronghold/banner-<id>.webp (the season's launch banner) exists */
  banner?: boolean;
}

export const seasonBanner = (id: string) => `/stronghold/banner-${id}.webp`;

export type StrongholdTab = "operators" | "alliances" | "strategies" | "equipment" | "enemies";

export type TraitType = "combat" | "stackOnce" | "stackOngoing" | "prep" | "special";

export const TRAIT_TYPE_LABEL: Record<TraitType, Partial<Record<Lang, string>> & { en: string }> = {
  combat: { en: "Combat", zh: "作战能力" },
  stackOnce: { en: "One-time Stack", zh: "单次叠加" },
  stackOngoing: { en: "Ongoing Stack", zh: "持续叠加" },
  prep: { en: "Preparation", zh: "整备能力" },
  special: { en: "Specialization", zh: "特异化" },
};

export const PROFESSION_LABEL: Record<string, string> = {
  PIONEER: "Vanguard",
  WARRIOR: "Guard",
  TANK: "Defender",
  SNIPER: "Sniper",
  CASTER: "Caster",
  MEDIC: "Medic",
  SUPPORT: "Supporter",
  SPECIAL: "Specialist",
};

export const TIER_NUMERAL = ["", "Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ"];

/** A piece in the season's operator pool (from PRTS; names from the game data). */
export interface StrongholdOperator {
  /** character id, or op_<CN name> for pieces with no character */
  id: string;
  /** 1–6 */
  tier: number;
  profession: string | null;
  names: Partial<Record<Lang, string>> & { zh: string };
  /** the reserve operator this piece is built on, if any */
  prototype?: { id: string | null; names: Partial<Record<Lang, string>> & { zh: string } };
  /** alliance ids (盟约; see the "alliances" section) */
  alliances: string[];
  traitType: TraitType;
  /** zh from PRTS; en official (EN client wording) or a fan translation (tl "fan") */
  trait: { zh: OperatorTrait; en?: OperatorTrait; tl?: "fan" };
  /** true when public/stronghold/<id>.webp exists */
  icon: boolean;
  /** true when public/stronghold/portrait-<id>.webp (E2 half-body, 180x360) exists */
  portrait?: boolean;
  /** has hand-filled data from data/stronghold-operators.json */
  manual?: boolean;
}

export interface OperatorTrait {
  base: string | null;
  /** after merging into an Elite (精锐) copy */
  elite: string | null;
}

/** Same shape as an IS mechanic section, plus the tab it belongs on. Icons live in public/stronghold/. */
export interface StrongholdSection extends MechanicSection {
  tab: StrongholdTab;
}

/** A season with its content. Pass only the Season part to components that just link to it. */
export interface SeasonData extends Season {
  /** PRTS page the operator pool was read from */
  operatorsSource: string;
  operators: StrongholdOperator[];
  sections: StrongholdSection[];
}

export interface StrongholdData {
  generatedAt: string;
  /** oldest first */
  seasons: SeasonData[];
}

export const strongholdData = data as unknown as StrongholdData;

/** The season fields alone (names, servers, runs), without its operators and sections. */
export const seasonMeta = ({ id, names, servers, runs, banner }: Season): Season => ({ id, names, servers, runs, banner });

/** Entries on one tab of a season (operators count as the Operators tab). */
export const tabCount = (s: SeasonData, tab: StrongholdTab) =>
  tab === "operators"
    ? s.operators.length
    : s.sections.filter((x) => x.tab === tab).reduce((n, x) => n + x.entries.length, 0);

export const seasonName = (s: Season, lang: Lang) => s.names[lang] ?? s.names.en ?? s.names.zh;
export const seasonHref = (id: string) => `/stronghold/${id}`;
