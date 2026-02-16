import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const plans = [
    {
      name: 'Starter',
      price: '$99',
      period: '/month',
      description: 'For small teams',
      features: [
        'Up to 5 projects',
        '1,000 test cases/month',
        'Basic analysis',
        'Community support',
      ],
    },
    {
      name: 'Professional',
      price: '$499',
      period: '/month',
      description: 'For growing teams',
      featured: true,
      features: [
        'Unlimited projects',
        '50,000 test cases/month',
        'Advanced analysis',
        'Priority support',
        'CI/CD integration',
        'Custom rules',
      ],
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations',
      features: [
        'Everything in Professional',
        'Unlimited test cases',
        'Dedicated account manager',
        'SLA guarantee',
        'On-premise option',
        'Custom integration',
      ],
    },
  ];

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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-[#111827]">Pricing</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-xl transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-12">
                <div className="text-center mb-16">
                  <p className="text-xl text-gray-600">
                    Choose the perfect plan for your team
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                  {plans.map((plan, index) => (
                    <motion.div
                      key={plan.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`rounded-2xl p-8 border-2 transition ${
                        plan.featured
                          ? 'border-[#F97316] bg-gradient-to-br from-[#F97316]/5 to-white shadow-xl'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {plan.featured && (
                        <div className="mb-4 inline-block px-3 py-1 bg-[#F97316] text-white rounded-full text-xs font-semibold">
                          Most Popular
                        </div>
                      )}
                      <h3 className="text-2xl font-bold text-[#111827] mb-2">
                        {plan.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-6">{plan.description}</p>
                      <div className="mb-6">
                        <span className="text-4xl font-bold text-[#111827]">
                          {plan.price}
                        </span>
                        <span className="text-gray-600">{plan.period}</span>
                      </div>
                      <button
                        className={`w-full py-3 rounded-xl font-semibold transition mb-8 ${
                          plan.featured
                            ? 'bg-[#111827] text-white hover:bg-[#1f2937]'
                            : 'bg-gray-100 text-[#111827] hover:bg-gray-200'
                        }`}
                      >
                        Get Started
                      </button>
                      <div className="space-y-4">
                        {plan.features.map((feature) => (
                          <div
                            key={feature}
                            className="flex items-center gap-3"
                          >
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <span className="text-gray-700 text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
