# AI Agents Microservice

This service orchestrates autonomous multi-agent workflows using CrewAI and LangGraph.

## Responsibilities

- **LangGraph**: Defines deterministic, stateful cognitive workflows (e.g., standard incident response triaging).
- **CrewAI**: Provides exploratory multi-agent collaboration environments for complex analytical queries.
- **MCP Integration**: Connects to the primary NestJS API to perform system actions on behalf of the user securely.

## Development

Requires Python 3.11+.

```bash
uv venv
source .venv/bin/activate
uv pip install -e .
```
