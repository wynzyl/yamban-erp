import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateDesignJobSchema, assignDesignJobSchema, DESIGN_APPROVAL_STATUS_LABELS } from './design.js';

test('updateDesignJobSchema validates approval status', () => {
  const result = updateDesignJobSchema.safeParse({ approvalStatus: 'FOR_APPROVAL' });
  assert.equal(result.success, true);
});

test('updateDesignJobSchema rejects invalid approval status', () => {
  const result = updateDesignJobSchema.safeParse({ approvalStatus: 'INVALID' });
  assert.equal(result.success, false);
});

test('updateDesignJobSchema validates optional fields', () => {
  const result = updateDesignJobSchema.safeParse({
    requirements: 'Some requirements',
    referenceNotes: 'Some notes',
  });
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

test('DESIGN_APPROVAL_STATUS_LABELS has all statuses', () => {
  assert.equal(DESIGN_APPROVAL_STATUS_LABELS.DRAFTING, 'Drafting');
  assert.equal(DESIGN_APPROVAL_STATUS_LABELS.FOR_APPROVAL, 'For approval');
  assert.equal(DESIGN_APPROVAL_STATUS_LABELS.REVISION_REQUESTED, 'Revision requested');
  assert.equal(DESIGN_APPROVAL_STATUS_LABELS.APPROVED, 'Approved');
});
