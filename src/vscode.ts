type VsCodeApi = {
  postMessage: (message: unknown) => void;
  setState?: (newState: unknown) => void;
  getState?: () => unknown;
};

declare global {
  interface Window {
    __INVARIANT_VSCODE_API__?: VsCodeApi;
    acquireVsCodeApi?: () => VsCodeApi;
  }
}

export function getVsCodeApi(): VsCodeApi | undefined {
  if (window.__INVARIANT_VSCODE_API__) {
    return window.__INVARIANT_VSCODE_API__;
  }
  if (typeof window.acquireVsCodeApi === "function") {
    return window.acquireVsCodeApi();
  }
  return undefined;
}

export function postToExtension(message: unknown): void {
  const api = getVsCodeApi();
  if (api) {
    api.postMessage(message);
  }
}
