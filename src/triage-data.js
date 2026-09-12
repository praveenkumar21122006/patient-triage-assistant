export const LEVELS = {
  1: { color: 'red', label: 'Resuscitation', wait: 'Immediate — physician now' },
  2: { color: 'orange', label: 'Emergent', wait: 'Within 10 minutes' },
  3: { color: 'yellow', label: 'Urgent', wait: 'Within 30 minutes' },
  4: { color: 'green', label: 'Less urgent', wait: 'Within 60–120 minutes' },
  5: { color: 'blue', label: 'Non-urgent', wait: 'Within 2–4 hours' },
};

export const DISCLAIMER =
  'This tool provides a guideline-level urgency estimate based on entered information. ' +
  'It is NOT a substitute for professional clinical judgment, and it cannot diagnose. ' +
  'When in doubt, escalate to the treating physician.';

export const CATEGORIES = [
  { id: 'chest-pain', label: 'Chest pain / pressure', risk: 'high' },
  { id: 'breathing', label: 'Shortness of breath / difficulty breathing', risk: 'high' },
  { id: 'neuro', label: 'Stroke / neurologic symptoms', risk: 'high' },
  { id: 'allergic', label: 'Allergic reaction', risk: 'high' },
  { id: 'bleeding', label: 'Bleeding / wound', risk: 'high' },
  { id: 'abdominal', label: 'Abdominal pain', risk: 'medium' },
  { id: 'head', label: 'Head injury / headache', risk: 'medium' },
  { id: 'trauma', label: 'Injury / trauma', risk: 'medium' },
  { id: 'fever', label: 'Fever', risk: 'medium' },
  { id: 'gi', label: 'Nausea / vomiting / diarrhea', risk: 'low' },
  { id: 'general', label: 'Other / general illness', risk: 'low' },
];

export const RED_FLAGS = {
  'chest-pain': [
    { id: 'cp-crushing', text: 'Crushing or pressure-like pain' },
    { id: 'cp-radiating', text: 'Pain radiating to arm, jaw or back' },
    { id: 'cp-autonomic', text: 'Pain with sweating, nausea or shortness of breath' },
    { id: 'cp-history', text: 'Known heart disease or prior heart attack' },
  ],
  breathing: [
    { id: 'br-severe', text: 'Severe difficulty — cannot speak full sentences' },
    { id: 'br-blue', text: 'Lips or face turning blue' },
    { id: 'br-sudden', text: 'Sudden onset of wheezing or gasping' },
    { id: 'br-history', text: 'Asthma / COPD ever requiring hospital care' },
  ],
  neuro: [
    { id: 'ne-fast', text: 'Facial droop, arm weakness or slurred speech (FAST)' },
    { id: 'ne-worst', text: 'Worst headache of life / sudden severe headache' },
    { id: 'ne-seizure', text: 'Seizure (now or within the last hour)' },
    { id: 'ne-limb', text: 'Sudden numbness or weakness of an arm or leg' },
  ],
  allergic: [
    { id: 'al-throat', text: 'Throat feels tight or trouble swallowing' },
    { id: 'al-swollen', text: 'Tongue or face swelling' },
    { id: 'al-anaphylaxis', text: 'History of severe / anaphylactic reaction' },
    { id: 'al-hives', text: 'Widespread hives or this is a new exposure' },
  ],
  bleeding: [
    { id: 'bl-uncontrolled', text: 'Bleeding that will not stop' },
    { id: 'bl-large', text: 'Large volume — soaking through dressings' },
    { id: 'bl-thinners', text: 'On blood thinners (warfarin/DOACs)' },
    { id: 'bl-nontraumatic', text: 'Major bleeding without a clear injury' },
  ],
  abdominal: [
    { id: 'ab-rigid', text: 'Rigid or very tender abdomen' },
    { id: 'ab-blood', text: 'Blood in vomit or stool' },
    { id: 'ab-pregnant', text: 'Pregnant or possible pregnancy' },
    { id: 'ab-dehydration', text: 'Cannot tolerate fluids / severe dehydration' },
  ],
  head: [
    { id: 'hd-unconscious', text: 'Loss of consciousness or fainted' },
    { id: 'hd-confused', text: 'Confusion or unusual drowsiness' },
    { id: 'hd-vomited', text: 'Vomited after the injury' },
    { id: 'hd-worst', text: 'Worst headache of life' },
  ],
  trauma: [
    { id: 'tr-highenergy', text: 'High-energy mechanism (fall, vehicle crash)' },
    { id: 'tr-torso', text: 'Injury to head, chest or abdomen' },
    { id: 'tr-deformity', text: 'Obvious deformity / suspected fracture' },
    { id: 'tr-weight', text: 'Cannot bear weight on the limb' },
  ],
  fever: [
    { id: 'fe-infant', text: 'Infant under 3 months old' },
    { id: 'fe-neck', text: 'Stiff neck' },
    { id: 'fe-rash', text: 'Rash that does not blanch under pressure' },
    { id: 'fe-seizure', text: 'Fever accompanied by seizure' },
  ],
  gi: [
    { id: 'gi-dizzy', text: 'Dizzy on standing / not passing urine (dehydration)' },
    { id: 'gi-blood', text: 'Blood in stool' },
    { id: 'gi-infant', text: 'Diarrhea more than a day in an infant or elderly person' },
  ],
  general: [
    { id: 'ge-weak', text: 'Very weak — cannot get out of bed' },
    { id: 'ge-confused', text: 'Confusion or disorientation' },
    { id: 'ge-severe', text: 'Severe fatigue or appearance of being seriously unwell' },
  ],
};

export const RED_FLAG_IDS = Object.values(RED_FLAGS).flat().map((f) => f.id);

export const LIFE_KEYWORDS = [
  'not breathing',
  'can\'t breathe',
  'cannot breathe',
  'turning blue',
  'turned blue',
  'blue lips',
  'unresponsive',
  'unconscious',
  'passed out',
  'passed-out',
  'fainted',
  'seizure',
  'convuls',
  'stroke',
  'face droop',
  'slurred speech',
  'arm weakness',
  'vomiting blood',
  'coughing blood',
  'choking',
  'chest is crushing',
  'crushing chest',
  'anaphylaxis',
  'anaphylactic',
  'throat closing',
  'cannot swallow',
  'suicide',
  'self-harm',
  'poison',
  'overdose',
  'gushing',
  'soaking through',
];

export const MEDICAL_CONDITIONS = [
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'heart-disease', label: 'Heart disease / prior heart attack' },
  { id: 'asthma-copd', label: 'Asthma or COPD' },
  { id: 'hypertension', label: 'High blood pressure' },
  { id: 'epilepsy', label: 'Epilepsy / seizures' },
  { id: 'pregnant', label: 'Pregnancy' },
  { id: 'kidney-disease', label: 'Kidney disease' },
  { id: 'cancer-immune', label: 'Cancer / weakened immune system' },
  { id: 'bleeding-disorder', label: 'Bleeding disorder' },
  { id: 'dementia', label: 'Dementia / cognitive impairment' },
  { id: 'none', label: 'None of the above' },
];

export const COMMON_ALLERGIES = [
  'Penicillin',
  'Cephalosporins',
  'Sulfa drugs',
  'Aspirin / NSAIDs',
  'Latex',
  'Peanuts',
  'None known',
];

export const DURATION_OPTIONS = [
  { value: '1', label: 'Under 1 hour' },
  { value: '3', label: '1–3 hours' },
  { value: '6', label: '3–6 hours' },
  { value: '12', label: '6–12 hours' },
  { value: '24', label: '12–24 hours' },
  { value: '72', label: '1–3 days' },
  { value: '168', label: 'Longer than 3 days' },
];

export function vitalRanges(age) {
  const a = Number(age);
  if (age == null || !Number.isFinite(a) || a >= 13) {
    return {
      hr: { low: 60, high: 100, dLow: 40, dHigh: 150 },
      rr: { low: 12, high: 20, dLow: 8, dHigh: 30 },
      sbp: { min: 90 },
    };
  }
  if (a < 1) {
    return {
      hr: { low: 100, high: 180, dLow: 90, dHigh: 200 },
      rr: { low: 25, high: 50, dLow: 20, dHigh: 65 },
      sbp: { min: 70 },
    };
  }
  if (Number.isFinite(a) && a < 6) {
    return {
      hr: { low: 80, high: 140, dLow: 70, dHigh: 180 },
      rr: { low: 20, high: 40, dLow: 15, dHigh: 55 },
      sbp: { min: 80 },
    };
  }
  if (Number.isFinite(a) && a < 13) {
    return {
      hr: { low: 70, high: 120, dLow: 60, dHigh: 160 },
      rr: { low: 15, high: 30, dLow: 12, dHigh: 40 },
      sbp: { min: 90 },
    };
  }
  return {
    hr: { low: 60, high: 100, dLow: 40, dHigh: 150 },
    rr: { low: 12, high: 20, dLow: 8, dHigh: 30 },
    sbp: { min: 90 },
  };
}