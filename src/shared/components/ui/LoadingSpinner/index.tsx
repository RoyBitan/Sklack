import React from "react";
import SklackLogo from "../SklackLogo";
import { cn } from "@/src/shared/utils/cn";

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = (
  { message = "טוען נתונים...", fullScreen = false, className },
) => {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12",
        className,
      )}
    >
      <div
        className={`
                relative w-28 h-28 flex items-center justify-center 
                bg-white/40 backdrop-blur-2xl rounded-[2.5rem] 
                border border-white/40 shadow-2xl 
                animate-fade-in-up
            `}
      >
        <div className="absolute inset-0 rounded-[2.5rem] border-[3px] border-black/5 animate-pulse">
        </div>
        <div className="relative animate-pulse-slow">
          <SklackLogo size={48} className="text-black" />
        </div>

        {/* Spinner Ring */}
        <div className="absolute inset-2 border-2 border-transparent border-t-black rounded-full animate-spin">
        </div>
      </div>

      {message && (
        <div className="mt-8 font-black text-gray-400 uppercase tracking-[0.3em] text-xs md:text-sm animate-pulse">
          {message}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#f8f9fa]/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
