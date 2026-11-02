import React, { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/lib/supabase";

const REVIEW_FIELDS = "id, reviewer_id, reviewee_id, rating, body, created_at, updated_at, author:profiles!neighbor_reviews_reviewer_id_fkey(full_name, account_type)";
type Review = { id: number; reviewer_id: string; rating: number; body: string; created_at: string; author: { full_name: string; account_type: string } | null };
type ReviewState = { targetId?: string; viewerId: string | null; reviews: Review[]; businessNames: Record<string, string>; loading: boolean; error: string | null };
const initialState = (targetId?: string): ReviewState => ({ targetId, viewerId: null, reviews: [], businessNames: {}, loading: Boolean(targetId), error: null });

export function useProfileReviews(targetId?: string, isOwnProfile = false) {
  const [state, setState] = useState<ReviewState>(() => initialState(targetId));
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  const currentTarget = useRef(targetId);
  currentTarget.current = targetId;

  useEffect(() => {
    const run = ++generation.current;
    let active = true;
    setState(initialState(targetId));
    if (!targetId) return () => { active = false; };
    void (async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error("Sign in to view and leave reviews.");
        const reviews: Review[] = [];
        for (let offset = 0; ; offset += 1000) {
          const { data, error } = await supabase.from("neighbor_reviews").select(REVIEW_FIELDS)
            .eq("reviewee_id", targetId).order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 999);
          if (error) throw error;
          reviews.push(...(data || []) as Review[]);
          if (!data || data.length < 1000) break;
        }
        const authorIds = [...new Set([user.id, ...reviews.filter(r => r.author?.account_type === "business").map(r => r.reviewer_id)])];
        const { data: businesses } = await supabase.from("business_profiles").select("user_id, business_name").in("user_id", authorIds);
        const businessNames = Object.fromEntries((businesses || []).map(b => [b.user_id, b.business_name]));
        if (active && generation.current === run) setState({ targetId, viewerId: user.id, reviews, businessNames, loading: false, error: null });
      } catch (error: any) {
        if (active && generation.current === run) setState({ ...initialState(targetId), loading: false, error: error?.message || "Reviews could not be loaded. Please try again." });
      }
    })();
    return () => { active = false; generation.current++; };
  }, [targetId, reload]);

  const visible = state.targetId === targetId ? state : initialState(targetId);
  const average = visible.reviews.length ? visible.reviews.reduce((sum, r) => sum + r.rating, 0) / visible.reviews.length : 0;
  const ownReview = visible.reviews.find(r => r.reviewer_id === visible.viewerId);
  const canReview = Boolean(targetId && visible.viewerId && targetId !== visible.viewerId && !isOwnProfile && !visible.loading && !visible.error);

  async function save(rating: number, body: string) {
    if (!canReview || !targetId) throw new Error("You cannot review this profile.");
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Choose a rating from 1 to 5 stars.");
    const trimmed = body.trim();
    if (!trimmed || trimmed.length > 2000) throw new Error("Write a review between 1 and 2,000 characters.");
    const run = generation.current;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user || user.id !== visible.viewerId) throw new Error("Your session changed. Reload this profile before reviewing.");
    if (currentTarget.current !== targetId || generation.current !== run) throw new Error("The profile changed. Please try again.");
    const { data, error } = await supabase.from("neighbor_reviews").upsert({
      reviewer_id: user.id, reviewee_id: targetId, rating, body: trimmed, updated_at: new Date().toISOString(),
    }, { onConflict: "reviewer_id,reviewee_id" }).select(REVIEW_FIELDS).single();
    if (error) throw error;
    if (!data) throw new Error("Your review was not saved. Please try again.");
    if (currentTarget.current === targetId && generation.current === run) {
      setState(previous => ({ ...previous, reviews: [data as Review, ...previous.reviews.filter(r => r.reviewer_id !== user.id)] }));
    }
  }

  return { ...visible, average, ownReview, canReview, isSelf: isOwnProfile || targetId === visible.viewerId,
    displayRating: visible.loading || visible.error ? "—" : average.toFixed(1), save,
    retry: () => setReload(value => value + 1) };
}

type ReviewsModel = ReturnType<typeof useProfileReviews>;

function ReviewForm({ model, name }: { model: ReviewsModel; name: string }) {
  const [picked, setPicked] = useState(model.ownReview?.rating || 0);
  const [hovered, setHovered] = useState(0);
  const [body, setBody] = useState(model.ownReview?.body || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const saving = useRef(false);
  useEffect(() => { setPicked(model.ownReview?.rating || 0); setBody(model.ownReview?.body || ""); }, [model.ownReview?.id]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(null); setSaved(false);
    try { await model.save(picked, body); setSaved(true); }
    catch (error: any) { setError(error?.message || "Your review could not be saved. Please try again."); }
    finally { saving.current = false; setBusy(false); }
  }

  return <form onSubmit={submit} className="bg-white rounded-xl border border-border p-5">
    <h3 className="font-semibold text-sm mb-3">{model.ownReview ? "Your review" : "Write a Review"}</h3>
    <p className="text-xs text-muted-foreground mb-3">Share your experience with {name}. Choose stars and write a short review.</p>
    <div role="group" aria-label="Your star rating" className="flex gap-1 mb-3" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map(star => <button key={star} type="button" aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
        aria-pressed={picked === star} disabled={busy} onMouseEnter={() => setHovered(star)}
        onClick={() => { setPicked(star); setHovered(0); setSaved(false); }}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50">
        <Star size={28} aria-hidden="true" className={star <= (hovered || picked) ? "fill-amber-400 text-amber-400" : "text-stone-400"} />
      </button>)}
    </div>
    <p className="text-xs text-muted-foreground mb-2" aria-live="polite">{picked ? `${picked} out of 5 stars selected` : "No rating selected"}</p>
    <textarea aria-label="Your review" rows={3} maxLength={2000} required disabled={busy} value={body}
      onChange={event => { setBody(event.target.value); setSaved(false); }} placeholder={`How was your experience with ${name}?`}
      className="w-full bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
    {error && <p role="alert" className="text-sm text-red-700 mt-2">Review not saved: {error}</p>}
    {saved && <p role="status" className="text-sm text-emerald-700 mt-2">Your review was saved — thank you!</p>}
    <button type="submit" disabled={busy || !picked || !body.trim()} className="mt-3 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40">
      {busy ? "Saving…" : model.ownReview ? "Update Review" : "Submit Review"}
    </button>
  </form>;
}

export function ProfileReviewsPanel({ model, name }: { model: ReviewsModel; name: string }) {
  if (model.loading) return <p role="status" className="p-5">Loading reviews…</p>;
  if (model.error) return <div className="bg-white rounded-xl border border-border p-5"><p role="alert">{model.error}</p><button type="button" onClick={model.retry} className="mt-3 text-primary underline">Retry loading reviews</button></div>;
  return <div className="flex flex-col gap-4">
    <section className="bg-white rounded-xl border border-border p-5" aria-label="Rating summary">
      <h2 className="font-semibold mb-2">Ratings &amp; Reviews</h2>
      <p className="text-3xl font-bold">{model.displayRating}<span className="ml-2 text-sm font-normal">out of 5 · {model.reviews.length} {model.reviews.length === 1 ? "review" : "reviews"}</span></p>
      {!model.reviews.length && <p className="text-sm text-muted-foreground mt-2">No reviews yet.</p>}
    </section>
    {model.canReview ? <ReviewForm key={model.targetId} model={model} name={name} />
      : <p className="text-sm text-muted-foreground">{model.isSelf ? "You cannot rate your own profile." : "Reviews are available for registered Neighborly profiles."}</p>}
    {model.reviews.map(review => <article key={review.id} className="bg-white rounded-xl border border-border p-5">
      <p className="font-semibold text-sm">{model.businessNames[review.reviewer_id] || review.author?.full_name || "Neighborly member"}</p>
      <div className="flex items-center gap-1 mt-1" aria-label={`${review.rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map(star => <Star key={star} size={14} aria-hidden="true" className={star <= review.rating ? "fill-amber-400 text-amber-400" : "text-stone-300"} />)}
        <time className="ml-2 text-xs text-muted-foreground" dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString()}</time>
      </div>
      <p className="text-sm mt-3 whitespace-pre-wrap break-words">{review.body}</p>
    </article>)}
  </div>;
}
