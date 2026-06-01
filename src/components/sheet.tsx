"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

/** Lightweight right-side drawer for mobile filter panels etc. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed right-0 top-0 z-50 h-full w-[88vw] max-w-sm overflow-y-auto border-l bg-background p-4 shadow-lg data-[state=open]:animate-in data-[state=open]:slide-in-from-right">
          <div className="mb-3 flex items-center justify-between">
            <DialogPrimitive.Title className="font-semibold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-sm opacity-70 hover:opacity-100"><X className="h-4 w-4" /></DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
