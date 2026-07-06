#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = process.env.AGENTIC_TOOLS_REPO_ROOT || path.resolve(__dirname, "../..");
const MEMORIES_DIR = path.join(REPO_ROOT, ".agentic-tools-mcp", "memories");
const TASKS_FILE = path.join(REPO_ROOT, ".agentic-tools-mcp", "tasks", "tasks.json");

async function ensureDirs() {
  await fs.mkdir(MEMORIES_DIR, { recursive: true });
  await fs.mkdir(path.dirname(TASKS_FILE), { recursive: true });
}

async function listMemoryFiles() {
  try {
    const entries = await fs.readdir(MEMORIES_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

async function readMemory(name) {
  const file = path.join(MEMORIES_DIR, name);
  if (!file.startsWith(MEMORIES_DIR)) throw new Error("Invalid memory name");
  try {
    return await fs.readFile(file, "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function writeMemory(name, content) {
  if (!/^[a-zA-Z0-9_-]+\.md$/.test(name)) {
    throw new Error("Memory name must be a safe .md filename");
  }
  const file = path.join(MEMORIES_DIR, name);
  await fs.writeFile(file, content, "utf-8");
}

async function searchMemories(query) {
  const files = await listMemoryFiles();
  const results = [];
  for (const name of files) {
    const content = await readMemory(name);
    if (content && content.toLowerCase().includes(query.toLowerCase())) {
      results.push(name);
    }
  }
  return results;
}

async function readTasks() {
  try {
    const raw = await fs.readFile(TASKS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return { projects: [], tasks: [], subtasks: [] };
    throw err;
  }
}

async function writeTasks(tasks) {
  await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf-8");
}

function sanitizeId(id) {
  if (typeof id !== "string" || !id) throw new Error("id must be a non-empty string");
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("id contains invalid characters");
  return id;
}

const server = new Server(
  { name: "agentic-tools-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "agentic_list_memories",
      description: "List all memory markdown files in the project memory store.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "agentic_read_memory",
      description: "Read the full contents of a memory markdown file by name.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Memory filename, e.g. 001-project-structure.md" },
        },
        required: ["name"],
      },
    },
    {
      name: "agentic_search_memories",
      description: "Search memory contents for a keyword or phrase (case-insensitive).",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keyword or phrase to search for" },
        },
        required: ["query"],
      },
    },
    {
      name: "agentic_create_memory",
      description: "Create or overwrite a memory markdown file. Use safe kebab-case filenames ending in .md.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Memory filename, e.g. 007-new-decision.md" },
          content: { type: "string", description: "Markdown content" },
        },
        required: ["name", "content"],
      },
    },
    {
      name: "agentic_update_memory",
      description: "Append a section to an existing memory markdown file. Creates the file if it does not exist.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Memory filename" },
          section: { type: "string", description: "Markdown section to append" },
        },
        required: ["name", "section"],
      },
    },
    {
      name: "agentic_list_tasks",
      description: "List all projects, tasks, and subtasks in the task store.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "agentic_create_task",
      description: "Create a new project, task, or subtask. Provide the entity type and object fields.",
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["project", "task", "subtask"], description: "Entity type" },
          data: { type: "object", description: "Entity fields (must include id)" },
        },
        required: ["type", "data"],
      },
    },
    {
      name: "agentic_update_task",
      description: "Update an existing task or subtask by id.",
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["task", "subtask"], description: "Entity type" },
          id: { type: "string", description: "Entity id" },
          updates: { type: "object", description: "Fields to merge" },
        },
        required: ["type", "id", "updates"],
      },
    },
    {
      name: "agentic_delete_task",
      description: "Delete a project, task, or subtask by id.",
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["project", "task", "subtask"], description: "Entity type" },
          id: { type: "string", description: "Entity id" },
        },
        required: ["type", "id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "agentic_list_memories": {
        const files = await listMemoryFiles();
        return { content: [{ type: "text", text: JSON.stringify(files, null, 2) }] };
      }

      case "agentic_read_memory": {
        const content = await readMemory(args.name);
        if (content === null) {
          return { content: [{ type: "text", text: `Memory '${args.name}' not found.` }] };
        }
        return { content: [{ type: "text", text: content }] };
      }

      case "agentic_search_memories": {
        const matches = await searchMemories(args.query);
        return { content: [{ type: "text", text: JSON.stringify(matches, null, 2) }] };
      }

      case "agentic_create_memory": {
        await writeMemory(args.name, args.content);
        return { content: [{ type: "text", text: `Created/updated memory '${args.name}'.` }] };
      }

      case "agentic_update_memory": {
        const existing = (await readMemory(args.name)) || "";
        const separator = existing.endsWith("\n") ? "" : "\n";
        const updated = `${existing}${separator}\n${args.section}\n`;
        await writeMemory(args.name, updated);
        return { content: [{ type: "text", text: `Updated memory '${args.name}'.` }] };
      }

      case "agentic_list_tasks": {
        const tasks = await readTasks();
        return { content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }] };
      }

      case "agentic_create_task": {
        const tasks = await readTasks();
        const id = sanitizeId(args.data.id);
        const collection = `${args.type}s`;
        if (!Array.isArray(tasks[collection])) tasks[collection] = [];
        const existingIndex = tasks[collection].findIndex((t) => t.id === id);
        if (existingIndex >= 0) {
          tasks[collection][existingIndex] = { ...tasks[collection][existingIndex], ...args.data };
        } else {
          tasks[collection].push(args.data);
        }
        await writeTasks(tasks);
        return { content: [{ type: "text", text: `Created/updated ${args.type} '${id}'.` }] };
      }

      case "agentic_update_task": {
        const tasks = await readTasks();
        const collection = `${args.type}s`;
        if (!Array.isArray(tasks[collection])) tasks[collection] = [];
        const index = tasks[collection].findIndex((t) => t.id === sanitizeId(args.id));
        if (index < 0) {
          return { content: [{ type: "text", text: `${args.type} '${args.id}' not found.` }] };
        }
        tasks[collection][index] = { ...tasks[collection][index], ...args.updates };
        await writeTasks(tasks);
        return { content: [{ type: "text", text: `Updated ${args.type} '${args.id}'.` }] };
      }

      case "agentic_delete_task": {
        const tasks = await readTasks();
        const collection = `${args.type}s`;
        if (!Array.isArray(tasks[collection])) tasks[collection] = [];
        tasks[collection] = tasks[collection].filter((t) => t.id !== sanitizeId(args.id));
        await writeTasks(tasks);
        return { content: [{ type: "text", text: `Deleted ${args.type} '${args.id}'.` }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

async function main() {
  await ensureDirs();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("agentic-tools-mcp running on stdio");

  const shutdown = async () => {
    console.error("Shutting down agentic-tools-mcp...");
    await server.close().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
