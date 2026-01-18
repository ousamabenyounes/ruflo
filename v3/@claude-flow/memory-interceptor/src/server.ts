/**
 * Memory Interceptor MCP Server
 *
 * Intercepts memory_* tool calls and redirects them to a custom backend.
 * Register this BEFORE claude-flow in your MCP config to shadow the default memory tools.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { MemoryBackend, MemoryEntry } from './backends/interface.js';
import { SQLiteBackend } from './backends/sqlite.js';

export interface InterceptorConfig {
  backend: MemoryBackend;
  interceptPatterns?: string[];
  passthrough?: boolean;
  hooks?: {
    beforeStore?: (key: string, value: unknown) => Promise<{ key: string; value: unknown } | null>;
    afterRetrieve?: (entry: MemoryEntry | null) => Promise<MemoryEntry | null>;
    beforeSearch?: (query: string) => Promise<string>;
  };
  debug?: boolean;
}

const DEFAULT_INTERCEPT_PATTERNS = [
  'memory_store',
  'memory_retrieve',
  'memory_search',
  'memory_delete',
  'memory_list',
  'memory_stats',
];

export class MemoryInterceptorServer {
  private server: Server;
  private config: InterceptorConfig;

  constructor(config: InterceptorConfig) {
    this.config = {
      interceptPatterns: DEFAULT_INTERCEPT_PATTERNS,
      passthrough: false,
      debug: false,
      ...config,
    };

    this.server = new Server(
      {
        name: "memory-interceptor",
        version: "3.0.0-alpha.1",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.error(`[MemoryInterceptor] ${message}`, ...args);
    }
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "memory_store",
            description: "Store a value in memory (intercepted)",
            inputSchema: {
              type: "object",
              properties: {
                key: { type: "string", description: "Memory key" },
                value: { description: "Value to store" },
                metadata: { type: "object", description: "Optional metadata" },
              },
              required: ["key", "value"],
            },
          },
          {
            name: "memory_retrieve",
            description: "Retrieve a value from memory (intercepted)",
            inputSchema: {
              type: "object",
              properties: {
                key: { type: "string", description: "Memory key" },
              },
              required: ["key"],
            },
          },
          {
            name: "memory_search",
            description: "Search memory by keyword (intercepted)",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Search query" },
                limit: { type: "number", description: "Result limit" },
              },
              required: ["query"],
            },
          },
          {
            name: "memory_delete",
            description: "Delete a memory entry (intercepted)",
            inputSchema: {
              type: "object",
              properties: {
                key: { type: "string", description: "Memory key" },
              },
              required: ["key"],
            },
          },
          {
            name: "memory_list",
            description: "List all memory entries (intercepted)",
            inputSchema: {
              type: "object",
              properties: {
                limit: { type: "number", description: "Result limit" },
                offset: { type: "number", description: "Result offset" },
              },
            },
          },
          {
            name: "memory_stats",
            description: "Get memory storage statistics (intercepted)",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      this.log(`Intercepted: ${name}`, args);

      try {
        switch (name) {
          case "memory_store":
            return await this.handleStore(args as { key: string; value: unknown; metadata?: Record<string, unknown> });

          case "memory_retrieve":
            return await this.handleRetrieve(args as { key: string });

          case "memory_search":
            return await this.handleSearch(args as { query: string; limit?: number });

          case "memory_delete":
            return await this.handleDelete(args as { key: string });

          case "memory_list":
            return await this.handleList(args as { limit?: number; offset?: number });

          case "memory_stats":
            return await this.handleStats();

          default:
            return {
              content: [{ type: "text", text: `Unknown tool: ${name}` }],
              isError: true,
            };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.log(`Error in ${name}:`, message);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        };
      }
    });
  }

  private async handleStore(args: { key: string; value: unknown; metadata?: Record<string, unknown> }) {
    let { key, value } = args;
    const { metadata } = args;

    // Apply beforeStore hook
    if (this.config.hooks?.beforeStore) {
      const result = await this.config.hooks.beforeStore(key, value);
      if (result === null) {
        return {
          content: [{ type: "text", text: `Store blocked by hook for key: ${key}` }],
        };
      }
      key = result.key;
      value = result.value;
    }

    await this.config.backend.store(key, value, metadata);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: true,
            key,
            backend: this.config.backend.name,
          }),
        },
      ],
    };
  }

  private async handleRetrieve(args: { key: string }) {
    let entry = await this.config.backend.retrieve(args.key);

    // Apply afterRetrieve hook
    if (this.config.hooks?.afterRetrieve) {
      entry = await this.config.hooks.afterRetrieve(entry);
    }

    if (!entry) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ found: false, key: args.key }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            found: true,
            key: entry.key,
            value: entry.value,
            metadata: entry.metadata,
            timestamp: entry.timestamp,
            backend: this.config.backend.name,
          }),
        },
      ],
    };
  }

  private async handleSearch(args: { query: string; limit?: number }) {
    let query = args.query;

    // Apply beforeSearch hook
    if (this.config.hooks?.beforeSearch) {
      query = await this.config.hooks.beforeSearch(query);
    }

    const results = await this.config.backend.search(query, { limit: args.limit });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            query,
            count: results.length,
            results: results.map(r => ({
              key: r.key,
              value: r.value,
              score: r.score,
            })),
            backend: this.config.backend.name,
          }),
        },
      ],
    };
  }

  private async handleDelete(args: { key: string }) {
    const deleted = await this.config.backend.delete(args.key);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            deleted,
            key: args.key,
            backend: this.config.backend.name,
          }),
        },
      ],
    };
  }

  private async handleList(args: { limit?: number; offset?: number }) {
    const entries = await this.config.backend.list(args);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            count: entries.length,
            entries: entries.map(e => ({
              key: e.key,
              value: e.value,
              timestamp: e.timestamp,
            })),
            backend: this.config.backend.name,
          }),
        },
      ],
    };
  }

  private async handleStats() {
    const stats = await this.config.backend.stats();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            ...stats,
            backend: this.config.backend.name,
            healthy: await this.config.backend.health(),
          }),
        },
      ],
    };
  }

  async start(): Promise<void> {
    await this.config.backend.init();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    this.log('Server started');
  }

  async stop(): Promise<void> {
    await this.config.backend.close();
    await this.server.close();
    this.log('Server stopped');
  }
}

// Quick start helper
export async function startInterceptor(options: {
  dbPath?: string;
  debug?: boolean;
}): Promise<MemoryInterceptorServer> {
  const backend = new SQLiteBackend({
    dbPath: options.dbPath || './memory-interceptor.db',
  });

  const server = new MemoryInterceptorServer({
    backend,
    debug: options.debug,
  });

  await server.start();
  return server;
}
