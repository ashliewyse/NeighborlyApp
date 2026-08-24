import { FormEvent, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, LoaderCircle, MessageSquare, Send, UserRound, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface MessagingContact {
  id: string;
  name: string;
  avatarUrl?: string | null;
  accountType?: "personal" | "business";
  latestMessage?: string;
  latestMessageAt?: string;
  unreadCount?: number;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface InboxRow {
  other_user_id: string;
  last_message_id: string;
  last_sender_id: string;
  last_recipient_id: string;
  last_message_body: string;
  last_message_read_at: string | null;
  last_message_created_at: string;
  unread_count: number;
}

const MESSAGE_PAGE_SIZE = 40;

function formatMessageTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ContactAvatar({ contact, size = "md" }: { contact: MessagingContact; size?: "sm" | "md" }) {
  const classes = size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  if (contact.avatarUrl) {
    return <img src={contact.avatarUrl} alt="" className={`${classes} rounded-full border border-border object-cover`} />;
  }
  const initials = contact.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase()).join("") || "N";
  return <span className={`${classes} flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-white`} aria-hidden="true">{initials}</span>;
}

export function MessagingModal({
  open,
  onClose,
  currentUserId,
  initialContact,
  onUnreadChange,
  onProfileOpen,
}: {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  initialContact: MessagingContact | null;
  onUnreadChange: () => void;
  onProfileOpen: (contact: MessagingContact) => void;
}) {
  const [contacts, setContacts] = useState<MessagingContact[]>([]);
  const [activeContact, setActiveContact] = useState<MessagingContact | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function loadInbox(showLoading = false) {
    if (showLoading) setLoading(true);
    const { data, error: inboxError } = await supabase.rpc("get_my_inbox");
    if (inboxError) {
      setError("Messages could not be loaded. Please try again.");
      setLoading(false);
      return;
    }

    const inboxRows = (data || []) as InboxRow[];
    const contactIds = inboxRows.map((row) => row.other_user_id);
    if (initialContact && initialContact.id !== currentUserId && !contactIds.includes(initialContact.id)) {
      contactIds.unshift(initialContact.id);
    }

    const [profilesResult, businessesResult] = contactIds.length
      ? await Promise.all([
          supabase.from("profiles").select("id, full_name, avatar_url, account_type").in("id", contactIds),
          supabase.from("business_profiles").select("user_id, business_name, logo_url").in("user_id", contactIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

    if (profilesResult.error || businessesResult.error) {
      setError("Neighbor details could not be loaded.");
      setLoading(false);
      return;
    }

    const profileById = new Map((profilesResult.data || []).map((profile: any) => [profile.id, profile]));
    const businessById = new Map((businessesResult.data || []).map((business: any) => [business.user_id, business]));
    const summaryById = new Map(inboxRows.map((row) => [row.other_user_id, row]));

    const nextContacts = contactIds.map((id): MessagingContact => {
      const profile: any = profileById.get(id);
      const business: any = businessById.get(id);
      const preferred = initialContact?.id === id ? initialContact : null;
      const summary = summaryById.get(id);
      const isBusiness = Boolean(business) || profile?.account_type === "business" || preferred?.accountType === "business";
      return {
        id,
        name: isBusiness ? business?.business_name || preferred?.name || profile?.full_name || "Local Business" : profile?.full_name || preferred?.name || "Neighbor",
        avatarUrl: isBusiness ? business?.logo_url || preferred?.avatarUrl || profile?.avatar_url || null : profile?.avatar_url || preferred?.avatarUrl || null,
        accountType: isBusiness ? "business" : "personal",
        latestMessage: summary?.last_message_body,
        latestMessageAt: summary?.last_message_created_at,
        unreadCount: Number(summary?.unread_count || 0),
      };
    }).sort((left, right) => new Date(right.latestMessageAt || 0).getTime() - new Date(left.latestMessageAt || 0).getTime());

    setContacts(nextContacts);
    setActiveContact((current) => {
      const preferredId = initialContact?.id || current?.id;
      return preferredId ? nextContacts.find((contact) => contact.id === preferredId) || current || initialContact : current;
    });
    setError(null);
    setLoading(false);
  }

  async function loadConversation(contactId: string, before?: string) {
    before ? setLoadingOlder(true) : setLoadingConversation(true);
    let request = supabase
      .from("direct_messages")
      .select("id, sender_id, recipient_id, body, read_at, created_at")
      .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${contactId}),and(sender_id.eq.${contactId},recipient_id.eq.${currentUserId})`)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(MESSAGE_PAGE_SIZE + 1);
    if (before) request = request.lt("created_at", before);

    const { data, error: conversationError } = await request;
    if (conversationError) {
      setError("This conversation could not be loaded.");
      setLoadingConversation(false);
      setLoadingOlder(false);
      return;
    }

    const rows = (data || []) as DirectMessage[];
    const page = rows.slice(0, MESSAGE_PAGE_SIZE).reverse();
    setHasOlder(rows.length > MESSAGE_PAGE_SIZE);
    setMessages((current) => before
      ? [...page.filter((message) => !current.some((existing) => existing.id === message.id)), ...current]
      : page,
    );
    setError(null);
    setLoadingConversation(false);
    setLoadingOlder(false);
  }

  useEffect(() => {
    if (!open) return;
    void loadInbox(true);
  }, [open, currentUserId, initialContact?.id]);

  useEffect(() => {
    if (!open || !activeContact?.id) {
      setMessages([]);
      return;
    }
    void loadConversation(activeContact.id);
  }, [open, activeContact?.id, currentUserId]);

  useEffect(() => {
    if (!open) return;
    const channel = supabase
      .channel(`user:${currentUserId}:inbox`, { config: { private: true } })
      .on("broadcast", { event: "message_created" }, ({ payload }) => {
        const message = payload as DirectMessage;
        if (!message?.id || message.recipient_id !== currentUserId) return;
        setMessages((current) => {
          if (message.sender_id !== activeContact?.id || current.some((existing) => existing.id === message.id)) return current;
          return [...current, message];
        });
        void loadInbox();
        onUnreadChange();
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [open, currentUserId, activeContact?.id]);

  useEffect(() => {
    if (!open || !activeContact) return;
    const unread = messages.filter((message) => message.sender_id === activeContact.id && message.recipient_id === currentUserId && !message.read_at);
    if (!unread.length) return;
    let cancelled = false;
    void (async () => {
      const readAt = new Date().toISOString();
      const { error: readError } = await supabase
        .from("direct_messages")
        .update({ read_at: readAt })
        .eq("sender_id", activeContact.id)
        .eq("recipient_id", currentUserId)
        .is("read_at", null);
      if (cancelled || readError) return;
      setMessages((current) => current.map((message) => unread.some((item) => item.id === message.id) ? { ...message, read_at: readAt } : message));
      void loadInbox();
      onUnreadChange();
    })();
    return () => { cancelled = true; };
  }, [open, activeContact?.id, currentUserId, messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeContact?.id]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!activeContact || !body || sending) return;
    if (activeContact.id === currentUserId) {
      setError("You cannot send a message to your own account.");
      return;
    }

    setSending(true);
    setError(null);
    const { data, error: sendError } = await supabase
      .from("direct_messages")
      .insert({ sender_id: currentUserId, recipient_id: activeContact.id, body })
      .select("id, sender_id, recipient_id, body, read_at, created_at")
      .single();
    if (sendError || !data) {
      setError("Your message was not sent. Please try again.");
      setSending(false);
      return;
    }

    setDraft("");
    setMessages((current) => current.some((message) => message.id === data.id) ? current : [...current, data as DirectMessage]);
    setSending(false);
    void loadInbox();
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  const oldestMessageAt = messages[0]?.created_at;

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-0 z-[81] h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-white shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[min(760px,92dvh)] sm:max-h-[92dvh] sm:w-[min(980px,94vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-border" aria-describedby={undefined}>
          <div className="flex h-full flex-col">
            <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border px-4">
              <Dialog.Title className="flex items-center gap-2 font-semibold"><MessageSquare size={18} className="text-primary" /> Messages</Dialog.Title>
              <Dialog.Close onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close messages"><X size={17} /></Dialog.Close>
            </div>

            <div className="grid min-h-0 flex-1 md:grid-cols-[300px_1fr]">
              <aside className={`${activeContact ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-border bg-muted/20`}>
                <div className="border-b border-border px-4 py-3">
                  <button type="button" onClick={onClose} className="mb-2 inline-flex items-center gap-1 rounded-lg py-1 pr-2 text-sm font-medium text-primary hover:bg-secondary md:hidden"><ChevronLeft size={18} /> Back</button>
                  <p className="text-sm font-semibold">Conversations</p>
                  <p className="text-xs text-muted-foreground">Private messages with your neighbors</p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><LoaderCircle size={17} className="animate-spin" /> Loading…</div>
                  ) : contacts.length === 0 ? (
                    <div className="px-6 py-12 text-center"><MessageSquare size={30} className="mx-auto mb-3 text-muted-foreground/40" /><p className="text-sm font-medium">No conversations yet</p><p className="mt-1 text-xs text-muted-foreground">Open a profile and choose Message to get started.</p></div>
                  ) : contacts.map((contact) => (
                    <button key={contact.id} onClick={() => setActiveContact(contact)} className={`flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary/60 ${activeContact?.id === contact.id ? "bg-blue-50" : ""}`}>
                      <ContactAvatar contact={contact} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{contact.name}</span><span className="flex-shrink-0 text-[10px] text-muted-foreground">{formatMessageTime(contact.latestMessageAt)}</span></span>
                        <span className="mt-0.5 flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{contact.latestMessage || "Start a conversation"}</span>{Boolean(contact.unreadCount) && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">{contact.unreadCount! > 99 ? "99+" : contact.unreadCount}</span>}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </aside>

              <section className={`${activeContact ? "flex" : "hidden md:flex"} min-h-0 flex-col bg-white`}>
                {activeContact ? (
                  <>
                    <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-border px-3 sm:px-4">
                      <button onClick={() => setActiveContact(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted md:hidden" aria-label="Back to conversations"><ChevronLeft size={20} /></button>
                      <button onClick={() => onProfileOpen(activeContact)} className="flex min-w-0 items-center gap-3 text-left" aria-label={`Open ${activeContact.name}'s profile`}>
                        <ContactAvatar contact={activeContact} size="sm" />
                        <span className="min-w-0"><span className="block truncate text-sm font-semibold hover:text-blue-600">{activeContact.name}</span><span className="block text-xs text-muted-foreground">{activeContact.accountType === "business" ? "Local business" : "Neighbor"} · View profile</span></span>
                      </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto bg-muted/10 px-4 py-4 sm:px-6">
                      {hasOlder && oldestMessageAt && <div className="mb-4 text-center"><button onClick={() => void loadConversation(activeContact.id, oldestMessageAt)} disabled={loadingOlder} className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-blue-600 shadow-sm hover:bg-muted disabled:opacity-50">{loadingOlder ? "Loading…" : "Load older messages"}</button></div>}
                      {loadingConversation ? (
                        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><LoaderCircle size={17} className="animate-spin" /> Loading conversation…</div>
                      ) : messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center"><UserRound size={32} className="mb-3 text-muted-foreground/40" /><p className="text-sm font-medium">Start the conversation</p><p className="mt-1 max-w-xs text-xs text-muted-foreground">Send a friendly message to {activeContact.name}.</p></div>
                      ) : messages.map((message) => {
                        const own = message.sender_id === currentUserId;
                        return <div key={message.id} className={`mb-3 flex ${own ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-sm ${own ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md border border-border bg-white text-foreground"}`}><p className="whitespace-pre-wrap break-words text-sm">{message.body}</p><p className={`mt-1 text-[10px] ${own ? "text-blue-100" : "text-muted-foreground"}`}>{formatMessageTime(message.created_at)}</p></div></div>;
                      })}
                      <div ref={endRef} />
                    </div>

                    {error && <p className="flex-shrink-0 border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>}
                    <form onSubmit={sendMessage} className="flex flex-shrink-0 items-end gap-2 border-t border-border bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4">
                      <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder={`Message ${activeContact.name}`} className="min-w-0 flex-1 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500" />
                      <button type="submit" disabled={sending || !draft.trim()} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40" aria-label="Send message"><Send size={17} /></button>
                    </form>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center"><MessageSquare size={36} className="mb-3 text-muted-foreground/40" /><p className="font-semibold">Choose a conversation</p><p className="mt-1 text-sm text-muted-foreground">Select a neighbor to read or send messages.</p></div>
                )}
              </section>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
