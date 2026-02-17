"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const vscode = __importStar(require("vscode"));
const VIEW_TYPE = "invariant.sidebarView";
const EXCLUDES = "**/{.git,node_modules,dist,.venv,__pycache__,.next,.nuxt,.idea,.vscode,coverage,build,target}/**";
class InvariantSidebarProvider {
    context;
    view;
    highlightDecoration = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        backgroundColor: "rgba(220, 38, 38, 0.18)",
        border: "1px solid rgba(220, 38, 38, 0.55)",
    });
    textDecoder = new TextDecoder("utf-8");
    isAuditRunning = false;
    constructor(context) {
        this.context = context;
    }
    dispose() {
        this.highlightDecoration.dispose();
    }
    async resolveWebviewView(webviewView) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.getDistUri(), this.context.extensionUri],
        };
        webviewView.webview.html = await this.buildWebviewHtml(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case "ready":
                    this.postMessage({ type: "bridgeReady" });
                    return;
                case "runAudit":
                    await this.runFullRepositoryAudit();
                    return;
                case "highlightLocation":
                    await this.highlightLocation(message.location);
                    return;
                case "applyFix":
                    await this.applyCodeFix({
                        location: message.location,
                        replacement: message.replacement,
                        endLine: message.endLine,
                    });
                    return;
                default:
                    return;
            }
        });
    }
    async runFullRepositoryAudit() {
        if (this.isAuditRunning) {
            void vscode.window.showInformationMessage("Invariant audit is already running.");
            return;
        }
        if (!vscode.workspace.workspaceFolders?.length) {
            void vscode.window.showWarningMessage("Open a workspace folder before running Invariant.");
            this.postMessage({
                type: "auditError",
                message: "No workspace folder is open.",
            });
            return;
        }
        this.isAuditRunning = true;
        this.postMessage({ type: "auditStarted" });
        try {
            const files = await this.collectWorkspaceFiles();
            this.postMessage({ type: "workspaceContext", fileCount: files.length });
            await this.streamAudit(files);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown audit failure";
            this.postMessage({ type: "auditError", message });
            void vscode.window.showErrorMessage(`Invariant audit failed: ${message}`);
        }
        finally {
            this.isAuditRunning = false;
            this.postMessage({ type: "auditStopped" });
        }
    }
    async highlightLocation(location) {
        const parsed = parseLocation(location);
        if (!parsed) {
            void vscode.window.showWarningMessage(`Cannot parse finding location: ${location}`);
            return;
        }
        const editor = await this.openEditorForPath(parsed.path);
        if (!editor) {
            void vscode.window.showWarningMessage(`File not found for ${parsed.path}`);
            return;
        }
        const startLine = clamp(parsed.line - 1, 0, editor.document.lineCount - 1);
        const lineRange = editor.document.lineAt(startLine).range;
        editor.revealRange(lineRange, vscode.TextEditorRevealType.InCenter);
        editor.setDecorations(this.highlightDecoration, [lineRange]);
        this.postMessage({ type: "locationHighlighted", location });
    }
    async applyCodeFix(payload) {
        if (!payload.replacement) {
            void vscode.window.showWarningMessage("Invariant fix skipped: empty replacement.");
            return;
        }
        const fromLocation = payload.location !== undefined ? parseLocation(payload.location) : undefined;
        const filePath = payload.path ?? fromLocation?.path;
        const startLineInput = payload.startLine ?? fromLocation?.line;
        const editor = filePath !== undefined
            ? await this.openEditorForPath(filePath)
            : vscode.window.activeTextEditor;
        if (!editor) {
            void vscode.window.showWarningMessage("No active editor to apply fix.");
            return;
        }
        if (!startLineInput) {
            void vscode.window.showWarningMessage("Invariant fix skipped: missing line information.");
            return;
        }
        const startLine = clamp(startLineInput - 1, 0, editor.document.lineCount - 1);
        const endLine = clamp((payload.endLine ?? payload.startLine ?? startLineInput) - 1, startLine, editor.document.lineCount - 1);
        const start = new vscode.Position(startLine, 0);
        const end = editor.document.lineAt(endLine).range.end;
        const range = new vscode.Range(start, end);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(editor.document.uri, range, payload.replacement);
        const ok = await vscode.workspace.applyEdit(edit);
        if (!ok) {
            void vscode.window.showErrorMessage("Invariant could not apply this code fix.");
            return;
        }
        editor.selection = new vscode.Selection(start, start);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        this.postMessage({
            type: "fixApplied",
            location: payload.location ?? `${filePath}:${startLine + 1}`,
        });
    }
    async collectWorkspaceFiles() {
        const maxFiles = vscode.workspace
            .getConfiguration("invariant")
            .get("maxFiles", 6000);
        const uris = await vscode.workspace.findFiles("**/*", EXCLUDES, maxFiles);
        const files = [];
        for (const uri of uris) {
            if (uri.scheme !== "file") {
                continue;
            }
            let raw;
            try {
                raw = await vscode.workspace.fs.readFile(uri);
            }
            catch {
                continue;
            }
            if (isLikelyBinary(raw)) {
                continue;
            }
            const relativePath = vscode.workspace.asRelativePath(uri, false);
            const content = this.textDecoder.decode(raw);
            files.push({ path: relativePath, content });
        }
        files.sort((a, b) => a.path.localeCompare(b.path));
        return files;
    }
    async streamAudit(files) {
        const backendUrl = vscode.workspace
            .getConfiguration("invariant")
            .get("backendUrl", "http://127.0.0.1:8000")
            .replace(/\/$/, "");
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0];
        const payload = {
            workspace_name: workspaceRoot?.name ?? "workspace",
            files,
        };
        const response = await fetch(`${backendUrl}/api/audit/repo/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Backend audit request failed with status ${response.status}`);
        }
        if (!response.body) {
            throw new Error("Backend did not return a stream body.");
        }
        const reader = response.body.getReader();
        let buffer = "";
        while (true) {
            const { done, value } = await reader.read();
            if (value) {
                buffer += this.textDecoder.decode(value, { stream: true });
            }
            let newlineIndex = buffer.indexOf("\n");
            while (newlineIndex >= 0) {
                const line = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 1);
                if (line.length > 0) {
                    this.handleBackendEvent(line);
                }
                newlineIndex = buffer.indexOf("\n");
            }
            if (done) {
                const trailing = buffer.trim();
                if (trailing.length > 0) {
                    this.handleBackendEvent(trailing);
                }
                break;
            }
        }
    }
    handleBackendEvent(line) {
        let event;
        try {
            event = JSON.parse(line);
        }
        catch {
            this.postMessage({
                type: "agentLog",
                agent: "Pipeline",
                message: line,
            });
            return;
        }
        switch (event.type) {
            case "log":
                this.postMessage({
                    type: "agentLog",
                    agent: event.agent,
                    message: event.message,
                    timestamp: event.timestamp,
                    raw: event.raw,
                });
                return;
            case "finding":
                this.postMessage({
                    type: "finding",
                    finding: event.finding,
                });
                return;
            case "done":
                this.postMessage({
                    type: "auditCompleted",
                    summary: event.summary,
                    findings: event.findings ?? [],
                });
                return;
            case "error":
                this.postMessage({
                    type: "auditError",
                    message: event.message,
                });
                return;
            default:
                return;
        }
    }
    async buildWebviewHtml(webview) {
        const distPath = this.getDistUri().fsPath;
        const manifestPath = path.join(distPath, ".vite", "manifest.json");
        const manifestRaw = await fs.readFile(manifestPath, "utf8");
        const manifest = JSON.parse(manifestRaw);
        const entry = Object.values(manifest).find((value) => value.isEntry);
        if (!entry) {
            throw new Error("Vite manifest entry was not found for webview assets.");
        }
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(distPath, entry.file)));
        const cssUris = (entry.css ?? []).map((cssFile) => webview.asWebviewUri(vscode.Uri.file(path.join(distPath, cssFile))));
        const nonce = getNonce();
        const styleLinks = cssUris
            .map((uri) => `<link rel="stylesheet" href="${uri.toString()}">`)
            .join("\n");
        const csp = [
            `default-src 'none'`,
            `img-src ${webview.cspSource} https: data:`,
            `font-src ${webview.cspSource} https: data:`,
            `style-src ${webview.cspSource} 'unsafe-inline'`,
            `script-src 'nonce-${nonce}'`,
            `connect-src https: http:`,
        ].join("; ");
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <title>Invariant</title>
  ${styleLinks}
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">window.__INVARIANT_VSCODE_API__ = acquireVsCodeApi();</script>
  <script nonce="${nonce}" type="module" src="${scriptUri.toString()}"></script>
</body>
</html>`;
    }
    getDistUri() {
        return vscode.Uri.file(path.resolve(this.context.extensionPath, "..", "dist"));
    }
    async openEditorForPath(filePath) {
        const normalized = filePath.replace(/^\/+/, "");
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return undefined;
        }
        const uri = path.isAbsolute(filePath)
            ? vscode.Uri.file(filePath)
            : vscode.Uri.joinPath(workspaceFolder.uri, normalized);
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            return await vscode.window.showTextDocument(document, {
                preview: false,
                preserveFocus: false,
            });
        }
        catch {
            return undefined;
        }
    }
    postMessage(payload) {
        void this.view?.webview.postMessage(payload);
    }
}
function activate(context) {
    const provider = new InvariantSidebarProvider(context);
    context.subscriptions.push(provider, vscode.window.registerWebviewViewProvider(VIEW_TYPE, provider), vscode.commands.registerCommand("invariant.runAudit", async () => {
        await provider.runFullRepositoryAudit();
    }), vscode.commands.registerCommand("invariant.highlightLocation", async (arg) => {
        const location = typeof arg === "string" ? arg : arg?.location ?? "";
        if (!location) {
            void vscode.window.showWarningMessage("Provide a location in the format path/to/file.ts:42");
            return;
        }
        await provider.highlightLocation(location);
    }), vscode.commands.registerCommand("invariant.applyCodeFix", async (arg) => {
        if (!arg) {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                void vscode.window.showWarningMessage("No active editor for code fix.");
                return;
            }
            const replacement = await vscode.window.showInputBox({
                prompt: "Replacement text for the selected lines",
                placeHolder: "Paste fixed code",
            });
            if (!replacement) {
                return;
            }
            const startLine = editor.selection.start.line + 1;
            const endLine = editor.selection.end.line + 1;
            await provider.applyCodeFix({
                path: vscode.workspace.asRelativePath(editor.document.uri, false),
                startLine,
                endLine,
                replacement,
            });
            return;
        }
        await provider.applyCodeFix(arg);
    }));
}
function deactivate() { }
function parseLocation(location) {
    const match = /^(.*):(\d+)$/.exec(location.trim());
    if (!match) {
        return undefined;
    }
    return {
        path: match[1],
        line: Number(match[2]),
    };
}
function isLikelyBinary(raw) {
    const sampleLength = Math.min(raw.length, 1024);
    for (let i = 0; i < sampleLength; i += 1) {
        if (raw[i] === 0) {
            return true;
        }
    }
    return false;
}
function clamp(value, min, max) {
    if (value < min) {
        return min;
    }
    if (value > max) {
        return max;
    }
    return value;
}
function getNonce() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let value = "";
    for (let i = 0; i < 16; i += 1) {
        value += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return value;
}
//# sourceMappingURL=extension.js.map