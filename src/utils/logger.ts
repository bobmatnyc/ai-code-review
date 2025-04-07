/**
 * @fileoverview Centralized logging system for the AI Code Review tool.
 * 
 * This module provides a standardized logging interface with support for
 * different log levels, colored output, and log level control via environment
 * variables. It's designed to be used throughout the codebase to ensure
 * consistent logging behavior.
 */

// Define log levels with numeric values for comparison
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

// Map string log level names to enum values
const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  'debug': LogLevel.DEBUG,
  'info': LogLevel.INFO,
  'warn': LogLevel.WARN,
  'error': LogLevel.ERROR,
  'none': LogLevel.NONE
};

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bright: '\x1b[1m',
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  time: '\x1b[90m',  // Gray
};

// Get the current log level from environment variables
function getCurrentLogLevel(): LogLevel {
  const envLogLevel = process.env.AI_CODE_REVIEW_LOG_LEVEL?.toLowerCase();
  
  if (envLogLevel && envLogLevel in LOG_LEVEL_MAP) {
    return LOG_LEVEL_MAP[envLogLevel];
  }
  
  // Default to INFO if not specified
  return LogLevel.INFO;
}

// The current log level
let currentLogLevel = getCurrentLogLevel();

/**
 * Set the current log level
 * @param level The log level to set
 */
export function setLogLevel(level: LogLevel | string): void {
  if (typeof level === 'string') {
    const levelLower = level.toLowerCase();
    if (levelLower in LOG_LEVEL_MAP) {
      currentLogLevel = LOG_LEVEL_MAP[levelLower];
    } else {
      console.warn(`Invalid log level: ${level}. Using default.`);
    }
  } else {
    currentLogLevel = level;
  }
}

/**
 * Get the current log level
 * @returns The current log level
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * Format a log message with timestamp and level
 * @param level The log level
 * @param message The message to log
 * @returns The formatted message
 */
function formatLogMessage(level: string, message: string): string {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase().padEnd(5);
  
  return `${COLORS.time}[${timestamp}]${COLORS.reset} ${COLORS[level as keyof typeof COLORS]}${levelUpper}${COLORS.reset} ${message}`;
}

/**
 * Log a message if the current log level allows it
 * @param level The log level
 * @param message The message to log
 * @param args Additional arguments to log
 */
function log(level: LogLevel, levelName: string, message: string, ...args: any[]): void {
  // Only log if the current log level is less than or equal to the specified level
  if (level >= currentLogLevel) {
    const formattedMessage = formatLogMessage(levelName, message);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, ...args);
        break;
      case LogLevel.INFO:
        console.log(formattedMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, ...args);
        break;
    }
  }
}

/**
 * Log a debug message
 * @param message The message to log
 * @param args Additional arguments to log
 */
export function debug(message: string, ...args: any[]): void {
  log(LogLevel.DEBUG, 'debug', message, ...args);
}

/**
 * Log an info message
 * @param message The message to log
 * @param args Additional arguments to log
 */
export function info(message: string, ...args: any[]): void {
  log(LogLevel.INFO, 'info', message, ...args);
}

/**
 * Log a warning message
 * @param message The message to log
 * @param args Additional arguments to log
 */
export function warn(message: string, ...args: any[]): void {
  log(LogLevel.WARN, 'warn', message, ...args);
}

/**
 * Log an error message
 * @param message The message to log
 * @param args Additional arguments to log
 */
export function error(message: string, ...args: any[]): void {
  log(LogLevel.ERROR, 'error', message, ...args);
}

/**
 * Create a logger instance with a specific prefix
 * @param prefix The prefix to add to all log messages
 * @returns An object with debug, info, warn, and error methods
 */
export function createLogger(prefix: string) {
  return {
    debug: (message: string, ...args: any[]) => debug(`[${prefix}] ${message}`, ...args),
    info: (message: string, ...args: any[]) => info(`[${prefix}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => warn(`[${prefix}] ${message}`, ...args),
    error: (message: string, ...args: any[]) => error(`[${prefix}] ${message}`, ...args),
  };
}

// Export a default logger instance
export default {
  debug,
  info,
  warn,
  error,
  setLogLevel,
  getLogLevel,
  createLogger,
  LogLevel
};
