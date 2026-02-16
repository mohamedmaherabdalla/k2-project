import { motion } from 'framer-motion';
import { AlertTriangle, Wand2 } from 'lucide-react';

interface ViolationCardProps {
  isVisible: boolean;
}

export function ViolationCard({ isVisible }: ViolationCardProps) {
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
                <h4 className="font-bold text-[#111827]">Logic Violation</h4>
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                  CRITICAL
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Authorization bypass detected in transfer() function
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
            <div className="font-mono text-xs text-gray-700 leading-relaxed">
              <span className="text-purple-600">if</span> amount <span className="text-purple-600">{">"}</span> <span className="text-green-600">0</span>:
              <div className="ml-4">transfer(amount)</div>
            </div>
          </div>

          <div className="space-y-2 mb-4 text-xs">
            <div className="flex items-center gap-2 text-gray-700">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              Missing authentication check
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <span className="w-1 h-1 rounded-full bg-red-500" />
              No amount validation for negative values
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
