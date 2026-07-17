# AI Backends Local OS Integration Server

This is a local running server designed to run within a Docker container or natively on the host OS. It bridges OS-level capabilities (diagnostics, process metrics, shell runner, workspace file access) to AI models/agent frameworks.

## Project Structure
- `Dockerfile`: Multi-stage setup building a slim Python environment with monitoring tools.
- `docker-compose.yml`: Mounts workspace files and host sockets.
- `main.py`: FastAPI server exposing system metrics and workspace utilities.
- `requirements.txt`: Package dependencies.

---

## 🚀 Getting Started

### 1. Build the Docker Image
To build the Docker image, run the following command in this directory:
```bash
docker build -t ai-backends .
```

### 2. Run the Container
You can run it using Docker Compose or standard docker commands.

#### Option A: Using Docker Compose (Recommended)
```bash
docker compose up -d
```

#### Option B: Using standard Docker CLI
```bash
docker run -d \
  -p 8000:8000 \
  -v /home/timothy/Projects:/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --name ai-backends-server \
  ai-backends
```

---

## 🔒 Security Best Practices

> [!WARNING]
> This server allows executing terminal commands via `/terminal/run`. It must **never** be exposed to the public internet. Ensure it binds only to `127.0.0.1` or remains in a closed Docker bridge network.

1. **Localhost Only**: If binding to the host, use `127.0.0.1:8000:8000` to prevent external requests.
2. **Read-Only Volumes**: If the AI should only read workspace files, change the volume mount in `docker-compose.yml` to read-only mode: `/home/timothy/Projects:/workspace:ro`.
3. **Restricted Shell**: Customize the shell executed in `subprocess.run` inside `main.py` if finer permissions are needed.

---

## 🛠️ API Reference

- `GET /`: Get server status and basic platform info.
- `GET /system/metrics`: Retrieve host CPU, Memory, Disk, and Load averages.
- `GET /system/processes`: List running processes sorted by resource consumption.
- `POST /terminal/run`: Execute a shell command inside the `/workspace` directory.
- `GET /workspace/list`: List files and directories within `/workspace`.
- `GET /workspace/read`: Read a specific file's content.
- `POST /workspace/write`: Write or overwrite a file.
