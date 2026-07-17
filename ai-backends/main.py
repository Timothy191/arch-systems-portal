import os
import subprocess
import psutil
import shutil
import platform
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

app = FastAPI(
    title="AI Backends Local OS Integration Server",
    description="A secure local API bridge that exposes OS core information and utilities to AI models.",
    version="1.0.0"
)

# Base path for workspace operations
WORKSPACE_DIR = os.getenv("WORKSPACE_DIR", "/workspace")

class CommandRequest(BaseModel):
    command: str
    timeout: Optional[int] = 30

class FileWriteRequest(BaseModel):
    filepath: str
    content: str
    overwrite: Optional[bool] = False

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": platform.system(),
        "release": platform.release(),
        "machine": platform.machine(),
        "python_version": platform.python_version()
    }

@app.get("/system/metrics")
def get_system_metrics():
    """Retrieve current host system resource usage metrics."""
    try:
        cpu_pct = psutil.cpu_percent(interval=0.5)
        cpu_cores = psutil.cpu_count(logical=True)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage(WORKSPACE_DIR)
        
        # CPU Temp (if available)
        cpu_temp = None
        if hasattr(psutil, "sensors_temperatures"):
            temps = psutil.sensors_temperatures()
            if "coretemp" in temps:
                cpu_temp = [t.current for t in temps["coretemp"]]
        
        return {
            "cpu": {
                "utilization_pct": cpu_pct,
                "cores": cpu_cores,
                "temperatures": cpu_temp
            },
            "memory": {
                "total_bytes": memory.total,
                "available_bytes": memory.available,
                "used_bytes": memory.used,
                "utilization_pct": memory.percent
            },
            "disk": {
                "total_bytes": disk.total,
                "used_bytes": disk.used,
                "free_bytes": disk.free,
                "utilization_pct": disk.percent
            },
            "load_average": os.getloadavg() if hasattr(os, "getloadavg") else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch system metrics: {str(e)}")

@app.get("/system/processes")
def get_processes(limit: int = Query(default=10, ge=1, le=100)):
    """List running processes ordered by CPU memory utilization."""
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent']):
        try:
            processes.append(proc.info)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    
    # Sort by cpu_percent descending
    processes.sort(key=lambda x: x.get('cpu_percent') or 0, reverse=True)
    return processes[:limit]

@app.post("/terminal/run")
def run_command(request: CommandRequest):
    """Execute a shell command inside the workspace directory."""
    # Safety Check: Prevent directory traversal or running command outside WORKSPACE_DIR
    if not os.path.exists(WORKSPACE_DIR):
        os.makedirs(WORKSPACE_DIR, exist_ok=True)
    
    # We execute commands in the mounted /workspace directory to avoid modifying container filesystems
    try:
        result = subprocess.run(
            request.command,
            shell=True,
            cwd=WORKSPACE_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=request.timeout
        )
        return {
            "exit_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail=f"Command execution timed out after {request.timeout} seconds")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run command: {str(e)}")

@app.get("/workspace/list")
def list_workspace(path: str = "."):
    """List contents of the workspace directory relative to the mount point."""
    target_path = os.path.abspath(os.path.join(WORKSPACE_DIR, path))
    
    # Safety Check: Ensure the target path is inside workspace
    if not target_path.startswith(os.path.abspath(WORKSPACE_DIR)):
        raise HTTPException(status_code=403, detail="Access denied: Path is outside workspace directory")
        
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="Directory not found")
        
    try:
        items = []
        for name in os.listdir(target_path):
            item_path = os.path.join(target_path, name)
            stat = os.stat(item_path)
            items.append({
                "name": name,
                "is_dir": os.path.isdir(item_path),
                "size_bytes": stat.st_size,
                "modified_time": stat.st_mtime
            })
        return {"path": path, "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workspace/read")
def read_workspace_file(filepath: str):
    """Read contents of a file within the workspace directory."""
    target_path = os.path.abspath(os.path.join(WORKSPACE_DIR, filepath))
    
    if not target_path.startswith(os.path.abspath(WORKSPACE_DIR)):
        raise HTTPException(status_code=403, detail="Access denied: Path is outside workspace directory")
        
    if not os.path.isfile(target_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    try:
        with open(target_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return {"filepath": filepath, "content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/workspace/write")
def write_workspace_file(request: FileWriteRequest):
    """Write or overwrite a file within the workspace directory."""
    target_path = os.path.abspath(os.path.join(WORKSPACE_DIR, request.filepath))
    
    if not target_path.startswith(os.path.abspath(WORKSPACE_DIR)):
        raise HTTPException(status_code=403, detail="Access denied: Path is outside workspace directory")
        
    if os.path.exists(target_path) and not request.overwrite:
        raise HTTPException(status_code=409, detail="File already exists and overwrite is disabled")
        
    try:
        # Create directories if they do not exist
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(request.content)
        return {"status": "success", "filepath": request.filepath}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
