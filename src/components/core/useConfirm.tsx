"use client";

import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Options = {
  title: string;
  body?: string;
  confirmLabel: string;
  destructive?: boolean;
};

/**
 * Design.md §5 ConfirmDialog: an in-page confirm instead of window.confirm (native dialogs are
 * blocked in some embedded browsers and look foreign). `await confirm({...})` → true/false.
 */
export function useConfirm(): [
  (opts: Options) => Promise<boolean>,
  React.ReactNode,
] {
  const common = useTranslations("Common");
  const [opts, setOpts] = useState<Options | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback(
    (o: Options) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOpts(o);
      }),
    [],
  );
  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  };

  const dialog = (
    <Dialog open={opts !== null} onOpenChange={(open) => !open && close(false)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">{opts?.title}</DialogTitle>
          {opts?.body && (
            <DialogDescription className="text-caption">
              {opts.body}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => close(false)}>
            {common("cancel")}
          </Button>
          <Button
            variant={opts?.destructive ? "destructive" : "default"}
            onClick={() => close(true)}
            autoFocus
          >
            {opts?.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  return [confirm, dialog];
}
