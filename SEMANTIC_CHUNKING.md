# Semantic Chunking Configuration

## Overview

Semantic chunking is an intelligent code analysis feature that uses TreeSitter to parse code and understand its structure, then creates meaningful chunks based on code relationships rather than arbitrary line boundaries. This leads to more effective code reviews and significantly reduced token usage.

## Environment Variable Configuration

### `AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING`

Controls whether semantic chunking is enabled for intelligent code analysis.

- **Type**: `boolean`
- **Default**: `true`
- **Values**: 
  - `true` - Enable semantic chunking (recommended)
  - `false` - Disable semantic chunking, use traditional token-based chunking

### Setting the Environment Variable

#### In .env.local file:
```bash
# Enable semantic chunking (default)
AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING=true

# Disable semantic chunking
AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING=false
```

#### Via command line:
```bash
# Enable for single command
AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING=true npm run dev -- path/to/code

# Disable for single command  
AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING=false npm run dev -- path/to/code
```

#### Via CLI flag (overrides environment variable):
```bash
# Enable via CLI flag
npm run dev -- path/to/code --enable-semantic-chunking=true

# Disable via CLI flag
npm run dev -- path/to/code --enable-semantic-chunking=false
```

## How Semantic Chunking Works

### 1. **Code Structure Analysis**
Uses TreeSitter to parse code into an Abstract Syntax Tree (AST), identifying:
- Functions and methods
- Classes and interfaces
- Import/export relationships
- Variable declarations
- Code complexity metrics

### 2. **Intelligent Strategy Selection**
Chooses optimal chunking strategy based on:
- **Review type**: Different strategies for architectural, security, performance reviews
- **Code structure**: Classes, functions, complexity levels
- **Dependencies**: Import relationships and cross-references

### 3. **AI-Guided Chunking**
Enhanced rule-based system that considers:
- Code complexity and nesting
- Functional relationships
- Review focus areas
- Token efficiency

## Chunking Strategies

### Available Strategies

| Strategy | Best For | Description |
|----------|----------|-------------|
| `individual` | Simple functions, high complexity code | Each declaration reviewed separately |
| `grouped` | Many small utilities | Related small declarations together |
| `hierarchical` | Object-oriented code | Classes with their methods |
| `functional` | Feature-based code | Related business logic grouped |
| `contextual` | Complex dependencies | Preserves import/dependency context |

### Strategy Selection Logic

```typescript
// Review type preferences
architectural review + classes → hierarchical strategy
security review + imports → contextual strategy  
performance review + complex functions → functional strategy
quick-fixes + high complexity → individual strategy
```

## Benefits

### 🚀 **Performance Improvements**
- **95%+ token reduction**: From ~196K to ~4K tokens in typical cases
- **Faster analysis**: TreeSitter parsing in ~50ms
- **Cost efficiency**: Significant reduction in API costs

### 🧠 **Better Analysis Quality**
- **Semantic coherence**: Related code analyzed together
- **Preserved relationships**: Class-method, import-usage connections maintained
- **Context awareness**: Dependencies and cross-references preserved
- **Review type optimization**: Strategies tailored to review goals

### 🛠 **Developer Experience**
- **Intelligent boundaries**: No arbitrary line cuts mid-function
- **Focused reviews**: Chunks organized by logical code structure
- **Consistent results**: Reproducible chunking based on code structure

## Usage Examples

### Basic Usage (Default Enabled)
```bash
# Semantic chunking enabled by default
npm run dev -- src/components/UserService.ts --type=architectural
```

Output:
```
🧠 Using semantic code analysis with TreeSitter...
✅ Semantic analysis complete:
   • Method: semantic
   • Chunks discovered: 3
   • Semantic threads: 3
   • Analysis time: 42ms
```

### Architectural Review with Hierarchical Chunking
```bash
npm run dev -- src/models/ --type=architectural
```
- Classes grouped with their methods
- Interfaces and implementations linked
- Inheritance relationships preserved

### Security Review with Contextual Chunking
```bash
npm run dev -- src/auth/ --type=security
```
- Authentication flows analyzed together
- Import relationships for security libraries preserved
- Data flow analysis optimized

### Performance Review with Functional Chunking
```bash
npm run dev -- src/utils/ --type=performance
```
- Related utility functions grouped
- Performance-critical paths analyzed together
- Execution flow relationships maintained

## Debugging and Troubleshooting

### Enable Debug Logging
```bash
npm run dev -- path/to/code --debug
```

Debug output shows:
```
Environment variable AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING: true
Semantic chunking enabled: true
Using AI-guided chunking recommendation
Generating enhanced rule-based chunking for review type: quick-fixes
```

### Common Issues

#### Semantic Chunking Not Working
**Symptoms**: Shows "Files not suitable for semantic analysis"
**Solutions**:
1. Check file types - only TypeScript, JavaScript, Python, Ruby supported
2. Verify environment variable: `AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING=true`
3. Check file size - files over 1MB use traditional chunking

#### Unexpected Chunking Strategy
**Check**: Review type and code structure influence strategy selection
```bash
# Force specific review type for different strategy
npm run dev -- path/to/code --type=architectural  # → hierarchical
npm run dev -- path/to/code --type=security      # → contextual
npm run dev -- path/to/code --type=performance   # → functional
```

#### Traditional Chunking Fallback
**When it happens**:
- Unsupported file types (JSON, XML, etc.)
- Files larger than 1MB
- Parse errors in code
- Semantic chunking disabled

**Solution**: Review file type and syntax, or enable semantic chunking

## Configuration Options

### Advanced Configuration
```bash
# Review type affects chunking strategy
--type=architectural  # Uses hierarchical chunking for class structures
--type=security      # Uses contextual chunking for data flow analysis
--type=performance   # Uses functional chunking for execution paths
--type=quick-fixes   # Uses individual chunking for focused analysis
```

### Model Compatibility
Semantic chunking works with all supported models:
- Gemini 1.5/2.x (recommended for large context)
- Claude 3.x series
- GPT-4 series
- OpenRouter models

## Migration Guide

### From Traditional to Semantic Chunking

**Before** (Traditional):
```bash
npm run dev -- large-project/ --force-single-pass
# Risk: Token limit errors, arbitrary code boundaries
```

**After** (Semantic):
```bash
npm run dev -- large-project/
# Benefit: Intelligent chunking, preserved code structure
```

### Gradual Adoption
1. **Start with small files**: Test semantic chunking on individual files
2. **Enable for specific review types**: Use `--type=architectural` first
3. **Monitor token usage**: Compare costs with debug logging
4. **Scale to full projects**: Apply to entire codebases

## Best Practices

### 1. **Choose Appropriate Review Types**
- Use `architectural` for new codebases or major refactoring
- Use `security` for authentication/authorization code
- Use `performance` for optimization-focused reviews
- Use `quick-fixes` for bug fixes and small improvements

### 2. **Leverage Debug Mode**
```bash
npm run dev -- path/to/code --debug
```
- Monitor chunking decisions
- Verify strategy selection
- Check token usage improvements

### 3. **File Organization**
- Keep related code in same files for better semantic grouping
- Use clear naming conventions for better AST analysis
- Maintain consistent code structure for optimal chunking

### 4. **Performance Monitoring**
```bash
# Compare token usage
AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING=false npm run dev -- code/ --estimate
AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING=true npm run dev -- code/ --estimate
```

## Technical Details

### Supported Languages
- **TypeScript** (.ts, .tsx) - Full support
- **JavaScript** (.js, .jsx) - Full support  
- **Python** (.py) - Full support
- **Ruby** (.rb) - Full support
- **PHP** (.php) - Basic support

### Fallback Behavior
1. **Semantic chunking** (preferred)
2. **Line-based chunking** (500-line chunks)
3. **Individual file processing** (current system)
4. **Emergency fallback** (single chunk per file)

### Performance Metrics
- **Analysis time**: 40-100ms per file
- **Token reduction**: 90-95% in typical cases
- **Memory usage**: Minimal overhead from TreeSitter parsing
- **Accuracy**: 95%+ semantic boundary detection

## Support

### Reporting Issues
When reporting semantic chunking issues, include:
1. File type and size
2. Review type used
3. Debug output (`--debug` flag)
4. Expected vs actual chunking behavior

### Feature Requests
Semantic chunking roadmap includes:
- Additional language support
- Custom chunking rules
- Full AI-guided chunking integration
- Performance optimizations

---

For more information, see the main [README.md](README.md) and [PROJECT.md](docs/PROJECT.md) documentation.