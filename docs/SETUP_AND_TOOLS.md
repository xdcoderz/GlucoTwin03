# Setup, Tools and Accounts

## Tools to install

| Tool | Why | Needed for demo? |
|---|---|---|
| Docker Desktop with Compose v2 | Runs the stack | Yes, for the Compose path |
| Git | Clone and publish the repository | Yes, for submission |
| Node and npm | Run React outside Docker | Optional for development |
| JDK and Maven/Gradle | Run Spring Boot outside Docker | Optional for development |
| Python and pip | Run FastAPI and the replay publisher outside Docker | Optional for development |
| OBS Studio or OS screen recorder | Backup demo video | Recommended |
| PowerPoint or LibreOffice | Pitch deck and PDF export | Yes, for the presentation |

The service code and Compose file are in place. Confirm exact published ports against `compose.yaml`; the current development mappings are dashboard 3000 and Spring Boot 8080. FastAPI is internal to the Compose network.

## Accounts

| Account | Why | Cost |
|---|---|---|
| GitHub | Public repository | Free |
| Docker Hub | Not required; images build locally | n/a |
| Cloud/API keys | None expected; the prototype uses local services | n/a |

## Ports (fill in after Compose is defined)

| Service | Port |
|---|---|
| Dashboard | `3000` |
| Spring Boot | `8080` |
| FastAPI | Internal only unless local debugging needs a host port |
| CGM replay publisher | No host port; sends HTTP events to Spring Boot |

## Run

```bash
docker compose up --build
docker compose down
```

The dashboard is at `http://localhost:3000`; Spring is available at `http://localhost:8080`. FastAPI is internal to Compose. Use `docker compose logs spring ml-service cgm-publisher` when diagnosing startup or replay issues.

## Offline demo

```bash
docker compose build
docker save -o glucotwin-images.tar $(docker compose config --images)
# on the demo machine:
docker load -i glucotwin-images.tar
docker compose up
```

The verified October 30 build archive is at `D:\3Nov\deliverables\glucotwin-images.tar` (357,423,104 bytes; SHA-256 `4BD62A1452CC9F5668DDE1370C47FB3C8FD52AAF186EBE2BDED192135D5A7E56`). It is intentionally ignored by Git. Regenerate and re-hash it whenever image contents change, then copy it to the demo backup location.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Dashboard blank | Backend not ready | Wait for health checks; inspect Spring logs |
| Port already in use | Another app uses the host port | Change the host port in Compose |
| No CGM updates | Replay publisher stopped or ingestion failed | Inspect publisher and Spring logs; confirm the HTTP ingestion route |
| Always “unavailable” | Model service or model artifact failed | Inspect FastAPI logs; check artifact path and metadata |
| Slow first start | Images are building | Pre-build before the demo |
| Push rejected for large file | Artifact exceeds GitHub's file limit | Check artifact size; use Git LFS if needed |



