# Design: Migration Command

Technical design for `lean-spec migrate` command.

## Command Interface

```bash
# Show generic migration instructions
lean-spec migrate <input-path>
lean-spec migrate ./docs/adr/
lean-spec migrate ./docs/rfcs/
lean-spec migrate ./specs/linear-export/

# AI-assisted migration (AI figures out the format)
lean-spec migrate <input-path> --with copilot
lean-spec migrate <input-path> --with claude
lean-spec migrate <input-path> --with gemini

# Options
lean-spec migrate <input-path> --dry-run          # Preview without changes
lean-spec migrate <input-path> --batch-size 10    # Process N docs at a time
lean-spec migrate <input-path> --skip-validation  # Don't validate after
```

## Supported Sources

**Any format!** By leveraging AI agents, we support unlimited formats:
- ADR (Architecture Decision Records)
- RFC-style documents
- Linear issues/projects
- Confluence pages
- GitHub Issues/Discussions
- Notion pages
- Jira tickets
- Custom markdown specs
- Google Docs exports
- Any structured document format

**Why this works**: AI analyzes document structure, extracts intent, and maps to LeanSpec without hard-coded parsers.

## Migration Modes

### Mode 1: Instruction-Based (Default)

Outputs generic migration prompt for user to copy to any AI tool:

```markdown
# LeanSpec Migration Instructions

## Source Location
./docs/adr/ (23 documents found)

## Migration Prompt
Copy this prompt to your AI assistant (Copilot, Claude, ChatGPT, etc.):

---

You are helping migrate specification documents to LeanSpec format.

**Source:** ./docs/adr/

**Your Task:**
1. Analyze the source documents to understand their format and structure
2. For each document, extract:
   - Title/name
   - Status (map to: planned, in-progress, complete, archived)
   - Creation date
   - Priority (if present)
   - Main content sections
   - Relationships to other documents

3. Migrate each document:
   ```bash
   # Create spec
   lean-spec create <name>
   
   # Set metadata (NEVER edit frontmatter manually)
   lean-spec update <name> --status <status>
   lean-spec update <name> --priority <priority>
   lean-spec update <name> --tags <tag1,tag2>
   
   # Edit content with your preferred tool
   # Map original sections to LeanSpec structure:
   # - Overview: Problem statement and context
   # - Design: Technical approach and decisions
   # - Plan: Implementation steps (if applicable)
   # - Test: Validation criteria (if applicable)
   # - Notes: Additional context, trade-offs, alternatives
   ```

4. After migration:
   ```bash
   lean-spec validate  # Check for issues
   lean-spec board     # Verify migration
   ```

**Important Rules:**
- Preserve decision rationale and context
- Map status appropriately to LeanSpec states
- Link related specs using `related` field (manual frontmatter edit)
- Follow LeanSpec first principles: clarity over completeness
- Keep specs under 400 lines (split if needed)

---
```

### Mode 2: AI-Assisted Automation

When `--with <provider>` specified, fully automated:

**Pre-flight Checks:**
```typescript
interface AIToolCheck {
  provider: 'copilot' | 'claude' | 'gemini';
  cliCommand: string;
  installed: boolean;
  version?: string;
  compatible: boolean;
}

async function verifyAITool(provider: string): Promise<AIToolCheck> {
  const tools = {
    copilot: 'github-copilot-cli',
    claude: 'claude',
    gemini: 'gemini-cli'
  };
  
  const command = tools[provider];
  const installed = await checkInstalled(command);
  
  if (!installed) {
    throw new Error(
      `${provider} CLI not found. Install: npm install -g ${command}`
    );
  }
  
  const version = await getVersion(command);
  const compatible = checkCompatibility(version);
  
  return { provider, cliCommand: command, installed, version, compatible };
}
```

**Migration Execution:**
```typescript
interface MigrationConfig {
  inputPath: string;
  aiProvider: 'copilot' | 'claude' | 'gemini';
  dryRun?: boolean;
  batchSize?: number;
}

async function migrateWithAI(config: MigrationConfig) {
  // 1. Verify AI tool
  const aiTool = await verifyAITool(config.aiProvider);
  
  // 2. Scan source documents (format-agnostic)
  const docs = await scanDocuments(config.inputPath);
  
  // 3. Generate generic migration prompt
  const batches = chunk(docs, config.batchSize || 10);
  
  for (const batch of batches) {
    const prompt = generateMigrationPrompt(batch);
    
    // 4. Execute via AI CLI
    await executeAICLI(aiTool.cliCommand, prompt);
  }
  
  // 5. Validate results
  await runValidation();
  
  // 6. Generate migration report
  return generateReport();
}

function generateMigrationPrompt(docs: string[]): string {
  return `
Migrate these documents to LeanSpec format.

SOURCE DOCUMENTS:
${docs.map(d => d.content).join('\n---\n')}

TASK:
1. Analyze document format and structure
2. Extract metadata (title, status, dates, priority)
3. For each document, execute:
   - lean-spec create <name>
   - lean-spec update <name> --status <status>
   - lean-spec update <name> --priority <priority>
   - lean-spec update <name> --tags <tags>
   - Edit content to match LeanSpec structure

4. Preserve decision rationale and relationships
5. Keep specs under 400 lines

Execute migration commands now.
  `;
}
```

## AI Provider Integration

**AI CLI Tool Registry:**
```typescript
interface AICliTool {
  name: 'copilot' | 'claude' | 'gemini';
  cliCommand: string;
  installCmd: string;
  versionCmd: string;
  minVersion: string;
  executePattern: (prompt: string) => string;
}

const AI_CLI_TOOLS: Record<string, AICliTool> = {
  copilot: {
    name: 'copilot',
    cliCommand: 'github-copilot-cli',
    installCmd: 'npm install -g @githubnext/github-copilot-cli',
    versionCmd: 'github-copilot-cli --version',
    minVersion: '0.1.0',
    executePattern: (prompt) => `echo "${prompt}" | github-copilot-cli --execute`
  },
  claude: {
    name: 'claude',
    cliCommand: 'claude',
    installCmd: 'pip install claude-cli',
    versionCmd: 'claude --version',
    minVersion: '1.0.0',
    executePattern: (prompt) => `claude --prompt "${prompt}" --execute`
  },
  gemini: {
    name: 'gemini',
    cliCommand: 'gemini-cli',
    installCmd: 'npm install -g @google/gemini-cli',
    versionCmd: 'gemini-cli --version',
    minVersion: '1.0.0',
    executePattern: (prompt) => `gemini-cli --prompt "${prompt}" --auto`
  }
};
```

**Pre-flight Verification:**
```typescript
async function verifyAndExecute(provider: string, inputPath: string) {
  const tool = AI_CLI_TOOLS[provider];
  
  // 1. Check if installed
  const installed = await commandExists(tool.cliCommand);
  if (!installed) {
    console.error(`❌ ${tool.name} CLI not found`);
    console.error(`   Install: ${tool.installCmd}`);
    process.exit(1);
  }
  
  // 2. Check version
  const version = await getVersion(tool.versionCmd);
  if (!satisfiesVersion(version, tool.minVersion)) {
    console.error(`❌ ${tool.name} version ${version} too old`);
    console.error(`   Required: >=${tool.minVersion}`);
    process.exit(1);
  }
  
  console.log(`✓ ${tool.name} CLI verified (v${version})`);
  
  // 3. Execute migration
  await executeMigration(tool, inputPath);
}
```

## Error Handling

**Common Error Scenarios:**

```bash
# AI CLI not found
$ lean-spec migrate ./docs/adr --with copilot
❌ copilot CLI not found
   Install: npm install -g @githubnext/github-copilot-cli
   Or run without --with flag for manual instructions

# AI CLI outdated
$ lean-spec migrate ./docs/adr --with claude
❌ claude version 0.5.0 too old
   Required: >=1.0.0
   Update: pip install --upgrade claude-cli

# No documents found
$ lean-spec migrate ./docs/empty --with gemini
❌ No documents found in ./docs/empty
   Check path and try again
```

**Error Handling Strategy:**
- **Dry run first**: Preview changes before applying
- **Validation**: Run `lean-spec validate` after migration
- **Rollback**: Keep source docs unchanged
- **Conflict resolution**: Detect duplicate names/IDs, prompt user
- **Partial migration**: Continue on errors, report summary

## How AI Handles Any Format

AI agent analyzes structure and maps intelligently:

**Example - ADR Migration:**
```markdown
Source: "0042-use-event-sourcing.md"

AI observes:
- Title: "Use Event Sourcing"
- Status: "Accepted" → maps to "complete"
- Date: 2024-03-15 → created_at
- Has Context, Decision, Consequences sections

AI executes:
$ lean-spec create use-event-sourcing
$ lean-spec update use-event-sourcing --status complete
$ lean-spec update use-event-sourcing --priority high
$ lean-spec update use-event-sourcing --tags architecture,database
[Maps sections: Context→Overview, Decision→Design, Consequences→Notes]
```

**Example - Linear Issue Migration:**
```markdown
Source: Linear JSON export

AI observes:
- Title, description, status, assignee, labels
- Status: "In Progress" → maps to "in-progress"
- Has comments with design discussion

AI executes:
$ lean-spec create <issue-title>
$ lean-spec update <name> --status in-progress
$ lean-spec update <name> --assignee <user>
$ lean-spec update <name> --tags <labels>
[Structures: description→Overview, comments→Design/Notes]
```

**Key advantage**: No hard-coded parsers. AI understands context and intent.
