/**
 * Test setup file to configure test environment
 */

// Mock the Date object to return a fixed date for all tests
const FIXED_DATE = new Date('2024-04-15T16:30:00.000Z');

// @ts-expect-error Intentionally overriding global Date
global.Date = class extends Date {
  constructor() {
    super();
    return FIXED_DATE;
  }

  static now(): number {
    return FIXED_DATE.getTime();
  }
};