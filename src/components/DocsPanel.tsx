import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Code, Zap } from 'lucide-react';

interface DocsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocsPanel({ isOpen, onClose }: DocsPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed right-0 top-0 h-screen w-full max-w-2xl bg-white z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-[#111827]">Documentation</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="w-6 h-6 text-[#F97316]" />
                  <h3 className="text-xl font-bold text-[#111827]">Getting Started</h3>
                </div>
                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                  <p>
                    Invariant analyzes your codebase to identify logic flaws and security vulnerabilities that traditional testing tools miss.
                  </p>
                  <div className="bg-[#F9FAFB] rounded-xl p-4 border border-gray-200">
                    <div className="font-mono text-xs bg-[#1E1E1E] text-gray-300 p-3 rounded-lg mb-3">
                      <div>$ npm install @invariant/core</div>
                      <div>$ invariant audit ./src</div>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Code className="w-6 h-6 text-[#111827]" />
                  <h3 className="text-xl font-bold text-[#111827]">API Reference</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="font-mono text-sm font-semibold text-[#111827] mb-2">
                      POST /api/analyze
                    </div>
                    <p className="text-gray-600 text-sm mb-3">
                      Analyze code and generate test cases
                    </p>
                    <div className="text-xs text-gray-600">
                      <p className="mb-2"><span className="font-semibold">Request:</span> code (string), language (string)</p>
                      <p><span className="font-semibold">Response:</span> violations (array), testCases (array)</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="font-mono text-sm font-semibold text-[#111827] mb-2">
                      GET /api/results/:id
                    </div>
                    <p className="text-gray-600 text-sm mb-3">
                      Retrieve analysis results
                    </p>
                    <div className="text-xs text-gray-600">
                      <p className="mb-2"><span className="font-semibold">Params:</span> id (string)</p>
                      <p><span className="font-semibold">Response:</span> analysis result object</p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-6 h-6 text-green-600" />
                  <h3 className="text-xl font-bold text-[#111827]">Key Features</h3>
                </div>
                <div className="space-y-3">
                  {[
                    'Automatic test case generation',
                    'State corruption detection',
                    'Race condition identification',
                    'Authorization bypass discovery',
                    'Real-time analysis feedback',
                  ].map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] mt-2 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold text-[#111827] mb-4">Support</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Need help? Check our FAQ or contact our support team.
                </p>
                <button className="px-4 py-2 bg-[#111827] text-white rounded-xl text-sm font-semibold hover:bg-[#1f2937] transition">
                  Contact Support
                </button>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
