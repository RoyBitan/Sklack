import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/src/shared/utils/cn";
import { ChevronDown } from "lucide-react";

const selectVariants = cva(
  "w-full rounded-2xl transition-all outline-none appearance-none cursor-pointer",
  {
    variants: {
      variant: {
        default: "border-2 border-transparent focus:border-black",
        premium:
          "bg-gray-50/50 focus:bg-white focus:border-black focus:ring-4 focus:ring-black/5",
        error: "border-red-500 focus:border-red-600",
      },
      size: {
        sm: "px-4 py-2 text-sm",
        md: "px-6 py-4 text-base",
        lg: "px-8 py-5 text-lg",
      },
    },
    defaultVariants: {
      variant: "premium",
      size: "md",
    },
  },
);

export interface SelectProps
  extends
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof selectVariants> {
  label?: string;
  error?: string;
  options: { label: string; value: string | number }[];
}

export const Select = ({
  className,
  variant,
  size,
  label,
  error,
  options,
  ...props
}: SelectProps) => {
  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={cn(
            selectVariants({
              variant: error ? "error" : variant,
              size,
              className,
            }),
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
          <ChevronDown size={20} />
        </div>
      </div>
      {error && (
        <p className="text-xs font-medium text-red-500 ml-1">
          {error}
        </p>
      )}
    </div>
  );
};
