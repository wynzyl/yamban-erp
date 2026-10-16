import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, formatMeasure, formatMobile, formatDate, normalizeMobile } from './format.js';

test('money uses ₱, comma thousands, two decimals and a true minus', () => {
  assert.equal(formatMoney(33600), '₱33,600.00');
  assert.equal(formatMoney('-50109.38'), '\u2212₱50,109.38');
  assert.equal(formatMoney(-0.001), '₱0.00');
});

test('measure always carries the unit', () => {
  assert.equal(formatMeasure(1.5), '1.50 yd');
  assert.equal(formatMeasure('300', 'ml'), '300.00 ml');
});

test('mobile numbers', () => {
  assert.equal(formatMobile('09171234567'), '+63 917 123 4567');
  assert.equal(normalizeMobile('+63 917 123 4567'), '+639171234567');
  assert.equal(normalizeMobile('12345'), null);
});

test('screen date', () => {
  assert.equal(formatDate('2026-03-07T04:00:00Z'), '7 Mar 2026');
});
