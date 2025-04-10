/**
 * A simple test file for code review
 */

// This function has some issues that should be detected
function calculateSum(a: any, b: any): number {
  // Missing type checks
  return a + b;
}

// This variable is unused
const unusedVariable = 'This is not used';

// This class has no access modifiers
class TestClass {
  name: string;
  age: number;
  
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
  
  // Method with no return type
  getInfo() {
    return `Name: ${this.name}, Age: ${this.age}`;
  }
}

export { calculateSum, TestClass };
