# JSDoc Documentation Templates

This document provides templates and guidelines for JSDoc documentation in the ai-code-review project. Following these templates will ensure consistent documentation across the codebase.

## File Headers

Every file should begin with a comprehensive file header:

```typescript
/**
 * @fileoverview Brief description of the file's purpose.
 *
 * Detailed description explaining the file's role in the system, 
 * its key responsibilities, and how it fits into the larger architecture.
 * Include any important context that would help a developer understand
 * the file's purpose.
 *
 * Key responsibilities:
 * - Responsibility 1
 * - Responsibility 2
 * - Responsibility 3
 *
 * @example
 * // Basic usage example if applicable
 * const instance = new MyClass();
 * instance.doSomething();
 */
```

## Class Documentation

```typescript
/**
 * Class description that explains its purpose and role.
 * 
 * @example
 * const instance = new MyClass('param');
 * instance.doSomething();
 * 
 * @implements {SomeInterface} Optional interfaces implemented
 * @extends {ParentClass} Optional parent class
 */
class MyClass {
  /**
   * Creates an instance of MyClass.
   * 
   * @param {string} param1 - Description of param1
   * @param {number} [param2=0] - Description of optional param2 with default value
   */
  constructor(param1, param2 = 0) {
    // Implementation
  }

  /**
   * Brief description of what the method does.
   * 
   * Detailed description including any important behavior,
   * side effects, or exceptions that might be thrown.
   * 
   * @param {string} param - Description of param
   * @returns {Promise<boolean>} Description of the return value
   * @throws {Error} Description of when/why an error might be thrown
   * 
   * @example
   * // Example usage of the method
   * const result = await instance.doSomething('test');
   */
  async doSomething(param) {
    // Implementation
  }
}
```

## Interface Documentation

```typescript
/**
 * Description of what this interface represents and its purpose.
 * 
 * @template T - Description of the type parameter if applicable
 */
interface MyInterface<T> {
  /**
   * Description of this property
   * 
   * @type {string}
   */
  propertyName: string;
  
  /**
   * Description of what this method does and its role.
   * 
   * @param {T} param - Description of the parameter
   * @returns {Promise<boolean>} Description of the return value
   */
  methodName(param: T): Promise<boolean>;
}
```

## Function Documentation

```typescript
/**
 * Description of what the function does.
 * 
 * More detailed explanation if needed about behavior,
 * limitations, or special cases.
 * 
 * @param {string} param1 - Description of the first parameter
 * @param {number} [param2] - Description of optional second parameter
 * @returns {boolean} Description of the return value
 * 
 * @example
 * // Example usage
 * const result = myFunction('test', 42);
 */
function myFunction(param1, param2?) {
  // Implementation
}
```

## Type Definition Documentation

```typescript
/**
 * Description of what this type represents and its purpose.
 * 
 * @template T - Description of the type parameter if applicable
 */
type MyType<T> = {
  /**
   * Description of this property
   */
  property1: string;
  
  /**
   * Description of this property
   */
  property2: T;
};
```

## Documentation Best Practices

1. **Be consistent** with documentation style across the codebase
2. **Document all public APIs** including classes, interfaces, methods, and functions
3. **Include examples** for complex functionality
4. **Document parameters and return types** with descriptions
5. **Explain complex logic** with inline comments
6. **Keep documentation updated** when code changes
7. **Use complete sentences** and proper grammar
8. **Link to related components** using `{@link ClassName}` syntax
9. **Document exceptions/errors** that might be thrown
10. **Include usage notes** for non-obvious behavior