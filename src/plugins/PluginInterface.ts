/**
 * @fileoverview Plugin interface for custom review strategies.
 *
 * This module defines the interface for plugins that can be registered with the
 * plugin manager to provide custom review strategies.
 */

import type { IReviewStrategy } from '../strategies/ReviewStrategy';

/**
 * Interface for plugin registration
 */
export interface PluginRegistration {
  /**
   * Name of the plugin
   */
  name: string;

  /**
   * Description of the plugin
   */
  description: string;

  /**
   * Strategy implementation
   */
  strategy: IReviewStrategy;
}

/**
 * Interface for plugin modules
 */
export interface Plugin {
  /**
   * Register the plugin with the plugin manager
   * @param pluginManager The plugin manager instance
   */
  register: (pluginManager: any) => void;

  /**
   * Get information about the plugin
   * @returns Plugin information
   */
  getInfo: () => {
    name: string;
    description: string;
    version: string;
    author: string;
  };
}
