import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Copy, Mail, MessageSquare, Share2, X } from "lucide-react";
import { shareLinks, shareTarget } from "@/lib/sharing.mjs";

type Props = {
  kind?: "website" | "post" | "group";
  itemId?: string;
  label?: string;
  className?: string;
};
export function ShareButton({
  kind = "website",
  itemId,
  label = "Share",
  className = "inline-flex items-center justify-center gap-2 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm font-semibold text-purple-800 hover:bg-purple-50",
}: Props) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const data = shareTarget(kind, itemId);
  const browser = typeof navigator === "undefined" ? undefined : navigator;
  const links = shareLinks(data, browser?.userAgent);

  async function copy() {
    setNotice("");
    setError("");
    try {
      if (!browser?.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await browser.clipboard.writeText(data.url);
      setNotice("Link copied. Paste it into a message or post.");
    } catch {
      input.current?.focus();
      input.current?.select();
      setError("Copy was unavailable. Select and copy the link below.");
    }
  }
  async function nativeShare() {
    setNotice("");
    setError("");
    setBusy(true);
    try {
      await browser?.share(data);
    } catch (cause: any) {
      if (cause?.name !== "AbortError")
        setError(
          "Your device could not open sharing. Try email, text or copy link.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        setNotice("");
        setError("");
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={className}
          aria-label={kind === "website" ? "Share Neighborly" : `Share ${kind}`}
        >
          <Share2 size={16} className="shrink-0" />
          {label}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-lg font-bold">
              {kind === "website" ? "Share Neighborly" : `Share this ${kind}`}
            </Dialog.Title>
            <Dialog.Close
              className="rounded-lg p-2 hover:bg-slate-100"
              aria-label="Close sharing"
            >
              <X size={18} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm text-slate-600">
            {kind === "website"
              ? "Invite someone to discover their local community."
              : "Share a link to the original. Recipients sign in to view it; group discussions also require joining."}
          </Dialog.Description>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {browser?.share && (
              <button
                type="button"
                onClick={() => void nativeShare()}
                disabled={busy}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                <Share2 size={18} />
                {busy ? "Opening…" : "Share with an app"}
              </button>
            )}
            <a
              href={links.email}
              className="flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold"
            >
              <Mail size={18} />
              Email
            </a>
            <a
              href={links.sms}
              className="flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold"
            >
              <MessageSquare size={18} />
              Text message
            </a>
            <button
              type="button"
              onClick={() => void copy()}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold"
            >
              <Copy size={18} />
              Copy link
            </button>
          </div>
          <label className="mt-4 block text-xs font-semibold text-slate-600">
            Share link
            <input
              ref={input}
              readOnly
              value={data.url}
              onFocus={(event) => event.target.select()}
              className="mt-1 w-full rounded-lg border bg-slate-50 p-2 text-xs font-normal"
            />
          </label>
          {notice && (
            <p role="status" className="mt-3 text-sm text-emerald-800">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
