import React from "react";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { AdminSafetyPanel } from "@/app/components/AdminSafetyPanel";
import { ModeratorMemberTools } from "@/app/components/ModeratorMemberTools";

export function ModeratorDashboard({
  onBack,
  onProfileOpen,
}: {
  onBack: () => void;
  onProfileOpen?: (name: string, userId: string) => void;
}) {
  return (
    <div className="min-h-screen bg-purple-950 pb-10 font-['DM_Sans',sans-serif]">
      <header className="sticky top-0 z-40 border-b border-purple-800 bg-purple-950/95 px-4 py-3 text-white backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-200 hover:text-white"
          >
            <ChevronLeft size={17} /> Back to feed
          </button>
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-300" />
            <h1 className="font-['Playfair_Display',serif] text-lg font-bold sm:text-xl">Neighborly Moderator</h1>
          </div>
          <span className="rounded-full border border-purple-700 bg-purple-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-purple-200">
            Limited access
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Moderator access</p>
          <p className="mt-1 text-xs leading-relaxed">
            Moderators can search approved members, open profiles, review safety reports, see block activity, warn members, and hide reported posts or comments when their assigned permissions allow it. Account suspensions, bans, sign-up approvals, advertising controls, and administrator settings remain admin-only.
          </p>
        </section>
        <ModeratorMemberTools onProfileOpen={onProfileOpen} />
        <AdminSafetyPanel onProfileOpen={onProfileOpen} />
      </main>
    </div>
  );
}
