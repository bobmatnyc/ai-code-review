#!/usr/bin/env node

/**
 * Pattern Database System for Extract Patterns Review Type
 * 
 * This module provides storage, organization, and retrieval functionality
 * for extracted code patterns, creating a searchable library of exemplar
 * project patterns.
 * 
 * Usage:
 *   node tests/extract-patterns/pattern-database.js [command] [options]
 * 
 * Commands:
 *   store <file>        Store patterns from extract-patterns output
 *   search <query>      Search patterns by keywords
 *   list               List all stored patterns
 *   compare <id1> <id2> Compare two pattern sets
 *   export <format>     Export patterns in specified format
 * 
 * Database Structure:
 *   - SQLite database for metadata and indexing
 *   - JSON files for full pattern content
 *   - Full-text search capabilities
 *   - Pattern similarity detection
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Database configuration
const DB_CONFIG = {
  dbPath: path.join(__dirname, '../../data/patterns.db'),
  patternsDir: path.join(__dirname, '../../data/patterns'),
  indexDir: path.join(__dirname, '../../data/patterns/index')
};

/**
 * Pattern record structure
 */
class PatternRecord {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.projectName = data.projectName || '';
    this.projectType = data.projectType || 'unknown';
    this.language = data.language || 'typescript';
    this.extractedAt = data.extractedAt || new Date().toISOString();
    this.model = data.model || '';
    this.version = data.version || '1.0.0';
    this.tags = data.tags || [];
    this.metadata = data.metadata || {};
    this.patterns = data.patterns || {};
    this.metrics = data.metrics || {};
    this.filePath = data.filePath || '';
    this.hash = data.hash || '';
  }

  /**
   * Generate unique ID for pattern record
   */
  generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `pattern_${timestamp}_${random}`;
  }

  /**
   * Generate content hash for deduplication
   */
  generateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex').substr(0, 16);
  }

  /**
   * Extract patterns from content
   */
  extractPatterns(content) {
    const patterns = {
      architecture: this.extractArchitecturePatterns(content),
      codeStyle: this.extractCodeStylePatterns(content),
      toolchain: this.extractToolchainPatterns(content),
      testing: this.extractTestingPatterns(content),
      configuration: this.extractConfigurationPatterns(content)
    };

    return patterns;
  }

  /**
   * Extract architecture patterns from content
   */
  extractArchitecturePatterns(content) {
    const patterns = [];
    const sections = this.extractSections(content, ['architecture', 'design', 'pattern']);
    
    for (const section of sections) {
      patterns.push({
        type: 'architecture',
        title: section.title,
        content: section.content,
        examples: this.extractCodeBlocks(section.content),
        keywords: this.extractKeywords(section.content)
      });
    }

    return patterns;
  }

  /**
   * Extract code style patterns from content
   */
  extractCodeStylePatterns(content) {
    const patterns = [];
    const sections = this.extractSections(content, ['style', 'convention', 'formatting']);
    
    for (const section of sections) {
      patterns.push({
        type: 'codeStyle',
        title: section.title,
        content: section.content,
        examples: this.extractCodeBlocks(section.content),
        keywords: this.extractKeywords(section.content)
      });
    }

    return patterns;
  }

  /**
   * Extract toolchain patterns from content
   */
  extractToolchainPatterns(content) {
    const patterns = [];
    const sections = this.extractSections(content, ['tool', 'build', 'configuration', 'setup']);
    
    for (const section of sections) {
      patterns.push({
        type: 'toolchain',
        title: section.title,
        content: section.content,
        examples: this.extractCodeBlocks(section.content),
        keywords: this.extractKeywords(section.content)
      });
    }

    return patterns;
  }

  /**
   * Extract testing patterns from content
   */
  extractTestingPatterns(content) {
    const patterns = [];
    const sections = this.extractSections(content, ['test', 'testing', 'spec', 'mock']);
    
    for (const section of sections) {
      patterns.push({
        type: 'testing',
        title: section.title,
        content: section.content,
        examples: this.extractCodeBlocks(section.content),
        keywords: this.extractKeywords(section.content)
      });
    }

    return patterns;
  }

  /**
   * Extract configuration patterns from content
   */
  extractConfigurationPatterns(content) {
    const patterns = [];
    const configKeywords = ['config', 'tsconfig', 'package.json', 'webpack', 'babel'];
    
    for (const keyword of configKeywords) {
      const regex = new RegExp(`${keyword}[\\s\\S]*?(?=\\n#{1,6}|$)`, 'gi');
      const matches = content.match(regex);
      
      if (matches) {
        for (const match of matches) {
          patterns.push({
            type: 'configuration',
            title: `${keyword} Configuration`,
            content: match,
            examples: this.extractCodeBlocks(match),
            keywords: [keyword, ...this.extractKeywords(match)]
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Extract sections from content based on keywords
   */
  extractSections(content, keywords) {
    const sections = [];
    const lines = content.split('\n');
    let currentSection = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        const title = headerMatch[2].trim();
        const titleLower = title.toLowerCase();
        
        // Check if this section matches our keywords
        const isRelevant = keywords.some(keyword => 
          titleLower.includes(keyword.toLowerCase())
        );
        
        if (isRelevant) {
          currentSection = {
            title,
            content: '',
            startLine: i
          };
        } else {
          currentSection = null;
        }
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }
    
    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Extract code blocks from content
   */
  extractCodeBlocks(content) {
    const codeBlocks = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1] || 'text',
        code: match[2].trim()
      });
    }

    return codeBlocks;
  }

  /**
   * Extract keywords from content
   */
  extractKeywords(content) {
    // Remove code blocks and markdown formatting
    const cleanContent = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/[#*_\[\]()]/g, '')
      .toLowerCase();

    // Extract meaningful words (3+ characters, not common words)
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men', 'put', 'say', 'she', 'too', 'use'
    ]);

    const words = cleanContent
      .split(/\s+/)
      .filter(word => word.length >= 3 && !commonWords.has(word))
      .filter(word => /^[a-z]+$/.test(word)); // Only alphabetic words

    // Count word frequency and return top keywords
    const wordCount = {};
    for (const word of words) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }

    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }
}

/**
 * Pattern Database class
 */
class PatternDatabase {
  constructor(config = DB_CONFIG) {
    this.config = config;
    this.db = null;
  }

  /**
   * Initialize database
   */
  async initialize() {
    // Ensure directories exist
    await fs.mkdir(path.dirname(this.config.dbPath), { recursive: true });
    await fs.mkdir(this.config.patternsDir, { recursive: true });
    await fs.mkdir(this.config.indexDir, { recursive: true });

    // Initialize SQLite database
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.config.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  /**
   * Create database tables
   */
  async createTables() {
    const createPatternsTable = `
      CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        project_name TEXT NOT NULL,
        project_type TEXT,
        language TEXT,
        extracted_at TEXT,
        model TEXT,
        version TEXT,
        tags TEXT,
        file_path TEXT,
        hash TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createPatternContentTable = `
      CREATE TABLE IF NOT EXISTS pattern_content (
        pattern_id TEXT,
        type TEXT,
        title TEXT,
        content TEXT,
        keywords TEXT,
        FOREIGN KEY (pattern_id) REFERENCES patterns (id)
      )
    `;

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_patterns_project_name ON patterns (project_name)',
      'CREATE INDEX IF NOT EXISTS idx_patterns_language ON patterns (language)',
      'CREATE INDEX IF NOT EXISTS idx_patterns_hash ON patterns (hash)',
      'CREATE INDEX IF NOT EXISTS idx_pattern_content_type ON pattern_content (type)',
      'CREATE INDEX IF NOT EXISTS idx_pattern_content_keywords ON pattern_content (keywords)'
    ];

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(createPatternsTable);
        this.db.run(createPatternContentTable);
        
        for (const indexSql of createIndexes) {
          this.db.run(indexSql);
        }
        
        resolve();
      });
    });
  }

  /**
   * Store pattern record
   */
  async storePattern(patternRecord) {
    const insertPattern = `
      INSERT OR REPLACE INTO patterns 
      (id, project_name, project_type, language, extracted_at, model, version, tags, file_path, hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertContent = `
      INSERT INTO pattern_content (pattern_id, type, title, content, keywords)
      VALUES (?, ?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Clear existing content for this pattern
        this.db.run('DELETE FROM pattern_content WHERE pattern_id = ?', [patternRecord.id]);
        
        // Insert pattern record
        const db = this.db;
        db.run(insertPattern, [
          patternRecord.id,
          patternRecord.projectName,
          patternRecord.projectType,
          patternRecord.language,
          patternRecord.extractedAt,
          patternRecord.model,
          patternRecord.version,
          JSON.stringify(patternRecord.tags),
          patternRecord.filePath,
          patternRecord.hash
        ], function(err) {
          if (err) {
            reject(err);
            return;
          }

          // Insert pattern content
          const stmt = db.prepare(insertContent);

          for (const [type, patterns] of Object.entries(patternRecord.patterns)) {
            for (const pattern of patterns) {
              stmt.run([
                patternRecord.id,
                type,
                pattern.title,
                pattern.content,
                JSON.stringify(pattern.keywords)
              ]);
            }
          }

          stmt.finalize((err) => {
            if (err) {
              reject(err);
            } else {
              resolve(patternRecord.id);
            }
          });
        });
      });
    });
  }

  /**
   * Search patterns by keywords
   */
  async searchPatterns(query, options = {}) {
    const limit = options.limit || 10;
    const offset = options.offset || 0;
    const language = options.language;
    const projectType = options.projectType;

    let sql = `
      SELECT DISTINCT p.*, pc.type, pc.title, pc.content
      FROM patterns p
      JOIN pattern_content pc ON p.id = pc.pattern_id
      WHERE (pc.content LIKE ? OR pc.keywords LIKE ? OR p.project_name LIKE ?)
    `;

    const params = [`%${query}%`, `%${query}%`, `%${query}%`];

    if (language) {
      sql += ' AND p.language = ?';
      params.push(language);
    }

    if (projectType) {
      sql += ' AND p.project_type = ?';
      params.push(projectType);
    }

    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * List all patterns
   */
  async listPatterns(options = {}) {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const sql = `
      SELECT * FROM patterns 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;

    return new Promise((resolve, reject) => {
      this.db.all(sql, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Get pattern by ID
   */
  async getPattern(id) {
    const patternSql = 'SELECT * FROM patterns WHERE id = ?';
    const contentSql = 'SELECT * FROM pattern_content WHERE pattern_id = ?';

    return new Promise((resolve, reject) => {
      this.db.get(patternSql, [id], (err, pattern) => {
        if (err) {
          reject(err);
          return;
        }

        if (!pattern) {
          resolve(null);
          return;
        }

        this.db.all(contentSql, [id], (err, content) => {
          if (err) {
            reject(err);
          } else {
            pattern.content = content;
            resolve(pattern);
          }
        });
      });
    });
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close(resolve);
      });
    }
  }
}

module.exports = {
  PatternDatabase,
  PatternRecord,
  DB_CONFIG
};
