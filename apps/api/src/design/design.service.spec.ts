import { describe, it, expect } from 'vitest';
import { isValidTransition, VALID_TRANSITIONS } from './design.service.js';

describe('Design approval status transitions', () => {
  describe('DRAFTING state', () => {
    it('allows DRAFTING → FOR_APPROVAL', () => {
      expect(isValidTransition('DRAFTING', 'FOR_APPROVAL')).toBe(true);
    });

    it('rejects DRAFTING → APPROVED', () => {
      expect(isValidTransition('DRAFTING', 'APPROVED')).toBe(false);
    });

    it('rejects DRAFTING → REVISION_REQUESTED', () => {
      expect(isValidTransition('DRAFTING', 'REVISION_REQUESTED')).toBe(false);
    });
  });

  describe('FOR_APPROVAL state', () => {
    it('allows FOR_APPROVAL → APPROVED', () => {
      expect(isValidTransition('FOR_APPROVAL', 'APPROVED')).toBe(true);
    });

    it('allows FOR_APPROVAL → REVISION_REQUESTED', () => {
      expect(isValidTransition('FOR_APPROVAL', 'REVISION_REQUESTED')).toBe(true);
    });

    it('rejects FOR_APPROVAL → DRAFTING', () => {
      expect(isValidTransition('FOR_APPROVAL', 'DRAFTING')).toBe(false);
    });
  });

  describe('REVISION_REQUESTED state', () => {
    it('allows REVISION_REQUESTED → FOR_APPROVAL', () => {
      expect(isValidTransition('REVISION_REQUESTED', 'FOR_APPROVAL')).toBe(true);
    });

    it('rejects REVISION_REQUESTED → APPROVED', () => {
      expect(isValidTransition('REVISION_REQUESTED', 'APPROVED')).toBe(false);
    });

    it('rejects REVISION_REQUESTED → DRAFTING', () => {
      expect(isValidTransition('REVISION_REQUESTED', 'DRAFTING')).toBe(false);
    });
  });

  describe('APPROVED state (terminal)', () => {
    it('rejects APPROVED → any state', () => {
      expect(isValidTransition('APPROVED', 'DRAFTING')).toBe(false);
      expect(isValidTransition('APPROVED', 'FOR_APPROVAL')).toBe(false);
      expect(isValidTransition('APPROVED', 'REVISION_REQUESTED')).toBe(false);
    });
  });

  describe('VALID_TRANSITIONS constant', () => {
    it('has correct structure', () => {
      expect(VALID_TRANSITIONS.DRAFTING).toEqual(['FOR_APPROVAL']);
      expect(VALID_TRANSITIONS.FOR_APPROVAL).toContain('APPROVED');
      expect(VALID_TRANSITIONS.FOR_APPROVAL).toContain('REVISION_REQUESTED');
      expect(VALID_TRANSITIONS.REVISION_REQUESTED).toEqual(['FOR_APPROVAL']);
      expect(VALID_TRANSITIONS.APPROVED).toEqual([]);
    });
  });
});
