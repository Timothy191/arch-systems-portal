import os
import time
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed

class LLMCouncil:
    """
    LLM Council: Minor internal system for assisting and decision-making.
    Uses multiple models to answer, rank, and synthesize a final best response.
    """
    def __init__(self, query: str):
        self.query = query
        self.models = ["hermes", "omp", "cline", "qwen", "opencode", "agy"]
        self.chairman = "claude --model Kimi-l2.7-coding:cloud"
        self.responses = {}
        self.rankings = {}
        self.synthesis = ""

    def call_model(self, model: str, prompt: str) -> str:
        """Simulates an CLI call to the local/cloud agent orchestrators."""
        cmd = f"ollama launch {model}" if not "--model" in model else f"ollama launch {model}"
        print(f"[COUNCIL] Querying {model}...")
        try:
            env = os.environ.copy()
            env["AGENT_TASK"] = prompt
            result = subprocess.run(
                cmd,
                shell=True,
                text=True,
                env=env,
                capture_output=True,
                timeout=30
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
            else:
                return f"[No response or timeout from {model}]"
        except Exception as e:
            return f"[ERROR: {str(e)}]"

    def phase_1_individual_responses(self):
        print("\n--- PHASE 1: Independent Deliberation ---")
        prompt = f"Provide your best solution/response to the following query:\n{self.query}"
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(self.call_model, m, prompt): m for m in self.models}
            for future in as_completed(futures):
                model = futures[future]
                self.responses[model] = future.result()
        return self.responses

    def phase_2_ranking(self):
        print("\n--- PHASE 2: Cross-Model Ranking ---")
        # Anonymize responses
        anonymized = ""
        for i, (model, response) in enumerate(self.responses.items()):
            anonymized += f"=== Response {i+1} ===\n{response}\n\n"
            
        ranking_prompt = f"""Evaluate these responses to the query: {self.query}
{anonymized}
Rank the responses from BEST to WORST with a 1-sentence justification."""
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(self.call_model, m, ranking_prompt): m for m in self.models}
            for future in as_completed(futures):
                model = futures[future]
                self.rankings[model] = future.result()
        return self.rankings

    def phase_3_chairman_synthesis(self):
        print(f"\n--- PHASE 3: Chairman Synthesis ({self.chairman}) ---")
        synthesis_prompt = f"Original Query: {self.query}\n\n"
        for i, (model, response) in enumerate(self.responses.items()):
            synthesis_prompt += f"Response {i+1} ({model}):\n{response}\n\n"
        
        synthesis_prompt += "\nSynthesize the best possible definitive answer based on these perspectives and rankings."
        
        self.synthesis = self.call_model(self.chairman, synthesis_prompt)
        return self.synthesis

    def run_council(self):
        self.phase_1_individual_responses()
        self.phase_2_ranking()
        return self.phase_3_chairman_synthesis()

if __name__ == "__main__":
    test_query = "What is the optimal architectural pattern for a highly available NestJS telemetry service?"
    council = LLMCouncil(test_query)
    print("Final Synthesis:", council.run_council())
