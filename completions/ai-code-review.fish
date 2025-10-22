# Fish completion for ai-code-review

# Review types
complete -c ai-code-review -l type -d "Type of review" -xa "quick-fixes architectural security performance unused-code consolidated evaluation extract-patterns coding-test ai-integration cloud-native developer-experience comprehensive"
complete -c ai-code-review -s t -d "Type of review" -xa "quick-fixes architectural security performance unused-code consolidated evaluation extract-patterns coding-test ai-integration cloud-native developer-experience comprehensive"

# Output formats
complete -c ai-code-review -l output -d "Output format" -xa "markdown json"
complete -c ai-code-review -s o -d "Output format" -xa "markdown json"

# Models
complete -c ai-code-review -l model -d "Model to use" -xa "openrouter:anthropic/claude-4-opus openrouter:anthropic/claude-4-sonnet openrouter:openai/gpt-4o openrouter:google/gemini-2.0-pro"
complete -c ai-code-review -s m -d "Model to use" -xa "openrouter:anthropic/claude-4-opus openrouter:anthropic/claude-4-sonnet openrouter:openai/gpt-4o openrouter:google/gemini-2.0-pro"

# Languages and frameworks
complete -c ai-code-review -l language -d "Programming language" -xa "typescript javascript python php ruby dart go java rust"
complete -c ai-code-review -l framework -d "Framework" -xa "react angular vue nextjs django laravel flask fastapi flutter"

# Other options
complete -c ai-code-review -l help -d "Show help"
complete -c ai-code-review -l version -d "Show version"
complete -c ai-code-review -l debug -d "Enable debug logging"
complete -c ai-code-review -l estimate -d "Estimate token usage"
complete -c ai-code-review -l listmodels -d "List available models"
complete -c ai-code-review -l interactive -d "Interactive mode"
complete -c ai-code-review -l test-api -d "Test API connections"
complete -c ai-code-review -l multi-pass -d "Multi-pass review"
complete -c ai-code-review -l force-single-pass -d "Force single-pass"
complete -c ai-code-review -l include-tests -d "Include test files"
complete -c ai-code-review -l include-project-docs -d "Include project docs"
complete -c ai-code-review -l config -d "Configuration file" -r
