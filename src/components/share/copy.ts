import { toast } from "sonner";

/** Copies `text` and toasts `done`; silently does nothing when the clipboard is blocked. */
export async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    // Clipboard blocked (permissions / insecure context): nothing else to do.
  }
}
