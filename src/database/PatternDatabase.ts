/**
 * @fileoverview Pattern database for storing and organizing extracted patterns.
 *
 * This module provides a database system for storing, organizing, and retrieving
 * extracted patterns from various projects to build a comprehensive pattern library.
 */

import fs from 'fs/promises';
import path from 'path';
import { ExtractPatternsReview } from '../prompts/schemas/extract-patterns-schema';
import { EvaluationResult } from '../evaluation/LangChainEvaluator';
import logger from '../utils/logger';

/**
 * Pattern entry in the database
 */
export interface PatternEntry {
  id: string;
  projectName: string;
  projectType: string; // 'cli', 'web-app', 'library', 'framework', etc.
  language: string;
  extractedAt: string; // ISO timestamp
  patterns: ExtractPatternsReview;
  evaluation?: EvaluationResult;
  tags: string[];
  sourceInfo: {
    repository?: string;
    version?: string;
    size: {
      files: number;
      linesOfCode: number;
    };
  };
}

/**
 * Search criteria for pattern database
 */
export interface SearchCriteria {
  projectType?: string;
  language?: string;
  tags?: string[];
  architecturalPatterns?: string[];
  minQualityScore?: number;
  maxResults?: number;
}

/**
 * Pattern similarity result
 */
export interface SimilarityResult {
  entry: PatternEntry;
  similarityScore: number; // 0-1
  matchingPatterns: string[];
  matchingTechnologies: string[];
}

/**
 * Pattern database for managing extracted patterns
 */
export class PatternDatabase {
  private dbPath: string;
  private indexPath: string;

  constructor(dbDirectory: string = 'pattern-database') {
    this.dbPath = path.resolve(dbDirectory);
    this.indexPath = path.join(this.dbPath, 'index.json');
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.dbPath, { recursive: true });
      
      // Create index if it doesn't exist
      try {
        await fs.access(this.indexPath);
      } catch {
        await this.saveIndex([]);
      }
      
      logger.info(`Pattern database initialized at: ${this.dbPath}`);
    } catch (error) {
      logger.error(`Failed to initialize pattern database: ${error}`);
      throw error;
    }
  }

  /**
   * Store a pattern entry
   */
  async store(entry: PatternEntry): Promise<void> {
    try {
      // Save the entry file
      const entryPath = path.join(this.dbPath, `${entry.id}.json`);
      await fs.writeFile(entryPath, JSON.stringify(entry, null, 2));
      
      // Update index
      const index = await this.loadIndex();
      const existingIndex = index.findIndex(item => item.id === entry.id);
      
      const indexEntry = {
        id: entry.id,
        projectName: entry.projectName,
        projectType: entry.projectType,
        language: entry.language,
        extractedAt: entry.extractedAt,
        tags: entry.tags,
        qualityScore: entry.evaluation?.overallScore || 0,
        patternCount: entry.patterns.architecturalPatterns.length
      };
      
      if (existingIndex >= 0) {
        index[existingIndex] = indexEntry;
      } else {
        index.push(indexEntry);
      }
      
      await this.saveIndex(index);
      logger.info(`Stored pattern entry: ${entry.id}`);
      
    } catch (error) {
      logger.error(`Failed to store pattern entry: ${error}`);
      throw error;
    }
  }

  /**
   * Retrieve a pattern entry by ID
   */
  async retrieve(id: string): Promise<PatternEntry | null> {
    try {
      const entryPath = path.join(this.dbPath, `${id}.json`);
      const content = await fs.readFile(entryPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      logger.error(`Failed to retrieve pattern entry ${id}: ${error}`);
      throw error;
    }
  }

  /**
   * Search for patterns based on criteria
   */
  async search(criteria: SearchCriteria): Promise<PatternEntry[]> {
    try {
      const index = await this.loadIndex();
      let filteredIndex = index;

      // Apply filters
      if (criteria.projectType) {
        filteredIndex = filteredIndex.filter(item => 
          item.projectType === criteria.projectType
        );
      }

      if (criteria.language) {
        filteredIndex = filteredIndex.filter(item =>
          item.language.toLowerCase() === criteria.language!.toLowerCase()
        );
      }

      if (criteria.tags && criteria.tags.length > 0) {
        filteredIndex = filteredIndex.filter(item =>
          criteria.tags!.some(tag => item.tags.includes(tag))
        );
      }

      if (criteria.minQualityScore) {
        filteredIndex = filteredIndex.filter(item =>
          item.qualityScore >= criteria.minQualityScore!
        );
      }

      // Sort by quality score (highest first)
      filteredIndex.sort((a, b) => b.qualityScore - a.qualityScore);

      // Limit results
      if (criteria.maxResults) {
        filteredIndex = filteredIndex.slice(0, criteria.maxResults);
      }

      // Load full entries
      const results: PatternEntry[] = [];
      for (const indexItem of filteredIndex) {
        const entry = await this.retrieve(indexItem.id);
        if (entry) {
          // Additional filtering for architectural patterns
          if (criteria.architecturalPatterns && criteria.architecturalPatterns.length > 0) {
            const hasMatchingPattern = criteria.architecturalPatterns.some(pattern =>
              entry.patterns.architecturalPatterns.some(p =>
                p.patternName.toLowerCase().includes(pattern.toLowerCase())
              )
            );
            if (hasMatchingPattern) {
              results.push(entry);
            }
          } else {
            results.push(entry);
          }
        }
      }

      return results;
    } catch (error) {
      logger.error(`Failed to search patterns: ${error}`);
      throw error;
    }
  }

  /**
   * Find similar patterns to a given pattern entry
   */
  async findSimilar(targetEntry: PatternEntry, maxResults: number = 5): Promise<SimilarityResult[]> {
    try {
      const allEntries = await this.getAllEntries();
      const similarities: SimilarityResult[] = [];

      for (const entry of allEntries) {
        if (entry.id === targetEntry.id) continue;

        const similarity = this.calculateSimilarity(targetEntry, entry);
        if (similarity.similarityScore > 0.1) { // Minimum threshold
          similarities.push(similarity);
        }
      }

      // Sort by similarity score (highest first)
      similarities.sort((a, b) => b.similarityScore - a.similarityScore);

      return similarities.slice(0, maxResults);
    } catch (error) {
      logger.error(`Failed to find similar patterns: ${error}`);
      throw error;
    }
  }

  /**
   * Get statistics about the pattern database
   */
  async getStatistics(): Promise<{
    totalEntries: number;
    languageDistribution: Record<string, number>;
    projectTypeDistribution: Record<string, number>;
    averageQualityScore: number;
    topPatterns: Array<{ pattern: string; count: number }>;
  }> {
    try {
      const allEntries = await this.getAllEntries();

      const languageDistribution: Record<string, number> = {};
      const projectTypeDistribution: Record<string, number> = {};
      const patternCounts: Record<string, number> = {};
      let totalQualityScore = 0;

      for (const entry of allEntries) {
        // Language distribution
        languageDistribution[entry.language] = (languageDistribution[entry.language] || 0) + 1;

        // Project type distribution
        projectTypeDistribution[entry.projectType] = (projectTypeDistribution[entry.projectType] || 0) + 1;

        // Pattern counts
        for (const pattern of entry.patterns.architecturalPatterns) {
          patternCounts[pattern.patternName] = (patternCounts[pattern.patternName] || 0) + 1;
        }

        // Quality score
        totalQualityScore += entry.evaluation?.overallScore || 0;
      }

      const topPatterns = Object.entries(patternCounts)
        .map(([pattern, count]) => ({ pattern, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalEntries: allEntries.length,
        languageDistribution,
        projectTypeDistribution,
        averageQualityScore: allEntries.length > 0 ? totalQualityScore / allEntries.length : 0,
        topPatterns
      };
    } catch (error) {
      logger.error(`Failed to get database statistics: ${error}`);
      throw error;
    }
  }

  /**
   * Export patterns to a specific format
   */
  async export(format: 'json' | 'csv', outputPath: string, criteria?: SearchCriteria): Promise<void> {
    try {
      const entries = criteria ? await this.search(criteria) : await this.getAllEntries();

      if (format === 'json') {
        await fs.writeFile(outputPath, JSON.stringify(entries, null, 2));
      } else if (format === 'csv') {
        const csv = this.convertToCSV(entries);
        await fs.writeFile(outputPath, csv);
      }

      logger.info(`Exported ${entries.length} entries to ${outputPath}`);
    } catch (error) {
      logger.error(`Failed to export patterns: ${error}`);
      throw error;
    }
  }

  /**
   * Load the index file
   */
  private async loadIndex(): Promise<any[]> {
    try {
      const content = await fs.readFile(this.indexPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return [];
    }
  }

  /**
   * Save the index file
   */
  private async saveIndex(index: any[]): Promise<void> {
    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Get all entries from the database
   */
  private async getAllEntries(): Promise<PatternEntry[]> {
    const index = await this.loadIndex();
    const entries: PatternEntry[] = [];

    for (const indexItem of index) {
      const entry = await this.retrieve(indexItem.id);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Calculate similarity between two pattern entries
   */
  private calculateSimilarity(entry1: PatternEntry, entry2: PatternEntry): SimilarityResult {
    let score = 0;
    const matchingPatterns: string[] = [];
    const matchingTechnologies: string[] = [];

    // Language similarity (high weight)
    if (entry1.language === entry2.language) {
      score += 0.3;
    }

    // Project type similarity
    if (entry1.projectType === entry2.projectType) {
      score += 0.2;
    }

    // Architectural pattern similarity
    const patterns1 = entry1.patterns.architecturalPatterns.map(p => p.patternName.toLowerCase());
    const patterns2 = entry2.patterns.architecturalPatterns.map(p => p.patternName.toLowerCase());
    
    for (const pattern1 of patterns1) {
      for (const pattern2 of patterns2) {
        if (pattern1 === pattern2 || pattern1.includes(pattern2) || pattern2.includes(pattern1)) {
          matchingPatterns.push(pattern1);
          score += 0.1;
        }
      }
    }

    // Technology stack similarity
    const techs1 = entry1.patterns.technologyStack.frameworks.map(t => t.name.toLowerCase());
    const techs2 = entry2.patterns.technologyStack.frameworks.map(t => t.name.toLowerCase());
    
    for (const tech1 of techs1) {
      if (techs2.includes(tech1)) {
        matchingTechnologies.push(tech1);
        score += 0.05;
      }
    }

    // Tag similarity
    const commonTags = entry1.tags.filter(tag => entry2.tags.includes(tag));
    score += commonTags.length * 0.05;

    return {
      entry: entry2,
      similarityScore: Math.min(1, score),
      matchingPatterns: [...new Set(matchingPatterns)],
      matchingTechnologies: [...new Set(matchingTechnologies)]
    };
  }

  /**
   * Convert entries to CSV format
   */
  private convertToCSV(entries: PatternEntry[]): string {
    const headers = [
      'ID', 'Project Name', 'Project Type', 'Language', 'Extracted At',
      'Quality Score', 'Pattern Count', 'Main Patterns', 'Technologies'
    ];

    const rows = entries.map(entry => [
      entry.id,
      entry.projectName,
      entry.projectType,
      entry.language,
      entry.extractedAt,
      entry.evaluation?.overallScore || 0,
      entry.patterns.architecturalPatterns.length,
      entry.patterns.architecturalPatterns.map(p => p.patternName).join('; '),
      entry.patterns.technologyStack.frameworks.map(t => t.name).join('; ')
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }
}
