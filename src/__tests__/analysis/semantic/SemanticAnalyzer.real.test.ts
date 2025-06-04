/**
 * @fileoverview Real TreeSitter integration tests for SemanticAnalyzer
 *
 * These tests use actual TreeSitter parsers without mocks to verify
 * that the semantic analysis functionality works correctly with real code.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { SemanticAnalyzer } from '../../../analysis/semantic/SemanticAnalyzer';
import { SemanticAnalysisConfig } from '../../../analysis/semantic/types';

describe('SemanticAnalyzer - Real TreeSitter Integration', () => {
  let analyzer: SemanticAnalyzer;

  beforeEach(() => {
    // Use default configuration for real testing
    const config: Partial<SemanticAnalysisConfig> = {
      enabledLanguages: ['typescript', 'javascript', 'python'],
      complexityThreshold: 10,
      maxChunkSize: 500,
      includeDependencyAnalysis: true
    };
    analyzer = new SemanticAnalyzer(config);
  });

  describe('TypeScript Analysis', () => {
    const typescriptCode = `
interface User {
  id: string;
  name: string;
  email?: string;
}

function getUserData(id: string): User | null {
  if (!id) {
    return null;
  }
  return users.find(u => u.id === id) || null;
}

class UserService {
  private users: User[] = [];
  private static instance: UserService;
  
  constructor() {
    this.users = [];
  }
  
  public addUser(user: User): void {
    if (this.validateUser(user)) {
      this.users.push(user);
    }
  }
  
  private validateUser(user: User): boolean {
    return !!(user.id && user.name);
  }
  
  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }
}

export default UserService;
export { User };
`;

    it('should successfully analyze TypeScript code', async () => {
      const result = await analyzer.analyzeCode(typescriptCode, 'UserService.ts');

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(false);
      expect(result.analysis).toBeDefined();
      expect(result.analysis!.language).toBe('typescript');
    });

    it('should extract top-level declarations correctly', async () => {
      const result = await analyzer.analyzeCode(typescriptCode, 'UserService.ts');

      expect(result.success).toBe(true);
      const declarations = result.analysis!.topLevelDeclarations;
      
      // Should find interface, function, and class
      expect(declarations).toHaveLength(3);
      
      const interfaceDecl = declarations.find(d => d.type === 'interface');
      expect(interfaceDecl).toBeDefined();
      expect(interfaceDecl!.name).toBe('User');
      expect(interfaceDecl!.startLine).toBeGreaterThan(0);
      
      const functionDecl = declarations.find(d => d.type === 'function');
      expect(functionDecl).toBeDefined();
      expect(functionDecl!.name).toBe('getUserData');
      expect(functionDecl!.cyclomaticComplexity).toBeGreaterThan(1); // Has if statement
      
      const classDecl = declarations.find(d => d.type === 'class');
      expect(classDecl).toBeDefined();
      expect(classDecl!.name).toBe('UserService');
      expect(classDecl!.children.length).toBeGreaterThan(0); // Should have methods
    });

    it('should extract class methods as children', async () => {
      const result = await analyzer.analyzeCode(typescriptCode, 'UserService.ts');

      expect(result.success).toBe(true);
      const classDecl = result.analysis!.topLevelDeclarations.find(d => d.type === 'class');
      
      expect(classDecl).toBeDefined();
      expect(classDecl!.children.length).toBeGreaterThanOrEqual(4); // constructor, addUser, validateUser, getInstance + fields
      
      const addUserMethod = classDecl!.children.find(c => c.name === 'addUser');
      expect(addUserMethod).toBeDefined();
      expect(addUserMethod!.type).toBe('method');
      expect(addUserMethod!.modifiers).toContain('public');
      
      const validateUserMethod = classDecl!.children.find(c => c.name === 'validateUser');
      expect(validateUserMethod).toBeDefined();
      expect(validateUserMethod!.modifiers).toContain('private');
    });

    it('should calculate complexity correctly', async () => {
      const result = await analyzer.analyzeCode(typescriptCode, 'UserService.ts');

      expect(result.success).toBe(true);
      const analysis = result.analysis!;
      
      expect(analysis.complexity).toBeDefined();
      expect(analysis.complexity.cyclomaticComplexity).toBeGreaterThan(1);
      expect(analysis.complexity.totalDeclarations).toBe(3); // interface, function, class
      
      // Function with if statement should have complexity > 1
      const functionDecl = analysis.topLevelDeclarations.find(d => d.type === 'function');
      expect(functionDecl!.cyclomaticComplexity).toBeGreaterThan(1);
    });

    it('should generate chunking recommendations', async () => {
      const result = await analyzer.analyzeCode(typescriptCode, 'UserService.ts');

      expect(result.success).toBe(true);
      const strategy = result.analysis!.suggestedChunkingStrategy;
      
      expect(strategy).toBeDefined();
      expect(strategy.strategy).toBeDefined();
      expect(strategy.reasoning).toBeDefined();
      expect(strategy.estimatedChunks).toBeGreaterThan(0);
    });
  });

  describe('JavaScript Analysis', () => {
    const javascriptCode = `
function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    if (item.price && item.quantity) {
      total += item.price * item.quantity;
    }
  }
  return total;
}

class ShoppingCart {
  constructor() {
    this.items = [];
  }
  
  addItem(item) {
    this.items.push(item);
  }
  
  getTotal() {
    return calculateTotal(this.items);
  }
}

module.exports = { ShoppingCart, calculateTotal };
`;

    it('should analyze JavaScript code successfully', async () => {
      const result = await analyzer.analyzeCode(javascriptCode, 'shopping.js');

      expect(result.success).toBe(true);
      expect(result.analysis!.language).toBe('javascript');
      expect(result.analysis!.topLevelDeclarations.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle JavaScript-specific constructs', async () => {
      const result = await analyzer.analyzeCode(javascriptCode, 'shopping.js');

      expect(result.success).toBe(true);
      const declarations = result.analysis!.topLevelDeclarations;
      
      const functionDecl = declarations.find(d => d.name === 'calculateTotal');
      expect(functionDecl).toBeDefined();
      expect(functionDecl!.cyclomaticComplexity).toBeGreaterThan(2); // for loop + if statement
      
      const classDecl = declarations.find(d => d.name === 'ShoppingCart');
      expect(classDecl).toBeDefined();
      expect(classDecl!.children.length).toBeGreaterThan(0);
    });
  });

  describe('Python Analysis', () => {
    const pythonCode = `
class UserManager:
    def __init__(self):
        self.users = []
    
    def add_user(self, user):
        if self.validate_user(user):
            self.users.append(user)
            return True
        return False
    
    def validate_user(self, user):
        return user.get('name') and user.get('email')
    
    def find_user_by_email(self, email):
        for user in self.users:
            if user.get('email') == email:
                return user
        return None

def create_user(name, email):
    return {'name': name, 'email': email}
`;

    it('should analyze Python code successfully', async () => {
      const result = await analyzer.analyzeCode(pythonCode, 'user_manager.py');

      expect(result.success).toBe(true);
      expect(result.analysis!.language).toBe('python');
      expect(result.analysis!.topLevelDeclarations.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract Python class methods', async () => {
      const result = await analyzer.analyzeCode(pythonCode, 'user_manager.py');

      expect(result.success).toBe(true);
      const classDecl = result.analysis!.topLevelDeclarations.find(d => d.type === 'class');
      
      expect(classDecl).toBeDefined();
      expect(classDecl!.name).toBe('UserManager');
      expect(classDecl!.children.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle syntax errors gracefully', async () => {
      const invalidCode = `
function broken( {
  // Missing closing parenthesis and brace
`;

      const result = await analyzer.analyzeCode(invalidCode, 'broken.js');

      // Should still attempt analysis even with parse errors
      expect(result.success).toBe(true); // Graceful degradation
      expect(result.errors?.some(e => e.type === 'parse_error')).toBe(true);
    });

    it('should handle empty files', async () => {
      const result = await analyzer.analyzeCode('', 'empty.ts');

      expect(result.success).toBe(true);
      expect(result.analysis!.topLevelDeclarations).toHaveLength(0);
      expect(result.analysis!.totalLines).toBe(1); // Empty string splits to 1 line
    });

    it('should handle unsupported languages', async () => {
      const result = await analyzer.analyzeCode('print "hello"', 'test.unknown');

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].type).toBe('language_not_supported');
    });

    it('should handle very large files', async () => {
      const largeCode = 'const x = 1;\n'.repeat(50000); // Exceed 1MB limit

      const result = await analyzer.analyzeCode(largeCode, 'large.ts');

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.errors![0].type).toBe('file_too_large');
    });
  });

  describe('Complex Code Analysis', () => {
    const complexCode = `
interface Config {
  apiUrl: string;
  timeout: number;
  retries?: number;
}

abstract class BaseService {
  protected config: Config;
  
  constructor(config: Config) {
    this.config = config;
  }
  
  abstract processData(data: any): Promise<any>;
  
  protected async makeRequest(url: string): Promise<any> {
    for (let i = 0; i < (this.config.retries || 3); i++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return await response.json();
        }
        throw new Error(\`HTTP \${response.status}\`);
      } catch (error) {
        if (i === (this.config.retries || 3) - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

class UserService extends BaseService {
  async processData(userData: any): Promise<User> {
    const validated = this.validateUserData(userData);
    if (!validated) {
      throw new Error('Invalid user data');
    }
    
    const user = await this.makeRequest(\`\${this.config.apiUrl}/users\`);
    return user;
  }
  
  private validateUserData(data: any): boolean {
    return !!(data.name && data.email && data.id);
  }
}

export { BaseService, UserService, Config };
`;

    it('should analyze complex inheritance patterns', async () => {
      const result = await analyzer.analyzeCode(complexCode, 'services.ts');

      expect(result.success).toBe(true);
      const declarations = result.analysis!.topLevelDeclarations;
      
      expect(declarations.length).toBeGreaterThanOrEqual(3); // interface, abstract class, concrete class
      
      const baseClass = declarations.find(d => d.name === 'BaseService');
      expect(baseClass).toBeDefined();
      expect(baseClass!.modifiers).toContain('abstract');
      
      const userService = declarations.find(d => d.name === 'UserService');
      expect(userService).toBeDefined();
      expect(userService!.children.length).toBeGreaterThan(0);
    });

    it('should calculate high complexity correctly', async () => {
      const result = await analyzer.analyzeCode(complexCode, 'services.ts');

      expect(result.success).toBe(true);
      const analysis = result.analysis!;
      
      // makeRequest method should have high complexity due to loops, try-catch, conditionals
      const baseClass = analysis.topLevelDeclarations.find(d => d.name === 'BaseService');
      const makeRequestMethod = baseClass!.children.find(c => c.name === 'makeRequest');
      
      expect(makeRequestMethod).toBeDefined();
      expect(makeRequestMethod!.cyclomaticComplexity).toBeGreaterThan(5);
    });
  });

  describe('Performance', () => {
    it('should complete analysis in reasonable time', async () => {
      const mediumCode = `
${'function test' + Math.random().toString().slice(2, 8) + '() { return "test"; }\n'.repeat(100)}
`;

      const startTime = Date.now();
      const result = await analyzer.analyzeCode(mediumCode, 'performance.ts');
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Language Detection', () => {
    it('should detect TypeScript from .ts extension', async () => {
      const result = await analyzer.analyzeCode('const x: number = 1;', 'test.ts');
      expect(result.success).toBe(true);
      expect(result.analysis!.language).toBe('typescript');
    });

    it('should detect JavaScript from .js extension', async () => {
      const result = await analyzer.analyzeCode('const x = 1;', 'test.js');
      expect(result.success).toBe(true);
      expect(result.analysis!.language).toBe('javascript');
    });

    it('should detect Python from .py extension', async () => {
      const result = await analyzer.analyzeCode('x = 1', 'test.py');
      expect(result.success).toBe(true);
      expect(result.analysis!.language).toBe('python');
    });

    it('should override detection with explicit language parameter', async () => {
      const result = await analyzer.analyzeCode('const x = 1;', 'test.txt', 'typescript');
      expect(result.success).toBe(true);
      expect(result.analysis!.language).toBe('typescript');
    });
  });
});