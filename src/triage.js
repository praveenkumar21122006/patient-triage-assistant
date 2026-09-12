import { LEVELS, CATEGORIES, RED_FLAGS, LIFE_KEYWORDS, vitalRanges } from './triage-data.js';

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function assess(input = {}) {
  const {
    complaint = '',
    category = '',
    painLevel = 0,
    durationHours = 0,
    freeText = '',
    redFlags = [],
    vitals = {},
    age = null,
    conditions = [],
  } = input;

  const reasons = [];
  const vitalsFlags = [];
  const recommendations = [];
  let level = 5;

  const note = (lvl, text) => {
    reasons.push({ level: lvl, text });
    level = Math.min(level, lvl);
  };
  const rec = (text) => recommendations.push(text);

  const text = `${complaint} ${freeText}`.toLowerCase();

  const lifeKeyword = LIFE_KEYWORDS.find((kw) => text.includes(kw));
  if (lifeKeyword) {
    note(1, `Life-threatening presentation — "${lifeKeyword}" mentioned in complaint`);
    rec('Immediate physician / emergency response');
    rec('Continuous monitoring, resuscitation cart available');
  }

  const v = {};
  for (const key of ['temp', 'hr', 'rr', 'sbp', 'dbp', 'spo2']) v[key] = num(vitals[key]);
  const ranges = vitalRanges(age);

  if (v.temp != null) {
    if (v.temp >= 40.5) {
      vitalsFlags.push(`Temperature ${v.temp}°C — severe hyperpyrexia`);
      note(2, `Severe hyperpyrexia (${v.temp}°C)`);
      rec('Aggressive temperature management');
    } else if (v.temp >= 39.0) {
      vitalsFlags.push(`Temperature ${v.temp}°C — high fever`);
      note(3, `High fever (${v.temp}°C)`);
    } else if (v.temp >= 38.0) {
      vitalsFlags.push(`Temperature ${v.temp}°C — fever`);
      note(4, `Fever (${v.temp}°C)`);
    } else if (v.temp < 35.0) {
      vitalsFlags.push(`Temperature ${v.temp}°C — hypothermia`);
      note(2, `Hypothermia (${v.temp}°C)`);
    }
  }

  if (v.hr != null) {
    if (v.hr >= ranges.hr.dHigh || v.hr <= ranges.hr.dLow) {
      vitalsFlags.push(`Heart rate ${v.hr} bpm — extreme for age`);
      note(2, `Extreme heart rate (${v.hr} bpm)`);
      rec('Cardiac monitoring / rhythm assessment');
    } else if (v.hr >= ranges.hr.high || v.hr <= ranges.hr.low) {
      vitalsFlags.push(`Heart rate ${v.hr} bpm — outside normal range`);
      note(3, `Heart rate outside normal range (${v.hr} bpm)`);
    }
  }

  if (v.rr != null) {
    if (v.rr >= ranges.rr.dHigh || v.rr <= ranges.rr.dLow) {
      vitalsFlags.push(`Respiratory rate ${v.rr} /min — extreme for age`);
      note(1, `Extreme respiratory rate (${v.rr} /min)`);
      rec('Respiratory support / urgent airway assessment');
    } else if (v.rr >= ranges.rr.high || v.rr <= ranges.rr.low) {
      vitalsFlags.push(`Respiratory rate ${v.rr} /min — outside normal range`);
      note(3, `Respiratory rate outside normal range (${v.rr} /min)`);
    }
  }

  if (v.sbp != null) {
    if (v.sbp <= 80) {
      vitalsFlags.push(`Systolic BP ${v.sbp} mmHg — critical hypotension`);
      note(1, `Critical hypotension (${v.sbp} mmHg)`);
      rec('IV access, fluid resuscitation, urgent physician review');
    } else if (v.sbp < ranges.sbp.min) {
      vitalsFlags.push(`Systolic BP ${v.sbp} mmHg — hypotension`);
      note(2, `Hypotension (${v.sbp} mmHg)`);
      rec('IV access / reassess lying and standing');
    } else if (v.sbp >= 200) {
      vitalsFlags.push(`Systolic BP ${v.sbp} mmHg — severe hypertension`);
      note(2, `Severe hypertension (${v.sbp} mmHg)`);
    } else if (v.sbp >= 170) {
      vitalsFlags.push(`Systolic BP ${v.sbp} mmHg — elevated`);
      note(3, `Markedly elevated blood pressure (${v.sbp} mmHg)`);
    }
  }

  if (v.dbp != null && v.dbp >= 110) {
    vitalsFlags.push(`Diastolic BP ${v.dbp} mmHg — elevated`);
    note(3, `Elevated diastolic pressure (${v.dbp} mmHg)`);
  }

  if (v.spo2 != null) {
    if (v.spo2 <= 88) {
      vitalsFlags.push(`Oxygen saturation ${v.spo2}% — severe hypoxemia`);
      note(1, `Severe hypoxemia (SpO₂ ${v.spo2}%)`);
      rec('High-flow oxygen, continuous SpO₂ monitoring');
    } else if (v.spo2 <= 92) {
      vitalsFlags.push(`Oxygen saturation ${v.spo2}% — low`);
      note(2, `Low oxygen saturation (SpO₂ ${v.spo2}%)`);
      rec('Supplemental oxygen and serial SpO₂ checks');
    } else if (v.spo2 <= 94) {
      vitalsFlags.push(`Oxygen saturation ${v.spo2}% — borderline`);
      note(3, `Borderline oxygen saturation (SpO₂ ${v.spo2}%)`);
      rec('Repeat SpO₂ after positioning and reassessment');
    }
  }

  if (age != null && age < 1 && v.temp != null && v.temp >= 38) {
    note(2, 'Fever in infant under 12 months');
    rec('Pediatric urgent evaluation — low threshold for escalation');
  }

  const categoryFlags = RED_FLAGS[category] || [];
  for (const flag of categoryFlags) {
    if (redFlags && redFlags.includes(flag.id)) {
      note(2, `Red flag: ${flag.text}`);
      if (category === 'allergic') rec('Watch for airway compromise — epinephrine if anaphylaxis');
      if (category === 'bleeding') rec('Apply direct pressure / control source of bleeding');
      if (category === 'neuro') rec('Neurologic assessment / stroke pathway if FAST positive');
    }
  }

  const pain = Math.min(Math.max(num(painLevel) ?? 0, 0), 10);
  const highRiskCategory = [
    'chest-pain',
    'breathing',
    'neuro',
    'allergic',
    'bleeding',
    'abdominal',
    'head',
    'trauma',
  ].includes(category);

  if (pain >= 8) {
    note(highRiskCategory ? 2 : 3, `Severe pain (${pain}/10)`);
    rec('Assess analgesia urgency');
  } else if (pain >= 5) {
    note(3, `Moderate pain (${pain}/10)`);
  } else if (pain >= 3) {
    note(4, `Mild pain (${pain}/10)`);
  }

  if (age != null && age >= 65 && pain >= 5) {
    note(3, 'Elderly patient with significant pain');
    rec('Fall risk assessment; chaperone for reassessment');
  }

  const categoryDef = CATEGORIES.find((c) => c.id === category);
  if (categoryDef && categoryDef.risk === 'high' && level >= 4) {
    note(4, `High-risk category (${categoryDef.label.toLowerCase()})`);
    rec('Early physician review for high-risk presentation');
  }

  const conditionsList = conditions || [];
  if (
    conditionsList.some((c) => ['heart-disease', 'diabetes', 'kidney-disease', 'cancer-immune', 'pregnant'].includes(c)) &&
    (v.sbp != null || v.hr != null) &&
    level >= 3
  ) {
    note(3, 'Chronic condition present that may modify disease course');
    rec('Consider baseline investigations for underlying condition');
  }

  if (level === 2) rec('Monitor closely — physician review as soon as possible');
  if (level === 1) rec('Reassess every 5 minutes until stabilized');

  return {
    level,
    color: LEVELS[level].color,
    label: LEVELS[level].label,
    wait: LEVELS[level].wait,
    reasons,
    vitalsFlags,
    recommendations: [...new Set(recommendations)],
  };
}