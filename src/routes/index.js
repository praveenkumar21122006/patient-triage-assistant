import { Router } from 'express';
import {
  listPatients,
  getPatient,
  createPatient,
  listIntakes,
  getIntake,
  createIntake,
  parseRow,
  intakeCounts,
  todayCount,
  totalCount,
} from '../db.js';
import { assess } from '../triage.js';
import {
  LEVELS,
  CATEGORIES,
  RED_FLAGS,
  MEDICAL_CONDITIONS,
  COMMON_ALLERGIES,
  DURATION_OPTIONS,
  DISCLAIMER,
} from '../triage-data.js';
import { timeAgo, formatDateTime, displayPain } from '../format.js';

const router = Router();

function viewHelpers() {
  return {
    LEVELS,
    CATEGORIES,
    RED_FLAGS,
    MEDICAL_CONDITIONS,
    COMMON_ALLERGIES,
    DURATION_OPTIONS,
    DISCLAIMER,
    timeAgo,
    formatDateTime,
    displayPain,
    levelColors: (lvl) => {
      const map = {
        1: ['#fee2e2', '#b91c1c'],
        2: ['#ffedd5', '#c2410c'],
        3: ['#fef9c3', '#a16207'],
        4: ['#dcfce7', '#15803d'],
        5: ['#dbeafe', '#1d4ed8'],
      };
      return map[lvl] || map[5];
    },
  };
}

router.get('/', (req, res) => {
  const levelFilter = req.query.level ? Number(req.query.level) : null;
  const intakes = listIntakes({ limit: 100, level: levelFilter }).map(parseRow);
  const counts = intakeCounts();
  res.render('dashboard', {
    ...viewHelpers(),
    title: 'Triage dashboard',
    intakes,
    counts,
    levelFilter,
    today: todayCount(),
    total: totalCount(),
    activeNav: 'dashboard',
  });
});

router.get('/intake/new', (req, res) => {
  const prefillId = req.query.patient ? Number(req.query.patient) : null;
  const prefill = (prefillId && getPatient(prefillId)) ? { patientId: prefillId } : {};
  res.render('intake', {
    ...viewHelpers(),
    title: 'New patient intake',
    patients: listPatients(),
    form: prefill,
    errors: [],
    activeNav: 'intake',
  });
});

router.post('/intake', (req, res) => {
  const b = req.body;
  const errors = [];

  const result = {
    patientId: b.patient_id && b.patient_id !== 'new' ? Number(b.patient_id) : null,
    name: (b.name || '').trim(),
    age: b.age ? Number(b.age) : null,
    sex: b.sex || '',
    phone: (b.phone || '').trim(),
    category: b.category || '',
    complaint: (b.complaint || '').trim(),
    freeText: (b.free_text || '').trim(),
    painLevel: b.pain !== '' && b.pain != null ? Number(b.pain) : null,
    durationHours: b.duration ? Number(b.duration) : null,
    vitals: {
      temp: b.temp || null,
      hr: b.hr || null,
      rr: b.rr || null,
      sbp: b.sbp || null,
      dbp: b.dbp || null,
      spo2: b.spo2 || null,
    },
    redFlags: Array.isArray(b.red_flags) ? b.red_flags : b.red_flags ? [b.red_flags] : [],
    conditions: Array.isArray(b.conditions) ? b.conditions : b.conditions ? [b.conditions] : [],
    allergies: Array.isArray(b.allergies) ? b.allergies : b.allergies ? [b.allergies] : [],
    medications: (b.medications || '').trim(),
  };

  if (b.other_allergy && !result.allergies.includes(b.other_allergy.trim())) {
    result.allergies.push(b.other_allergy.trim());
  }

  if (!result.category) errors.push('Please choose a chief complaint category.');
  if (!result.complaint) errors.push('Please describe the chief complaint.');
  if (!result.patientId && !result.name) errors.push('Select an existing patient or enter a name for a new patient.');

  const categoryValid = CATEGORIES.some((c) => c.id === result.category);
  if (result.category && !categoryValid) errors.push('Unknown complaint category.');

  if (errors.length) {
    if (result.patientId) {
      const patient = getPatient(result.patientId);
      if (patient) result.name = patient.name;
    }
    return res.status(400).render('intake', {
      ...viewHelpers(),
      title: 'New patient intake',
      patients: listPatients(),
      form: result,
      errors,
      activeNav: 'intake',
    });
  }

  let patientId = result.patientId;
  if (!patientId) {
    patientId = createPatient({
      name: result.name,
      age: result.age,
      sex: result.sex,
      phone: result.phone,
    });
  }

  const assessment = assess(result);
  const intakeId = createIntake({ ...result, patientId, assessment });

  res.redirect(303, `/patients/${patientId}?intake=${intakeId}`);
});

router.get('/patients/:id', (req, res) => {
  const patient = getPatient(req.params.id);
  if (!patient) {
    return res.status(404).render('error', { status: 404, message: 'Patient not found', title: 'Not found' });
  }
  const intakes = listIntakes({ patientId: patient.id, limit: 50 }).map(parseRow);
  res.render('patient', {
    ...viewHelpers(),
    title: patient.name,
    patient,
    intakes,
    highlightIntake: req.query.intake ? Number(req.query.intake) : null,
    activeNav: 'dashboard',
  });
});

router.post('/api/assess', (req, res) => {
  try {
    const assessment = assess(req.body || {});
    res.json(assessment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/api/intakes', (req, res) => {
  const level = req.query.level ? Number(req.query.level) : null;
  res.json(listIntakes({ limit: 100, level }).map(parseRow));
});

router.get('/api/health', (req, res) => {
  res.json({ ok: true, intakes: totalCount() });
});

export default router;