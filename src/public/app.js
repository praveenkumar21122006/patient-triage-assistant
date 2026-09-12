(() => {
  const dataEl = document.getElementById('triage-data');
  const data = dataEl ? JSON.parse(dataEl.textContent) : { RED_FLAGS: {}, LEVELS: {}, selected: [] };
  const { RED_FLAGS, LEVELS } = data;

  const COLORS = {
    1: ['#fee2e2', '#b91c1c'],
    2: ['#ffedd5', '#c2410c'],
    3: ['#fef9c3', '#a16207'],
    4: ['#dcfce7', '#15803d'],
    5: ['#dbeafe', '#1d4ed8'],
  };

  const categorySelect = document.getElementById('category-select');
  const redflagWrap = document.getElementById('redflags');
  const painRange = document.getElementById('pain-range');
  const painValue = document.getElementById('pain-value');
  const previewBox = document.getElementById('preview');
  const previewChip = document.getElementById('preview-chip');
  const previewWait = document.getElementById('preview-wait');
  const previewNotes = document.getElementById('preview-notes');

  function renderRedFlags(category) {
    const flags = RED_FLAGS[category] || [];
    if (!flags.length) {
      redflagWrap.innerHTML = '<p class="text-sm text-slate-400 sm:col-span-2">No red flags defined for this category.</p>';
      return;
    }
    redflagWrap.innerHTML = flags
      .map(
        (f) =>
          `<label class="flex items-start gap-2 text-sm text-slate-700">
             <input type="checkbox" name="red_flags" value="${f.id}" class="accent-teal-600 mt-0.5" ${data.selected.includes(f.id) ? 'checked' : ''} />
             ${f.text}
           </label>`
      )
      .join('');
  }

  function collectPayload() {
    const checked = (name) =>
      Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
    const v = {
      temp: document.querySelector('input[name="temp"]').value,
      hr: document.querySelector('input[name="hr"]').value,
      rr: document.querySelector('input[name="rr"]').value,
      sbp: document.querySelector('input[name="sbp"]').value,
      dbp: document.querySelector('input[name="dbp"]').value,
      spo2: document.querySelector('input[name="spo2"]').value,
    };
    for (const k of Object.keys(v)) {
      if (v[k] === '') v[k] = null;
    }
    return {
      complaint: document.querySelector('input[name="complaint"]').value,
      category: categorySelect.value,
      freeText: document.querySelector('textarea[name="free_text"]').value,
      painLevel: painRange.value,
      durationHours: document.querySelector('select[name="duration"]').value,
      redFlags: checked('red_flags'),
      conditions: checked('conditions'),
      allergies: checked('allergies'),
      medications: document.querySelector('textarea[name="medications"]').value,
      vitals: v,
      age: document.querySelector('input[name="age"]').value || null,
    };
  }

  let timer = null;
  function schedulePreview() {
    clearTimeout(timer);
    const category = categorySelect.value;
    if (!category) {
      previewBox.classList.add('hidden');
      return;
    }
    timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/assess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(collectPayload()),
        });
        if (!res.ok) return;
        const a = await res.json();
        const [bg, fg] = COLORS[a.level] || COLORS[5];
        previewBox.classList.remove('hidden');
        previewChip.style.background = bg;
        previewChip.style.color = fg;
        previewChip.textContent = `Level ${a.level} · ${a.label}`;
        previewWait.textContent = `Expected wait: ${a.wait}`;
        previewNotes.innerHTML = (a.reasons.slice(0, 4) || [])
          .map((r) => `<li>${r.text}</li>`)
          .join('');
      } catch {
        /* preview is best-effort */
      }
    }, 450);
  }

  const find = (id) => document.getElementById(id);

  if (categorySelect) {
    renderRedFlags(categorySelect.value);
    categorySelect.addEventListener('change', () => {
      renderRedFlags(categorySelect.value);
      schedulePreview();
    });
  }

  const patientSelect = find('patient-select');
  const newFields = find('new-patient-fields');
  function togglePatientFields() {
    const isNew = patientSelect.value === 'new';
    newFields.style.display = isNew ? 'grid' : 'none';
    newFields.querySelectorAll('input, select').forEach((el) => {
      el.disabled = !isNew;
    });
  }
  if (patientSelect) {
    togglePatientFields();
    patientSelect.addEventListener('change', togglePatientFields);
  }

  if (painRange) {
    const sync = () => {
      painValue.textContent = painRange.value;
      schedulePreview();
    };
    painRange.addEventListener('input', sync);
    sync();
  }

  document.querySelectorAll('form input, form select, form textarea').forEach((el) => {
    el.addEventListener('input', schedulePreview);
  });

  if (categorySelect && categorySelect.value) schedulePreview();
})();