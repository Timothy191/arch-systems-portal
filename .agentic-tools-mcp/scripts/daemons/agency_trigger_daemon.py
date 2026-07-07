import os
import sys
import json
import time
import shutil
import subprocess
from pathlib import Path

# Paths
WORKSPACE_ROOT = Path(os.getcwd())
EVENTS_DIR = WORKSPACE_ROOT / ".ai/events"
PENDING_EVENTS_DIR = EVENTS_DIR / "pending"
PROCESSED_EVENTS_DIR = EVENTS_DIR / "processed"

class AgencyTriggerDaemon:
    def __init__(self, poll_interval: int = 15):
        self.poll_interval = poll_interval
        self.running = False
        
        # Ensure event directories exist
        PENDING_EVENTS_DIR.mkdir(parents=True, exist_ok=True)
        PROCESSED_EVENTS_DIR.mkdir(parents=True, exist_ok=True)

    def check_infrastructure_events(self):
        """Reads JSON event files from the Node.js / NestJS webhooks and delegates actions."""
        if not PENDING_EVENTS_DIR.exists():
            return
            
        for event_file in PENDING_EVENTS_DIR.glob("*.json"):
            try:
                with open(event_file, 'r') as f:
                    payload = json.load(f)
                
                trigger_type = payload.get("triggerType", "UNKNOWN")
                severity = payload.get("severity", "unknown")
                context = payload.get("context", {})
                
                print(f"[TRIGGER_DAEMON] Caught Infrastructure Event: {trigger_type} ({severity})")
                
                task = f"Analyze event {trigger_type}. Context: {json.dumps(context)}"
                self.wake_agency(task=task)
                    
                # Move to processed
                shutil.move(str(event_file), str(PROCESSED_EVENTS_DIR / event_file.name))
            except Exception as e:
                print(f"[TRIGGER_DAEMON] Failed to process event {event_file.name}: {e}")
                shutil.move(str(event_file), str(PROCESSED_EVENTS_DIR / event_file.name))

    def wake_agency(self, task: str):
        # Fallback chain defined by the user
        fallbacks = [
            'ollama launch claude --model Kimi-l2.7-coding:cloud && hermes',
            'omp',
            'cline',
            'qwen',
            'opencode',
            'agy'
        ]
        
        print(f"[TRIGGER_DAEMON] Waking agency for task: {task[:50]}...")
        
        for command in fallbacks:
            print(f"[TRIGGER_DAEMON] Attempting model launch sequence: {command}")
            try:
                # We inject the task as an environment variable so the agent can read it
                env = os.environ.copy()
                env["AGENT_TASK"] = task
                
                # Execute the agent runner
                result = subprocess.run(
                    command,
                    shell=True,
                    text=True,
                    env=env,
                    capture_output=True,
                    timeout=10 # Reduced timeout so fallback chain proceeds quickly if command doesn't exist
                )
                
                if result.returncode == 0:
                    print(f"[TRIGGER_DAEMON] Successfully launched agent using: {command}")
                    return True
                else:
                    print(f"[TRIGGER_DAEMON] Failed with {command}. Output: {result.stderr.strip()[:100]}... Trying next fallback...")
            except Exception as e:
                print(f"[TRIGGER_DAEMON] Command {command} threw exception: {e}. Trying next...")
                
        print("[TRIGGER_DAEMON] All agent fallback launches failed.")
        return False

    def run(self):
        self.running = True
        print("[TRIGGER_DAEMON] Starting polling loop...")
        while self.running:
            try:
                self.check_infrastructure_events()
                time.sleep(self.poll_interval)
            except KeyboardInterrupt:
                self.running = False
            except Exception as e:
                print(f"[TRIGGER_DAEMON] Critical error in loop: {e}")
                time.sleep(self.poll_interval)

if __name__ == "__main__":
    daemon = AgencyTriggerDaemon()
    # In test mode we just check once if not actively polling
    daemon.check_infrastructure_events()
