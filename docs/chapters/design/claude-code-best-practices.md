# Claude Code Best Practices - Organized by File

Based on the Anthropic Claude Code best practices article, here's how to organize the content across your instruction files:

## 📁 claude.md

**Purpose:** Project-specific context and conventions that Claude should know when working in this codebase.

### Core Content to Include:

#### Development Environment & Tools

- Shell commands and their purposes
- Coding conventions and style guides
- Testing procedures and test locations
- Project-specific instructions and requirements
- Tool access configurations (gh CLI, MCP servers, etc.)

#### Project Structure Documentation

#### Headless Mode Implementation

```markdown
## Automation Setupmarkdown

## Project Structure

- `/src` - Main application code
- `/tests` - Test suites (unit, integration)
- `/docs` - Project documentation
- `/.claude/commands` - Custom Claude commands

## Development Conventions

- Use TypeScript strict mode
- Follow ESLint configuration
- Prefer functional components in React
- Use conventional commit messages

## Testing Guidelines

- Run tests with `npm test`
- Integration tests in `/tests/integration`
- Mock external services in tests
- Maintain >80% code coverage

## Development Server Management (TypeScript)

- Start: `ppnpm run dev:pm2 start`
- Monitor: `ppnpm run dev:pm2 logs`
- Restart: `ppnpm run dev:pm2 restart`
- Stop: `ppnpm run dev:pm2 stop`

## Post-Task Verification (TypeScript)

After each development task:

1. `ppnpm run dev:pm2 restart` - Clean server state
2. `ppnpm run dev:pm2 logs` - Monitor for errors
3. `ppnpm run type-check` - TypeScript validation
4. `ppnpm run lint` - Code style check

## Development Server Management (Python)

- Start: `python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`
- Monitor: `tail -f app.log`
- Debug: `python -m pdb main.py`
- Test: `python -m pytest`

## Post-Task Verification (Python)

After each development task:

1. Restart server/reload code
2. `python -m pytest` - Run test suite
3. `python -m mypy .` - Type checking
4. `python -m ruff check .` - Linting
5. `python -m ruff format .` - Formatting
```

#### Tool Integration

- TrackDown CLI setup and commands
- MCP server configurations
- Permission settings for tools
- Custom automation scripts

#### Iterative Refinement Notes

- Document what works well with Claude in this project
- Note specific prompting patterns that are effective
- Record common debugging workflows
- TrackDown ticket workflow patterns

---

## 📁 docs/workflow.md

**Purpose:** Standardized processes and methodologies for using Claude Code effectively.

### Core Content to Include:

#### Planning-First Approach

```markdown
## Planning-First Workflow

1. **Context Gathering Phase**

   - Have Claude read relevant files, images, or URLs
   - Provide general pointers or specific filenames
   - Explicitly tell Claude NOT to write code yet
   - Use subagents for complex problems

2. **Planning Phase**

   - Use keywords like "think hard" or "ultrathink" for increased reasoning
   - Have Claude generate a detailed plan
   - Review and request changes to the plan
   - Generate documentation (GitHub issues) before implementation

3. **Implementation Phase**
   - Iterative implementation following the plan
   - Validation steps at each stage
   - Independent sub-agent checks for overfitting
```

#### Structured Development Patterns

- **Test-Driven Development:** Generate failing tests first, commit them, then implement
- **Visual Development:** Use screenshots and visual mocks for UI alignment
- **Iterative Refinement:** Plan for 2-3 iterations to achieve optimal results
- **Subagent Parallelization:** Use Task Tool for parallel execution of independent tasks

#### Subagent Usage Patterns

```markdown
## When to Use Subagents

### Parallel Exploration

- Large codebase analysis: "Explore the codebase using 4 tasks in parallel. Each agent should explore different directories."
- Independent research tasks
- Multi-component analysis

### Key Characteristics

- Each subagent has its own context window (additional context capacity)
- Maximum 10 parallel tasks supported
- Tasks queue automatically when limit reached
- Don't specify parallelism level unless throttling needed
- Let Claude Code decide optimal parallel execution

### Best Practices

- Use for clearly parallelizable work
- Each task should be independent
- Avoid dependencies between parallel tasks
- Leverage for large-scale codebase exploration
```

#### Session Management

```markdown
## Session Types and Approaches

### Interactive Sessions

- Pipe in log files or data
- Use tools to pull additional context
- Combine multiple data sources

### Headless Mode (CI/Automation)

- Use `-p` flag with prompt
- `--output-format stream-json` for structured output
- No session persistence - trigger each time
- Good for GitHub event automation
```

#### Permission and Safety Patterns

- When to use `--dangerously-skip-permissions`
- Safe automation workflows (lint fixes, boilerplate)
- Risk assessment for unattended operations
- **Always verify changes with post-task workflows**

#### Error Monitoring and Resolution

````markdown
## Development Error Patterns

### TypeScript Common Issues

| Error Type       | Example                                     | Fix                                              |
| ---------------- | ------------------------------------------- | ------------------------------------------------ |
| Missing Import   | `ReferenceError: TrendingUp is not defined` | Add: `import { TrendingUp } from "lucide-react"` |
| Module Not Found | `Cannot find module 'tailwind-merge'`       | Clear cache: `rm -rf .next && pnpm dev`          |
| Type Error       | `Type 'string' not assignable to 'number'`  | Fix type or add assertion                        |
| Hook Error       | `Invalid hook call`                         | Check hook at component top level                |

### Python Common Issues

| Error Type    | Example                                    | Fix                                 |
| ------------- | ------------------------------------------ | ----------------------------------- |
| Import Error  | `ModuleNotFoundError: No module named 'x'` | `pip install x` or check PYTHONPATH |
| Type Error    | `Argument has incompatible type`           | Fix type annotations                |
| Syntax Error  | `SyntaxError: invalid syntax`              | Check indentation and syntax        |
| Runtime Error | `AttributeError: 'NoneType'`               | Add null checks                     |

### Monitoring Commands

```bash
# TypeScript
tail -f dev-server.log | grep -E "(Error|error|⨯|failed)"

# Python
tail -f app.log | grep -E "(ERROR|error|exception|traceback)"
```
````

````

---

## 📁 docs/instructions.md

**Purpose:** Technical implementation details and configuration guidance.

### Core Content to Include:

#### Custom Slash Commands Setup
```markdown
## Slash Commands Configuration

### Project Commands (`.claude/commands/`)
Store reusable prompt templates in Markdown files:

**Example: `.claude/commands/fix-trackdown-ticket.md`**
````

Please analyze and fix the TrackDown ticket: $ARGUMENTS

Follow these steps:

1. Use `trackdown view` to get the ticket details
2. Understand the problem described in the ticket
3. Search the codebase for relevant files
4. Implement the necessary changes to fix the issue
5. Create tests to verify the fix
6. Commit the changes with descriptive message
7. Update ticket status using `trackdown update`

```

**Usage:** `/project:fix-trackdown-ticket TICKET-123`

### Personal Commands (`~/.claude/commands/`)
Global commands available across all sessions.
```

#### MCP Server Configuration

````markdown
## MCP Server Setup

### Project-Level (`.mcp.json`)

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-puppeteer"]
    },
    "sentry": {
      "command": "mcp-server-sentry",
      "args": ["--token", "$SENTRY_TOKEN"]
    }
  }
}
```
````

### Debugging

- Use `--mcp-debug` flag to identify configuration issues
- Check server logs for connection problems
- Verify environment variables are set

````

#### Tool Integration Guidelines
```markdown
## TrackDown Integration
1. Install TrackDown CLI: `trackdown auth login`
2. Configure project access
3. Test with: `trackdown list`

## Permission Management
- Configure tool access via CLI flags
- Use persistent configuration files
- Set permission levels per tool type

## Environment Inheritance
- Claude inherits local shell environment
- Unix utilities available by default
- Version control systems accessible
- Language-specific tooling works out of box

## Quick Reset Commands
```bash
# TypeScript - Full reset
rm -rf .next node_modules/.cache && pnpm install && pnpm dev

# Python - Clean environment
pip freeze | xargs pip uninstall -y && pip install -r requirements.txt

# Port conflicts
lsof -ti:3000 | xargs kill -9  # TypeScript
lsof -ti:8000 | xargs kill -9  # Python
````

````

#### Subagent Integration
```markdown
## Task Tool and Subagents

### Parallel Task Execution
```bash
# Codebase exploration example
"Explore the codebase using 4 tasks in parallel. Each agent should explore different directories."

# Independent analysis tasks
"Analyze these 3 components in parallel: authentication, database layer, and API endpoints."

# Testing in parallel
"Run unit tests, integration tests, and linting in parallel using separate tasks."
````

### Subagent Capabilities

- Lightweight Claude Code instances within tasks
- Independent context windows (expand available context)
- Automatic queuing when exceeding 10 parallel limit
- Efficient task-to-completion execution

### Task Design Principles

- Ensure tasks are truly independent
- Avoid inter-task dependencies
- Design for parallel completion
- Let Claude Code manage parallelism automatically

````

### CI/CD Integration
```bash
# Pre-commit hook example
claude -p "Fix linting errors in staged files" --output-format stream-json

# TrackDown webhook automation example
claude -p "Analyze new ticket and assign priority/labels" --dangerously-skip-permissions
````

### Build Script Integration

- Non-interactive contexts supported
- JSON streaming output for parsing
- No session persistence (stateless)

````

#### Visual Development Workflow
```markdown
## UI/Visual Development

### Required Setup
1. Browser screenshot capability (Puppeteer MCP server)
2. Visual mock assets (images, designs)
3. Iterative feedback loop

### Process
1. Provide visual mock (drag-drop image or file path)
2. Ask Claude to implement design in code
3. Have Claude take screenshots of result
4. Iterate until result matches mock
5. Commit when satisfied

### Tools Integration
- iOS simulator MCP server for mobile
- Manual screenshot copy/paste option
- Image file path referencing
````

---

## 🎯 Key Implementation Priorities

1. **Start with claude.md** - Document your specific project needs and conventions
2. **Set up slash commands** - Create reusable workflows for common tasks
3. **Configure MCP servers** - Enable tool integrations your team needs
4. **Establish planning workflows** - Train team on planning-first approach
5. **Implement subagent patterns** - Use parallel tasks for independent work
6. **Set up development workflows** - Configure server management and post-task verification
7. **Implement headless automation** - Automate repetitive tasks safely

## 🔄 Iterative Improvement

Just like prompt engineering, these configurations should be refined over time:

- Track what works well in your specific codebase
- Document effective prompting patterns
- Adjust configurations based on team usage
- Regular review of slash commands and workflows
