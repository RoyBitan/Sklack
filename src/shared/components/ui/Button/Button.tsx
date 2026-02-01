import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/src/shared/utils/cn";
import LoadingSpinner from "@/src/shared/components/ui/LoadingSpinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl font-bold transition-all focus:outline-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-black text-white hover:scale-[1.05] active:scale-[0.95]",
        secondary:
          "bg-white text-black border-2 border-gray-100 hover:border-black",
        ghost: "hover:bg-gray-100",
        danger: "bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        sm: "h-10 px-4 text-sm",
        md: "h-12 px-6 text-base",
        lg: "h-14 px-8 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = ({
  className,
  variant,
  size,
  loading,
  children,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <LoadingSpinner className="mr-2" />}
      {children}
    </button>
  );
};
