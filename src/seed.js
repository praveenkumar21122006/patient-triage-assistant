import { assess } from './triage.js';
import { createPatient, createIntake, totalCount, findUserByName, createUser } from './db.js';
import { hashPassword } from './auth.js';

export const DEFAULT_ADMIN_USERNAME = 'admin';
export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export async function ensureDefaultUser() {
  const existing = findUserByName(DEFAULT_ADMIN_USERNAME);
  if (existing) return false;
  await createUser({
    username: DEFAULT_ADMIN_USERNAME,
    passwordHash: await hashPassword(DEFAULT_ADMIN_PASSWORD),
    displayName: 'Clinic Admin',
  });
  return true;
}

const SAMPLES = [
  {
    patient: { name: 'Marta Alvarez', age: 34, sex: 'female', phone: '555-0142' },
    intake: {
      complaint: 'Worsening chest tightness',
      category: 'chest-pain',
      durationHours: 2,
      painLevel: 7,
      freeText: 'Radiating to left arm, feels sweaty and nauseous',
      redFlags: ['cp-radiating', 'cp-autonomic'],
      vitals: { temp: 36.8, hr: 118, rr: 22, sbp: 148, dbp: 90, spo2: 96 },
      conditions: ['hypertension'],
      allergies: [],
      medications: 'Amlodipine',
    },
  },
  {
    patient: { name: 'Ravi Patel', age: 9, sex: 'male', phone: '555-0177' },
    intake: {
      complaint: 'Fever and sore throat',
      category: 'fever',
      durationHours: 20,
      painLevel: 4,
      freeText: 'Temperature 38.6, drinking ok, no rash',
      redFlags: [],
      vitals: { temp: 38.6, hr: 108, rr: 22, sbp: 105, dbp: 62, spo2: 98 },
      conditions: [],
      allergies: ['Penicillin'],
      medications: '',
    },
  },
  {
    patient: { name: 'Grace Kim', age: 71, sex: 'female', phone: '555-0110' },
    intake: {
      complaint: 'Sudden weakness on the right side',
      category: 'neuro',
      durationHours: 1,
      painLevel: 2,
      freeText: 'Face drooping and speech is slurred',
      redFlags: ['ne-fast'],
      vitals: { temp: 36.7, hr: 92, rr: 18, sbp: 178, dbp: 96, spo2: 97 },
      conditions: ['hypertension', 'diabetes'],
      allergies: [],
      medications: 'Metformin, Lisinopril',
    },
  },
  {
    patient: { name: 'Lucas Meyer', age: 26, sex: 'male', phone: '555-0199' },
    intake: {
      complaint: 'Sprained right ankle while playing football',
      category: 'trauma',
      durationHours: 8,
      painLevel: 6,
      freeText: 'Swollen, painful, can barely put weight on it',
      redFlags: ['tr-weight'],
      vitals: { temp: 36.6, hr: 88, rr: 16, sbp: 122, dbp: 78, spo2: 99 },
      conditions: [],
      allergies: [],
      medications: '',
    },
  },
  {
    patient: { name: 'Sofia Rossi', age: 2, sex: 'female', phone: '555-0123' },
    intake: {
      complaint: 'Diarrhea since yesterday',
      category: 'gi',
      durationHours: 30,
      painLevel: 3,
      freeText: 'Vomiting twice, still wetting nappies, playful',
      redFlags: [],
      vitals: { temp: 37.4, hr: 115, rr: 26, sbp: 88, dbp: 50, spo2: 98 },
      conditions: [],
      allergies: [],
      medications: '',
    },
  },
];

export function seedIfEmpty() {
  if (totalCount() > 0) return;
  for (const sample of SAMPLES) {
    const patientId = createPatient(sample.patient);
    const age = sample.patient.age ?? null;
    const assessment = assess({ ...sample.intake, age });
    createIntake({ ...sample.intake, patientId, assessment });
  }
  console.log(`seeded ${SAMPLES.length} sample encounters`);
}