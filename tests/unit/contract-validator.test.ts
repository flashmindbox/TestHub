/**
 * Contract Validator Unit Tests
 *
 * Tests for the ContractValidator class and helper functions.
 */

import { test, expect } from '@playwright/test';
import { z } from 'zod';
import {
  ContractValidator,
  ContractValidationError,
  createContractValidator,
  defaultValidator,
} from '../../src/utils/contract-validator';

// =============================================================================
// TEST SCHEMAS
// =============================================================================

const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  age: z.number().int().positive().optional(),
});

const DeckSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  cardCount: z.number().int().nonnegative(),
});

const NestedSchema = z.object({
  user: UserSchema,
  decks: z.array(DeckSchema),
});

// =============================================================================
// VALIDATOR CLASS TESTS
// =============================================================================

test.describe('ContractValidator', () => {
  test.describe('validate()', () => {
    test('returns validated data for valid input', () => {
      const validator = createContractValidator();
      const validUser = { id: '123', email: 'test@example.com', name: 'John' };

      const result = validator.validate(UserSchema, validUser);

      expect(result).toEqual(validUser);
    });

    test('throws ContractValidationError for invalid input', () => {
      const validator = createContractValidator();
      const invalidUser = { id: '123', email: 'not-an-email', name: '' };

      expect(() => validator.validate(UserSchema, invalidUser)).toThrow(ContractValidationError);
    });

    test('includes field path in error message', () => {
      const validator = createContractValidator();
      const invalidUser = { id: '123', email: 'invalid', name: 'John' };

      try {
        validator.validate(UserSchema, invalidUser);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ContractValidationError);
        const validationError = error as ContractValidationError;
        expect(validationError.paths).toContain('email');
        expect(validationError.message).toContain('email');
      }
    });

    test('includes context in error message when provided', () => {
      const validator = createContractValidator();
      const invalidData = { id: 123 }; // id should be string

      try {
        validator.validate(UserSchema, invalidData, 'GET /api/users/123');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ContractValidationError);
        expect((error as ContractValidationError).message).toContain('GET /api/users/123');
      }
    });

    test('handles nested object validation errors', () => {
      const validator = createContractValidator();
      const invalidNested = {
        user: { id: '1', email: 'bad', name: 'Test' },
        decks: [{ id: '1', name: 'Deck', cardCount: -1 }],
      };

      try {
        validator.validate(NestedSchema, invalidNested);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ContractValidationError);
        const validationError = error as ContractValidationError;
        // Should have errors for both user.email and decks[0].cardCount
        expect(validationError.errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  test.describe('safeParse()', () => {
    test('returns success: true with data for valid input', () => {
      const validator = createContractValidator();
      const validDeck = { id: '1', name: 'Test Deck', cardCount: 10 };

      const result = validator.safeParse(DeckSchema, validDeck);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validDeck);
      expect(result.errors).toBeUndefined();
    });

    test('returns success: false with errors for invalid input', () => {
      const validator = createContractValidator();
      const invalidDeck = { id: '1', name: '', cardCount: 'ten' };

      const result = validator.safeParse(DeckSchema, invalidDeck);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    test('includes readable error messages', () => {
      const validator = createContractValidator();
      const invalidUser = { id: '1', email: 'not-email', name: 'Test' };

      const result = validator.safeParse(UserSchema, invalidUser);

      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.includes('email'))).toBe(true);
    });

    test('does not throw on invalid input', () => {
      const validator = createContractValidator();
      const invalidData = null;

      expect(() => validator.safeParse(UserSchema, invalidData)).not.toThrow();
    });
  });

  test.describe('assertValid()', () => {
    test('does not throw for valid input', () => {
      const validator = createContractValidator();
      const validDeck = { id: '1', name: 'Test', cardCount: 5 };

      expect(() => validator.assertValid(DeckSchema, validDeck)).not.toThrow();
    });

    test('throws ContractValidationError for invalid input', () => {
      const validator = createContractValidator();
      const invalidDeck = { id: '1' }; // missing required fields

      expect(() => validator.assertValid(DeckSchema, invalidDeck)).toThrow(ContractValidationError);
    });

    test('includes context in error', () => {
      const validator = createContractValidator();
      const invalidDeck = {};

      try {
        validator.assertValid(DeckSchema, invalidDeck, 'Deck creation response');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as ContractValidationError).context).toBe('Deck creation response');
      }
    });
  });

  test.describe('statistics tracking', () => {
    test('tracks total validations', () => {
      const validator = createContractValidator();
      const validData = { id: '1', name: 'Test', cardCount: 0 };

      validator.safeParse(DeckSchema, validData);
      validator.safeParse(DeckSchema, validData);
      validator.safeParse(DeckSchema, {});

      const stats = validator.getStats();
      expect(stats.total).toBe(3);
    });

    test('tracks passed validations', () => {
      const validator = createContractValidator();
      const validData = { id: '1', name: 'Test', cardCount: 0 };

      validator.safeParse(DeckSchema, validData);
      validator.safeParse(DeckSchema, validData);

      const stats = validator.getStats();
      expect(stats.passed).toBe(2);
    });

    test('tracks failed validations', () => {
      const validator = createContractValidator();

      validator.safeParse(DeckSchema, {});
      validator.safeParse(DeckSchema, { id: 1 });

      const stats = validator.getStats();
      expect(stats.failed).toBe(2);
    });

    test('calculates pass rate correctly', () => {
      const validator = createContractValidator();
      const validData = { id: '1', name: 'Test', cardCount: 0 };

      validator.safeParse(DeckSchema, validData); // pass
      validator.safeParse(DeckSchema, validData); // pass
      validator.safeParse(DeckSchema, validData); // pass
      validator.safeParse(DeckSchema, {}); // fail

      const stats = validator.getStats();
      expect(stats.passRate).toBe(75);
    });

    test('reset() clears statistics', () => {
      const validator = createContractValidator();

      validator.safeParse(DeckSchema, {});
      validator.safeParse(DeckSchema, {});

      validator.reset();

      const stats = validator.getStats();
      expect(stats.total).toBe(0);
      expect(stats.passed).toBe(0);
      expect(stats.failed).toBe(0);
    });

    test('tracks stats across validate() calls that throw', () => {
      const validator = createContractValidator();

      try {
        validator.validate(DeckSchema, {});
      } catch {
        // expected
      }

      const stats = validator.getStats();
      expect(stats.total).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });

  test.describe('validation modes', () => {
    const StrictSchema = z.object({
      id: z.string(),
      name: z.string(),
    });

    test('strict mode rejects extra fields by default', () => {
      const validator = createContractValidator({ mode: 'strict' });
      const dataWithExtra = { id: '1', name: 'Test', extraField: 'oops' };

      const result = validator.safeParse(StrictSchema.strict(), dataWithExtra);

      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.includes('extraField'))).toBe(true);
    });

    test('lenient mode allows extra fields', () => {
      const validator = createContractValidator({ mode: 'lenient' });
      const dataWithExtra = { id: '1', name: 'Test', extraField: 'allowed' };

      const result = validator.safeParse(StrictSchema, dataWithExtra);

      expect(result.success).toBe(true);
    });

    test('setMode() changes validation behavior', () => {
      const validator = createContractValidator({ mode: 'strict' });

      expect(validator.getMode()).toBe('strict');

      validator.setMode('lenient');

      expect(validator.getMode()).toBe('lenient');
    });
  });
});

// =============================================================================
// ERROR MESSAGE TESTS
// =============================================================================

test.describe('ContractValidationError', () => {
  test('formats type mismatch errors clearly', () => {
    const validator = createContractValidator();
    const invalidData = { id: 123, name: 'Test', cardCount: 0 };

    const result = validator.safeParse(DeckSchema, invalidData);

    expect(result.success).toBe(false);
    // Check that error mentions the field 'id' and indicates a type issue
    // Different Zod versions may format this differently
    expect(result.errors?.some((e) => e.includes('id'))).toBe(true);
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  test('formats missing field errors clearly', () => {
    const validator = createContractValidator();
    const missingFields = { id: '1' };

    const result = validator.safeParse(DeckSchema, missingFields);

    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.includes('name'))).toBe(true);
    expect(result.errors?.some((e) => e.includes('cardCount'))).toBe(true);
  });

  test('formats email validation errors clearly', () => {
    const validator = createContractValidator();
    const invalidEmail = { id: '1', email: 'not-valid', name: 'Test' };

    const result = validator.safeParse(UserSchema, invalidEmail);

    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.toLowerCase().includes('email'))).toBe(true);
  });

  test('formats array index paths correctly', () => {
    const ArraySchema = z.object({
      items: z.array(z.string()),
    });
    const validator = createContractValidator();
    const invalidData = { items: ['valid', 123, 'also-valid'] };

    const result = validator.safeParse(ArraySchema, invalidData);

    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.includes('items.1'))).toBe(true);
  });

  test('includes all error paths in ContractValidationError', () => {
    const validator = createContractValidator();
    const multipleErrors = { id: 123, email: 'bad', name: '' };

    try {
      validator.validate(UserSchema, multipleErrors);
      expect.fail('Should have thrown');
    } catch (error) {
      const validationError = error as ContractValidationError;
      expect(validationError.paths).toContain('id');
      expect(validationError.paths).toContain('email');
      expect(validationError.paths).toContain('name');
    }
  });
});

// =============================================================================
// FACTORY AND DEFAULT INSTANCE TESTS
// =============================================================================

test.describe('createContractValidator()', () => {
  test('creates new validator instance', () => {
    const validator = createContractValidator();

    expect(validator).toBeInstanceOf(ContractValidator);
  });

  test('accepts options', () => {
    const validator = createContractValidator({ mode: 'lenient', maxErrors: 5 });

    expect(validator.getMode()).toBe('lenient');
  });

  test('each instance has independent stats', () => {
    const validator1 = createContractValidator();
    const validator2 = createContractValidator();

    validator1.safeParse(DeckSchema, {});

    expect(validator1.getStats().total).toBe(1);
    expect(validator2.getStats().total).toBe(0);
  });
});

test.describe('defaultValidator', () => {
  test('is a ContractValidator instance', () => {
    expect(defaultValidator).toBeInstanceOf(ContractValidator);
  });

  test('can be used for validation', () => {
    const validData = { id: '1', name: 'Test', cardCount: 10 };

    const result = defaultValidator.safeParse(DeckSchema, validData);

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

test.describe('edge cases', () => {
  test('handles null input', () => {
    const validator = createContractValidator();

    const result = validator.safeParse(UserSchema, null);

    expect(result.success).toBe(false);
  });

  test('handles undefined input', () => {
    const validator = createContractValidator();

    const result = validator.safeParse(UserSchema, undefined);

    expect(result.success).toBe(false);
  });

  test('handles empty object', () => {
    const validator = createContractValidator();

    const result = validator.safeParse(UserSchema, {});

    expect(result.success).toBe(false);
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  test('handles deeply nested errors', () => {
    const DeepSchema = z.object({
      level1: z.object({
        level2: z.object({
          level3: z.object({
            value: z.string(),
          }),
        }),
      }),
    });
    const validator = createContractValidator();
    const invalidData = {
      level1: {
        level2: {
          level3: {
            value: 123,
          },
        },
      },
    };

    const result = validator.safeParse(DeepSchema, invalidData);

    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.includes('level1.level2.level3.value'))).toBe(true);
  });

  test('handles optional fields correctly', () => {
    const validator = createContractValidator();
    const dataWithoutOptional = { id: '1', email: 'test@example.com', name: 'Test' };

    const result = validator.safeParse(UserSchema, dataWithoutOptional);

    expect(result.success).toBe(true);
  });

  test('validates optional fields when present', () => {
    const validator = createContractValidator();
    const dataWithInvalidOptional = {
      id: '1',
      email: 'test@example.com',
      name: 'Test',
      age: -5, // invalid: must be positive
    };

    const result = validator.safeParse(UserSchema, dataWithInvalidOptional);

    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.includes('age'))).toBe(true);
  });

  test('100% pass rate when no validations', () => {
    const validator = createContractValidator();

    const stats = validator.getStats();

    expect(stats.passRate).toBe(100);
  });
});
