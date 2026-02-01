import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/src/shared/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-bold px-3 py-1 text-xs uppercase tracking-wider",
  {
    variants: {
      variant: {
        primary: "bg-black text-white",
        secondary: "bg-gray-100 text-gray-800",
        success: "bg-green-100 text-green-700",
        warning: "bg-amber-100 text-amber-700",
        danger: "bg-red-100 text-red-700",
        premium:
          "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
};
