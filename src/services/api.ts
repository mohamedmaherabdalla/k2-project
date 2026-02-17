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

export type DynamicScanStreamEvent =
  | {
      type: "run_start";
      run_id: string;
      filename: string;
      timestamp: string;
    }
  | {
      type: "agent_status";
      agent: string;
      status: "running" | "done";
    }
  | {
      type: "log";
      agent: string;
      message: string;
      timestamp?: string;
      raw?: string;
    }
  | {
      type: "token";
      content: string;
    }
  | {
      type: "error";
      message: string;
    }
  | {
      type: "done";
      run_id: string;
      analysis_text: string;
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

export async function streamDynamicScan(
  request: {
    code: string;
    filename: string;
    focusPrompt?: string;
  },
  options: {
    onEvent: (event: DynamicScanStreamEvent) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/scan/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: request.code,
      filename: request.filename,
      focus_prompt: request.focusPrompt,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Scan request failed (${response.status})`);
  }

  if (!response.body) {
    throw new Error("Scan response body is empty.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (line) {
        const parsed = JSON.parse(line) as DynamicScanStreamEvent;
        options.onEvent(parsed);
      }

      newlineIndex = buffer.indexOf("\n");
    }
  }

  const finalLine = buffer.trim();
  if (finalLine) {
    const parsed = JSON.parse(finalLine) as DynamicScanStreamEvent;
    options.onEvent(parsed);
  }
}
