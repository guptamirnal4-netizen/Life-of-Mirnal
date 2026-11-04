import { COMBINATION_RULES, STREAMS } from '../../data/streams.js';
import { SENIOR_SUBJECTS } from '../../data/curriculum.js';

// selection: { presetId, electives: string[], additional: string|null }
export function validateCombination(selection, rules = COMBINATION_RULES) {
  const errors = [];
  const warnings = [];
  const { electives = [], additional = null } = selection;
  const all = [...electives, ...(additional ? [additional] : [])];

  for (const id of all) {
    if (!SENIOR_SUBJECTS[id]) errors.push(`Unknown subject: ${id}`);
    else if (rules.notOffered.includes(id)) errors.push(`${SENIOR_SUBJECTS[id].name} is not offered by this school.`);
  }
  if (all.includes(rules.compulsoryLanguage)) errors.push('English Core is already compulsory; choose other electives.');
  if (new Set(all).size !== all.length) errors.push('A subject was chosen twice.');
  if (electives.length !== rules.electivesRequired) {
    errors.push(`Choose exactly ${rules.electivesRequired} elective subjects (you have ${electives.length}).`);
  }
  const skills = electives.filter((id) => SENIOR_SUBJECTS[id]?.kind === 'skill');
  if (skills.length > rules.maxSkillAmongElectives) {
    errors.push(`At most ${rules.maxSkillAmongElectives} skill subject can be one of the four electives.`);
  }
  for (const rule of [...rules.mutuallyExclusive, ...rules.schoolClashes]) {
    if (rule.ids.every((id) => all.includes(id))) errors.push(rule.reason);
  }

  const preset = STREAMS.find((s) => s.id === selection.presetId);
  if (preset) {
    const missing = preset.core.filter((id) => !electives.includes(id));
    if (missing.length) warnings.push(`${preset.name} usually includes ${missing.map((id) => SENIOR_SUBJECTS[id]?.name).join(', ')}.`);
    if (preset.id === 'com_math' && !electives.some((id) => id === 'math' || id === 'amath')) {
      warnings.push('Commerce with Mathematics needs Mathematics or Applied Mathematics.');
    }
  }
  const load = all.reduce((sum, id) => sum + (SENIOR_SUBJECTS[id]?.weeklyPeriods || 0), SENIOR_SUBJECTS.eng.weeklyPeriods);
  if (load > 40) warnings.push(`Heavy timetable: about ${load} periods a week.`);

  return { ok: errors.length === 0, errors, warnings, weeklyPeriods: load };
}

export function defaultElectives(presetId) {
  const p = STREAMS.find((s) => s.id === presetId);
  if (!p) return [];
  const picks = [...p.core];
  for (const id of p.suggested) {
    if (picks.length >= COMBINATION_RULES.electivesRequired) break;
    const trial = validateCombination({ presetId, electives: [...picks, id] }, { ...COMBINATION_RULES, electivesRequired: picks.length + 1 });
    if (trial.ok) picks.push(id);
  }
  return picks.slice(0, COMBINATION_RULES.electivesRequired);
}

export function toStream(selection) {
  return {
    presetId: selection.presetId,
    subjects: [COMBINATION_RULES.compulsoryLanguage, ...selection.electives],
    additional: selection.additional || null,
  };
}

export function streamGroup(stream) {
  if (!stream) return null;
  return STREAMS.find((s) => s.id === stream.presetId)?.group || null;
}
