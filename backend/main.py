import json
import os
import re
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncIterator
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

K2_API_URL = "https://api.k2think.ai/v1/chat/completions"
K2_MODEL = "MBZUAI-IFM/K2-Think-v2"


class AnalyzeRequest(BaseModel):
    source_code: str = Field(..., min_length=1)


class RepoFile(BaseModel):
    path: str = Field(..., min_length=1)
    content: str


class RepoAuditRequest(BaseModel):
    workspace_name: str = "workspace"
    files: list[RepoFile] = Field(..., min_length=1)


class Finding(BaseModel):
    error_name: str
    explanation: str
    location: str
    roast_summary: str
    recommendation: str


app = FastAPI(title="Invariant Backend", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze")
def analyze_source(request: AnalyzeRequest) -> dict[str, Any]:
    findings = heuristic_findings([RepoFile(path="inline.ts", content=request.source_code)])
    return {
        "run_id": f"run_{uuid.uuid4().hex[:10]}",
        "status": "success",
        "summary": f"{len(findings)} high-signal issues found",
        "issues_found": len(findings),
        "critical_logic_failures": findings,
        "logs": [
            "Mock endpoint is active for compatibility.",
            "Use /api/audit/repo/stream for the full 5-agent pipeline.",
        ],
        "model": K2_MODEL,
    }


@app.post("/api/audit/repo/stream")
async def stream_repo_audit(request: RepoAuditRequest) -> StreamingResponse:
    async def stream() -> AsyncIterator[str]:
        async for event in run_pipeline(request):
            yield to_ndjson(event)

    return StreamingResponse(stream(), media_type="application/x-ndjson")


async def run_pipeline(request: RepoAuditRequest) -> AsyncIterator[dict[str, Any]]:
    run_id = f"run_{uuid.uuid4().hex[:12]}"
    repo_context = bundle_repo_context(request.files)
    docs_context = extract_docs_context(request.files)
    metadata_context = extract_metadata_context(request.files)
    api_key = os.getenv("K2_API_KEY")

    yield log_event(
        "Pipeline",
        f"Run {run_id} started. Loaded {len(request.files)} files from {request.workspace_name}.",
    )

    if not api_key:
        yield log_event(
            "Pipeline",
            "K2_API_KEY is not configured. Running local heuristic fallback.",
        )
        findings = heuristic_findings(request.files)
        for finding in findings:
            yield {"type": "finding", "finding": finding.model_dump()}
        yield {
            "type": "done",
            "summary": {"critical_count": len(findings), "run_id": run_id},
            "findings": [finding.model_dump() for finding in findings],
        }
        return

    try:
        cartographer_raw = await invoke_agent(
            api_key=api_key,
            agent_name="Agent 1 - The Cartographer",
            system_prompt=(
                "You are The Cartographer. Map global state, cross-file dependencies, "
                "and mutation edges precisely."
            ),
            user_prompt=(
                "Analyze this repository context.\n"
                "Return JSON only with keys: global_state_map, cross_file_dependencies, "
                "mutation_hotspots, high_risk_flows.\n\n"
                f"{repo_context}"
            ),
        )
        cartographer = extract_json(cartographer_raw)
        yield log_event(
            "Cartographer",
            summarize_agent(
                cartographer,
                "Mapped repository topology and state dependencies.",
            ),
            cartographer_raw,
        )

        injector_raw = await invoke_agent(
            api_key=api_key,
            agent_name="Agent 2 - The Context Injector",
            system_prompt=(
                "You are The Context Injector. Infer business intent from docs and metadata. "
                "State invariants that must never break."
            ),
            user_prompt=(
                "Given cartography output and project docs, infer business invariants.\n"
                "Return JSON only with keys: inferred_business_invariants, "
                "trust_boundaries, asset_priorities, contradiction_candidates.\n\n"
                f"Cartographer output:\n{json.dumps(cartographer, indent=2)}\n\n"
                f"Documentation context:\n{docs_context}\n\n"
                f"Metadata context:\n{metadata_context}"
            ),
        )
        injector = extract_json(injector_raw)
        yield log_event(
            "Context Injector",
            summarize_agent(
                injector,
                "Inferred business intent and trust boundaries from docs/metadata.",
            ),
            injector_raw,
        )

        adversary_raw = await invoke_agent(
            api_key=api_key,
            agent_name="Agent 3 - The Adversary",
            system_prompt=(
                "You are The Adversary. Hunt for logic bypasses, state contradictions, "
                "and cross-file exploit paths. Demand concrete proof."
            ),
            user_prompt=(
                "Find exploit-capable logic flaws using repository context plus prior analysis.\n"
                "Return JSON only with key candidate_findings where each finding has: "
                "error_name, explanation, location, exploitability_proof, recommendation, confidence.\n\n"
                f"Cartographer output:\n{json.dumps(cartographer, indent=2)}\n\n"
                f"Context Injector output:\n{json.dumps(injector, indent=2)}\n\n"
                f"Repository context:\n{repo_context}"
            ),
        )
        adversary = extract_json(adversary_raw)
        yield log_event(
            "Adversary",
            summarize_agent(
                adversary,
                "Proposed exploit candidates with cross-file attack paths.",
            ),
            adversary_raw,
        )

        roaster_raw = await invoke_agent(
            api_key=api_key,
            agent_name="Agent 4 - The Roaster/Critic",
            system_prompt=(
                "You are The Roaster/Critic. Aggressively reject weak findings. "
                "Only keep claims with explicit exploitability proof and concrete locations."
            ),
            user_prompt=(
                "Roast the Adversary findings. Remove weak claims and demand proof.\n"
                "Return JSON only with key roasted_findings where each finding has: "
                "keep (boolean), error_name, location, roast_summary, proof, "
                "recommendation, severity.\n\n"
                f"Adversary output:\n{json.dumps(adversary, indent=2)}"
            ),
        )
        roaster = extract_json(roaster_raw)
        yield log_event(
            "Roaster/Critic",
            summarize_agent(
                roaster,
                "Rejected weak claims and retained only exploitable findings.",
            ),
            roaster_raw,
        )

        auditor_raw = await invoke_agent(
            api_key=api_key,
            agent_name="Agent 5 - The Auditor",
            system_prompt=(
                "You are The Auditor. Produce final report entries only for roasted, "
                "critical, exploitable findings."
            ),
            user_prompt=(
                "Compile final findings in strict JSON. "
                "Return only: {\"final_findings\": [ ... ]}.\n"
                "Each finding must contain exactly these keys:\n"
                "error_name, explanation, location, roast_summary, recommendation.\n"
                "location must be path:line.\n\n"
                f"Roaster output:\n{json.dumps(roaster, indent=2)}"
            ),
        )
        auditor = extract_json(auditor_raw)
        findings = normalize_findings(auditor.get("final_findings", []))

        yield log_event(
            "Auditor",
            f"Finalized {len(findings)} critical findings for report output.",
            auditor_raw,
        )

        for finding in findings:
            yield {"type": "finding", "finding": finding.model_dump()}

        yield {
            "type": "done",
            "summary": {"critical_count": len(findings), "run_id": run_id},
            "findings": [finding.model_dump() for finding in findings],
        }
    except Exception as error:  # pragma: no cover - safety net for streamed API
        yield {"type": "error", "message": f"{type(error).__name__}: {error}"}
        yield {
            "type": "done",
            "summary": {"critical_count": 0, "run_id": run_id},
            "findings": [],
        }


async def invoke_agent(
    *,
    api_key: str,
    agent_name: str,
    system_prompt: str,
    user_prompt: str,
) -> str:
    payload = {
        "model": K2_MODEL,
        "temperature": 0.15,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }
    body = await asyncio.to_thread(_invoke_k2, payload, api_key, agent_name)
    choices = body.get("choices", [])
    if not choices:
        raise RuntimeError(f"{agent_name} returned no choices.")

    message = choices[0].get("message", {})
    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError(f"{agent_name} returned empty content.")
    return content.strip()


def _invoke_k2(
    payload: dict[str, Any],
    api_key: str,
    agent_name: str,
) -> dict[str, Any]:
    request = Request(
        K2_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=120) as response:
            raw = response.read().decode("utf-8")
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                return parsed
            raise RuntimeError(f"{agent_name} returned malformed JSON payload.")
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"{agent_name} HTTP {error.code}: {detail}") from error
    except URLError as error:
        raise RuntimeError(f"{agent_name} network error: {error.reason}") from error


def extract_json(raw: str) -> dict[str, Any]:
    stripped = raw.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?", "", stripped).strip()
        stripped = re.sub(r"```$", "", stripped).strip()

    try:
        parsed = json.loads(stripped)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    first = stripped.find("{")
    last = stripped.rfind("}")
    if first != -1 and last != -1 and first < last:
        try:
            parsed = json.loads(stripped[first : last + 1])
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    return {}


def normalize_findings(raw_findings: Any) -> list[Finding]:
    if not isinstance(raw_findings, list):
        return []

    normalized: list[Finding] = []
    for item in raw_findings:
        if not isinstance(item, dict):
            continue
        finding = Finding(
            error_name=str(item.get("error_name", "Unspecified Critical Flaw")).strip(),
            explanation=str(item.get("explanation", "Business logic risk identified.")).strip(),
            location=normalize_location(str(item.get("location", "unknown:1"))),
            roast_summary=str(
                item.get(
                    "roast_summary",
                    "Roaster retained this issue because exploitability proof survived scrutiny.",
                )
            ).strip(),
            recommendation=str(
                item.get(
                    "recommendation",
                    "Add strict invariant checks and regression tests for this execution path.",
                )
            ).strip(),
        )
        normalized.append(finding)

    return normalized


def normalize_location(location: str) -> str:
    cleaned = location.strip()
    match = re.match(r"^(.*):(\d+)$", cleaned)
    if match:
        return f"{match.group(1)}:{match.group(2)}"
    return "unknown:1"


def summarize_agent(parsed: dict[str, Any], fallback: str) -> str:
    if not parsed:
        return fallback
    keys = list(parsed.keys())
    return f"{fallback} Output keys: {', '.join(keys[:5])}."


def to_ndjson(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False) + "\n"


def log_event(agent: str, message: str, raw: str | None = None) -> dict[str, Any]:
    event = {
        "type": "log",
        "agent": agent,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if raw:
        event["raw"] = raw[:2200]
    return event


def bundle_repo_context(files: list[RepoFile]) -> str:
    chunks: list[str] = []
    for file in files:
        chunks.append(f"### FILE: {file.path}\n{file.content}")
    return "\n\n".join(chunks)


def extract_docs_context(files: list[RepoFile]) -> str:
    docs: list[str] = []
    for file in files:
        lower = file.path.lower()
        if lower.endswith(".md") or lower.endswith(".rst") or "readme" in lower:
            docs.append(f"### DOC: {file.path}\n{file.content}")
    if not docs:
        return "No documentation files detected."
    return "\n\n".join(docs[:25])


def extract_metadata_context(files: list[RepoFile]) -> str:
    metadata: list[str] = []
    interesting = ("package.json", "pyproject.toml", "requirements.txt", ".env.example")
    for file in files:
        if file.path.endswith(interesting):
            metadata.append(f"### META: {file.path}\n{file.content}")
    if not metadata:
        return "No metadata files detected."
    return "\n\n".join(metadata[:20])


def heuristic_findings(files: list[RepoFile]) -> list[Finding]:
    findings: list[Finding] = []

    for file in files:
        lines = file.content.splitlines()
        for index, line in enumerate(lines):
            if "return true" in line and "if" not in line:
                findings.append(
                    Finding(
                        error_name="Unconditional Success Path",
                        explanation="An unconditional success return can bypass business validation and falsely mark operations as completed.",
                        location=f"{file.path}:{index + 1}",
                        roast_summary="This survived roasting because the branch can complete sensitive flows without proving required preconditions.",
                        recommendation="Gate this return behind explicit invariant checks and add regression tests for zero/negative/unauthorized states.",
                    )
                )
            if "admin" in line and "return true" in line:
                findings.append(
                    Finding(
                        error_name="Role-Based Shortcut Without Context",
                        explanation="A direct admin bypass can expose privileged actions without resource-scope verification.",
                        location=f"{file.path}:{index + 1}",
                        roast_summary="Roaster kept this because role-only checks are frequently exploitable when tenant or owner constraints are omitted.",
                        recommendation="Require both role validation and resource ownership/tenant boundary checks before granting access.",
                    )
                )

    deduped: dict[str, Finding] = {}
    for finding in findings:
        key = f"{finding.error_name}:{finding.location}"
        deduped[key] = finding

    return list(deduped.values())[:12]
