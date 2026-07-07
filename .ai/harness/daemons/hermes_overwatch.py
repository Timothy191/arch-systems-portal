import os
import sys
import time
import subprocess
from pathlib import Path

# Paths
WORKSPACE_ROOT = Path(os.getcwd())
LOG_FILE = WORKSPACE_ROOT / "apps/api/logs/app.log" # Assuming a standard log file location or we can use docker logs
EVENTS_DIR = WORKSPACE_ROOT / ".ai/events"
HERMES_EVENTS = EVENTS_DIR / "hermes_flags"

class HermesOverwatch:
    def __init__(self, poll_interval: int = 10):
        self.poll_interval = poll_interval
        self.running = False
        self.last_position = 0
        
        HERMES_EVENTS.mkdir(parents=True, exist_ok=True)
        
        # In a real scenario, we'd ensure the log file exists. If it doesn't, we wait.
        if LOG_FILE.exists():
            self.last_position = LOG_FILE.stat().st_size

    def monitor_logs(self):
        if not LOG_FILE.exists():
            return
            
        current_size = LOG_FILE.stat().st_size
        if current_size < self.last_position:
            # Log rotated
            self.last_position = 0
            
        if current_size == self.last_position:
            return
            
        with open(LOG_FILE, 'r') as f:
            f.seek(self.last_position)
            new_logs = f.read()
            self.last_position = f.tell()
            
        self.analyze_for_anomalies(new_logs)

    def analyze_for_anomalies(self, logs: str):
        # Hermes local filter: look for keywords that require overwatch
        keywords = ["ERROR", "WARN", "Exception", "Timeout", "Unauthorized", "Anomaly"]
        flagged = []
        
        for line in logs.splitlines():
            if any(k.upper() in line.upper() for k in keywords):
                flagged.append(line)
                
        if flagged:
            print(f"[HERMES_OVERWATCH] Flagged {len(flagged)} anomalous log entries. Triggering Hermes...")
            self.delegate_to_hermes("\n".join(flagged[:10])) # send up to 10 lines

    def delegate_to_hermes(self, context: str):
        task = f"Hermes Overwatch: Review the following flagged logs for anomalies, verify intent, and delegate to maintenance if needed:\n{context}"
        
        # Use Hermes directly as requested
        command = 'ollama launch claude --model hermes'
        
        print(f"[HERMES_OVERWATCH] Delegating to Hermes via: {command}")
        try:
            env = os.environ.copy()
            env["AGENT_TASK"] = task
            
            result = subprocess.run(
                command,
                shell=True,
                text=True,
                env=env,
                capture_output=True,
                timeout=15 # fast timeout for non-blocking
            )
            if result.returncode == 0:
                print("[HERMES_OVERWATCH] Hermes successfully processed the anomalies.")
            else:
                print(f"[HERMES_OVERWATCH] Hermes unavailable or busy. Output: {result.stderr.strip()[:100]}")
        except Exception as e:
            print(f"[HERMES_OVERWATCH] Failed to wake Hermes: {e}")

    def run(self):
        self.running = True
        print("[HERMES_OVERWATCH] Hermes Overwatch active. Monitoring logs...")
        while self.running:
            try:
                self.monitor_logs()
                time.sleep(self.poll_interval)
            except KeyboardInterrupt:
                self.running = False
            except Exception as e:
                print(f"[HERMES_OVERWATCH] Critical error: {e}")
                time.sleep(self.poll_interval)

if __name__ == "__main__":
    overwatch = HermesOverwatch()
    # In test mode, just run once
    overwatch.monitor_logs()
