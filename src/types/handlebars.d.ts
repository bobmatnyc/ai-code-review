/**
 * Type declarations for Handlebars template functions
 */

declare type HandlebarsTemplateDelegate<T = any> = (context: T, options?: any) => string;
