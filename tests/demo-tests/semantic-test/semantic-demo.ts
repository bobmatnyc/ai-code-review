/**
 * @fileoverview Test file for semantic analysis demonstration
 * 
 * This file contains various TypeScript constructs to test
 * the semantic chunking functionality including interfaces,
 * classes, functions, and complex code patterns.
 */

// Interface definitions
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  preferences?: UserPreferences;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
}

type UserRole = 'admin' | 'user' | 'guest';

// Enum declaration
enum StatusCode {
  SUCCESS = 200,
  NOT_FOUND = 404,
  INTERNAL_ERROR = 500
}

// Simple function
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Complex function with high cyclomatic complexity
function validateUserData(user: Partial<User>): boolean {
  if (!user) {
    return false;
  }

  if (!user.id || user.id.trim().length === 0) {
    return false;
  }

  if (!user.name || user.name.trim().length < 2) {
    return false;
  }

  if (!user.email || !user.email.includes('@')) {
    return false;
  }

  if (user.role && !['admin', 'user', 'guest'].includes(user.role)) {
    return false;
  }

  if (user.preferences) {
    if (user.preferences.theme && !['light', 'dark'].includes(user.preferences.theme)) {
      return false;
    }
    
    if (typeof user.preferences.notifications !== 'boolean') {
      return false;
    }
  }

  return true;
}

// Abstract class
abstract class BaseService {
  protected apiUrl: string;
  protected timeout: number;

  constructor(apiUrl: string, timeout: number = 5000) {
    this.apiUrl = apiUrl;
    this.timeout = timeout;
  }

  abstract processData(data: any): Promise<any>;

  protected async makeRequest(endpoint: string, data?: any): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: data ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Request failed: ${error.message}`);
      }
      throw error;
    }
  }
}

// Concrete class extending abstract class
class UserService extends BaseService {
  private cache: Map<string, User> = new Map();
  private static instance: UserService;

  constructor() {
    super('/api/users');
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  async processData(userData: Partial<User>): Promise<User> {
    if (!validateUserData(userData)) {
      throw new Error('Invalid user data provided');
    }

    // Check cache first
    if (userData.id && this.cache.has(userData.id)) {
      return this.cache.get(userData.id)!;
    }

    try {
      const user = await this.makeRequest('/validate', userData) as User;
      
      // Cache the validated user
      if (user.id) {
        this.cache.set(user.id, user);
      }

      return user;
    } catch (error) {
      throw new Error(`User processing failed: ${error}`);
    }
  }

  public async createUser(userData: Omit<User, 'id'>): Promise<User> {
    const userWithId: User = {
      ...userData,
      id: generateUserId()
    };

    if (!validateUserData(userWithId)) {
      throw new Error('Generated user data is invalid');
    }

    const createdUser = await this.makeRequest('/create', userWithId) as User;
    this.cache.set(createdUser.id, createdUser);
    
    return createdUser;
  }

  public async getUserById(id: string): Promise<User | null> {
    // Try cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    try {
      const user = await this.makeRequest(`/${id}`) as User;
      this.cache.set(id, user);
      return user;
    } catch (error) {
      console.warn(`Failed to fetch user ${id}:`, error);
      return null;
    }
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheSize(): number {
    return this.cache.size;
  }
}

// Utility class with static methods
class UserUtils {
  public static formatUserName(user: User): string {
    return `${user.name} (${user.role})`;
  }

  public static isAdmin(user: User): boolean {
    return user.role === 'admin';
  }

  public static getUserInitials(user: User): string {
    return user.name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }

  public static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  public static validateNameLength(name: string): boolean {
    return name.length >= UserConstants.MIN_NAME_LENGTH && 
           name.length <= UserConstants.MAX_NAME_LENGTH;
  }
}

// Generic function
function createResponse<T>(data: T, status: StatusCode = StatusCode.SUCCESS): ApiResponse<T> {
  return {
    data,
    status,
    timestamp: new Date().toISOString(),
    success: status === StatusCode.SUCCESS
  };
}

// Generic interface
interface ApiResponse<T> {
  data: T;
  status: StatusCode;
  timestamp: string;
  success: boolean;
}

// Complex type with conditional types
type UserPermissions<T extends UserRole> = T extends 'admin'
  ? 'read' | 'write' | 'delete' | 'manage'
  : T extends 'user'
  ? 'read' | 'write'
  : 'read';

// Constants for user validation
export const UserConstants = {
  MAX_NAME_LENGTH: 100,
  MIN_NAME_LENGTH: 2,
  PASSWORD_MIN_LENGTH: 8,
  CACHE_TTL: 300000, // 5 minutes
} as const;

// Export statements
export default UserService;
export {
  User,
  UserRole,
  UserPreferences,
  UserService,
  UserUtils,
  UserConstants,
  StatusCode,
  ApiResponse,
  createResponse,
  validateUserData,
  generateUserId
};
export type { UserPermissions };