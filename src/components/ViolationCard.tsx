import { motion } from 'framer-motion';
import { AlertTriangle, Wand2 } from 'lucide-react';
import type { CriticalLogicFailure } from '../services/api';

interface ViolationCardProps {
  isVisible: boolean;
  issue?: CriticalLogicFailure | null;
  summary?: string;
}

export function ViolationCard({ isVisible, issue, summary }: ViolationCardProps) {
  const severity = issue?.severity ?? 'HIGH';
  const severityStyle = severity === 'HIGH'
    ? 'bg-red-100 text-red-700'
    : severity === 'MED'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-green-100 text-green-700';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="w-full flex justify-end"
    >
      <div className="relative backdrop-blur-xl bg-white/80 border border-white/20 rounded-2xl p-6 shadow-2xl max-w-sm overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-[#111827]">{issue?.title ?? 'Logic Violation'}</h4>
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${severityStyle}`}>
                  {severity}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {summary ?? issue?.description ?? 'Security issue detected in current code.'}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
            <div className="font-mono text-xs text-gray-700 leading-relaxed">
              {issue?.evidence ?? 'Run analysis to view exploit evidence'}
            </div>
          </div>

          <div className="space-y-2 mb-4 text-xs">
            <div className="flex items-center gap-2 text-gray-700">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {issue?.description ?? 'Potential logic bypass detected'}
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              {issue ? `Reported at line ${issue.line}` : 'No line information available'}
            </div>
          </div>

          <button className="w-full py-3 rounded-xl font-semibold text-white text-sm transition bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 flex items-center justify-center gap-2">
            <Wand2 className="w-4 h-4" />
            Apply Fix
          </button>
        </div>
      </div>
    </motion.div>
  );
}
