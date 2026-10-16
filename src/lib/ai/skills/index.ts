import { fillUiStrings } from "@/lib/ui-strings";
import { SKILLS, type SkillName } from "@/lib/ai/skills/registry";

export { SKILL_NAMES, type SkillName } from "@/lib/ai/skills/registry";

/** A skill document with the site's labels in the user's language. */
export function readSkill(name: SkillName, locale: string): string {
  return fillUiStrings(SKILLS[name].text, locale);
}
