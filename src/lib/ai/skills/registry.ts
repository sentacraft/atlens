import { TERMS_SKILL } from "./terms.ts";

/** Reference documents Iris reads on demand through the skill tool. */
export const SKILLS = { terms: TERMS_SKILL } as const;

export type SkillName = keyof typeof SKILLS;
export const SKILL_NAMES = Object.keys(SKILLS) as [SkillName, ...SkillName[]];
