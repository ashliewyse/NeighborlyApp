import { supabase } from "@/lib/supabase";

export type GroupInfo = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  city: string;
  created_by: string | null;
  member_count: number;
};
export type Discussion = {
  id: string;
  group_id?: string;
  post_id?: string;
  author_id: string;
  content: string;
  created_at: string;
  author: { full_name: string; avatar_url?: string | null } | null;
};
export type GroupInvite = {
  id: string;
  group_id: string;
  inviter_id: string;
  invitee_id: string;
  status: string;
  group: { name: string; emoji: string } | null;
  inviter: { full_name: string } | null;
};

export async function requireCurrentMember(expectedId: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.id !== expectedId)
    throw new Error("Your sign-in session changed. Refresh and sign in again.");
  return data.user.id;
}
export function throwIfError(error: { message?: string } | null) {
  if (error)
    throw new Error(error.message || "The request could not be completed.");
}
export async function loadGroupInvites(userId: string): Promise<GroupInvite[]> {
  const { data, error } = await supabase
    .from("community_group_invites")
    .select(
      "id,group_id,inviter_id,invitee_id,status,group:community_groups(name,emoji),inviter:profiles!community_group_invites_inviter_id_fkey(full_name)",
    )
    .eq("invitee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);
  throwIfError(error);
  return (data || []) as unknown as GroupInvite[];
}
