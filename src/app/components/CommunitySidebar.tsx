import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, MapPin, UserPlus, UserCheck, Users, X } from "lucide-react";

export interface CommunityAreaOption {
  value: string;
  city: string;
  neighborhood: string | null;
  label: string;
}

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  emoji: string;
  city: string;
  neighborhood: string | null;
  members: number;
  joined: boolean;
}

export interface ActiveNeighbor {
  id: string;
  name: string;
  city: string;
  neighborhood: string | null;
  avatarUrl: string | null;
  accountType: "personal" | "business";
  following: boolean;
}

function InitialAvatar({ neighbor }: { neighbor: ActiveNeighbor }) {
  const initials = neighbor.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join("") || "N";

  if (neighbor.avatarUrl) {
    return <img src={neighbor.avatarUrl} alt="" className="h-8 w-8 rounded-full border border-border object-cover" />;
  }

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-[11px] font-bold text-white" aria-hidden="true">
      {initials}
    </span>
  );
}

export function CommunityGroupsCard({
  groups,
  loading,
  error,
  busyGroupId,
  onToggleMembership,
  onCreate,
}: {
  groups: CommunityGroup[];
  loading: boolean;
  error: string | null;
  busyGroupId: string | null;
  onToggleMembership: (group: CommunityGroup) => void;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Community Groups</h3>
        <button onClick={onCreate} className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100">
          + Create
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground">
          <LoaderCircle size={15} className="animate-spin" /> Loading local groups…
        </div>
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center">
          <Users size={20} className="mx-auto mb-2 text-muted-foreground/60" />
          <p className="text-xs font-medium">No groups in this area yet</p>
          <button onClick={onCreate} className="mt-1 text-xs font-semibold text-blue-600 hover:underline">Create the first group</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((group) => {
            const busy = busyGroupId === group.id;
            return (
              <div key={group.id} className="rounded-lg border border-border/60 p-2.5 transition-colors hover:bg-secondary/30">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold" title={group.name}>
                    <span aria-hidden="true">{group.emoji}</span> {group.name}
                  </span>
                  <button
                    onClick={() => onToggleMembership(group)}
                    disabled={busy}
                    className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${group.joined ? "bg-secondary text-muted-foreground hover:bg-secondary/80" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                  >
                    {busy ? "Saving…" : group.joined ? "Joined" : "Join"}
                  </button>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{group.description}</p>
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                  <span>{group.members} {group.members === 1 ? "member" : "members"}</span>
                  <span className="max-w-28 truncate" title={group.neighborhood ? `${group.neighborhood}, ${group.city}` : group.city}>
                    {group.neighborhood || group.city}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ActiveNeighborsCard({
  neighbors,
  loading,
  busyNeighborId,
  onOpenProfile,
  onToggleFollow,
}: {
  neighbors: ActiveNeighbor[];
  loading: boolean;
  busyNeighborId: string | null;
  onOpenProfile: (neighbor: ActiveNeighbor) => void;
  onToggleFollow: (neighbor: ActiveNeighbor) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Active Neighbors</h3>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" /> Online now
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground">
          <LoaderCircle size={15} className="animate-spin" /> Checking who is online…
        </div>
      ) : neighbors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center">
          <Users size={20} className="mx-auto mb-2 text-muted-foreground/60" />
          <p className="text-xs font-medium">No other neighbors are online right now</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Active members will appear here automatically.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {neighbors.map((neighbor) => (
            <div key={neighbor.id} className="flex items-center gap-2.5">
              <button onClick={() => onOpenProfile(neighbor)} aria-label={`View ${neighbor.name}'s profile`} className="relative flex-shrink-0">
                <InitialAvatar neighbor={neighbor} />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <button onClick={() => onOpenProfile(neighbor)} className="block max-w-full truncate text-left text-sm font-medium leading-tight transition-colors hover:text-blue-600">
                  {neighbor.name}
                </button>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{neighbor.neighborhood || neighbor.city}</p>
              </div>
              <button
                onClick={() => onToggleFollow(neighbor)}
                disabled={busyNeighborId === neighbor.id}
                className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${neighbor.following ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-600/30 text-blue-600 hover:bg-secondary"}`}
              >
                {neighbor.following ? <UserCheck size={11} /> : <UserPlus size={11} />}
                {busyNeighborId === neighbor.id ? "Saving" : neighbor.following ? "Following" : "Follow"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const GROUP_EMOJIS = ["🏘️", "🪴", "🐾", "🛠️", "📰", "🎉", "🤝", "🏃"];

export function CreateGroupDialog({
  open,
  areas,
  defaultAreaValue,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  areas: CommunityAreaOption[];
  defaultAreaValue: string;
  onOpenChange: (open: boolean) => void;
  onCreate: (values: { name: string; description: string; emoji: string; areaValue: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🏘️");
  const [areaValue, setAreaValue] = useState(defaultAreaValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAreaValue(defaultAreaValue);
    setError(null);
  }, [defaultAreaValue, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({ name: name.trim(), description: description.trim(), emoji, areaValue });
      setName("");
      setDescription("");
      setEmoji("🏘️");
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The group could not be created.");
    } finally {
      setSaving(false);
    }
  }

  const selectableAreas = areas.filter((area) => area.value !== "All Areas");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[91] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-bold">Create a community group</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">Bring nearby neighbors together around a shared interest.</Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Close create group dialog"><X size={17} /></Dialog.Close>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-medium">
              Group name
              <input required minLength={3} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Example: Downtown Walking Club" className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </label>

            <label className="block text-sm font-medium">
              Description
              <textarea required minLength={5} maxLength={300} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will neighbors share or do in this group?" className="mt-1.5 min-h-24 w-full resize-none rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
              <span className="mt-1 block text-right text-[11px] text-muted-foreground">{description.length}/300</span>
            </label>

            <div className="grid grid-cols-[7rem_1fr] gap-3">
              <label className="block text-sm font-medium">
                Icon
                <select value={emoji} onChange={(event) => setEmoji(event.target.value)} className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                  {GROUP_EMOJIS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Area
                <span className="relative mt-1.5 block">
                  <MapPin size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select required value={areaValue} onChange={(event) => setAreaValue(event.target.value)} className="w-full rounded-lg border border-border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500">
                    {selectableAreas.map((area) => <option key={area.value} value={area.value}>{area.label}</option>)}
                  </select>
                </span>
              </label>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button type="button" onClick={() => onOpenChange(false)} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving || name.trim().length < 3 || description.trim().length < 5 || !areaValue} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {saving && <LoaderCircle size={15} className="animate-spin" />}{saving ? "Creating…" : "Create group"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
