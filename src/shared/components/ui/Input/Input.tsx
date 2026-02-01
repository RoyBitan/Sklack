import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/src/shared/utils/cn";

const inputVariants = cva(
  "w-full rounded-2xl transition-all outline-none",
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

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
}

export const Input = ({
  className,
  variant,
  size,
  label,
  error,
  ...props
}: InputProps) => {
  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 ml-1">
          {label}
        </label>
      )}
      <input
        className={cn(
          inputVariants({
            variant: error ? "error" : variant,
            size,
            className,
          }),
        )}
        {...props}
      />
      {error && (
        <p className="text-xs font-medium text-red-500 ml-1">
          {error}
        </p>
      )}
    </div>
  );
};
