# V3 Architecture Decision Records (ADRs)

This directory contains all Architecture Decision Records for Claude-Flow v3.

## ADR Index

| ADR | Title | Status | File |
|-----|-------|--------|------|
| ADR-001 | Adopt agentic-flow as Core Foundation | ✅ Implemented | [ADR-001-AGENT-IMPLEMENTATION.md](./ADR-001-AGENT-IMPLEMENTATION.md) |
| ADR-002 | Implement Domain-Driven Design Structure | ✅ Implemented | [ADR-002-DDD-STRUCTURE.md](./ADR-002-DDD-STRUCTURE.md) |
| ADR-003 | Single Coordination Engine | ✅ Implemented | [ADR-003-CONSOLIDATION-COMPLETE.md](./ADR-003-CONSOLIDATION-COMPLETE.md) |
| ADR-004 | Plugin-Based Architecture | ✅ Implemented | [ADR-004-PLUGIN-ARCHITECTURE.md](./ADR-004-PLUGIN-ARCHITECTURE.md) |
| ADR-005 | MCP-First API Design | ✅ Implemented | [ADR-005-implementation-summary.md](./ADR-005-implementation-summary.md) |
| ADR-006 | Unified Memory Service | ✅ Implemented | [ADR-006-UNIFIED-MEMORY.md](./ADR-006-UNIFIED-MEMORY.md) |
| ADR-007 | Event Sourcing for State Changes | ✅ Implemented | [ADR-007-EVENT-SOURCING.md](./ADR-007-EVENT-SOURCING.md) |
| ADR-008 | Vitest Over Jest | ✅ Implemented | [ADR-008-VITEST.md](./ADR-008-VITEST.md) |
| ADR-009 | Hybrid Memory Backend as Default | ✅ Implemented | [ADR-009-IMPLEMENTATION.md](./ADR-009-IMPLEMENTATION.md) |
| ADR-010 | Remove Deno Support | ✅ Implemented | [ADR-010-NODE-ONLY.md](./ADR-010-NODE-ONLY.md) |
| ADR-011 | LLM Provider System | ✅ Implemented | [ADR-011-llm-provider-system.md](./ADR-011-llm-provider-system.md) |
| ADR-012 | MCP Security Features | ✅ Implemented | [ADR-012-mcp-security-features.md](./ADR-012-mcp-security-features.md) |
| ADR-013 | Core Security Module | ✅ Implemented | [ADR-013-core-security-module.md](./ADR-013-core-security-module.md) |
| ADR-014 | Workers System | ✅ Implemented | [ADR-014-workers-system.md](./ADR-014-workers-system.md) (Node.js Daemon 2026-01-07) |
| ADR-015 | Unified Plugin System | ✅ Implemented | [ADR-015-unified-plugin-system.md](./ADR-015-unified-plugin-system.md) |
| ADR-016 | Collaborative Issue Claims | ✅ Implemented | [ADR-016-collaborative-issue-claims.md](./ADR-016-collaborative-issue-claims.md) |

## Implementation Progress

| Component | Status | Details |
|-----------|--------|---------|
| DDD Modules | ✅ 100% | 16 modules, 833 files, ~240K lines |
| Test Coverage | ● In Progress | 85+ test files, target: >90% (ADR-008) |
| Service Integration | ✅ Complete | agentic-flow@alpha integration |
| Performance Benchmarks | ✅ Complete | Full benchmark suite in @claude-flow/performance |

## Quick Summary

### Core Decisions

1. **ADR-001**: Build on agentic-flow@alpha instead of duplicating (eliminates 10,000+ lines)
2. **ADR-002**: Domain-Driven Design with bounded contexts for clean architecture
3. **ADR-003**: Single UnifiedSwarmCoordinator as canonical coordination engine
4. **ADR-004**: Microkernel with plugins for optional features (HiveMind, Neural, etc.)
5. **ADR-005**: MCP tools as primary API, CLI as thin wrapper

### Technical Decisions

6. **ADR-006**: Single MemoryService with SQLite, AgentDB, or Hybrid backends
7. **ADR-007**: Event sourcing for audit trail and state reconstruction
8. **ADR-008**: Vitest for 10x faster testing with native ESM
9. **ADR-009**: Hybrid backend (SQLite + AgentDB) as default for best performance
10. **ADR-010**: Node.js 20+ only, removing Deno complexity

## Additional Files

- [v3-adrs.md](./v3-adrs.md) - Complete ADR master document with all decisions
- [ADR-003-implementation-status.md](./ADR-003-implementation-status.md) - Detailed implementation tracking

## Performance Targets (from ADRs)

| Metric | Target | ADR Reference |
|--------|--------|---------------|
| Code reduction | <5,000 lines vs 15,000+ | ADR-001 |
| HNSW search | 150x-12,500x faster | ADR-009 |
| Flash Attention | 2.49x-7.47x speedup | ADR-001 |
| Test execution | <5s (10x improvement) | ADR-008 |
| Startup time | <500ms | ADR-004 |
| Query latency | <100ms | ADR-006 |

## Security Improvements

All ADRs consider security:
- CVE-1: Command injection prevention (ADR-005 input validation)
- CVE-2: Path traversal prevention (ADR-006 memory sandboxing)
- CVE-3: Credential generation (secure random with rejection sampling)

---

**Last Updated:** 2026-01-07
**Project:** Claude-Flow V3
**Version:** 3.0.0-alpha.15

### Recent Updates (2026-01-07)

#### Release: @claude-flow/cli@3.0.0-alpha.15 (Latest)

**Doctor Command Enhancements**:
- **Claude Code CLI Check**: Verifies `@anthropic-ai/claude-code` installation
- **Auto-Install**: `--install` flag to auto-install missing Claude Code CLI
- **Fixed Package Paths**: Corrected `dist/src/` paths for proper npm resolution

```bash
# Check system health including Claude Code CLI
npx claude-flow@v3alpha doctor

# Auto-install Claude Code CLI if missing
npx claude-flow@v3alpha doctor --install

# Check only Claude Code CLI
npx claude-flow@v3alpha doctor -c claude
```

**Package Resolution Fix**: Fixed Windows module resolution issue where `@claude-flow/cli` exports pointed to wrong paths (`dist/index.js` → `dist/src/index.js`).

#### Release: @claude-flow/cli@3.0.0-alpha.7
- **Hive-Mind CLI**: All MCP tools now exposed via CLI subcommands:
  - `hive-mind join <agent-id>` - Join agent to hive
  - `hive-mind leave <agent-id>` - Remove agent from hive
  - `hive-mind consensus` - Manage consensus proposals and voting
  - `hive-mind broadcast -m <msg>` - Broadcast messages to workers
  - `hive-mind memory` - Access shared memory (get/set/delete/list)
- **Bug Fix**: Fixed positional argument parsing for subcommands in CLI parser
- **File Persistence**: All MCP tools use file-based persistence in `.claude-flow/` directories
- **ADR-014**: Node.js Worker Daemon - cross-platform TypeScript daemon replaces shell helpers
- **CLI**: `daemon` command with start/stop/status/trigger/enable subcommands
- **Session Integration**: Auto-start daemon on SessionStart, auto-stop on SessionEnd

#### CLI MCP Tool Coverage
| Category | Tools | CLI Status |
|----------|-------|------------|
| Agent | spawn, terminate, status, list, pool, health, update | ✅ Complete |
| Hive-Mind | init, spawn, status, task, join, leave, consensus, broadcast, memory, optimize-memory, shutdown | ✅ Complete |
| Task | create, status, list, complete, cancel | ✅ Complete |
| Session | save, restore, list, delete, export | ✅ Complete |
| Config | get, set, list, reset, export, import | ✅ Complete |
| Memory | store, retrieve, list, delete, search | ✅ Complete |
| Workflow | create, execute, list, status, delete | ✅ Complete |

#### Install
```bash
npx @claude-flow/cli@v3alpha --help
```

### Release: @claude-flow/cli@3.0.0-alpha.11 (2026-01-07)

#### New V3 Advanced CLI Commands
All commands include subcommand help and "Created with ❤️ by ruv.io" branding.

| Command | Description | Subcommands |
|---------|-------------|-------------|
| `neural` | Neural pattern training, MoE, Flash Attention | train, status, patterns, predict, optimize |
| `security` | Security scanning, CVE detection, threat modeling | scan, cve, threats, audit, secrets |
| `performance` | Performance profiling, benchmarking, optimization | benchmark, profile, metrics, optimize, bottleneck |
| `providers` | AI provider management, models, configurations | list, configure, test, models, usage |
| `plugins` | Plugin management, installation, lifecycle | list, install, uninstall, toggle, info, create |
| `deployment` | Deployment management, environments, rollbacks | deploy, status, rollback, history, environments, logs |
| `claims` | Claims-based authorization, access control | list, check, grant, revoke, roles, policies |
| `embeddings` | Vector embeddings, semantic search | generate, search, compare, collections, index, providers |
| `doctor` | System diagnostics | Node version, config, daemon, memory, API keys, MCP, disk |
| `completions` | Shell completions | bash, zsh, fish, powershell |

### P0 Features Completed (alpha.12)

**Smart Error Suggestions**: Typo detection with Levenshtein distance
```bash
$ claude-flow swram
[ERROR] Unknown command: swram
  Did you mean one of these?
  - swarm
  - neural
  - start

$ claude-flow memroy
[ERROR] Unknown command: memroy
  Did you mean "memory"?
```

**Doctor Command**: System health diagnostics
```bash
$ claude-flow doctor
Claude Flow Doctor
──────────────────────────────────────────────────
✓ Node.js Version: v22.21.1 (>= 20 required)
✓ npm Version: v10.9.4
✓ Git: v2.52.0
✓ Git Repository: In a git repository
⚠ Config File: No config file (using defaults)
⚠ Daemon Status: Not running
⚠ Memory Database: Not initialized
⚠ API Keys: No API keys found
⚠ MCP Servers: No MCP config found
✓ Disk Space: 73G available
✓ TypeScript: v5.9.3
──────────────────────────────────────────────────
Summary: 6 passed, 5 warnings
```

**Shell Completions**: Tab completion for all shells
```bash
# Install bash completions
claude-flow completions bash > ~/.bash_completion.d/claude-flow

# Install zsh completions
claude-flow completions zsh > ~/.zfunc/_claude-flow

# Install fish completions
claude-flow completions fish > ~/.config/fish/completions/claude-flow.fish

# Install PowerShell completions
claude-flow completions powershell >> $PROFILE
```

## CLI Roadmap

### Priority Recommendations

| Priority | Recommendation | Status | Description |
|----------|----------------|--------|-------------|
| 🔴 P0 | Add `doctor` command | ✅ Done | System diagnostics, dependency checks, config validation |
| 🔴 P0 | Add `completions` command | ✅ Done | Shell completions for bash, zsh, fish, powershell |
| 🔴 P0 | Add smart error suggestions | ✅ Done | Levenshtein distance for typo corrections |
| 🟡 P1 | Resolve provider config overlap | Pending | Unify provider configs across embeddings/providers commands |
| 🟡 P1 | Add unified `logs` command | Pending | Centralized log viewing across daemon, agents, swarms |
| 🟢 P2 | Add `upgrade` command | Pending | Self-update CLI to latest version |
| 🟢 P2 | Add interactive shell/REPL mode | Pending | `claude-flow shell` for interactive command execution |

### Implementation Plan

**P0 - Critical (Next Release)**
```bash
# Doctor command - diagnose system health
claude-flow doctor              # Full system check
claude-flow doctor --fix        # Auto-fix issues where possible
claude-flow doctor --component mcp  # Check specific component

# Shell completions
claude-flow completions bash > ~/.bash_completion.d/claude-flow
claude-flow completions zsh > ~/.zfunc/_claude-flow
claude-flow completions fish > ~/.config/fish/completions/claude-flow.fish
```

**P1 - High Priority**
```bash
# Unified logs command
claude-flow logs                # All logs
claude-flow logs --follow       # Tail logs
claude-flow logs --component daemon
claude-flow logs --level error
```

**P2 - Nice to Have**
```bash
# Self-update
claude-flow upgrade             # Upgrade to latest
claude-flow upgrade --check     # Check for updates
claude-flow upgrade --version 3.1.0

# Interactive shell
claude-flow shell               # Enter REPL
> swarm init mesh
> agent spawn coder
> memory search "patterns"
```

---

## agentic-flow vs claude-flow Feature Comparison

### Feature Matrix

| Feature | agentic-flow | claude-flow | Integration Value |
|---------|--------------|-------------|-------------------|
| **Core Agent System** | | | |
| Specialized Agents | 66+ | 15 (hierarchical) | 🟡 |
| Agent Spawning | ✅ | ✅ | - |
| Agent Pool/Scaling | ✅ | ✅ | - |
| **Orchestration** | | | |
| Swarm Coordination | ✅ | ✅ | - |
| Hive-Mind Consensus | ❌ | ✅ | - |
| Federation Hub | ✅ | ❌ | 🔴 High |
| Ephemeral Agents | ✅ | ❌ | 🔴 High |
| **Transport** | | | |
| HTTP/SSE | ✅ | ✅ | - |
| QUIC (UDP) | ✅ | ❌ | 🔴 High |
| WebSocket | ✅ | ✅ | - |
| **AI Providers** | | | |
| Multi-Provider | ✅ | ✅ | - |
| Model Optimization | ✅ | ❌ | 🔴 High |
| Provider Fallback | ✅ | ❌ | 🔴 High |
| Cost Tracking | ✅ | ❌ | 🟡 Medium |
| Proxy Server | ✅ | ❌ | 🟡 Medium |
| **Memory/Learning** | | | |
| ReasoningBank (WASM) | ✅ | ❌ | 🔴 High |
| Embeddings CLI | ✅ | ✅ | - |
| HNSW Indexing | ✅ | ✅ | - |
| Memory Persistence | ✅ | ✅ | - |
| **DevOps** | | | |
| Doctor Command | ❌ | ✅ | - |
| Shell Completions | ❌ | ✅ | - |
| Smart Errors | ❌ | ✅ | - |
| Background Workers | ✅ | ✅ | - |
| Worker Dispatch | ✅ | ❌ | 🟡 Medium |
| **Security** | | | |
| Security Scanning | ❌ | ✅ | - |
| CVE Detection | ❌ | ✅ | - |
| Claims/RBAC | ❌ | ✅ | - |
| **Advanced** | | | |
| Neural Patterns | ❌ | ✅ | - |
| Self-Learning Hooks | ✅ | ✅ | - |
| Deployment Mgmt | ❌ | ✅ | - |
| Plugin System | ❌ | ✅ | - |

### High-Value Integration Opportunities

#### 🔴 Tier 1: Highest Impact (Unique to agentic-flow)

**1. QUIC Transport (50-70% faster)**
```bash
# Integration target:
claude-flow transport quic --port 4433
claude-flow swarm start --transport quic  # 50-70% faster agent comms
```

**2. Federation Hub (Ephemeral Agents)**
```bash
# Integration target:
claude-flow federation start --port 9443
claude-flow federation spawn --tenant acme --lifetime 600
```
*Value: Agents die but memories persist → learning across agent generations*

**3. Model Optimization (85% cost savings)**
```bash
# Integration target:
claude-flow agent spawn -t coder --optimize --priority cost
claude-flow providers optimize --task "Build API" --budget 0.01
```

**4. Provider Fallback (Enterprise resilience)**
```bash
# Integration target:
claude-flow providers fallback configure --primary anthropic --fallback openrouter,onnx
```

**5. ReasoningBank (WASM Learning Memory)**
```bash
# Integration target:
claude-flow reasoningbank store "pattern" --reasoning "..."
claude-flow reasoningbank search "authentication patterns"
```
*Value: 10-100x faster reasoning pattern storage vs JSON*

#### 🟡 Tier 2: Medium Impact

| Feature | Description | Complexity |
|---------|-------------|------------|
| Proxy Server | Use any model with Claude Code via local proxy | 🟡 Medium |
| Worker Dispatch | More granular worker control | 🟢 Low |
| Embeddings Management | Better model management | 🟢 Low |

### Integration Roadmap

#### Phase 1: Quick Wins (1 week) → 9.3 → 9.5

| Feature | Effort | Impact | Source |
|---------|--------|--------|--------|
| Model Optimization flags | 🟢 Low | 🔴 High | New command |
| Provider fallback config | 🟢 Low | 🔴 High | New subcommand |
| Embeddings download/benchmark | 🟢 Low | 🟡 Med | Enhance existing |

```bash
# After Phase 1:
claude-flow agent spawn -t coder --optimize --priority cost
claude-flow providers fallback configure --primary anthropic --fallback openrouter,onnx
claude-flow embeddings download all-MiniLM-L6-v2
```

#### Phase 2: Core Integration (2-3 weeks) → 9.5 → 9.7

| Feature | Effort | Impact | Source |
|---------|--------|--------|--------|
| Federation Hub | 🟡 Med | 🔴 High | Port from agentic-flow |
| Ephemeral agents | 🟡 Med | 🔴 High | Part of federation |
| Proxy server | 🟡 Med | 🟡 Med | Port from agentic-flow |
| Worker dispatch triggers | 🟢 Low | 🟡 Med | Enhance daemon |

```bash
# After Phase 2:
claude-flow federation start --port 9443
claude-flow federation spawn --lifetime 300 --task "Quick analysis"
claude-flow proxy start --provider openrouter
claude-flow daemon dispatch security-audit
```

#### Phase 3: Advanced (4-6 weeks) → 9.7 → 9.9

| Feature | Effort | Impact | Source |
|---------|--------|--------|--------|
| QUIC Transport | 🔴 High | 🔴 High | Port QUIC module |
| ReasoningBank (WASM) | 🔴 High | 🔴 High | Port + WASM build |
| 66 Agent configs | 🟡 Med | 🟡 Med | Copy + adapt |

```bash
# After Phase 3:
claude-flow swarm start --transport quic  # 50-70% faster
claude-flow reasoningbank store "pattern" --reasoning "..."
claude-flow agent spawn -t security-analyst  # One of 66 types
```

### Recommended Integration Approach

**Option A: Dependency Approach (Fastest)**
```json
// claude-flow/package.json
{
  "dependencies": {
    "agentic-flow": "^2.0.3"
  }
}
```

**Option B: Port Code (More Control)**
```bash
# Copy specific modules:
- agentic-flow/src/transport/quic.ts → claude-flow/src/transport/
- agentic-flow/src/federation/ → claude-flow/src/federation/
- agentic-flow/src/reasoningbank/ → claude-flow/src/reasoningbank/
```

**Option C: Unified Package (Long-term)**
```bash
@claude-flow/core      # Shared primitives
@claude-flow/cli       # CLI (current)
@claude-flow/agents    # From agentic-flow's 66 agents
@claude-flow/transport # QUIC + HTTP + WebSocket
```
