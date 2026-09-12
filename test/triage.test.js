import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assess } from '../src/triage.js';

test('defaults to non-urgent level 5 with empty input', () => {
  const r = assess({});
  assert.equal(r.level, 5);
  assert.equal(r.color, 'blue');
});

test('severe hypoxemia triggers level 1', () => {
  const r = assess({ complaint: 'shortness of breath', category: 'breathing', vitals: { spo2: 84 } });
  assert.equal(r.level, 1);
  assert.ok(r.reasons.some((x) => x.level === 1));
});

test('life-threatening keyword in free text triggers level 1', () => {
  const r = assess({ complaint: 'feeling unwell', freeText: 'he passed out and is unresponsive' });
  assert.equal(r.level, 1);
});

test('crushing chest pain with sweating triggers level 2', () => {
  const r = assess({ complaint: 'chest pain', category: 'chest-pain', redFlags: ['cp-autonomic'] });
  assert.equal(r.level, 2);
});

test('extreme heart rate triggers level 2', () => {
  const r = assess({ category: 'general', vitals: { hr: 168 } });
  assert.equal(r.level, 2);
});

test('high fever and moderate pain stays urgent level 3', () => {
  const r = assess({ category: 'fever', painLevel: 6, vitals: { temp: 39.2 } });
  assert.equal(r.level, 3);
});

test('mild fever is less urgent level 4', () => {
  const r = assess({ category: 'fever', painLevel: 1, vitals: { temp: 38.2 } });
  assert.equal(r.level, 4);
});

test('infant with fever escalates to level 2', () => {
  const r = assess({ category: 'fever', age: 0.5, vitals: { temp: 38.3 } });
  assert.equal(r.level, 2);
});

test('adult with same fever is much less urgent', () => {
  const r = assess({ category: 'fever', age: 40, vitals: { temp: 38.3 } });
  assert.equal(r.level, 4);
});

test('severe pain in a high-risk category triggers level 2', () => {
  const r = assess({ category: 'abdominal', painLevel: 9, complaint: 'abdominal pain' });
  assert.equal(r.level, 2);
});

test('severe pain in a low-risk category triggers level 3', () => {
  const r = assess({ category: 'gi', painLevel: 9 });
  assert.equal(r.level, 3);
});

test('long duration moderate pain is level 3', () => {
  const r = assess({ category: 'trauma', painLevel: 6, durationHours: 8, complaint: 'ankle pain' });
  assert.equal(r.level, 3);
});

test('young child heart rate near upper bound is flagged normal band', () => {
  const r = assess({ category: 'general', age: 2, vitals: { hr: 130 } });
  assert.equal(r.level, 5);
});

test('hypotension triggers level 2', () => {
  const r = assess({ category: 'general', age: 40, vitals: { sbp: 82 } });
  assert.equal(r.level, 2);
});