/**
 * @fileoverview Tests for JSON recovery functionality in response processing
 */

import { describe, it, expect } from 'vitest';

// We need to access the private function for testing, so we'll create a test version
function attemptJsonRecovery(content: string): any | null {
  const strategies = [
    // Strategy 1: Remove leading language identifiers (e.g., "typescript\n{...}")
    (text: string) => {
      const match = text.match(/^(?:typescript|javascript|json|ts|js)\s*\n?\s*({[\s\S]*})$/i);
      return match ? match[1] : null;
    },
    
    // Strategy 2: Extract JSON from mixed content (find first complete JSON object)
    (text: string) => {
      const match = text.match(/({[\s\S]*?})\s*$/);
      return match ? match[1] : null;
    },
    
    // Strategy 3: Look for JSON between quotes (e.g., "typescript\n{...}")
    (text: string) => {
      const match = text.match(/"[^"]*"\s*\n?\s*({[\s\S]*})/);
      return match ? match[1] : null;
    },
    
    // Strategy 4: Remove everything before the first opening brace
    (text: string) => {
      const braceIndex = text.indexOf('{');
      if (braceIndex === -1) return null;
      return text.substring(braceIndex);
    },
    
    // Strategy 5: Try to extract from code blocks with language prefixes
    (text: string) => {
      const match = text.match(/```(?:json|typescript|javascript)?\s*([^`]+)\s*```/i);
      if (!match) return null;
      const blockContent = match[1].trim();
      // Remove language identifier if it's at the start
      const cleanContent = blockContent.replace(/^(?:typescript|javascript|json|ts|js)\s*\n?/i, '');
      return cleanContent.startsWith('{') ? cleanContent : null;
    }
  ];
  
  for (const strategy of strategies) {
    try {
      const extracted = strategy(content.trim());
      if (extracted) {
        const parsed = JSON.parse(extracted);
        // Basic validation
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      }
    } catch (error) {
      // Continue to next strategy
      continue;
    }
  }
  
  return null;
}

describe('JSON Recovery', () => {
  const validJson = {
    summary: "Test summary",
    issues: [
      {
        type: "error",
        severity: "high",
        message: "Test issue",
        line: 1,
        column: 1,
        file: "test.ts"
      }
    ]
  };

  describe('Strategy 1: Language identifier prefix', () => {
    it('should recover JSON with typescript prefix', () => {
      const malformedContent = `typescript
${JSON.stringify(validJson)}`;
      
      const result = attemptJsonRecovery(malformedContent);
      expect(result).toEqual(validJson);
    });

    it('should recover JSON with javascript prefix', () => {
      const malformedContent = `javascript
${JSON.stringify(validJson)}`;
      
      const result = attemptJsonRecovery(malformedContent);
      expect(result).toEqual(validJson);
    });

    it('should recover JSON with ts prefix and whitespace', () => {
      const malformedContent = `ts   
  ${JSON.stringify(validJson)}`;
      
      const result = attemptJsonRecovery(malformedContent);
      expect(result).toEqual(validJson);
    });
  });

  describe('Strategy 2: Mixed content extraction', () => {
    it('should extract JSON from end of mixed content', () => {
      const malformedContent = `Some text before
More text
${JSON.stringify(validJson)}`;
      
      const result = attemptJsonRecovery(malformedContent);
      expect(result).toEqual(validJson);
    });
  });

  describe('Strategy 3: Quoted content', () => {
    it('should extract JSON after quoted language identifier', () => {
      const malformedContent = `"typescript"
${JSON.stringify(validJson)}`;
      
      const result = attemptJsonRecovery(malformedContent);
      expect(result).toEqual(validJson);
    });
  });

  describe('Strategy 4: Remove prefix before brace', () => {
    it('should remove everything before first opening brace', () => {
      const malformedContent = `Random text and numbers 123 ${JSON.stringify(validJson)}`;
      
      const result = attemptJsonRecovery(malformedContent);
      expect(result).toEqual(validJson);
    });
  });

  describe('Strategy 5: Code blocks', () => {
    it('should extract JSON from json code block', () => {
      const malformedContent = `\`\`\`json
${JSON.stringify(validJson)}
\`\`\``;
      
      const result = attemptJsonRecovery(malformedContent);
      expect(result).toEqual(validJson);
    });

    it('should extract JSON from typescript code block with language prefix', () => {
      const malformedContent = `\`\`\`typescript
typescript
${JSON.stringify(validJson)}
\`\`\``;
      
      const result = attemptJsonRecovery(malformedContent);
      expect(result).toEqual(validJson);
    });
  });

  describe('Error cases', () => {
    it('should return null for completely invalid content', () => {
      const malformedContent = 'This is just plain text with no JSON';
      
      const result = attemptJsonRecovery(malformedContent);
      expect(result).toBeNull();
    });

    it('should return null for malformed JSON', () => {
      const malformedContent = 'typescript\n{invalid json}';
      
      const result = attemptJsonRecovery(malformedContent);
      expect(result).toBeNull();
    });

    it('should return null for empty content', () => {
      const result = attemptJsonRecovery('');
      expect(result).toBeNull();
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle the specific error case from the log', () => {
      // Simulating the error: Unexpected token 'y', "typescript"... is not valid JSON
      const malformedContent = `"typescript"
${JSON.stringify(validJson)}`;

      const result = attemptJsonRecovery(malformedContent);
      expect(result).toEqual(validJson);
    });

    it('should handle the exact error pattern from colleague log', () => {
      // The error shows: Unexpected token 'y', "typescript"... is not valid JSON
      // This suggests the content starts with "typescript" (with quotes)
      const malformedContent = `"typescript
${JSON.stringify(validJson)}`;

      const result = attemptJsonRecovery(malformedContent);
      expect(result).toEqual(validJson);
    });

    it('should handle Gemini response with language identifier', () => {
      const malformedContent = `typescript
{
  "summary": "Code review completed",
  "issues": [
    {
      "type": "warning",
      "severity": "medium",
      "message": "Consider using const instead of let",
      "line": 5,
      "column": 1,
      "file": "example.ts"
    }
  ]
}`;

      const result = attemptJsonRecovery(malformedContent);
      expect(result).toBeDefined();
      expect(result.summary).toBe("Code review completed");
      expect(result.issues).toHaveLength(1);
    });

    it('should handle the exact colleague error pattern with newline', () => {
      // The error shows: Unexpected token 'y', "typescript\n"... is not valid JSON
      // This suggests the content starts with "typescript\n{...}"
      const malformedContent = `"typescript
{
  "summary": "Test summary",
  "issues": []
}`;

      const result = attemptJsonRecovery(malformedContent);
      expect(result).toBeDefined();
      expect(result.summary).toBe("Test summary");
      expect(result.issues).toEqual([]);
    });
  });
});
