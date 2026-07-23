import { generateLocalFallbackEmbedding, getBatchEmbeddings } from './embedding-provider'

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    const valA = a[i] ?? 0
    const valB = b[i] ?? 0
    dot += valA * valB
    normA += valA * valA
    normB += valB * valB
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

describe('RAG Subsystem Performance & Vector Similarity Benchmark', () => {
  it('benchmarks 1536-dimensional vector generation latency (< 5ms per query)', async () => {
    const iterations = 100
    const start = performance.now()

    for (let i = 0; i < iterations; i++) {
      generateLocalFallbackEmbedding(`synthetic query string payload iteration #${i}`)
    }

    const elapsed = performance.now() - start
    const avgMs = elapsed / iterations

    console.log(`[RAG Benchmark] Average 1536d Vector Generation Latency: ${avgMs.toFixed(3)}ms`)
    expect(avgMs).toBeLessThan(5.0) // Must generate vectors under 5ms
  })

  it('benchmarks cosine similarity retrieval match precision and scoring', () => {
    const queryVec = generateLocalFallbackEmbedding('safety compliance audit report')
    const matchVec = generateLocalFallbackEmbedding('safety compliance audit report')
    const distinctVec = generateLocalFallbackEmbedding('unrelated machine maintenance log')

    const selfSim = cosineSimilarity(queryVec, matchVec)
    const diffSim = cosineSimilarity(queryVec, distinctVec)

    console.log(`[RAG Benchmark] Self Similarity Score: ${selfSim.toFixed(4)}`)
    console.log(`[RAG Benchmark] Distinct Similarity Score: ${diffSim.toFixed(4)}`)

    expect(selfSim).toBeGreaterThan(0.99) // Exact match vector similarity ~ 1.0
    expect(diffSim).toBeLessThan(selfSim) // Distinct vectors must score significantly lower
  })

  it('benchmarks batch vector embedding retrieval throughput', async () => {
    const batchTexts = Array.from({ length: 50 }, (_, i) => `batch text item #${i}`)
    const start = performance.now()

    const results = await getBatchEmbeddings(batchTexts)
    const elapsed = performance.now() - start

    console.log(
      `[RAG Benchmark] Batch 50 Vector Embedding Generation Latency: ${elapsed.toFixed(2)}ms`
    )

    expect(results.length).toBe(50)
    expect(results[0]?.embedding.length).toBe(1536)
    expect(elapsed).toBeLessThan(1500) // 50 embeddings in < 1.5 seconds
  })
})
