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
