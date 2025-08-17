# Refactoring Agent Implementation Guide v1.0

## 1. Quick Start Guide

### How to Invoke the Refactoring Agent

The Refactoring Agent is invoked through delegation from the Project Manager using the Task tool with specific refactoring prompts.

#### Basic Invocation Syntax
```markdown
Task: Refactor [target code]
Type: Refactoring
Target: [file paths]
Priority: [Low|Medium|High]

Context: [Description of code smells and issues]
Requirements: [Specific refactoring goals]
Test Command: [Command to run tests]
Performance Baseline: [Current metrics if available]
```

#### Example: Simple Method Extraction
```markdown
Task: Extract method from processOrder function
Type: Refactoring
Target: /src/services/OrderService.js
Priority: Medium

Context: processOrder method is 150 lines with multiple responsibilities
Requirements:
- Extract validation logic into validateOrder()
- Extract shipping logic into calculateShipping()
- Keep all methods under 50 lines

Test Command: npm test -- OrderService.test.js
Performance Baseline: 45ms average processing time
```

### Basic Usage Examples

#### Example 1: Quick Rename Operation
```markdown
REFACTOR: Rename Variable
TARGET: /src/utils/helpers.js
OLD_NAME: usr
NEW_NAME: user
SCOPE: module
TEST_CMD: npm test
```

#### Example 2: Remove Code Duplication
```markdown
REFACTOR: Remove Duplication
FILES: /src/auth/jwt.js, /src/auth/oauth.js
PATTERN: Token validation logic (80% similarity)
STRATEGY: Extract to TokenValidator base class
TEST_CMD: npm run test:auth
```

### Common Refactoring Scenarios

| Scenario | When to Use | Expected Outcome |
|----------|-------------|-----------------|
| **Method Too Long** | Method >50 lines | Multiple focused methods |
| **God Class** | Class >500 lines | Separated concerns into multiple classes |
| **Code Duplication** | >80% similarity | Extracted common functionality |
| **Deep Nesting** | >3 nesting levels | Guard clauses and early returns |
| **Magic Numbers** | Unexplained constants | Named constants with clear purpose |
| **Complex Conditionals** | High cyclomatic complexity | Decomposed logic with clear naming |

## 2. Implementation Checklist

### Prerequisites
- [ ] **Test Coverage**: Minimum 80% overall, 90% for target files
- [ ] **Working Tests**: All tests must pass before starting
- [ ] **Git Branch**: Clean working directory
- [ ] **Performance Baseline**: Captured current metrics
- [ ] **Backup Strategy**: Ability to rollback quickly

### Step-by-Step Implementation

#### Phase 1: Pre-Refactoring Setup (5-10 minutes)
1. **Verify Test Coverage**
   ```bash
   # Check coverage meets minimum requirements
   npm run coverage
   # Coverage must be ≥80% overall, ≥90% for target files
   ```

2. **Create Safety Branch**
   ```bash
   git checkout -b refactor/$(date +%Y%m%d)-<description>
   git commit -am "checkpoint: before refactoring"
   ```

3. **Capture Performance Baseline**
   ```bash
   # Run performance tests and record metrics
   npm run benchmark
   # Note: execution time, memory usage, response times
   ```

4. **Run Full Test Suite**
   ```bash
   npm test
   # All tests must pass before proceeding
   ```

#### Phase 2: Incremental Refactoring (15-30 minutes)
1. **Make Small Changes** (≤10 lines per change)
2. **Test After Each Change**
3. **Commit Working Changes**
4. **Revert Failed Changes**
5. **Repeat Until Complete**

#### Phase 3: Post-Refactoring Validation (5-10 minutes)
1. **Full Test Suite**
2. **Performance Comparison**
3. **Code Quality Metrics**
4. **Documentation Updates**

### Required Configurations

#### Environment Setup
```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src/ --report-complexity",
    "complexity": "complexity-report src/",
    "benchmark": "node scripts/benchmark.js"
  },
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

#### Git Hooks (Optional but Recommended)
```bash
# .git/hooks/pre-commit
#!/bin/sh
npm test
if [ $? -ne 0 ]; then
  echo "Tests failed. Commit aborted."
  exit 1
fi
```

## 3. Usage Examples

### Example 1: Extract Method Refactoring in JavaScript

**Before:**
```javascript
// 150-line method with multiple responsibilities
function processOrder(orderData) {
  // Validation logic (30 lines)
  if (!orderData.items || orderData.items.length === 0) {
    throw new Error('Order must have items');
  }
  if (!orderData.customer || !orderData.customer.email) {
    throw new Error('Customer email required');
  }
  // ... more validation

  // Tax calculation (40 lines)
  let taxRate = 0.08; // Default rate
  if (orderData.customer.state === 'CA') {
    taxRate = 0.0875;
  } else if (orderData.customer.state === 'NY') {
    taxRate = 0.08375;
  }
  // ... more tax logic

  // Shipping calculation (50 lines)
  let shippingCost = 0;
  const totalWeight = orderData.items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight > 10) {
    shippingCost = 15.99;
  } else if (totalWeight > 5) {
    shippingCost = 9.99;
  } else {
    shippingCost = 4.99;
  }
  // ... more shipping logic

  // Payment processing (30 lines)
  // ... payment logic
}
```

**Refactoring Process:**
```markdown
Task: Extract methods from processOrder function
Type: Refactoring
Target: /src/services/OrderService.js:processOrder
Priority: High

Context: processOrder method is 150 lines with 4 distinct responsibilities
Requirements:
1. Extract validateOrder() method
2. Extract calculateTax() method  
3. Extract calculateShipping() method
4. Extract processPayment() method
5. Each method should be <50 lines
6. Maintain exact same behavior

Test Command: npm test -- OrderService.test.js
Performance Baseline: 45ms average processing time
```

**After:**
```javascript
function processOrder(orderData) {
  const validatedOrder = validateOrder(orderData);
  const orderWithTax = calculateTax(validatedOrder);
  const orderWithShipping = calculateShipping(orderWithTax);
  return processPayment(orderWithShipping);
}

function validateOrder(orderData) {
  if (!orderData.items || orderData.items.length === 0) {
    throw new Error('Order must have items');
  }
  if (!orderData.customer || !orderData.customer.email) {
    throw new Error('Customer email required');
  }
  // ... validation logic
  return orderData;
}

function calculateTax(orderData) {
  const taxRates = {
    'CA': 0.0875,
    'NY': 0.08375,
    'default': 0.08
  };
  
  const taxRate = taxRates[orderData.customer.state] || taxRates.default;
  // ... tax calculation logic
  return orderData;
}

function calculateShipping(orderData) {
  const totalWeight = orderData.items.reduce((sum, item) => sum + item.weight, 0);
  const shippingRates = [
    { threshold: 10, cost: 15.99 },
    { threshold: 5, cost: 9.99 },
    { threshold: 0, cost: 4.99 }
  ];
  
  // ... shipping logic
  return orderData;
}

function processPayment(orderData) {
  // ... payment processing logic
  return orderData;
}
```

### Example 2: Remove Dead Code in Python

**Refactoring Task:**
```markdown
Task: Remove dead code from user management module
Type: Refactoring
Target: /src/user/manager.py
Priority: Medium

Context: Static analysis identified 3 unused methods and 5 unused variables
Requirements:
- Remove unused methods: old_encrypt(), legacy_validate(), deprecated_hash()
- Remove unused imports and variables
- Ensure no breaking changes to public API

Test Command: pytest tests/user/ -v --cov=src/user/
Performance Baseline: Not applicable for dead code removal
```

**Process:**
1. Analyze usage with grep/search tools
2. Verify methods are truly unused
3. Remove code incrementally
4. Test after each removal
5. Update documentation

### Example 3: Decompose Conditional in TypeScript

**Before:**
```typescript
function calculateDiscount(user: User, order: Order): number {
  if (user.membershipLevel === 'premium' && 
      user.yearsActive >= 2 && 
      order.total > 100 &&
      (order.category === 'electronics' || order.category === 'books') &&
      user.lastOrderDate && 
      differenceInDays(new Date(), user.lastOrderDate) <= 30) {
    if (order.total > 500) {
      return order.total * 0.15;
    } else if (order.total > 200) {
      return order.total * 0.10;
    } else {
      return order.total * 0.05;
    }
  } else if (user.membershipLevel === 'standard' && order.total > 50) {
    return order.total * 0.02;
  } else {
    return 0;
  }
}
```

**Refactoring Task:**
```markdown
Task: Decompose complex conditional in discount calculation
Type: Refactoring
Target: /src/services/DiscountService.ts:calculateDiscount
Priority: High

Context: Method has cyclomatic complexity of 12, deep nesting
Requirements:
- Extract eligibility checks into separate methods
- Create clear discount tier logic
- Reduce complexity to <10
- Maintain exact discount calculations

Test Command: npm test -- DiscountService.test.ts
Performance Baseline: 2ms average calculation time
```

**After:**
```typescript
function calculateDiscount(user: User, order: Order): number {
  if (!isEligibleForDiscount(user, order)) {
    return 0;
  }

  if (isPremiumMember(user) && isQualifiedOrder(order)) {
    return calculatePremiumDiscount(order);
  }

  if (isStandardMember(user) && order.total > 50) {
    return calculateStandardDiscount(order);
  }

  return 0;
}

function isEligibleForDiscount(user: User, order: Order): boolean {
  return user.membershipLevel !== null && order.total > 0;
}

function isPremiumMember(user: User): boolean {
  return user.membershipLevel === 'premium' && user.yearsActive >= 2;
}

function isQualifiedOrder(order: Order): boolean {
  const isValidCategory = ['electronics', 'books'].includes(order.category);
  const isMinimumAmount = order.total > 100;
  const isRecentCustomer = user.lastOrderDate && 
    differenceInDays(new Date(), user.lastOrderDate) <= 30;
  
  return isValidCategory && isMinimumAmount && isRecentCustomer;
}

function calculatePremiumDiscount(order: Order): number {
  if (order.total > 500) return order.total * 0.15;
  if (order.total > 200) return order.total * 0.10;
  return order.total * 0.05;
}

function calculateStandardDiscount(order: Order): number {
  return order.total * 0.02;
}

function isStandardMember(user: User): boolean {
  return user.membershipLevel === 'standard';
}
```

### Example 4: Rename Variable Across Multiple Files

**Refactoring Task:**
```markdown
Task: Rename variable for clarity across payment module
Type: Refactoring
Target: /src/payment/*.js
Priority: Low

Context: Variable 'usr' used in 15 files, should be 'user' for clarity
Requirements:
- Rename all instances of 'usr' to 'user'
- Update related function parameters
- Update test files
- Maintain all functionality

Test Command: npm test -- payment/
Performance Baseline: Not applicable for renaming
```

**Implementation:**
1. Use MultiEdit for systematic replacement
2. Update one file at a time
3. Run tests after each file
4. Verify no functionality changes

## 4. Best Practices

### When to Use Refactoring Agent vs Engineer Agent

| Use Refactoring Agent When | Use Engineer Agent When |
|---------------------------|--------------------------|
| Improving existing code structure | Adding new features |
| Reducing complexity without changing behavior | Modifying functionality |
| Eliminating code smells | Fixing bugs that require logic changes |
| Performance optimization through restructuring | Implementing new algorithms |
| Making code more maintainable | Changing external APIs |

### Optimal Task Size for Delegation

**Good Task Sizes:**
- Single refactoring pattern (Extract Method, Rename, etc.)
- One file or closely related files
- Specific code smell elimination
- Performance optimization for specific function

**Too Large:**
- "Refactor entire application"
- "Fix all code smells"
- Multiple unrelated refactoring types

**Too Small:**
- "Rename one variable"
- "Add one comment"
- "Fix indentation"

### How to Specify Success Criteria

#### Quantitative Criteria
```markdown
Success Criteria:
- [ ] Cyclomatic complexity reduced from X to <10
- [ ] Code duplication reduced from X% to <5%
- [ ] Method length reduced from X lines to <50 lines
- [ ] Test coverage maintained at ≥80%
- [ ] Performance within 5% of baseline
```

#### Qualitative Criteria
```markdown
Success Criteria:
- [ ] Code is more readable and self-documenting
- [ ] Responsibilities are clearly separated
- [ ] Public API remains unchanged
- [ ] No new code smells introduced
```

### Performance Baseline Establishment

#### Before Refactoring
```bash
# Capture comprehensive baseline
npm run benchmark > baseline.txt
echo "Memory usage:" >> baseline.txt
node --inspect scripts/memory-usage.js >> baseline.txt
echo "Load time:" >> baseline.txt
time npm test >> baseline.txt
```

#### After Refactoring
```bash
# Compare with baseline
npm run benchmark > after.txt
diff baseline.txt after.txt
```

## 5. Integration Guide

### How to Coordinate with Other Agents

#### Pre-Refactoring Coordination
```markdown
1. QA Agent: "Verify test coverage for /src/auth/ before refactoring"
2. QA Agent: "Create missing tests for uncovered code paths"
3. Documentation Agent: "Document current API before structural changes"
```

#### During Refactoring
```markdown
1. QA Agent: "Run regression tests after each commit"
2. Version Control Agent: "Create atomic commits for each refactoring step"
```

#### Post-Refactoring
```markdown
1. QA Agent: "Validate full test suite and performance metrics"
2. Documentation Agent: "Update documentation for structural changes"
3. Version Control Agent: "Create release notes for refactoring improvements"
```

### Handoff Procedures

#### From PM to Refactoring Agent
```markdown
Required Information:
- Target files/functions (absolute paths)
- Specific code smells identified
- Test commands and coverage requirements
- Performance baseline if available
- Success criteria and constraints
- Priority and timeline
```

#### From Refactoring Agent to QA
```markdown
Handoff Information:
- Files modified with line counts
- Refactoring patterns applied
- Performance impact summary
- Test results and coverage changes
- Validation requests for QA
```

#### From Refactoring Agent to Documentation
```markdown
Handoff Information:
- Structural changes made
- API signature changes (if any)
- New methods/classes created
- Deprecated functionality removed
- Documentation update requirements
```

### Communication Protocols

#### Progress Updates
```markdown
Status Update Format:
- **Phase**: [Pre-refactoring | Execution | Validation]
- **Progress**: X% complete
- **Current Task**: [specific refactoring step]
- **Tests Status**: [passing | failing | needs attention]
- **Blockers**: [none | description]
- **ETA**: [time estimate]
```

#### Issue Escalation
```markdown
Escalation Format:
- **Issue Type**: [Test failure | Performance regression | Compilation error]
- **Severity**: [Low | Medium | High | Critical]
- **Impact**: [description of impact]
- **Attempted Solutions**: [what was tried]
- **Requested Help**: [specific assistance needed]
- **Urgency**: [timeline for resolution]
```

## 6. Troubleshooting

### Common Issues and Solutions

#### Test Failures After Refactoring

**Symptoms:**
- Tests that previously passed now fail
- New test failures in unrelated modules
- Timeout errors in test suite

**Diagnosis:**
```bash
# Compare test results
git diff HEAD~1 -- test-results.xml
# Check for missing imports
npm run lint
# Verify test dependencies
npm test -- --verbose
```

**Solutions:**
1. **Immediate Revert**
   ```bash
   git reset --hard HEAD~1
   npm test  # Verify tests pass again
   ```

2. **Incremental Fix**
   ```bash
   # Make smaller change
   git checkout -b refactor-fix
   # Apply minimal changes
   # Test frequently
   ```

3. **Test Updates**
   ```bash
   # Update tests to match refactored interface
   # Ensure behavior equivalence maintained
   ```

#### Performance Regression

**Symptoms:**
- Response times increased >5%
- Memory usage significantly higher
- CPU utilization spikes

**Diagnosis:**
```bash
# Profile performance
node --prof app.js
npm run benchmark -- --detailed
# Compare with baseline
```

**Solutions:**
1. **Revert and Optimize**
   ```bash
   git revert HEAD --no-edit
   # Analyze performance bottleneck
   # Apply performance-focused refactoring
   ```

2. **Alternative Approach**
   ```bash
   # Try different refactoring pattern
   # Consider trade-offs between readability and performance
   ```

#### Merge Conflicts

**Symptoms:**
- Git merge conflicts during rebase
- Overlapping changes in refactored code
- Lost refactoring work

**Prevention:**
```bash
# Frequent rebasing on main branch
git fetch origin
git rebase origin/main
```

**Resolution:**
```bash
# Stash refactoring changes
git stash save "refactoring-in-progress"
# Update from main
git rebase origin/main
# Reapply changes carefully
git stash pop
# Resolve conflicts preserving refactoring intent
```

### Debug Strategies

#### Incremental Debugging
```bash
# Bisect to find problematic commit
git bisect start
git bisect bad HEAD
git bisect good HEAD~10
# Git will help identify the failing commit
```

#### Comprehensive Testing
```bash
# Run extended test suite
npm run test:integration
npm run test:e2e
npm run test:performance
```

#### Code Analysis
```bash
# Static analysis for issues
npm run lint -- --fix
npm run complexity
# Look for introduced complexity
```

### Recovery Procedures

#### Quick Recovery (< 5 minutes)
```bash
# Simple revert
git reset --hard HEAD~1
npm test  # Verify recovery
```

#### Medium Recovery (5-15 minutes)
```bash
# Selective revert
git revert <commit-hash> --no-edit
# Cherry-pick good changes
git cherry-pick <good-commit>
```

#### Full Recovery (15+ minutes)
```bash
# Start over from last known good state
git reset --hard <last-good-commit>
# Re-plan refactoring approach
# Apply smaller, safer changes
```

## 7. Metrics and Reporting

### How to Interpret Refactoring Metrics

#### Complexity Metrics
```yaml
Cyclomatic Complexity:
  Excellent: 1-5
  Good: 6-10
  Moderate: 11-15
  High: 16-20
  Very High: >20

Cognitive Complexity:
  Low: 1-10
  Moderate: 11-15
  High: 16-25
  Very High: >25

Nesting Depth:
  Ideal: 1-2
  Acceptable: 3
  Problematic: 4+
```

#### Code Quality Metrics
```yaml
Code Duplication:
  Excellent: <3%
  Good: 3-5%
  Acceptable: 5-10%
  Poor: >10%

Test Coverage:
  Minimum: 80%
  Target: 90%
  Excellent: 95%+

Maintainability Index:
  Excellent: 85-100
  Good: 70-84
  Moderate: 50-69
  Poor: <50
```

### Success Measurement

#### Quantitative Success Indicators
```markdown
Positive Indicators:
✅ Reduced cyclomatic complexity
✅ Decreased code duplication
✅ Improved test coverage
✅ Reduced method/class size
✅ Better performance or same performance
✅ Fewer code smells detected

Negative Indicators:
❌ Increased complexity
❌ Test coverage decreased
❌ Performance regression >5%
❌ New code smells introduced
❌ Breaking changes to public API
```

#### Qualitative Success Indicators
```markdown
✅ Code is more readable
✅ Business logic is clearer
✅ Responsibilities are well-separated
✅ Code follows consistent patterns
✅ Documentation is up-to-date
✅ Future modifications are easier
```

### Progress Tracking

#### Session-Level Tracking
```yaml
Track Per Session:
  files_modified: number
  lines_added: number
  lines_removed: number
  net_lines_changed: number
  commits_created: number
  test_runs: number
  test_failures: number
  rollbacks_needed: number
  time_spent_minutes: number
  complexity_before: number
  complexity_after: number
  coverage_before: number
  coverage_after: number
```

#### Project-Level Tracking
```yaml
Track Cumulative:
  total_debt_reduced: hours
  average_complexity_improvement: percentage
  refactoring_success_rate: percentage
  most_common_patterns: array
  time_per_refactoring_type: object
  performance_impact_distribution: object
```

#### Reporting Format
```markdown
## Refactoring Session Report

### Summary
- **Duration**: 45 minutes
- **Files Modified**: 3
- **Patterns Applied**: Extract Method, Decompose Conditional
- **Overall Success**: ✅ Complete

### Metrics Improvement
| Metric | Before | After | Change |
|--------|--------|-------|---------|
| Cyclomatic Complexity | 25 | 8 | -68% |
| Lines of Code | 600 | 420 | -30% |
| Test Coverage | 82% | 88% | +6% |
| Performance | 50ms | 48ms | -4% |

### Changes Made
1. Extracted 8 methods from authenticateUser()
2. Created AuthValidator and TokenHandler classes
3. Eliminated duplication with shared base class

### Recommendations
- Consider further extraction of OAuth-specific logic
- Database calls could benefit from caching
- Monitor performance under load testing
```

## 8. Safety Guidelines

### Pre-flight Checklist

#### Code Safety Verification
```markdown
Before Starting Refactoring:
- [ ] All tests are currently passing
- [ ] Test coverage meets minimum requirements (≥80%)
- [ ] Working directory is clean (no uncommitted changes)
- [ ] Current branch is up-to-date with main
- [ ] Performance baseline has been captured
- [ ] Backup branch has been created
- [ ] Rollback procedure has been tested
```

#### Team Communication
```markdown
- [ ] Team notified of refactoring session
- [ ] Coordinate with ongoing feature development
- [ ] Identify potential merge conflict points
- [ ] Establish communication channel for issues
```

### Risk Assessment

#### High-Risk Scenarios
```yaml
Critical Risk Factors:
  - Low test coverage (<80%)
  - No automated tests
  - Large, complex refactoring (>500 lines)
  - Multiple dependent systems
  - Production hotfix in progress
  - Tight deployment deadlines

Mitigation Strategies:
  - Add tests before refactoring
  - Break into smaller chunks
  - Coordinate with team calendar
  - Create detailed rollback plan
```

#### Medium-Risk Scenarios
```yaml
Moderate Risk Factors:
  - Shared code modules
  - Recent changes by multiple developers
  - Performance-critical code
  - External API integrations

Mitigation Strategies:
  - Extra testing of integrations
  - Performance monitoring
  - Gradual rollout if possible
  - Team review before merge
```

#### Low-Risk Scenarios
```yaml
Low Risk Factors:
  - Well-tested isolated modules
  - Recent successful refactoring
  - Simple pattern applications
  - Non-critical path code

Standard Precautions:
  - Normal testing procedures
  - Standard commit practices
  - Regular progress updates
```

### Rollback Procedures

#### Immediate Rollback (Emergency)
```bash
# Complete revert of all changes
git reset --hard HEAD~N  # N = number of commits to revert
npm test  # Verify system is functional
git push --force-with-lease  # If remote exists
```

#### Selective Rollback
```bash
# Revert specific problematic commit
git revert <commit-hash> --no-edit
# Or interactive rebase to remove specific commits
git rebase -i HEAD~N
```

#### Gradual Rollback
```bash
# Stash current work
git stash save "partial-refactoring-$(date)"
# Reset to last known good state
git reset --hard <last-good-commit>
# Selectively reapply safe changes
git stash pop
# Resolve and commit only safe changes
```

#### Recovery Validation
```bash
# After rollback, verify system integrity
npm test                    # All tests pass
npm run lint               # No lint errors
npm run build              # Build succeeds
npm run benchmark          # Performance acceptable
```

## Conclusion

This implementation guide provides a comprehensive framework for effectively utilizing the Refactoring Agent. Remember that refactoring is a disciplined practice that requires patience, systematic approach, and constant validation. The key to successful refactoring is making small, incremental changes while maintaining safety through comprehensive testing.

### Key Takeaways

1. **Safety First**: Always ensure comprehensive test coverage before starting
2. **Incremental Progress**: Make small changes and test frequently
3. **Clear Objectives**: Define specific, measurable success criteria
4. **Team Coordination**: Communicate with other agents and team members
5. **Performance Awareness**: Monitor and maintain system performance
6. **Documentation**: Keep documentation updated as code structure evolves

For questions or issues not covered in this guide, escalate to the Project Manager for coordination with appropriate specialist agents.

---
*Refactoring Agent Implementation Guide v1.0 - Generated by Documentation Agent*