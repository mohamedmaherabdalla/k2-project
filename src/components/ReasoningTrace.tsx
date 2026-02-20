import { motion } from 'framer-motion';
import { Check, Clock } from 'lucide-react';

interface TraceStep {
  title: string;
  status: 'success' | 'in-progress' | 'pending';
  description: string;
}

interface ReasoningTraceProps {
  steps: TraceStep[];
}

export function ReasoningTrace({ steps }: ReasoningTraceProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-[#111827]">Reasoning Trace</h3>
      <div className="relative space-y-4">
        {steps.map((step, index) => {
          const isSuccess = step.status === 'success';
          const isInProgress = step.status === 'in-progress';

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
              className="relative"
            >
              {index < steps.length - 1 && (
                <div
                  className={`absolute left-5 top-12 w-0.5 h-12 ${
                    isSuccess ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              )}

              <div className="flex gap-4">
                <div className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center">
                  {isSuccess && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center"
                    >
                      <Check className="w-5 h-5 text-white" />
                    </motion.div>
                  )}
                  {isInProgress && (
                    <motion.div
                      animate={{
                        boxShadow: [
                          '0 0 0 0 rgba(168, 85, 247, 0.7)',
                          '0 0 0 10px rgba(168, 85, 247, 0)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center border-2 border-purple-500"
                    >
                      <Clock className="w-5 h-5 text-white animate-spin" />
                    </motion.div>
                  )}
                  {!isSuccess && !isInProgress && (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300" />
                  )}
                </div>

                <div className="pt-1">
                  <div className="font-semibold text-[#111827]">{step.title}</div>
                  <div className="text-xs text-gray-600 mt-1">{step.description}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
