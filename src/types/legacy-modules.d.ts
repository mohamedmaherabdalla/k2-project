declare module "framer-motion" {
  import type { ComponentType } from "react";

  export const motion: Record<string, ComponentType<Record<string, unknown>>>;
  export const AnimatePresence: ComponentType<Record<string, unknown>>;
}

declare module "@monaco-editor/react" {
  import type { ComponentType } from "react";

  export type MonacoEditorProps = {
    height?: string | number;
    defaultLanguage?: string;
    value?: string;
    theme?: string;
    options?: Record<string, unknown>;
    onChange?: (value: string | undefined) => void;
  };

  const Editor: ComponentType<MonacoEditorProps>;
  export default Editor;
}
