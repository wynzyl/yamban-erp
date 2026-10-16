import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateDesignJobSchema, assignDesignJobSchema } from './design.js';

test('updateDesignJobSchema validates optional fields', () => {
  const result = updateDesignJobSchema.safeParse({
    requirements: 'Some requirements',
    referenceNotes: 'Some notes',
  });
  assert.equal(result.success, true);
});

test('updateDesignJobSchema allows empty object', () => {
  const result = updateDesignJobSchema.safeParse({});
  assert.equal(result.success, true);
});

test('assignDesignJobSchema validates uuid', () => {
  const result = assignDesignJobSchema.safeParse({
    assignedToId: '550e8400-e29b-41d4-a716-446655440000',
  });
  assert.equal(result.success, true);
});

test('assignDesignJobSchema allows null', () => {
  const result = assignDesignJobSchema.safeParse({ assignedToId: null });
  assert.equal(result.success, true);
});
