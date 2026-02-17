const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type CriticalLogicFailure = {
  title: string;
  description: string;
  severity: "HIGH" | "MED" | "LOW";
  line: number;
  evidence: string;
};

export type AnalyzeResponse = {
  run_id: string;
  status: string;
  summary: string;
  issues_found: number;
  model: string;
  critical_logic_failures?: CriticalLogicFailure[];
};

export async function analyzeInvariantSource(sourceCode: string): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_code: sourceCode,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Analyze request failed (${response.status})`);
  }

  return response.json() as Promise<AnalyzeResponse>;
}
