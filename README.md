# Invariant VS Code Extension (K2 Think V2)

Invariant is a VS Code sidebar extension that audits an entire repository using a 5-agent reasoning pipeline:

1. Cartographer
2. Context Injector
3. Adversary
4. Roaster/Critic
5. Auditor

The extension streams live agent debate logs and outputs critical findings in strict format.

## Architecture

- `extension/`: VS Code extension host (TypeScript)
- `src/`: React sidebar webview UI
- `backend/`: FastAPI service that calls K2 Think V2
- `playgrounds/buggy-fintech/`: intentionally vulnerable sample repo for testing

## Prerequisites

- Node.js 18+
- Python 3.11+
- VS Code 1.90+

## One-word commands

From repo root:

```bash
./ok
./web
./ext
./up
./check
```

- `./ok` validates backend imports + compile + web build + extension compile.
- `./web` builds the React webview bundle.
- `./ext` compiles the VS Code extension host.
- `./up` starts backend on `127.0.0.1:8000`.
- `./check` validates Python deps, backend health, frontend build, extension compile.

Hot reload option:

```bash
RELOAD=1 ./up
```

## 1. Configure API key

Do not hardcode your key in source files. Set it as an environment variable before running backend:

```bash
export K2_API_KEY="YOUR_K2_API_KEY"
```

Optional test call:

```bash
curl -X POST \
  "https://api.k2think.ai/v1/chat/completions" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $K2_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "MBZUAI-IFM/K2-Think-v2",
    "messages": [{"role":"user","content":"hi there"}],
    "stream": true
  }'
```

## 2. Run backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

## 3. Build sidebar webview bundle

From repo root:

```bash
npm install
npm run build
```

This generates `dist/` assets used by the extension webview.

## 4. Build and run extension

```bash
cd extension
npm install
npm run compile
```

Then:

1. Open `extension/` in VS Code.
2. Press `F5` to launch an Extension Development Host window.
3. In the host window, open the target repo folder you want to audit.
4. Open the Invariant activity bar icon and click `Run Full Audit`.

## 5. Using editor integration

From findings in sidebar:

- `Highlight` jumps to `path:line` and highlights the line.
- `Apply Fix to Editor` applies replacement text at the finding location.

Available commands:

- `Invariant: Run Full Repository Audit`
- `Invariant: Highlight Finding Location`
- `Invariant: Apply Code Fix`

## 6. Backend and extension config

VS Code settings:

- `invariant.backendUrl` (default `http://127.0.0.1:8000`)
- `invariant.maxFiles` (default `6000`)

## 7. Strict output format

Final findings are rendered as:

```text
CRITICAL: [Error Name]

EXPLANATION: [One sentence business risk]

LOCATION: [Path:Line]

ROAST SUMMARY: [Why this was a sophisticated find]

RECOMMENDATION: [Fix plan]
```

## 8. Test with intentionally vulnerable sample repo

Use this folder:

```bash
cd /Users/mohamed.abdalla/Documents/Spiring26/Hackathons/K2/playgrounds/buggy-fintech
```

Then open that folder in the Extension Development Host and run Invariant.

## Troubleshooting

- If sidebar shows backend error: verify backend is running on port `8000`.
- If no K2 results: verify `K2_API_KEY` is exported in backend shell.
- If webview is blank: run `npm run build` again from repo root.
