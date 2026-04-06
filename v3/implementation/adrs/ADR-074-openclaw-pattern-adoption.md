# ADR-074: OpenClaw Pattern Adoption for Ruflo

**Status**: Proposed
**Date**: 2026-04-06
**Author**: RuvNet
**PR**: TBD
**Related**: ADR-059 (rvagent-wasm), ADR-070 (rvagent completion), ADR-026 (model routing)

## Context

[OpenClaw](https://github.com/openclaw/openclaw) (350K stars, MIT, TypeScript) is a personal AI assistant platform with a Gateway architecture, 20+ messaging channel adapters, session-based agent coordination, and a skills marketplace. While OpenClaw solves a different problem (personal assistant via messaging) than Ruflo (multi-agent developer orchestration), several architectural patterns are worth adopting.

This ADR evaluates 10 OpenClaw patterns and proposes adoption of 8, deferral of 1, and rejection of 1.

### Key Difference

| | OpenClaw | Ruflo |
|---|---------|-------|
| **Purpose** | Personal AI assistant via messaging | Multi-agent developer orchestration |
| **Interface** | WhatsApp, Telegram, Slack, Discord, etc. | CLI, MCP, IDE extensions |
| **Agent model** | Single agent + subagents | 60+ specialized agent types with swarm topologies |
| **Memory** | Session history (flat) | AgentDB + HNSW vector search (150x-12,500x faster) |
| **Learning** | None | SONA, MoE, EWC++, neural hooks |
| **Consensus** | None | Byzantine, Raft, CRDT, Gossip, Quorum |

## Decision

Adopt 8 patterns across 4 phases. Use `@ruvector/rvagent-wasm` as the sandboxed runtime for subagent spawning (Pattern 6).

## Patterns

### Phase 1 — Quick Wins (S, 1-2 weeks)

#### Pattern 2: Prompt Cache Stability

**Problem**: Ruflo registers 314 MCP tools from 29 files. Import order determines registration order. If order drifts between builds, Claude API prompt cache prefixes break, causing latency and cost increases.

**Solution**: Sort all tool definitions lexicographically by `name` before registration. Add a snapshot test ensuring deterministic order.

**Scope**: S — single sort call in `mcp-tools/index.ts` + invariant test.

**Files**: `v3/@claude-flow/cli/src/mcp-tools/index.ts`

#### Pattern 8: Strict Config Validation

**Problem**: Ruflo's MCP server and CLI silently fall back to defaults on invalid config. Users get confusing behavior from silent misconfiguration.

**Solution**: Add Zod schema validation at startup. If config file exists but is invalid, refuse to start with clear error + `doctor --fix` suggestion. Missing config still uses defaults.

**Scope**: S — Zod schema in config loader + startup gate.

**Files**: `v3/@claude-flow/cli/src/config-adapter.ts`, `v3/@claude-flow/cli/src/mcp-server.ts`

---

### Phase 2 — Core Coordination (M, 2-4 weeks)

#### Pattern 1: Session Coordination Primitives

**Problem**: Inter-agent coordination requires polling AgentDB memory stores. No direct message-passing between live sessions.

**Solution**: Add 3 MCP tools:
- `session_send` — fire-and-forget message to a session (or wait-for-reply mode)
- `session_yield` — block current session, wait for reply from another session
- `session_history` — read message log for any session

Built on an in-memory per-session message queue (EventEmitter). Aligns with Claude Code's existing `SendMessage` and Agent Teams mailbox.

**Scope**: M — 3 new MCP tools + message queue per session.

**Files**: `v3/@claude-flow/cli/src/mcp-tools/session-tools.ts`

#### Pattern 6: Subagent Spawning Model (rvagent-wasm)

**Problem**: Agent spawning is fragmented: `agent_spawn` MCP tool creates metadata, Claude Code Task tool does actual work, `claude -p` does headless work. No unified spawn primitive with runtime selection.

**Solution**: Add `session_spawn` MCP tool with runtime selection:

| Runtime | Backend | Use Case |
|---------|---------|----------|
| `wasm` | `@ruvector/rvagent-wasm` WasmAgent | Sandboxed, lightweight, no OS access, <1ms spawn |
| `native` | Claude Code Task tool | Full capabilities, file access, tools |
| `headless` | `claude -p` | Background headless work |
| `acp` | External harness (future) | Codex, Gemini CLI |

**Why rvagent-wasm**: The existing 10 WASM MCP tools (`wasm_agent_create`, `wasm_agent_prompt`, etc.) already provide sandboxed agent lifecycle. `session_spawn` wraps these with session binding and runtime selection. WASM agents are ideal for:
- Isolated code analysis (no filesystem side effects)
- Parallel subtask execution (lightweight, no process overhead)
- Security-sensitive operations (sandboxed VFS, no OS access)
- Gallery templates (Coder, Researcher, Tester, Reviewer, Security, Swarm)

```typescript
// Spawn a WASM agent for sandboxed code review
session_spawn({
  runtime: 'wasm',
  template: 'reviewer',       // from WasmGallery
  instructions: 'Review auth module for injection risks',
  workspace: { 'auth.ts': sourceCode },  // preload VFS
})
// Returns: { sessionId, runId } — non-blocking
```

**Scope**: M — new MCP tool wrapping existing WASM + Task tool + headless backends.

**Depends on**: Pattern 1 (session primitives for yield/reply).

**Files**: `v3/@claude-flow/cli/src/mcp-tools/agent-tools.ts`, `v3/@claude-flow/cli/src/ruvector/agent-wasm.ts`

---

### Phase 3 — Plugin Infrastructure (M, 2-3 weeks)

#### Pattern 3: Plugin Boundary Enforcement

**Problem**: Plugins can import any internal module from `@claude-flow/cli`. No SDK boundary. Refactoring internals risks breaking plugins.

**Solution**: Create `@claude-flow/plugin-sdk` package that re-exports the narrow public API (hook registration, tool registration, memory access, config access). Add ESLint rule + invariant test that plugins only import from `@claude-flow/plugin-sdk/*`.

**Scope**: M — new package (thin re-exports) + lint rule.

**Files**: New `v3/@claude-flow/plugin-sdk/`, update `v3/@claude-flow/cli/src/plugins/manager.ts`

#### Pattern 9: Skills Marketplace

**Problem**: 90+ skills exist as local SKILL.md files. No remote sharing, publishing, or versioning.

**Solution**: Extend IPFS plugin registry to also index skills. Add `skills search`, `skills publish`, `skills install` CLI commands. Skills are small (YAML + markdown) so they store directly in registry JSON.

**Scope**: M — extend registry schema + 3 CLI commands.

**Depends on**: Pattern 3 (clean SDK surface).

**Files**: `v3/@claude-flow/cli/src/plugins/store/discovery.ts`, new skills CLI command

---

### Phase 4 — Gateway Architecture (L, 4-8 weeks)

#### Pattern 4: Gateway Control Plane

**Problem**: MCP server is single-client (one CLI connects to one server). No concurrent multi-client support.

**Solution**: Evolve MCP server into a Gateway accepting multiple concurrent connections across transports. Add connection registry, per-connection auth (using existing claims system), and message routing.

Feature-flagged behind `--gateway` mode. Existing single-client `stdio` mode unchanged.

**Scope**: L — major refactor of `mcp-server.ts`.

**Depends on**: Pattern 3 (clean plugin surface for Gateway extensions).

#### Pattern 5: Channel Adapters

**Problem**: Agents only reachable via CLI/MCP. No messaging platform integration.

**Solution**: Channel adapter abstraction: normalize inbound messages from Slack/Discord/Telegram into session messages, normalize outbound responses back to platform format. Each adapter is a plugin.

**Scope**: L — adapter framework (M) + first 2-3 adapters (S each).

**Depends on**: Pattern 4 (Gateway for multi-client connections).

---

### Deferred

#### Pattern 7: ACP (Agent Client Protocol) Standardization

**Why defer**: Protocol still emerging in industry. Premature standardization risks building to a changing spec. Current `@claude-flow/codex` dual-mode works for Claude+Codex. Revisit when ACP stabilizes.

**Scope**: XL.

### Not Adopting

#### Pattern 10: Companion Apps (Native macOS/iOS/Android)

**Why not**: Ruflo users live in the terminal. Native apps add enormous scope (3 platforms, app stores, UI frameworks) for minimal developer value. Gateway (Pattern 4) enables community-built clients without first-party investment.

## rvagent-wasm Role Summary

`@ruvector/rvagent-wasm@0.1.0` serves as the WASM runtime tier in the unified subagent spawning model:

| Capability | Already Implemented | New in ADR-074 |
|-----------|-------------------|----------------|
| `WasmAgent` — sandboxed agent lifecycle | `wasm_agent_create/prompt/terminate` | Session binding via `session_spawn` |
| `WasmGallery` — 6 pre-built templates | `wasm_gallery_list/search/create` | Template selection in spawn config |
| `WasmMcpServer` — JSON-RPC in WASM | Available but not wired | Bridge to Gateway MCP protocol |
| `WasmStateBackend` — sandboxed VFS | `wasm_agent_files` | Workspace preloading on spawn |
| `WasmToolExecutor` — sandboxed tools | `wasm_agent_tool` | Tool execution via session primitives |
| `WasmRvfBuilder` — container format | Available but not wired | Agent state export/import |

## Implementation Priority

```
Phase 1 ──── [S] Config Validation ──── standalone
             [S] Cache Stability ─────── standalone

Phase 2 ──── [M] Session Primitives ─── standalone
             [M] Subagent Spawn ──────── depends on Phase 2.1 + rvagent-wasm

Phase 3 ──── [M] Plugin SDK ──────────── standalone
             [M] Skills Marketplace ──── benefits from Phase 3.1

Phase 4 ──── [L] Gateway ─────────────── benefits from Phase 3.1
             [L] Channel Adapters ────── depends on Phase 4.1
```

## Consequences

### Positive
- Session primitives replace memory-polling with direct message-passing
- rvagent-wasm provides <1ms sandboxed agent spawning for lightweight tasks
- Plugin SDK boundary protects internals from plugin coupling
- Gateway enables future multi-client scenarios (IDE, web, messaging)
- Prompt cache stability reduces API costs across all 314 tools

### Negative
- Gateway refactor is high-risk change to core MCP server
- Channel adapters add ongoing maintenance per messaging platform
- Plugin SDK boundary may initially be too narrow, requiring iteration

### Neutral
- ACP deferred — revisit when industry converges on spec
- Companion apps rejected — Gateway enables community alternatives

## References

- [OpenClaw](https://github.com/openclaw/openclaw) — 350K stars, MIT, TypeScript
- [ADR-059](./ADR-059-rvagent-wasm-integration.md) — rvagent-wasm integration
- [ADR-070](./ADR-070-rvagent-wasm-completion.md) — rvagent-wasm completion
- [ADR-026](./ADR-026-three-tier-model-routing.md) — 3-tier model routing
- [AgentSkills spec](https://agentskills.io) — SKILL.md format
