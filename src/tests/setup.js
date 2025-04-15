// Mock the Date object to return a fixed date for all tests
const FIXED_DATE = new Date('2024-04-15T16:30:00.000Z');
global.Date = class extends Date {
  constructor() {
    return FIXED_DATE;
  }

  static now() {
    return FIXED_DATE.getTime();
  }
};
