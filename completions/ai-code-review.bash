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
