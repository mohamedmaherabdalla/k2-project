import { useState } from 'react';
import { motion } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { Zap, Search, Shield, BarChart3 } from 'lucide-react';
import { ReasoningTrace } from './ReasoningTrace';
import { ViolationCard } from './ViolationCard';
import { analyzeInvariantSource, type AnalyzeResponse } from '../services/api';

const PYTHON_PAYMENT_CODE = `def process_payment(user_id, amount):
    """Process payment with authorization check."""
    # Bug: Missing validation for negative amounts
    if amount > 0:
        balance = get_user_balance(user_id)
        if balance >= amount:
            # Bug: No authentication verification
            deduct_balance(user_id, amount)
            return {"status": "success", "amount": amount}

    return {"status": "failed", "reason": "insufficient funds"}


def transfer(from_user, to_user, amount):
    """Transfer funds between users."""
    # Critical Bug: Missing authorization check
    if amount > 0:
        deduct_balance(from_user, amount)
        add_balance(to_user, amount)
        return True
    return False`;

interface TraceStep {
  title: string;
  status: 'success' | 'in-progress' | 'pending';
  description: string;
}

interface AnalysisView {
  id: string;
  label: string;
  icon: typeof Search;
}

export function DemoSection() {
  const [code, setCode] = useState(PYTHON_PAYMENT_CODE);
  const [activeView, setActiveView] = useState<string>('analysis');
  const [showViolation, setShowViolation] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const views: AnalysisView[] = [
    { id: 'analysis', label: 'Analysis', icon: Search },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'coverage', label: 'Coverage', icon: BarChart3 },
  ];

  const traceSteps: TraceStep[] = isRunning
    ? [
      {
        title: 'Mapping Control Flow',
        status: 'success',
        description: 'Parsed function scopes and branch conditions',
      },
      {
        title: 'Inferring State',
        status: 'in-progress',
        description: 'Tracking state transitions and edge cases...',
      },
      {
        title: 'Detecting Bypass',
        status: 'pending',
        description: 'Waiting for model output',
      },
    ]
    : [
      {
        title: 'Mapping Control Flow',
        status: 'success',
        description: 'Parsed 2 functions, 5 branches',
      },
      {
        title: 'Inferring State',
        status: 'success',
        description: analysis ? `Model: ${analysis.model}` : 'Tracked balance, authorization state',
      },
      {
        title: 'Detecting Bypass',
        status: analysis ? 'success' : 'in-progress',
        description: analysis
          ? `${analysis.issues_found} issues found`
          : 'Analyzing security boundaries...',
      },
    ];

  const handleRunAnalysis = async () => {
    setRequestError(null);
    setIsRunning(true);
    try {
      const result = await analyzeInvariantSource(code);
      setAnalysis(result);
      setShowViolation(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown backend error';
      setRequestError(message);
      setShowViolation(true);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <h2 className="text-5xl font-bold text-[#111827] tracking-tight mb-4">
          The Sandbox
        </h2>
        <p className="text-xl text-gray-600">
          See Invariant Logic Core v2 in action. Edit code, watch real-time analysis.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 overflow-visible shadow-2xl relative">
        <div className="grid lg:grid-cols-3 divide-x divide-gray-200">
          <div className="lg:col-span-2 flex flex-col min-h-[600px]">
            <div className="border-b border-gray-200 p-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-4 text-xs text-gray-400 font-mono">
                payment-service.py
              </span>
            </div>

            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="python"
                value={code}
                onChange={(value) => setCode(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  fontFamily: 'Fira Code, monospace',
                  padding: { top: 16, bottom: 16 },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                }}
              />
            </div>
          </div>

          <div className="lg:col-span-1 bg-gray-50 p-6 overflow-y-auto max-h-[600px] flex flex-col">
            <ReasoningTrace steps={traceSteps} />

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-bold text-[#111827] mb-4">Analysis View</h3>
              <div className="space-y-2">
                {views.map((view) => {
                  const Icon = view.icon;
                  return (
                    <motion.button
                      key={view.id}
                      onClick={() => setActiveView(view.id)}
                      whileHover={{ x: 4 }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${
                        activeView === view.id
                          ? 'bg-[#111827] text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {view.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-center">
          <motion.button
            onClick={handleRunAnalysis}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-[#F97316] text-white rounded-2xl text-base font-semibold hover:bg-[#ea580c] transition flex items-center gap-2 shadow-lg"
            disabled={isRunning}
          >
            <Zap className="w-5 h-5" />
            {isRunning ? 'Running...' : 'Run Invariant'}
          </motion.button>
        </div>
      </div>

      {showViolation && (
        <div className="relative mt-8 h-64">
          <ViolationCard
            isVisible={showViolation}
            issue={analysis?.critical_logic_failures?.[0] ?? null}
            summary={requestError ?? analysis?.summary}
          />
        </div>
      )}
    </section>
  );
}
