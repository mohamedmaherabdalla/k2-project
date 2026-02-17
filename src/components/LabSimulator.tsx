import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  FileCode,
  FileText,
  FolderOpen,
  History,
  Loader2,
  Settings,
  Shield,
  TerminalSquare,
  UserRound,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeInvariantSource } from "../services/api";

type FileId = "vulnerable_bank.py" | "exploit.py" | "requirements.txt";
type PanelTab = "terminal" | "output";
type StepStatus = "pending" | "running" | "done";

type Props = {
  onBack: () => void;
};

const KEYWORDS = new Set([
  "and",
  "as",
  "async",
  "await",
  "class",
  "def",
  "elif",
  "else",
  "except",
  "False",
  "finally",
  "for",
  "from",
  "if",
  "import",
  "in",
  "is",
  "None",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "True",
  "try",
  "while",
  "with",
]);

const TOKEN_PATTERN =
  /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(?:and|as|async|await|class|def|elif|else|except|False|finally|for|from|if|import|in|is|None|not|or|pass|raise|return|True|try|while|with)\b|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_]\w*(?=\()/g;

const INITIAL_FILES: Record<FileId, string> = {
  "vulnerable_bank.py": `import threading
import time


class BankAccount:
    def __init__(self, opening_balance):
        self.balance = opening_balance

    def withdraw(self, amount):
        if amount <= 0:
            return {"ok": False, "reason": "invalid amount"}

        if self.balance >= amount:
            current = self.balance
            time.sleep(0.08)
            self.balance = current - amount
            return {"ok": True, "new_balance": self.balance}

        return {"ok": False, "reason": "insufficient funds"}


account = BankAccount(1000)
`,
  "exploit.py": `import threading
from vulnerable_bank import account


def attack():
    result = account.withdraw(700)
    print("withdraw result:", result)


t1 = threading.Thread(target=attack)
t2 = threading.Thread(target=attack)
t1.start()
t2.start()
t1.join()
t2.join()

print("final balance:", account.balance)
`,
  "requirements.txt": `flask==3.0.2
gunicorn==22.0.0
`,
};

const AGENT_STEPS = [
  "Agent 1 - Cartographer",
  "Agent 2 - Context Injector",
  "Agent 3 - Adversary",
  "Agent 4 - Roaster/Critic",
  "Agent 5 - Auditor",
];

export function LabSimulator({ onBack }: Props) {
  const [files, setFiles] = useState<Record<FileId, string>>(INITIAL_FILES);
  const [activeFile, setActiveFile] = useState<FileId>("vulnerable_bank.py");
  const [activePanel, setActivePanel] = useState<PanelTab>("terminal");
  const [scanRunning, setScanRunning] = useState(false);
  const [exploitUnlocked, setExploitUnlocked] = useState(false);
  const [raceHighlightEnabled, setRaceHighlightEnabled] = useState(false);
  const [fixApplied, setFixApplied] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "$ python vulnerable_bank.py",
    "Running local dev simulation...",
    "No issues detected yet.",
  ]);
  const [debateLines, setDebateLines] = useState<string[]>([
    "Live agent debate will appear here after scan starts.",
  ]);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([
    "pending",
    "pending",
    "pending",
    "pending",
    "pending",
  ]);
  const [outputText, setOutputText] = useState<string>(
    "Invariant Output is empty. Run Scan Logic to start analysis.",
  );
  const [apiState, setApiState] = useState<"idle" | "ok" | "down">("idle");

  const codeLayerRef = useRef<HTMLPreElement | null>(null);
  const inputLayerRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const panelScrollRef = useRef<HTMLDivElement | null>(null);

  const redLines = useMemo(
    () =>
      raceHighlightEnabled && activeFile === "vulnerable_bank.py"
        ? new Set([12, 13, 14, 15])
        : new Set<number>(),
    [activeFile, raceHighlightEnabled],
  );

  const highlightedCode = useMemo(
    () => renderCode(files[activeFile], redLines),
    [activeFile, files, redLines],
  );

  const handleFileClick = (fileId: FileId) => {
    if (fileId === "exploit.py" && !exploitUnlocked) {
      return;
    }
    setActiveFile(fileId);
  };

  const handleCodeChange = (value: string) => {
    setFixApplied(false);
    setFiles((prev) => ({ ...prev, [activeFile]: value }));
  };

  const syncScroll = () => {
    if (!codeLayerRef.current || !inputLayerRef.current) {
      return;
    }
    codeLayerRef.current.scrollTop = inputLayerRef.current.scrollTop;
    codeLayerRef.current.scrollLeft = inputLayerRef.current.scrollLeft;
  };

  const stopTypewriter = () => {
    if (typingTimerRef.current !== null) {
      window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopTypewriter();
  }, []);

  useEffect(() => {
    if (panelScrollRef.current) {
      panelScrollRef.current.scrollTop = panelScrollRef.current.scrollHeight;
    }
  }, [debateLines]);

  const pushDebate = (line: string) => {
    setDebateLines((prev) => [...prev, line]);
  };

  const pushTerminal = (line: string) => {
    setTerminalLines((prev) => [...prev, line]);
  };

  const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const setStepStatus = (index: number, status: StepStatus) => {
    setStepStatuses((prev) => prev.map((entry, idx) => (idx === index ? status : entry)));
  };

  const streamOutput = (message: string): Promise<void> =>
    new Promise((resolve) => {
      stopTypewriter();
      setOutputText("");
      let index = 0;
      typingTimerRef.current = window.setInterval(() => {
        index += 2;
        setOutputText(message.slice(0, index));
        if (index >= message.length) {
          stopTypewriter();
          resolve();
        }
      }, 16);
    });

  const handleScanLogic = async () => {
    if (scanRunning) {
      return;
    }

    const scanStartedAt = Date.now();
    setScanRunning(true);
    setActivePanel("output");
    setRaceHighlightEnabled(false);
    setFixApplied(false);
    setDebateLines([]);
    setStepStatuses(["pending", "pending", "pending", "pending", "pending"]);
    pushTerminal("$ invariant scan vulnerable_bank.py");
    pushTerminal("Invariant AI Reasoning...");
    pushDebate("Bootstrapping 5-agent pipeline with full repository context...");

    const source = files["vulnerable_bank.py"];
    const apiPromise = analyzeInvariantSource(source)
      .then((result) => {
        setApiState("ok");
        return result.summary;
      })
      .catch(() => {
        setApiState("down");
        return "";
      });

    const script: Array<{ step: number; line: string; wait: number }> = [
      {
        step: 0,
        line: "Agent 1 (Cartographer): mapped withdrawal state reads/writes across thread execution.",
        wait: 460,
      },
      {
        step: 1,
        line: "Agent 2 (Context Injector): inferred business rule: one balance can only fund one successful withdrawal.",
        wait: 480,
      },
      {
        step: 2,
        line: "Agent 3 (Adversary): two threads can both pass the same balance gate before mutation.",
        wait: 540,
      },
      {
        step: 3,
        line: "Agent 4 (Roaster): rejected weak hypothesis and validated a real race window between read and write.",
        wait: 620,
      },
      {
        step: 4,
        line: "Agent 5 (Auditor): formatting only exploitable finding for critical output.",
        wait: 520,
      },
    ];

    for (const item of script) {
      setStepStatus(item.step, "running");
      pushDebate(item.line);
      await sleep(item.wait);
      setStepStatus(item.step, "done");
    }

    const elapsed = Date.now() - scanStartedAt;
    if (elapsed < 3000) {
      await sleep(3000 - elapsed);
    }

    setRaceHighlightEnabled(true);
    setExploitUnlocked(true);

    const apiSummary = await Promise.race<string>([
      apiPromise,
      new Promise((resolve) => window.setTimeout(() => resolve(""), 1200)),
    ]);

    const report = [
      "CRITICAL: Race Condition Flaw",
      "",
      "EXPLANATION: Two concurrent withdrawals can both pass the balance check before state updates, enabling double-spend losses.",
      "",
      "LOCATION: vulnerable_bank.py:12",
      "",
      "ROAST SUMMARY: The critic confirmed exploitability by reproducing a timing window between balance read and mutation, proving this is not a false positive.",
      "",
      "RECOMMENDATION: Protect withdraw() with a lock or atomic transaction and add concurrent test coverage for duplicate withdrawal attempts.",
    ].join("\n");

    if (apiSummary) {
      pushDebate(`K2 corroboration: ${apiSummary}`);
    } else {
      pushDebate("K2 API unavailable, continuing with validated local simulation evidence.");
    }

    await streamOutput(report);
    pushTerminal("Scan complete: race condition confirmed.");
    pushTerminal("exploit.py unlocked.");
    setScanRunning(false);
  };

  const handleApplyFix = () => {
    setFiles((prev) => {
      let patched = prev["vulnerable_bank.py"];

      if (!patched.includes("self._lock = threading.Lock()")) {
        patched = patched.replace(
          "        self.balance = opening_balance",
          "        self.balance = opening_balance\n        self._lock = threading.Lock()",
        );
      }

      patched = patched.replace(
        "        if self.balance >= amount:\n            current = self.balance\n            time.sleep(0.08)\n            self.balance = current - amount\n            return {\"ok\": True, \"new_balance\": self.balance}\n",
        "        with self._lock:\n            if self.balance >= amount:\n                current = self.balance\n                time.sleep(0.08)\n                self.balance = current - amount\n                return {\"ok\": True, \"new_balance\": self.balance}\n",
      );

      return {
        ...prev,
        "vulnerable_bank.py": patched,
      };
    });

    setActiveFile("vulnerable_bank.py");
    setRaceHighlightEnabled(false);
    setFixApplied(true);
    pushTerminal("Patch applied: added lock guard around withdrawal critical section.");
    pushDebate("Patch operation applied in editor. Re-run scan to verify remediation.");
  };

  return (
    <div className="lab-shell">
      <aside className="lab-rail">
        <div className="lab-rail-logo">
          <TerminalSquare size={20} />
        </div>
        <div className="lab-rail-nav">
          <button className="lab-rail-btn active" title="Explorer">
            <FolderOpen size={18} />
          </button>
          <button className="lab-rail-btn" title="Security">
            <Shield size={18} />
          </button>
          <button className="lab-rail-btn" title="Metrics">
            <BarChart3 size={18} />
          </button>
          <button className="lab-rail-btn" title="History">
            <History size={18} />
          </button>
        </div>
        <div className="lab-rail-foot">
          <button className="lab-rail-btn" title="Settings">
            <Settings size={18} />
          </button>
          <div className="lab-avatar">
            <UserRound size={16} />
          </div>
        </div>
      </aside>

      <section className="lab-center">
        <header className="lab-topbar">
          <div className="lab-file-chip">
            <FileCode size={15} />
            <span>{activeFile}</span>
          </div>
          <div className="lab-topbar-actions">
            <button className="lab-back-btn" onClick={onBack}>
              <ChevronLeft size={14} />
              Back
            </button>
            <span className={`lab-api-pill lab-api-pill-${apiState}`}>
              API {apiState === "ok" ? "Online" : apiState === "down" ? "Offline" : "Unknown"}
            </span>
            <button className="lab-scan-btn" onClick={handleScanLogic} disabled={scanRunning}>
              {scanRunning ? (
                <>
                  <Loader2 size={14} className="spin-loop" />
                  Invariant AI Reasoning...
                </>
              ) : (
                "Scan Logic"
              )}
            </button>
          </div>
        </header>

        <div className="lab-workbench">
          <aside className="lab-explorer">
            <div className="lab-explorer-title">Explorer</div>
            <div className="lab-group-title">workspace</div>
            <button
              className={`lab-file-row ${activeFile === "vulnerable_bank.py" ? "active" : ""}`}
              onClick={() => handleFileClick("vulnerable_bank.py")}
            >
              <FileCode size={14} />
              vulnerable_bank.py
            </button>
            <button
              className={`lab-file-row ${activeFile === "exploit.py" ? "active" : ""} ${!exploitUnlocked ? "disabled" : ""}`}
              onClick={() => handleFileClick("exploit.py")}
              title={!exploitUnlocked ? "Locked until scan completes" : "Open exploit script"}
            >
              <FileCode size={14} />
              exploit.py
            </button>
            <button
              className={`lab-file-row ${activeFile === "requirements.txt" ? "active" : ""}`}
              onClick={() => handleFileClick("requirements.txt")}
            >
              <FileText size={14} />
              requirements.txt
            </button>
          </aside>

          <section className="lab-editor-column">
            <div className="lab-editor-surface">
              <pre
                ref={codeLayerRef}
                className="lab-code-layer"
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
              />
              <textarea
                ref={inputLayerRef}
                className="lab-input-layer"
                value={files[activeFile]}
                onChange={(event) => handleCodeChange(event.target.value)}
                onScroll={syncScroll}
                spellCheck={false}
              />
            </div>

            <section className="lab-bottom-panel">
              <div className="lab-panel-tabs">
                <button
                  className={activePanel === "terminal" ? "lab-panel-tab active" : "lab-panel-tab"}
                  onClick={() => setActivePanel("terminal")}
                >
                  Terminal
                </button>
                <button
                  className={activePanel === "output" ? "lab-panel-tab active" : "lab-panel-tab"}
                  onClick={() => setActivePanel("output")}
                >
                  Invariant Output
                </button>
              </div>
              <div className="lab-panel-content">
                {activePanel === "terminal" ? (
                  <pre className="lab-terminal-output">
                    {terminalLines.map((line, idx) => (
                      <div key={`${idx}-${line}`}>{line}</div>
                    ))}
                  </pre>
                ) : (
                  <pre className="lab-invariant-output">
                    {outputText}
                    {scanRunning ? <span className="cursor">▋</span> : null}
                  </pre>
                )}
              </div>
            </section>
          </section>
        </div>
      </section>

      <aside className="lab-right-panel">
        <header className="lab-right-header">
          <h2>Invariant Logic Core v2</h2>
          <div className="lab-live-badge">
            <span className="dot" />
            Live
          </div>
        </header>

        <div className="lab-right-body" ref={panelScrollRef}>
          <div className="lab-step-list">
            {AGENT_STEPS.map((name, index) => (
              <div className="lab-step-item" key={name}>
                <div className={`lab-step-dot ${stepStatuses[index]}`} />
                <div className="lab-step-content">
                  <div className="lab-step-title">{name}</div>
                  <div className="lab-step-status">
                    {stepStatuses[index] === "done"
                      ? "completed"
                      : stepStatuses[index] === "running"
                        ? "running"
                        : "pending"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lab-debate-log">
            {debateLines.map((line, idx) => (
              <div key={`${idx}-${line}`} className="lab-debate-line">
                {line}
              </div>
            ))}
          </div>
        </div>

        <div className="lab-insight-card">
          <div className="lab-insight-head">
            <div className="lab-insight-title">
              <AlertTriangle size={16} />
              Logic Violation Detected
            </div>
            <span className="lab-critical-pill">Critical</span>
          </div>
          <p className="lab-insight-copy">
            Transaction state can be mutated concurrently before final balance validation.
            Exploitability is confirmed when two threads race through the same critical section.
          </p>
          <button className="lab-fix-btn" onClick={handleApplyFix}>
            <Wrench size={14} />
            {fixApplied ? "Fix Applied" : "Apply Fix"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function highlightLine(line: string): string {
  TOKEN_PATTERN.lastIndex = 0;
  let html = "";
  let last = 0;
  let tokenMatch: RegExpExecArray | null = TOKEN_PATTERN.exec(line);

  while (tokenMatch) {
    const token = tokenMatch[0];
    const index = tokenMatch.index;
    html += escapeHtml(line.slice(last, index));

    if (tokenMatch[1]) {
      html += `<span class="tok-comment">${escapeHtml(token)}</span>`;
      last = index + token.length;
      break;
    } else if (tokenMatch[2]) {
      html += `<span class="tok-string">${escapeHtml(token)}</span>`;
    } else if (/^\d/.test(token)) {
      html += `<span class="tok-number">${escapeHtml(token)}</span>`;
    } else if (KEYWORDS.has(token)) {
      html += `<span class="tok-keyword">${escapeHtml(token)}</span>`;
    } else {
      html += `<span class="tok-function">${escapeHtml(token)}</span>`;
    }

    last = index + token.length;
    tokenMatch = TOKEN_PATTERN.exec(line);
  }

  html += escapeHtml(line.slice(last));
  return html.length > 0 ? html : "&nbsp;";
}

function renderCode(code: string, redLines: Set<number>): string {
  return code
    .split("\n")
    .map((line, index) => {
      const lineNo = index + 1;
      const isAlert = redLines.has(lineNo);
      return `<span class="code-line ${isAlert ? "code-line-alert" : ""}">
  <span class="line-no">${lineNo}</span>
  <span class="line-content">${highlightLine(line)}</span>
</span>`;
    })
    .join("");
}
