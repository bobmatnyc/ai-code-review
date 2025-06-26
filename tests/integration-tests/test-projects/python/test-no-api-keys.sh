#\!/bin/bash

# Run the tool with no API keys (unset all)
env -u AI_CODE_REVIEW_GOOGLE_API_KEY \
    -u AI_CODE_REVIEW_OPENROUTER_API_KEY \
    -u AI_CODE_REVIEW_ANTHROPIC_API_KEY \
    -u AI_CODE_REVIEW_OPENAI_API_KEY \
    -u OPENAI_API_KEY \
    -u ANTHROPIC_API_KEY \
    node ../../dist/index.js --debug .
