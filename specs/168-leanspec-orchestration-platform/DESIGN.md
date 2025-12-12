# LeanSpec Orchestration Platform - Detailed Design

This document provides detailed architecture, UI flows, and integration patterns for spec 168.

## Table of Contents

1. [Architectural Layers](#architectural-layers)
2. [Desktop App UI](#desktop-app-ui)
3. [Integration Architecture](#integration-architecture)
4. [SDD Lifecycle Workflow](#sdd-lifecycle-workflow)
5. [Desktop-Specific Features](#desktop-specific-features)
6. [CLI Integration](#cli-integration)
7. [Configuration](#configuration)

## Architectural Layers

### 1. LeanSpec Desktop App (User Interface Layer)

```
packages/desktop/
├── src/
│   ├── views/
│   │   ├── SpecsView.tsx           # Browse/search specs
│   │   ├── SpecDetailView.tsx      # View spec content
│   │   ├── SessionsView.tsx        # Active AI coding sessions
│   │   └── ValidationView.tsx      # Test results, code review
│   ├── components/
│   │   ├── AIAgentSelector.tsx     # Choose Claude/Copilot/etc
│   │   ├── SessionMonitor.tsx      # Real-time session output
│   │   ├── PhaseProgress.tsx       # Design → Impl → Test → Docs
│   │   └── ValidationResults.tsx   # Test coverage, lint errors
│   └── lib/
│       ├── orchestrator.ts         # Coordinate agent-relay calls
│       ├── session-manager.ts      # Track active sessions
│       ├── validation-runner.ts    # Run tests, linters
│       ├── agent-relay-client.ts   # agent-relay WebSocket client
│       └── devlog-client.ts        # Devlog telemetry client
```

### 2. Agent-Relay Integration (Execution Backend)

```typescript
// LeanSpec orchestrator calls agent-relay
interface OrchestrationRequest {
  specPath: string;              // Which spec to implement
  agent: AgentType;              // Which AI agent
  phases: Phase[];               // Which phases to execute
  checkpoints: boolean;          // Pause between phases?
  worktree?: string;             // Optional git worktree
}

// agent-relay executes and streams back
interface SessionUpdate {
  sessionId: string;
  phase: 'design' | 'implement' | 'test' | 'docs';
  status: 'running' | 'paused' | 'completed' | 'failed';
  output: string;                // Terminal output
  filesChanged: string[];
  duration: number;
  tokensUsed: number;
}
```

### 3. Devlog Integration (Observability Layer)

```typescript
// LeanSpec sends telemetry to Devlog
interface ActivityEvent {
  specId: string;
  sessionId: string;
  event: 'spec_created' | 'session_started' | 'phase_completed' | 'spec_completed';
  metadata: {
    agent: string;
    duration: number;
    filesChanged: string[];
    tokensUsed: number;
    success: boolean;
  };
  timestamp: string;
}
```

## Desktop App UI

### Main Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│ LeanSpec Desktop                                    [─] [□] [×] │
├────────────────────────────────────────────────────────────────┤
│ 📋 Specs (45) │ 🤖 Sessions (2) │ ✓ Validation │ 📊 Stats     │
├───────────────┴────────────────────────────────────────────────┤
│                                                                │
│  Recent Specs                                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 168-orchestration-platform        [Implement with AI ▼] │ │
│  │ Status: planned                                          │ │
│  │ Created: 2025-12-12                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Active Sessions                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 165-tauri-v2-migration            Phase: Testing ⏸       │ │
│  │ Agent: Claude                     Duration: 12m          │ │
│  │ [Show Output] [Pause] [Stop]                             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Implement Spec Modal

```
┌────────────────────────────────────────────────────────────────┐
│ Implement Spec: 168-orchestration-platform                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Select AI Agent:                                              │
│  ◉ Claude (Recommended for complex design)                     │
│  ○ GitHub Copilot (Fast iteration)                             │
│  ○ Cursor (Interactive editing)                                │
│  ○ Aider (Command-line focused)                                │
│                                                                │
│  Execution Mode:                                               │
│  ◉ Guided (Pause between phases for review)                    │
│  ○ Autonomous (Run all phases automatically)                   │
│                                                                │
│  Phases to Execute:                                            │
│  ☑ Design refinement                                           │
│  ☑ Implementation                                              │
│  ☑ Testing                                                     │
│  ☑ Documentation                                               │
│                                                                │
│  Options:                                                      │
│  ☑ Create git worktree                                         │
│  ☑ Update spec status automatically                            │
│  ☑ Run validation after implementation                         │
│                                                                │
│                               [Cancel] [Start Implementation]  │
└────────────────────────────────────────────────────────────────┘
```

### Session Monitor

```
┌────────────────────────────────────────────────────────────────┐
│ Session: 168-orchestration-platform                            │
│ Agent: Claude · Started: 3m ago · Phase: Implementation        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Progress:                                                     │
│  ✓ Design refinement        (2m) [Show Details]               │
│  → Implementation           (1m) [Live Output]                 │
│    Testing                  (waiting)                          │
│    Documentation            (waiting)                          │
│                                                                │
│  Live Output:                                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ $ Creating orchestrator.ts...                            │ │
│  │ $ Implementing OrchestrationRequest interface...         │ │
│  │ $ Writing session-manager.ts...                          │ │
│  │ $ Running type check... ✓ No errors                      │ │
│  │ $ Building desktop package... ✓ Built successfully       │ │
│  │                                                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Files Changed: orchestrator.ts, session-manager.ts (2 files)  │
│  Tokens Used: 4,523 / ~8,000                                   │
│                                                                │
│                    [Pause] [Stop] [Continue to Testing →]      │
└────────────────────────────────────────────────────────────────┘
```

### Validation View

```
┌────────────────────────────────────────────────────────────────┐
│ Validation: 168-orchestration-platform                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Overall Status: ⚠️ Passed with Warnings                       │
│                                                                │
│  ✓ Tests              12/12 passed       [Show Details]       │
│  ✓ Type Check         No errors          [Show Details]       │
│  ⚠️ Linting           3 warnings         [Show Details]       │
│  ✓ AI Code Review     Matches spec       [Show Details]       │
│                                                                │
│  Lint Warnings:                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ orchestrator.ts:45 - Unused variable 'error'            │ │
│  │ session-manager.ts:78 - console.log in production code  │ │
│  │ validation-runner.ts:12 - Missing return type           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  AI Code Review Summary:                                       │
│  "Implementation correctly follows spec design. All required   │
│   interfaces are implemented. Suggest adding error handling    │
│   for WebSocket disconnection."                                │
│                                                                │
│                    [Fix Warnings] [Mark Complete Anyway]       │
└────────────────────────────────────────────────────────────────┘
```

## Integration Architecture

### LeanSpec → agent-relay Communication

```typescript
// packages/desktop/src/lib/orchestrator.ts
export class AIOrchestrator {
  private agentRelayClient: AgentRelayClient;
  private sessionManager: SessionManager;
  private devlogClient: DevlogClient;
  
  async startImplementation(request: OrchestrationRequest): Promise<Session> {
    // 1. Read spec content from LeanSpec
    const spec = await loadSpec(request.specPath);
    
    // 2. Prepare context for agent
    const context = {
      spec: spec.content,
      dependencies: await loadDependencies(spec),
      projectContext: await loadProjectContext(),
    };
    
    // 3. Dispatch to agent-relay
    const session = await this.agentRelayClient.createSession({
      specPath: request.specPath,
      agent: request.agent,
      context,
      phases: request.phases,
      callbacks: {
        onPhaseComplete: (phase) => this.handlePhaseComplete(phase),
        onOutput: (output) => this.streamOutput(output),
        onError: (error) => this.handleError(error),
      },
    });
    
    // 4. Track session in LeanSpec
    await this.sessionManager.trackSession(session);
    
    // 5. Update spec status
    await updateSpec(request.specPath, { status: 'in-progress' });
    
    // 6. Log to Devlog
    await this.devlogClient.logActivity({
      event: 'session_started',
      specId: request.specPath,
      sessionId: session.id,
      metadata: {
        agent: request.agent,
        phases: request.phases,
      },
    });
    
    return session;
  }
  
  async validateImplementation(specPath: string): Promise<ValidationResults> {
    // 1. Run tests
    const testResults = await runTests(specPath);
    
    // 2. Run linters
    const lintResults = await runLinters(specPath);
    
    // 3. Type checking
    const typeResults = await runTypeCheck(specPath);
    
    // 4. AI code review against spec
    const aiReview = await this.runAIReview(specPath);
    
    // 5. Aggregate results
    const results = {
      tests: testResults,
      lint: lintResults,
      types: typeResults,
      aiReview,
      passed: testResults.passed && lintResults.passed && typeResults.passed,
    };
    
    // 6. Log to Devlog
    await this.devlogClient.logActivity({
      event: 'validation_completed',
      specId: specPath,
      metadata: {
        passed: results.passed,
        testsPassed: testResults.passed,
        lintWarnings: lintResults.warnings.length,
      },
    });
    
    return results;
  }
  
  private async runAIReview(specPath: string): Promise<AIReviewResult> {
    // Use agent-relay to run AI code review
    const spec = await loadSpec(specPath);
    const codeFiles = await getChangedFiles(specPath);
    
    const reviewSession = await this.agentRelayClient.createSession({
      agent: 'claude',
      task: 'code-review',
      context: {
        spec: spec.content,
        files: codeFiles,
        prompt: `Review the following code changes against the spec requirements. 
                 Check if implementation matches design, identify missing features,
                 and suggest improvements.`,
      },
    });
    
    const result = await reviewSession.waitForCompletion();
    return parseAIReview(result.output);
  }
}
```

### agent-relay → LeanSpec Callbacks

```typescript
// agent-relay calls these LeanSpec endpoints
interface LeanSpecCallbacks {
  // Update spec status
  updateStatus(specPath: string, status: SpecStatus): Promise<void>;
  
  // Log progress
  logProgress(specPath: string, phase: Phase, progress: number): Promise<void>;
  
  // Request context
  getContext(specPath: string): Promise<SpecContext>;
  
  // Validation request
  validate(specPath: string): Promise<ValidationResults>;
}
```

## SDD Lifecycle Workflow

### Complete Flow Diagram

```
User Action                LeanSpec Desktop          agent-relay           Devlog
────────────────────────────────────────────────────────────────────────────────

1. Click "New Spec"
                    →      Create spec file
                           Open in editor
                           
2. Write spec
                    →      Save to disk
                           Parse frontmatter
                           
3. Click "Implement"
                    →      Read spec content
                           Prepare context
                           Select agent
                    →                          →   Create session
                                                   Spawn runner
                                                   Execute Phase 1
                                                   
4. Watch progress
                    ←      Stream output      ←   PTY stream
                           Update UI
                           Show phase progress
                                                                   →   Log activity
                                                                       
5. Phase complete
                    ←      Notification       ←   Phase callback
                           Ask: Continue?
                           
6. Approve next phase
                    →                          →   Execute Phase 2
                                                   
7. Implementation done
                    ←      Show results       ←   Session complete
                           Run validation
                           
8. Click "Validate"
                    →      Run tests
                           Run linters
                           AI code review
                           Show results
                           
9. Validation passed
                    →      Update status
                           Mark complete
                                                                   →   Log completion
                                                                       Calculate metrics
                                                                       
10. View metrics
                    ←                                          ←   Query Devlog
                           Show stats
                           Duration, files, tokens
```

## Desktop-Specific Features

### 1. Multi-Project AI Orchestration

```
Project Switcher:
├── lean-spec (3 active sessions)
│   ├── 168-orchestration → Claude (implementing)
│   ├── 165-tauri-v2 → Testing (paused)
│   └── 148-desktop-app → Complete
│
├── my-saas-app (1 active session)
│   └── 042-auth-redesign → Copilot (testing)
│
└── client-project (0 active sessions)
    └── (no active sessions)
```

### 2. System Tray Integration

```
┌────────────────────────┐
│ 📋 LeanSpec            │
├────────────────────────┤
│ Active Sessions: 4     │
│                        │
│ 168 → Implementing ⚡   │
│ 165 → Testing ⏸        │
│ 042 → Testing ⚡        │
│ 148 → Complete ✓       │
├────────────────────────┤
│ New Spec...            │
│ Show Desktop           │
│ Preferences...         │
│ Quit                   │
└────────────────────────┘
```

### 3. Global Shortcuts

- `Cmd/Ctrl+Shift+L` → Open desktop
- `Cmd/Ctrl+Shift+K` → Quick spec switcher
- `Cmd/Ctrl+Shift+N` → New spec
- `Cmd/Ctrl+Shift+I` → Implement current spec
- `Cmd/Ctrl+Shift+V` → Validate current spec

### 4. OS Notifications

```
OS Notification:
┌─────────────────────────────────────┐
│ LeanSpec                             │
│ 168-orchestration-platform           │
│ Implementation phase completed ✓     │
│ Ready for testing. Review changes?   │
│                                      │
│ [Review] [Continue] [Dismiss]        │
└─────────────────────────────────────┘
```

## CLI Integration

### Enhanced CLI Commands

```bash
# Full lifecycle
lean-spec create auth-redesign
lean-spec implement auth-redesign --agent claude --guided
lean-spec validate auth-redesign
lean-spec complete auth-redesign

# Session management
lean-spec sessions list
lean-spec sessions show auth-redesign
lean-spec sessions pause auth-redesign
lean-spec sessions resume auth-redesign
lean-spec sessions stop auth-redesign

# Validation
lean-spec validate auth-redesign --tests --lint --types --ai-review
lean-spec validate auth-redesign --watch  # Continuous validation

# Metrics
lean-spec stats auth-redesign  # Show implementation metrics
lean-spec stats --all          # Project-wide metrics
```

### CLI Examples

```bash
# Autonomous implementation
$ lean-spec implement 168 --agent claude --autonomous
✓ Started session: 168-orchestration-platform
→ Design phase... (1m 23s)
→ Implementation phase... (8m 45s)
→ Testing phase... (2m 12s)
→ Documentation phase... (1m 34s)
✓ Session complete (13m 54s)
→ Running validation...
✓ All tests passed
✓ No lint errors
✓ Type check passed
✓ AI review: Implementation matches spec
→ Updated spec status to complete

# Guided implementation with pause
$ lean-spec implement 168 --agent claude --guided
✓ Started session: 168-orchestration-platform
→ Design phase... (1m 23s)
✓ Design phase complete

Review changes before continuing? [y/N]: y
→ Opening diff...
Continue to implementation? [Y/n]: y

→ Implementation phase... (8m 45s)
✓ Implementation phase complete

Review changes before continuing? [y/N]: y
→ Opening diff...
Continue to testing? [Y/n]: y

# And so on...
```

## Configuration

### Desktop Config (~/.lean-spec/desktop.yaml)

```yaml
orchestration:
  defaultAgent: claude
  guidedMode: true              # Pause between phases
  autoValidate: true            # Run validation after implementation
  autoComplete: false           # Require manual completion
  
agents:
  claude:
    enabled: true
    priority: 1
    models:
      default: claude-3-5-sonnet-20241022
      fast: claude-3-5-haiku-20241022
  copilot:
    enabled: true
    priority: 2
  cursor:
    enabled: false
  aider:
    enabled: true
    priority: 3
    
agentRelay:
  endpoint: "http://localhost:8080"
  apiKey: "${AGENT_RELAY_API_KEY}"
  timeout: 300000               # 5 minutes
  retryAttempts: 3
  retryDelay: 5000              # 5 seconds
  
devlog:
  endpoint: "http://localhost:9090"
  apiKey: "${DEVLOG_API_KEY}"
  enabled: true
  batchSize: 10                 # Batch telemetry events
  flushInterval: 5000           # Flush every 5 seconds
  
validation:
  autoRun: true
  runTests: true
  runLinters: true
  runTypeCheck: true
  aiReview: true
  
  # Test runner
  testCommand: "npm test"
  testCoverage: true
  
  # Linter
  linterCommand: "npm run lint"
  linterIgnore: ["*.test.ts", "*.spec.ts"]
  
  # Type checker
  typeCheckCommand: "tsc --noEmit"
  
notifications:
  phaseComplete: true
  sessionComplete: true
  validationFailed: true
  validationPassed: false       # Only notify on failure
  
shortcuts:
  implement: "CommandOrControl+Shift+I"
  validate: "CommandOrControl+Shift+V"
  newSpec: "CommandOrControl+Shift+N"
  quickSwitcher: "CommandOrControl+Shift+K"
  
ui:
  theme: "system"               # light, dark, or system
  outputFontSize: 13
  outputFontFamily: "Menlo, Monaco, 'Courier New', monospace"
  animatePhaseProgress: true
  showTokenCount: true
  showDuration: true
```

### Project-Specific Config (.leanspec/config.yaml)

```yaml
# Override desktop defaults for this project
orchestration:
  defaultAgent: copilot         # This project uses Copilot
  guidedMode: false             # Autonomous for this project
  
validation:
  testCommand: "pnpm test"      # Use pnpm instead of npm
  linterCommand: "pnpm lint"
  
  # Custom validation rules for this project
  customChecks:
    - name: "API compatibility"
      command: "pnpm check:api"
    - name: "Performance benchmarks"
      command: "pnpm bench"
```

## Implementation Details

### Session State Management

```typescript
// packages/desktop/src/lib/session-manager.ts
export class SessionManager {
  private sessions: Map<string, Session>;
  private storage: SessionStorage;
  
  async trackSession(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
    await this.storage.save(session);
  }
  
  async pauseSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    
    await this.agentRelayClient.pauseSession(sessionId);
    session.status = 'paused';
    await this.storage.update(session);
  }
  
  async resumeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    
    await this.agentRelayClient.resumeSession(sessionId);
    session.status = 'running';
    await this.storage.update(session);
  }
  
  async recoverSessions(): Promise<void> {
    // On desktop app restart, recover active sessions
    const savedSessions = await this.storage.loadAll();
    
    for (const session of savedSessions) {
      if (session.status === 'running' || session.status === 'paused') {
        // Reconnect to agent-relay
        const liveSession = await this.agentRelayClient.getSession(session.id);
        if (liveSession) {
          this.sessions.set(session.id, liveSession);
        } else {
          // Session no longer exists, mark as failed
          session.status = 'failed';
          await this.storage.update(session);
        }
      }
    }
  }
}
```

### Validation Runner

```typescript
// packages/desktop/src/lib/validation-runner.ts
export class ValidationRunner {
  async runTests(specPath: string): Promise<TestResults> {
    const config = await loadConfig();
    const testCommand = config.validation.testCommand;
    
    const result = await exec(testCommand);
    return parseTestOutput(result.stdout);
  }
  
  async runLinters(specPath: string): Promise<LintResults> {
    const config = await loadConfig();
    const linterCommand = config.validation.linterCommand;
    
    const result = await exec(linterCommand);
    return parseLintOutput(result.stdout);
  }
  
  async runTypeCheck(specPath: string): Promise<TypeCheckResults> {
    const config = await loadConfig();
    const typeCheckCommand = config.validation.typeCheckCommand;
    
    const result = await exec(typeCheckCommand);
    return parseTypeCheckOutput(result.stdout);
  }
  
  async runAIReview(specPath: string): Promise<AIReviewResult> {
    // Delegate to orchestrator for AI review
    const orchestrator = new AIOrchestrator();
    return await orchestrator.runAIReview(specPath);
  }
}
```

## Error Handling

### Connection Failures

```typescript
// Handle agent-relay connection failures
export class AgentRelayClient {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  
  async connect(): Promise<void> {
    try {
      this.ws = new WebSocket(this.endpoint);
      this.setupEventHandlers();
    } catch (error) {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        await this.wait(5000); // Wait 5 seconds
        return this.connect();
      } else {
        throw new Error('Failed to connect to agent-relay after 3 attempts');
      }
    }
  }
  
  private setupEventHandlers(): void {
    this.ws.on('close', () => {
      // Attempt to reconnect
      this.connect();
    });
    
    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      // Notify user
      this.emitError(error);
    });
  }
}
```

### Session Failures

```typescript
// Handle session failures
export class AIOrchestrator {
  async handleError(error: SessionError): Promise<void> {
    const session = this.sessions.get(error.sessionId);
    if (!session) return;
    
    // Update session status
    session.status = 'failed';
    session.error = error.message;
    await this.sessionManager.updateSession(session);
    
    // Log to Devlog
    await this.devlogClient.logActivity({
      event: 'session_failed',
      specId: session.specPath,
      sessionId: session.id,
      metadata: {
        error: error.message,
        phase: session.currentPhase,
        duration: session.duration,
      },
    });
    
    // Notify user
    showNotification({
      title: 'Session Failed',
      message: `${session.specPath}: ${error.message}`,
      actions: [
        { label: 'Retry', onClick: () => this.retrySession(session.id) },
        { label: 'Dismiss' },
      ],
    });
  }
}
```
