# Free-Tier Providers (Priority Order)

| Rank | Provider        | Free Tier      | CC Needed | Speed           | Best For                   | Key Pool |
| ---- | --------------- | -------------- | --------- | --------------- | -------------------------- | -------- |
| 1    | **Groq**        | ✅ Full        | ❌        | ⚡ Fastest      | Low-latency, voice, agents | ❌       |
| 2    | **Cerebras**    | ✅ ~1M/day     | ❌        | ⚡ Very fast    | High-throughput, agentic   | ❌       |
| 3    | **Gemini**      | ✅ Gen'ous     | ❌        | 🏃 Fast         | Multimodal, high context   | ❌       |
| 4    | **Mistral**     | ✅ ~1B/mo      | ❌        | 🏃 Fast         | Coding, high volume        | ❌       |
| 5    | **OpenRouter**  | ✅ Limited     | ❌        | ⏳ Varies       | Model variety, failover    | ✅ 50+   |
| 6    | **DeepSeek**    | ✅ ~500/d      | ❌        | 🏃 Fast         | Coding, reasoning          | ❌       |
| 7    | **Ollama**      | ✅ Local/Cloud | ❌        | 🏃 Fast         | Local + ollama.com cloud   | ❌       |
| 8    | **HuggingFace** | ✅ 100/h       | ❌        | 🐢 Rate-limited | Prototyping, open models   | ❌       |
| 9    | **OpenCode**    | ? TBD          | ?         | ❓ Unknown      | —                          | ❌       |
| 10   | **AIHubMix**    | ✅ Free        | ❌        | ❓ Unknown      | —                          | ❌       |
| 11   | **Venice**      | ✅ Free        | ❌        | ❓ Unknown      | Privacy-first              | ❌       |
| 12   | **Cohere**      | ⚠️ Trial       | ❌        | 🏃 Moderate     | RAG, embeddings            | ❌       |

## Paid-Only Providers (Fallback)

| Provider               | CC Needed | Best For                          |
| ---------------------- | --------- | --------------------------------- |
| **Anthropic (Claude)** | ✅        | Reasoning, coding, analysis       |
| **Perplexity**         | ✅        | Web-search augmented generation   |
| **Together AI**        | ✅        | Production inference, fine-tuning |

## Agent-to-Provider Recommendations

| Agent Role             | Recommended Providers      | Why                     |
| ---------------------- | -------------------------- | ----------------------- |
| fullstack-nextjs-pro   | Groq, Cerebras, OpenRouter | Coding + reasoning      |
| backend-nestjs-pro     | Groq, DeepSeek, Mistral    | Code generation         |
| frontend-ui-pro        | Groq, Gemini, OpenRouter   | UI + fast iteration     |
| devops-ci-pro          | Groq, Cerebras             | Fast tooling, scripting |
| architect-pro          | OpenRouter, Anthropic      | Complex reasoning       |
| security-pro           | OpenRouter, Gemini         | Security analysis       |
| fast-outliner          | Groq, OpenRouter           | Fast outlines           |
| frontend-design        | Gemini, OpenRouter         | Visual reasoning        |
| frontend-implementer   | Groq, Cerebras             | Fast code generation    |
| sceptic                | OpenRouter, Anthropic      | Deep analysis           |
| ai-maintenance-checker | Groq, OpenRouter           | Lightweight checks      |
