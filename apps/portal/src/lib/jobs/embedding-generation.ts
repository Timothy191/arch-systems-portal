import { InngestFunction } from "inngest";
import { inngest, aiGenerateEmbeddingEvent } from "@repo/utils/inngest";
// Module stubs for type safety - embeddings module not yet created
async function generateEmbedding(_text: string, _userId: string): Promise<void> {
  // Stub: embedding service not yet configured
}
async function batchGenerateEmbeddings(_texts: string[], _userId: string): Promise<void> {
  // Stub: embedding service not yet configured
}
import { logError } from "@/lib/errors/error-logger";
import { recordJobExecution } from "@/lib/observability/metrics";
export const generateEmbeddingFn = inngest.createFunction(
  { id: "generate-embedding", triggers: [{ event: aiGenerateEmbeddingEvent }] },
  async ({ event }) => {
    const { text, texts, userId } = event.data;
    const start = performance.now();
    let success = true;

    try {
      if (Array.isArray(texts)) {
        await batchGenerateEmbeddings(texts, userId);
      } else if (typeof text === "string" && text.trim() !== "") {
        await generateEmbedding(text, userId);
      }
      return { success: true };
    } catch (err) {
      success = false;
      logError(err instanceof Error ? err : new Error(String(err)), {
        context: "generate_embedding_job",
        userId,
        hasText: !!text,
        hasTexts: !!texts,
      });
      throw err;
    } finally {
      recordJobExecution("generate-embedding", performance.now() - start, success);
    }
  }
) as unknown as InngestFunction.Any;
