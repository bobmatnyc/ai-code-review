#!/bin/bash
# Generate shell completion scripts for ai-code-review

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPLETIONS_DIR="$PROJECT_ROOT/completions"

# Create completions directory
mkdir -p "$COMPLETIONS_DIR"

echo "🔧 Generating shell completion scripts..."

# Generate bash completion
cat > "$COMPLETIONS_DIR/ai-code-review.bash" << 'EOF'
#!/bin/bash
# Bash completion for ai-code-review

_ai_code_review() {
    local cur prev opts
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    # Review types
    local review_types="quick-fixes architectural security performance unused-code consolidated evaluation extract-patterns coding-test ai-integration cloud-native developer-experience comprehensive"
    
    # Output formats
    local output_formats="markdown json"
    
    # Models (common ones)
    local models="openrouter:anthropic/claude-4-opus openrouter:anthropic/claude-4-sonnet openrouter:openai/gpt-4o openrouter:google/gemini-2.0-pro"

    # Main options
    opts="--type --output --model --help --version --debug --estimate --listmodels --interactive --test-api --multi-pass --force-single-pass --include-tests --include-project-docs --language --framework --config"

    case "${prev}" in
        --type|-t)
            COMPREPLY=( $(compgen -W "${review_types}" -- ${cur}) )
            return 0
            ;;
        --output|-o)
            COMPREPLY=( $(compgen -W "${output_formats}" -- ${cur}) )
            return 0
            ;;
        --model|-m)
            COMPREPLY=( $(compgen -W "${models}" -- ${cur}) )
            return 0
            ;;
        --language)
            COMPREPLY=( $(compgen -W "typescript javascript python php ruby dart go java rust" -- ${cur}) )
            return 0
            ;;
        --framework)
            COMPREPLY=( $(compgen -W "react angular vue nextjs django laravel flask fastapi flutter" -- ${cur}) )
            return 0
            ;;
        --config)
            COMPREPLY=( $(compgen -f -- ${cur}) )
            return 0
            ;;
    esac

    if [[ ${cur} == -* ]] ; then
        COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
        return 0
    fi

    # Complete file/directory names for target
    COMPREPLY=( $(compgen -f -- ${cur}) )
}

complete -F _ai_code_review ai-code-review
EOF

# Generate zsh completion
cat > "$COMPLETIONS_DIR/ai-code-review.zsh" << 'EOF'
#compdef ai-code-review

_ai_code_review() {
    local context state line
    typeset -A opt_args

    _arguments \
        '1:target:_files' \
        '--type[Type of review]:review type:(quick-fixes architectural security performance unused-code consolidated evaluation extract-patterns coding-test ai-integration cloud-native developer-experience comprehensive)' \
        '-t[Type of review]:review type:(quick-fixes architectural security performance unused-code consolidated evaluation extract-patterns coding-test ai-integration cloud-native developer-experience comprehensive)' \
        '--output[Output format]:format:(markdown json)' \
        '-o[Output format]:format:(markdown json)' \
        '--model[Model to use]:model:(openrouter:anthropic/claude-4-opus openrouter:anthropic/claude-4-sonnet openrouter:openai/gpt-4o openrouter:google/gemini-2.0-pro)' \
        '-m[Model to use]:model:(openrouter:anthropic/claude-4-opus openrouter:anthropic/claude-4-sonnet openrouter:openai/gpt-4o openrouter:google/gemini-2.0-pro)' \
        '--language[Programming language]:language:(typescript javascript python php ruby dart go java rust)' \
        '--framework[Framework]:framework:(react angular vue nextjs django laravel flask fastapi flutter)' \
        '--config[Configuration file]:file:_files' \
        '--help[Show help]' \
        '--version[Show version]' \
        '--debug[Enable debug logging]' \
        '--estimate[Estimate token usage]' \
        '--listmodels[List available models]' \
        '--interactive[Interactive mode]' \
        '--test-api[Test API connections]' \
        '--multi-pass[Multi-pass review]' \
        '--force-single-pass[Force single-pass]' \
        '--include-tests[Include test files]' \
        '--include-project-docs[Include project docs]'
}

_ai_code_review "$@"
EOF

# Generate fish completion
cat > "$COMPLETIONS_DIR/ai-code-review.fish" << 'EOF'
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
EOF

echo "✅ Generated completion scripts:"
echo "   - Bash: $COMPLETIONS_DIR/ai-code-review.bash"
echo "   - Zsh: $COMPLETIONS_DIR/ai-code-review.zsh"
echo "   - Fish: $COMPLETIONS_DIR/ai-code-review.fish"
echo ""
echo "📋 Installation instructions:"
echo ""
echo "Bash:"
echo "  source $COMPLETIONS_DIR/ai-code-review.bash"
echo "  # Or add to ~/.bashrc"
echo ""
echo "Zsh:"
echo "  # Add to ~/.zshrc:"
echo "  fpath=($COMPLETIONS_DIR \$fpath)"
echo "  autoload -U compinit && compinit"
echo ""
echo "Fish:"
echo "  cp $COMPLETIONS_DIR/ai-code-review.fish ~/.config/fish/completions/"
