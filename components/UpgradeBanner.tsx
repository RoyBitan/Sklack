import React from "react";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { useSubscription } from "../hooks/useSubscription";

const UpgradeBanner: React.FC = () => {
  const { isPremium, isTrialActive, trialDaysLeft, tier } = useSubscription();

  if (isPremium) return null;

  return (
    <div className="mx-4 mb-8 group">
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-[2px] rounded-3xl shadow-2xl transition-all duration-500 hover:shadow-indigo-500/25 group-hover:-translate-y-1">
        <div className="bg-white rounded-[1.4rem] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-50 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 opacity-50" />

          <div className="flex items-center gap-6 relative z-10 text-start">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <Zap size={32} fill="white" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {tier === "FREE"
                    ? "Unlock Premium Power"
                    : "Limited Time Offer"}
                </h3>
                <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
                  Up To 60% OFF
                </div>
              </div>
              <p className="text-gray-500 font-bold text-sm max-w-md leading-relaxed">
                {isTrialActive
                  ? `Your free trial ends in ${trialDaysLeft} days. Upgrade now to keep unlimited tasks, documents, and real-time chat.`
                  : "Upgrade to Premium to get unlimited active tasks, document management, and live chat with your customers."}
              </p>
            </div>
          </div>

          <button className="relative z-10 w-full md:w-auto bg-black text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-gray-900 active:scale-95 transition-all flex items-center justify-center gap-3 shrink-0">
            Upgrade to Premium
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeBanner;
