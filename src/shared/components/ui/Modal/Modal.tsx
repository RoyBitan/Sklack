import { useEffect, useRef } from "react";
import { Card } from "../Card/Card";
import { Button } from "../Button/Button";
import { X } from "lucide-react";
import { cn } from "@/src/shared/utils/cn";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = "md",
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-7xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <Card
        className={cn(
          "relative w-full shadow-2xl animate-in fade-in zoom-in duration-300",
          sizeClasses[size],
          className,
        )}
        variant="default"
        padding="none"
      >
        <div className="flex items-center justify-between p-8 border-b border-gray-50">
          {title && <h2 className="text-2xl font-bold">{title}</h2>}
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full w-10 h-10 p-0"
            onClick={onClose}
          >
            <X size={20} />
          </Button>
        </div>

        <div className="p-8 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </Card>
    </div>
  );
};
