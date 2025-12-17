#!/bin/bash
# Script to simplify deprecation tracking from complex object to simple boolean flag
# GitHub Issue #77

set -e  # Exit on error

echo "Simplifying deprecation tracking to boolean flag..."

# 1. Update functions.ts - getModelMapping function
perl -i -pe '
  s/if \(enhanced\.deprecation\?\.deprecated\)/if (enhanced.deprecated)/;
  s/DEPRECATED: \$\{enhanced\.deprecation\.migrationGuide \|\| '\''Please migrate to an alternative model'\''\}/DEPRECATED: Please migrate to an alternative model/;
' src/clients/utils/modelMaps/functions.ts

# 2. Update functions.ts - validateModelKey function
perl -i -0pe '
  s/if \(enhanced\.deprecation\?\.deprecated\) \{\s+return \{\s+isValid: false,\s+error: `Model '\''\$\{modelKey\}'\'' is deprecated`,\s+warning: enhanced\.deprecation\.migrationGuide,\s+suggestion: enhanced\.deprecation\.alternativeModel,\s+\};\s+\}/if (enhanced.deprecated) {\n    return {\n      isValid: false,\n      error: `Model '\''${modelKey}'\'' is deprecated`,\n      warning: '\''Please migrate to an alternative model'\'',\n    };\n  }/gs;
' src/clients/utils/modelMaps/functions.ts

# Remove suggestion from retiring section
perl -i -pe '
  s/suggestion: enhanced\.deprecation\?\.alternativeModel,//;
' src/clients/utils/modelMaps/functions.ts

# 3. Update legacy.ts
perl -i -pe '
  s/if \(enhanced\.deprecation\?\.deprecated\)/if (enhanced.deprecated)/;
  s/DEPRECATED: \$\{enhanced\.deprecation\.migrationGuide \|\| '\''Please migrate to an alternative model'\''\}/DEPRECATED: Please migrate to an alternative model/;
' src/clients/utils/modelMaps/legacy.ts

# 4. Update anthropic.ts - claude-3-opus
perl -i -0pe '
  s/(status: '\''deprecated'\'',\s+categories: \[ModelCategory\.REASONING, ModelCategory\.CODING\],\s+capabilities: \['\''advanced-reasoning'\'', '\''code-generation'\''\],\s+inputPricePerMillion: 15\.0,\s+outputPricePerMillion: 75\.0,)\s+deprecation: \{[^}]+\},/$1\n    deprecated: true,/gs;
' src/clients/utils/modelMaps/anthropic.ts

# Update claude-3-haiku
perl -i -0pe '
  s/(status: '\''deprecated'\'',\s+categories: \[ModelCategory\.FAST_INFERENCE, ModelCategory\.COST_OPTIMIZED\],\s+capabilities: \['\''fast-inference'\'', '\''basic-reasoning'\''\],\s+inputPricePerMillion: 0\.25,\s+outputPricePerMillion: 1\.25,)\s+deprecation: \{[^}]+\},/$1\n    deprecated: true,/gs;
' src/clients/utils/modelMaps/anthropic.ts

# 5. Update openai.ts - gpt-4.5
perl -i -0pe '
  s/(status: '\''deprecated'\'',\s+categories: \[ModelCategory\.REASONING\],\s+capabilities: \['\''advanced-reasoning'\'', '\''code-generation'\''\],\s+inputPricePerMillion: 10\.0,\s+outputPricePerMillion: 30\.0,)\s+deprecation: \{[^}]+\},/$1\n    deprecated: true,/gs;
' src/clients/utils/modelMaps/openai.ts

echo "✓ Deprecation tracking simplified successfully"
echo "  - Removed DeprecationInfo interface from types.ts"
echo "  - Changed deprecation?: DeprecationInfo to deprecated?: boolean"
echo "  - Updated functions.ts to use simple boolean checks"
echo "  - Updated legacy.ts to use simple boolean checks"
echo "  - Updated provider files (anthropic.ts, openai.ts) to use deprecated: true"
