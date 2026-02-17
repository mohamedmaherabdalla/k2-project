import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeInvariantSource } from "./services/api";

type FileId = "vulnerable_bank.py" | "exploit.py" | "requirements.txt";
type PanelTab = "terminal" | "output";

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

function App() {
  const [files, setFiles] = useState<Record<FileId, string>>(INITIAL_FILES);
  const [activeFile, setActiveFile] = useState<FileId>("vulnerable_bank.py");
  const [activePanel, setActivePanel] = useState<PanelTab>("terminal");
  const [scanRunning, setScanRunning] = useState(false);
  const [exploitUnlocked, setExploitUnlocked] = useState(false);
  const [raceHighlightEnabled, setRaceHighlightEnabled] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "$ python vulnerable_bank.py",
    "Running local dev simulation...",
    "No issues detected yet.",
  ]);
  const [outputText, setOutputText] = useState<string>(
    "Invariant Output is empty. Run Scan Logic to start analysis.",
  );
  const [apiState, setApiState] = useState<"idle" | "ok" | "down">("idle");

  const codeLayerRef = useRef<HTMLPreElement | null>(null);
  const inputLayerRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

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
    return () => {
      stopTypewriter();
    };
  }, []);

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

    setScanRunning(true);
    setActivePanel("output");
    setRaceHighlightEnabled(false);
    setTerminalLines((prev) => [
      ...prev,
      "$ invariant scan vulnerable_bank.py",
      "Invariant AI Reasoning...",
    ]);

    const source = files["vulnerable_bank.py"];
    const startedAt = Date.now();
    const apiPromise = analyzeInvariantSource(source)
      .then((result) => {
        setApiState("ok");
        return result.summary;
      })
      .catch(() => {
        setApiState("down");
        return "";
      });

    const elapsed = Date.now() - startedAt;
    const delay = Math.max(3000 - elapsed, 0);
    await new Promise((resolve) => window.setTimeout(resolve, delay));

    setRaceHighlightEnabled(true);
    setExploitUnlocked(true);

    const apiSummary = await Promise.race<string>([
      apiPromise,
      new Promise((resolve) => window.setTimeout(() => resolve(""), 1200)),
    ]);

    const report = [
      "CRITICAL: Race Condition Flaw",
      "",
      "EXPLANATION: Two concurrent withdrawals can both pass the balance check before state is updated, enabling double-spend losses.",
      "",
      "LOCATION: vulnerable_bank.py:12",
      "",
      "ROAST SUMMARY: This survives critique because exploitability depends on precise timing between read and write steps, not a trivial syntax mistake.",
      "",
      "RECOMMENDATION: Protect withdraw() with a lock or atomic transaction and add concurrent test coverage for duplicate withdrawal attempts.",
      "",
      apiSummary
        ? `API NOTE: ${apiSummary}`
        : "API NOTE: Backend unavailable, rendered local simulation report.",
    ].join("\n");

    await streamOutput(report);
    setTerminalLines((prev) => [
      ...prev,
      "Scan complete: race condition confirmed.",
      "exploit.py unlocked.",
    ]);
    setScanRunning(false);
  };

  return (
    <div className="vscode-shell">
      <header className="workbench-topbar">
        <div className="window-title">Invariant Security Lab</div>
        <div className="topbar-right">
          <span className={`api-pill api-pill-${apiState}`}>
            API {apiState === "ok" ? "Online" : apiState === "down" ? "Offline" : "Unknown"}
          </span>
          <button className="scan-button" onClick={handleScanLogic} disabled={scanRunning}>
            {scanRunning ? (
              <>
                <span className="spinner" />
                Invariant AI Reasoning...
              </>
            ) : (
              "Scan Logic"
            )}
          </button>
        </div>
      </header>

      <div className="workbench-main">
        <aside className="explorer">
          <div className="explorer-title">Explorer</div>
          <div className="file-group">workspace</div>
          <button
            className={`file-row ${activeFile === "vulnerable_bank.py" ? "active" : ""}`}
            onClick={() => handleFileClick("vulnerable_bank.py")}
          >
            <span className="file-icon py" />
            vulnerable_bank.py
          </button>
          <button
            className={`file-row ${activeFile === "exploit.py" ? "active" : ""} ${!exploitUnlocked ? "disabled" : ""}`}
            onClick={() => handleFileClick("exploit.py")}
            title={!exploitUnlocked ? "Locked until scan completes" : "Open exploit script"}
          >
            <span className="file-icon py" />
            exploit.py
          </button>
          <button
            className={`file-row ${activeFile === "requirements.txt" ? "active" : ""}`}
            onClick={() => handleFileClick("requirements.txt")}
          >
            <span className="file-icon txt" />
            requirements.txt
          </button>
        </aside>

        <section className="editor-section">
          <div className="editor-tabbar">
            <div className="editor-tab active">{activeFile}</div>
          </div>
          <div className="editor-surface">
            <pre
              ref={codeLayerRef}
              className="code-layer"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
            <textarea
              ref={inputLayerRef}
              className="input-layer"
              value={files[activeFile]}
              onChange={(event) => handleCodeChange(event.target.value)}
              onScroll={syncScroll}
              spellCheck={false}
            />
          </div>
        </section>
      </div>

      <section className="bottom-panel">
        <div className="panel-tabs">
          <button
            className={activePanel === "terminal" ? "panel-tab active" : "panel-tab"}
            onClick={() => setActivePanel("terminal")}
          >
            Terminal
          </button>
          <button
            className={activePanel === "output" ? "panel-tab active" : "panel-tab"}
            onClick={() => setActivePanel("output")}
          >
            Invariant Output
          </button>
        </div>
        <div className="panel-content">
          {activePanel === "terminal" ? (
            <pre className="terminal-output">
              {terminalLines.map((line, idx) => (
                <div key={`${idx}-${line}`}>{line}</div>
              ))}
            </pre>
          ) : (
            <pre className="invariant-output">
              {outputText}
              {scanRunning ? <span className="cursor">▋</span> : null}
            </pre>
          )}
        </div>
      </section>
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

export default App;
