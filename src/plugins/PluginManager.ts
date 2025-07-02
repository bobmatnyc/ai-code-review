/**
 * @fileoverview Plugin manager for custom review strategies.
 *
 * This module provides a singleton manager for loading and registering plugins
 * that provide custom review strategies.
 */

import fs from 'fs/promises';
import path from 'path';
import type { IReviewStrategy } from '../strategies/ReviewStrategy';
import logger from '../utils/logger';
import type { PluginRegistration } from './PluginInterface';

/**
 * Singleton manager for plugins
 */
export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, PluginRegistration> = new Map();

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance
   * @returns The plugin manager instance
   */
  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /**
   * Register a plugin strategy
   * @param registration Plugin registration information
   */
  registerPlugin(registration: PluginRegistration): void {
    if (this.plugins.has(registration.name)) {
      logger.warn(`Plugin with name "${registration.name}" is already registered. Overwriting...`);
    }

    this.plugins.set(registration.name, registration);
    logger.info(`Registered plugin strategy: ${registration.name}`);
  }

  /**
   * Get a plugin strategy by name
   * @param name Plugin name
   * @returns The strategy or undefined if not found
   */
  getPlugin(name: string): IReviewStrategy | undefined {
    const registration = this.plugins.get(name);
    return registration?.strategy;
  }

  /**
   * Get plugin information by name
   * @param name Plugin name
   * @returns Plugin information or undefined if not found
   */
  getPluginInfo(name: string): PluginRegistration | undefined {
    return this.plugins.get(name);
  }

  /**
   * List all registered plugins
   * @returns Array of plugin registrations
   */
  listPlugins(): PluginRegistration[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Load plugins from a directory
   * @param pluginsDir Directory containing plugins
   */
  async loadPlugins(pluginsDir: string): Promise<void> {
    try {
      // Check if the directory exists
      try {
        await fs.access(pluginsDir);
      } catch (error) {
        // Silently ignore missing plugins directory - this is expected in most cases
        logger.debug(`Plugins directory not found: ${pluginsDir}`);
        return;
      }

      // Read the directory
      const files = await fs.readdir(pluginsDir);

      // Load each plugin
      for (const file of files) {
        if (file.endsWith('.js')) {
          try {
            const pluginPath = path.join(pluginsDir, file);
            // Dynamic import to load the plugin
            const plugin = await import(pluginPath);

            // Check if the plugin has a register function
            if (plugin.default && typeof plugin.default.register === 'function') {
              // Register the plugin
              plugin.default.register(this);
              logger.info(`Loaded plugin from ${file}`);
            } else {
              logger.warn(`File ${file} is not a valid plugin (missing register function)`);
            }
          } catch (error) {
            logger.error(
              `Error loading plugin ${file}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      logger.info(`Loaded ${this.plugins.size} plugins from ${pluginsDir}`);
    } catch (error) {
      logger.error(
        `Error loading plugins: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
