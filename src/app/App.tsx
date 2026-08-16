import React, { useState, useEffect, useRef } from "react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import neighborlyLogo from "@/imports/Copilot_20260807_041314.png";
import neighborlyAppLogo from "@/imports/watermarked_img_9245041771390677153.jpg";
import * as Dialog from "@radix-ui/react-dialog";
import * as SliderPrimitive from "@radix-ui/react-slider";
import {
  Bell,
  Search,
  MapPin,
  ChevronDown,
  Heart,
  MessageCircle,
  Share2,
  ShieldAlert,
  CalendarDays,
  ShoppingBag,
  Megaphone,
  Leaf,
  MoreHorizontal,
  Plus,
  Users,
  Star,
  Briefcase,
  Home,
  X,
  Send,
  Bookmark,
  ThumbsUp,
  Flag,
  Phone,
  Mail,
  Globe,
  Clock,
  ChevronLeft,
  CheckCircle2,
  Award,
  Zap,
  Trophy,
  Shield,
  BadgeCheck,
  Smile,
  HandHeart,
  CalendarCheck,
  Eye,
  Camera,
  ChevronRight,
  MessageSquare,
  MapPinned,
  ExternalLink,
  LogOut,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BusinessBadgeType = "neighbor-fave" | "verified-pro" | "elite";
type UserBadgeType = "champion" | "helpful" | "organizer" | "safety-watcher" | "newcomer";

interface BusinessReview {
  id: number;
  author: string;
  authorBadges: UserBadgeType[];
  rating: number;
  date: string;
  body: string;
  helpful: number;
}

interface Business {
  id: number;
  name: string;
  category: string;
  city: string;
  rating: number;
  reviewCount: number;
  badges: BusinessBadgeType[];
  description: string;
  services: string[];
  photos: { url: string; alt: string }[];
  phone: string;
  email: string;
  website: string;
  address: string;
  hours: { day: string; time: string }[];
  founded: string;
  owner: string;
  reviews: BusinessReview[];
}

interface NeighborReview {
  id: number;
  author: string;
  authorBadges: UserBadgeType[];
  rating: number;
  date: string;
  body: string;
  helpful: number;
}

interface UserProfile {
  name: string;
  neighborhood: string;
  city: string;
  joinDate: string;
  bio: string;
  badges: UserBadgeType[];
  posts: number;
  neighbors: number;
  helpfulVotes: number;
  recsGiven: number;
  rating: number;
  ratingCount: number;
  neighborReviews: NeighborReview[];
  galleryPhotos: { url: string; alt: string }[];
  recentActivity: { type: string; text: string; time: string }[];
}

type PostCategory = "news" | "safety" | "event" | "forsale" | "recommendation" | "general";
type ActiveView =
  | { page: "feed" }
  | { page: "business"; id: number }
  | { page: "user"; name: string }
  | { page: "auth"; mode: "signin" | "signup" }
  | { page: "search" }
  | { page: "events" }
  | { page: "classifieds" }
  | { page: "messages" };

interface Comment {
  id: number;
  author: string;
  authorBadges: UserBadgeType[];
  body: string;
  time: string;
  likes: number;
}
interface Post {
  id: number;
  author: string;
  authorBadges: UserBadgeType[];
  neighborhood: string;
  city: string;
  time: string;
  category: PostCategory;
  title?: string;
  body: string;
  image?: string;
  likes: number;
  comments: Comment[];
  bookmarked: boolean;
  liked: boolean;
}

interface Message {
  id: number;
  sender: string;
  recipient: string;
  text: string;
  time: string;
}

// ─── Badge Meta ───────────────────────────────────────────────────────────────

const BIZ_BADGE_META: Record<BusinessBadgeType, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
  "neighbor-fave": { label: "Neighbor Fave", icon: <Star size={10} className="fill-current" />, color: "bg-amber-50 text-amber-700 border-amber-200", desc: "Consistently top-rated by neighbors" },
  "verified-pro": { label: "Verified Local Pro", icon: <BadgeCheck size={10} />, color: "bg-sky-50 text-sky-700 border-sky-200", desc: "Identity and license verified by Neighborly" },
  elite: { label: "Elite Business", icon: <Trophy size={10} />, color: "bg-violet-50 text-violet-700 border-violet-200", desc: "Top 1% of businesses in the area" },
};

const USER_BADGE_META: Record<UserBadgeType, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
  champion: { label: "Community Champion", icon: <Award size={10} />, color: "bg-purple-50 text-purple-700 border-purple-200", desc: "Outstanding community contributions" },
  helpful: { label: "Helpful Neighbor", icon: <HandHeart size={10} />, color: "bg-emerald-50 text-emerald-700 border-emerald-200", desc: "Frequently marked helpful by neighbors" },
  organizer: { label: "Event Organizer", icon: <CalendarCheck size={10} />, color: "bg-violet-50 text-violet-700 border-violet-200", desc: "Hosts and organizes community events" },
  "safety-watcher": { label: "Safety Watcher", icon: <Shield size={10} />, color: "bg-red-50 text-red-700 border-red-200", desc: "Active in keeping the neighborhood safe" },
  newcomer: { label: "New Neighbor", icon: <Leaf size={10} />, color: "bg-teal-50 text-teal-700 border-teal-200", desc: "Joined within the past 6 months" },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const LOCATIONS = ["All Areas", "Michigan City", "La Porte", "New Buffalo", "Long Beach"] as const;
type LocationName = (typeof LOCATIONS)[number];

const BUSINESSES: Business[] = [
  {
    id: 1,
    name: "Martinez Plumbing",
    category: "Home Services",
    city: "Michigan City",
    rating: 4.9,
    reviewCount: 47,
    badges: ["neighbor-fave", "verified-pro"],
    owner: "Rafael Martinez",
    founded: "2011",
    description: "Family-owned plumbing company serving Maplewood Heights and surrounding neighborhoods for over 13 years.",
    services: ["Emergency Repairs", "Pipe Installation", "Water Heater Service", "Drain Cleaning"],
    photos: [{ url: "https://images.unsplash.com/photo-1676210134188-4c05dd172f89?w=600&h=400&fit=crop&auto=format", alt: "Plumber working" }],
    phone: "(555) 842-3901",
    email: "rafael@martinezplumbing.com",
    website: "martinezplumbing.com",
    address: "112 Cedar Ave, Maplewood Heights",
    hours: [{ day: "Mon – Fri", time: "7:00 AM – 6:00 PM" }],
    reviews: [
      { id: 1, author: "Grace Okonkwo", authorBadges: ["helpful"], rating: 5, date: "Aug 2, 2026", body: "Had a burst pipe emergency and they arrived in under 2 hours.", helpful: 14 }
    ],
  },
];

const USER_PROFILES: Record<string, UserProfile> = {
  "Maria Santos": {
    name: "Maria Santos",
    neighborhood: "Michigan City",
    city: "Michigan City",
    joinDate: "March 2019",
    bio: "Born and raised in Maplewood Heights. Passionate about neighborhood safety, local schools, and getting to know my neighbors. Mom of two, dog owner (Biscuit says hi), and avid gardener.",
    badges: ["champion", "safety-watcher", "helpful"],
    posts: 84,
    neighbors: 231,
    helpfulVotes: 347,
    recsGiven: 29,
    rating: 4.7,
    ratingCount: 3,
    neighborReviews: [
      { id: 1, author: "James Whitfield", authorBadges: ["organizer"], rating: 5, date: "Aug 3, 2026", body: "Maria is the heart of this neighborhood.", helpful: 18 }
    ],
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&h=400&fit=crop&auto=format", alt: "Park" },
    ],
    recentActivity: [{ type: "post", text: "Posted a safety alert", time: "2 hours ago" }],
  },
  "Ashlie Wyse": {
    name: "Ashlie Wyse",
    neighborhood: "Michigan City",
    city: "Michigan City",
    joinDate: "August 2026",
    bio: "Owner of Beachside Cleaners. Local resident in Michigan City.",
    badges: ["newcomer"],
    posts: 1,
    neighbors: 1,
    helpfulVotes: 0,
    recsGiven: 0,
    rating: 5.0,
    ratingCount: 1,
    neighborReviews: [],
    galleryPhotos: [],
    recentActivity: [{ type: "post", text: "Joined Neighborly", time: "Just now" }],
  },
};

const AVATAR_COLORS = ["bg-emerald-700", "bg-amber-600", "bg-sky-700", "bg-rose-600", "bg-violet-700", "bg-teal-700"];

const CATEGORY_META: Record<PostCategory, { label: string; color: string; icon: React.ReactNode }> = {
  news: { label: "Local News", color: "text-sky-700 bg-sky-50 border-sky-200", icon: <Megaphone size={11} /> },
  safety: { label: "Safety", color: "text-red-700 bg-red-50 border-red-200", icon: <ShieldAlert size={11} /> },
  event: { label: "Event", color: "text-violet-700 bg-violet-50 border-violet-200", icon: <CalendarDays size={11} /> },
  forsale: { label: "For Sale", color: "text-amber-700 bg-amber-50 border-amber-200", icon: <ShoppingBag size={11} /> },
  recommendation: { label: "Recommendation", color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: <Star size={11} /> },
  general: { label: "General", color: "text-stone-600 bg-stone-50 border-stone-200", icon: <Leaf size={11} /> },
};

const INITIAL_POSTS: Post[] = [
  {
    id: 1,
    author: "Maria Santos",
    authorBadges: ["champion", "safety-watcher"],
    neighborhood: "Michigan City",
    city: "Michigan City",
    time: "2 hours ago",
    category: "safety",
    title: "Heads up: Car break-ins on Elm & 4th",
    body: "There were two car break-ins last night on Elm Street near 4th Ave.",
    likes: 47,
    comments: [],
    bookmarked: false,
    liked: false,
  },
];

const EVENTS = [
  { id: 1, title: "Community Cleanup", date: "Sat Aug 10", time: "9:00 AM", going: 34, icon: <Leaf size={14} /> },
  { id: 2, title: "Farmer's Market", date: "Sun Aug 11", time: "8:00 AM", going: 87, icon: <ShoppingBag size={14} /> },
  { id: 3, title: "Block Party Planning", date: "Tue Aug 13", time: "7:00 PM", going: 22, icon: <Users size={14} /> },
];

// ─── Shared Components ────────────────────────────────────────────────────────

function Avatar({ name, size = "md", src }: { name: string; size?: "sm" | "md" | "lg" | "xl"; src?: string | null }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const color = AVATAR_COLORS[name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  const sz = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-11 h-11 text-base", xl: "w-16 h-16 text-xl" }[size];
  if (src) return <img src={src} alt={name} className={`${sz} rounded-full object-cover flex-shrink-0`} />;
  return <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>{initials}</div>;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={12} className={s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-stone-200"} />
      ))}
    </div>
  );
}

// ─── Auth View ────────────────────────────────────────────────────────────────
function AuthView({ mode, onSwitchMode, onSuccess }: { mode: "signin" | "signup"; onSwitchMode: (m: "signin" | "signup") => void; onSuccess: (name: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"person" | "business">("person");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");

  const handleSubmit = () => {
    const displayName = fullName.trim() || businessName.trim() || username.trim() || email.split("@")[0] || "Ashlie Wyse";
    onSuccess(displayName);
  };

  return (
    <div className="min-h-screen bg-purple-950 flex items-center justify-center p-4 font-['DM_Sans',sans-serif] overflow-y-auto py-10">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-36 mx-auto mb-4">
            <ImageWithFallback src={neighborlyLogo} alt="Neighborly App" className="w-full h-auto object-contain" />
          </div>
          <h1 className="font-['Playfair_Display',serif] font-bold text-2xl text-foreground">
            {mode === "signin" ? "Welcome back" : "Join your neighborhood"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" ? "Sign in with your email to connect with your community" : "Create a personal or business profile"}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {mode === "signup" && (
            <div className="mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Account Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType("person")}
                  className={`flex-1 py-2 text-sm rounded-lg font-medium border transition-colors ${accountType === "person" ? "bg-blue-600 text-white border-blue-600" : "bg-muted text-muted-foreground border-border"}`}
                >
                  Personal Profile
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("business")}
                  className={`flex-1 py-2 text-sm rounded-lg font-medium border transition-colors ${accountType === "business" ? "bg-blue-600 text-white border-blue-600" : "bg-muted text-muted-foreground border-border"}`}
                >
                  Business Profile
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Email (Login)</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>

          {mode === "signup" && (
            <>
              {accountType === "person" ? (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Full Name</label>
                  <input type="text" placeholder="Ashlie Wyse" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Business Name</label>
                  <input type="text" placeholder="Beachside Cleaners" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
              )}
            </>
          )}

          <button onClick={handleSubmit} className="w-full mt-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            {mode === "signin" ? "Sign In" : "Create Account"}
          </button>

          <div className="text-center mt-4">
            {mode === "signin" ? (
              <p className="text-sm text-muted-foreground">
                Don't have an account? <button onClick={() => onSwitchMode("signup")} className="text-blue-600 font-medium hover:underline">Sign up</button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Already have an account? <button onClick={() => onSwitchMode("signin")} className="text-blue-600 font-medium hover:underline">Sign in</button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Business Profile View ────────────────────────────────────────────────────
function BusinessProfileView({ biz, onBack }: { biz: Business; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-purple-950 p-6 text-white font-['DM_Sans',sans-serif]">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-purple-300 hover:text-white mb-4">
        <ChevronLeft size={16} /> Back to feed
      </button>
      <div className="bg-card text-foreground rounded-2xl p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">{biz.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{biz.category} · {biz.city}</p>
        <div className="flex items-center gap-2 mt-2">
          <StarRating rating={biz.rating} />
          <span className="text-sm font-semibold">{biz.rating}</span>
          <span className="text-xs text-muted-foreground">({biz.reviewCount} reviews)</span>
        </div>
        <p className="mt-4 text-sm">{biz.description}</p>
      </div>
    </div>
  );
}

// ─── User Profile View ────────────────────────────────────────────────────────
function UserProfileView({ profile, onBack, isOwnProfile, myAvatarUrl, onAvatarChange, onProfileUpdate }: {
  profile: UserProfile;
  onBack: () => void;
  isOwnProfile?: boolean;
  myAvatarUrl?: string | null;
  onAvatarChange?: (url: string) => void;
  onProfileUpdate?: (updated: Partial<UserProfile>) => void;
}) {
  const [profileTab, setProfileTab] = useState<"about" | "photos" | "reviews">("about");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editNeighborhood, setEditNeighborhood] = useState(profile.neighborhood);
  const [editBio, setEditBio] = useState(profile.bio);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(myAvatarUrl);

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && isOwnProfile) {
      setCoverUrl(URL.createObjectURL(f));
    }
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && isOwnProfile) {
      const url = URL.createObjectURL(f);
      setAvatarUrl(url);
      onAvatarChange?.(url);
    }
  }

  function handleSaveProfile() {
    onProfileUpdate?.({
      name: editName,
      neighborhood: editNeighborhood,
      bio: editBio,
    });
    setIsEditing(false);
  }

  return (
    <div className="min-h-screen bg-background font-['DM_Sans',sans-serif] pb-20">
      {/* Cover Photo */}
      <div className="relative h-44 md:h-56 overflow-hidden bg-purple-900">
        {coverUrl ? (
          <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-700 to-blue-400" />
        )}
        <button onClick={onBack} className="absolute top-4 left-4 flex items-center gap-1.5 text-sm bg-black/40 text-white px-3 py-1.5 rounded-lg hover:bg-black/60 transition-colors backdrop-blur-sm">
          <ChevronLeft size={16} /> Back to feed
        </button>
        {isOwnProfile && (
          <label className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/40 hover:bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-colors backdrop-blur-sm">
            <Camera size={13} /> Change Cover
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          </label>
        )}
      </div>

      {/* Profile Header Bar */}
      <div className="bg-white border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-6 pb-4">
          <div className="flex items-start justify-between -mt-10 pt-0 pb-2">
            <div className="relative flex-shrink-0 mt-1">
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-muted">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <Avatar name={profile.name} size="xl" />
                )}
              </div>
              {isOwnProfile && (
                <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border border-border shadow flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                  <Camera size={12} className="text-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              )}
            </div>

            <div className="flex items-center gap-2 mt-12">
              {isOwnProfile && !isEditing && (
                <button onClick={() => setIsEditing(true)} className="border border-border bg-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-muted transition-colors">
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          <div>
            {isEditing ? (
              <div className="flex flex-col gap-2 max-w-sm mt-2">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full Name" className="border border-border rounded-lg px-3 py-1.5 text-sm font-medium text-foreground" />
                <input type="text" value={editNeighborhood} onChange={(e) => setEditNeighborhood(e.target.value)} placeholder="Neighborhood / City" className="border border-border rounded-lg px-3 py-1.5 text-sm text-foreground" />
              </div>
            ) : (
              <>
                <h1 className="font-['Playfair_Display',serif] font-bold text-2xl leading-tight">{profile.name}</h1>
                <div className="flex items-center gap-1.5 mt-1">
                  <StarRating rating={profile.rating} />
                  <span className="text-sm font-semibold ml-0.5">{profile.rating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({profile.ratingCount} ratings)</span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin size={11} /> {profile.neighborhood} · Member since {profile.joinDate}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {profile.badges.map((b) => (
                    <span key={b} className="text-xs font-medium px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
                      {b === "champion" ? "Community Champion" : b === "safety-watcher" ? "Safety Watcher" : "Helpful Neighbor"}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Profile Navigation Tabs */}
          <div className="flex gap-6 border-t border-border mt-6 pt-2">
            <button onClick={() => setProfileTab("about")} className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${profileTab === "about" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>About</button>
            <button onClick={() => setProfileTab("photos")} className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${profileTab === "photos" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Photos ({profile.galleryPhotos.length})</button>
            <button onClick={() => setProfileTab("reviews")} className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${profileTab === "reviews" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>Reviews ({profile.neighborReviews.length})</button>
          </div>
        </div>
      </div>

      {/* Profile Body Content */}
      <div className="max-w-4xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
        <div>
          {profileTab === "about" && (
            <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
              <h2 className="font-semibold text-sm mb-3">About</h2>
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <textarea rows={4} value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Write your bio..." className="w-full bg-muted border border-border rounded-lg p-3 text-sm resize-none text-foreground" />
                  <div className="flex gap-2">
                    <button onClick={handleSaveProfile} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg">Save Changes</button>
                    <button onClick={() => setIsEditing(false)} className="px-3 py-2 border border-border rounded-lg text-xs">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>
              )}
            </div>
          )}

          {profileTab === "photos" && (
            <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
              <h2 className="font-semibold text-sm mb-4">Gallery Photos</h2>
              {profile.galleryPhotos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No photos added yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {profile.galleryPhotos.map((p, idx) => (
                    <img key={idx} src={p.url} alt={p.alt} className="w-full h-32 object-cover rounded-lg border border-border" />
                  ))}
                </div>
              )}
            </div>
          )}

          {profileTab === "reviews" && (
            <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
              <h2 className="font-semibold text-sm mb-4">Neighbor Reviews</h2>
              {profile.neighborReviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {profile.neighborReviews.map((rev) => (
                    <div key={rev.id} className="border-b border-border pb-4 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{rev.author}</span>
                        <span className="text-xs text-muted-foreground">{rev.date}</span>
                      </div>
                      <StarRating rating={rev.rating} />
                      <p className="text-sm text-foreground/80 mt-2">{rev.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Community Stats Sidebar Card */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm self-start">
          <h3 className="font-semibold text-sm mb-4">Community Stats</h3>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-2"><Megaphone size={15} className="text-primary" /> Posts</span>
              <span className="font-semibold text-foreground">{profile.posts}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-2"><Users size={15} className="text-primary" /> Neighbors</span>
              <span className="font-semibold text-foreground">{profile.neighbors}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-2"><ThumbsUp size={15} className="text-primary" /> Helpful votes</span>
              <span className="font-semibold text-foreground">{profile.helpfulVotes}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-2"><Star size={15} className="text-primary" /> Recs given</span>
              <span className="font-semibold text-foreground">{profile.recsGiven}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Search View ─────────────────────────────────────────────────────────────
function SearchView({ onBack, onUserClick, onBusinessClick, groups, activeLocation }: {
  onBack: () => void;
  onUserClick: (name: string) => void;
  onBusinessClick: (id: number) => void;
  groups: any[];
  activeLocation: LocationName;
}) {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase().trim();

  const matchedPeople = Object.values(USER_PROFILES).filter((p) => q === "" || p.name.toLowerCase().includes(q));
  const matchedBusinesses = BUSINESSES.filter((b) => q === "" || b.name.toLowerCase().includes(q));

  return (
    <div className="min-h-screen bg-purple-950 font-['DM_Sans',sans-serif] pb-20 text-white">
      <div className="sticky top-0 z-40 bg-card text-foreground border-b border-border p-4 flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground"><ChevronLeft size={20} /></button>
        <div className="flex-1 flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
          <Search size={16} className="text-muted-foreground" />
          <input autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people, businesses..." className="flex-1 bg-transparent text-sm focus:outline-none" />
        </div>
      </div>
      <div className="p-4 max-w-2xl mx-auto flex flex-col gap-3">
        {matchedPeople.map((p) => (
          <button key={p.name} onClick={() => onUserClick(p.name)} className="bg-card text-foreground p-3 rounded-xl border border-border flex items-center gap-3 text-left">
            <Avatar name={p.name} size="md" />
            <div><p className="font-semibold text-sm">{p.name}</p><p className="text-xs text-muted-foreground">{p.neighborhood}</p></div>
          </button>
        ))}
        {matchedBusinesses.map((b) => (
          <button key={b.id} onClick={() => onBusinessClick(b.id)} className="bg-card text-foreground p-3 rounded-xl border border-border flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-secondary text-primary flex items-center justify-center font-bold text-sm">{b.name.slice(0, 2)}</div>
            <div><p className="font-semibold text-sm">{b.name}</p><p className="text-xs text-muted-foreground">{b.category} · ⭐ {b.rating}</p></div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Events View ──────────────────────────────────────────────────────────────
function EventsView({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-purple-950 font-['DM_Sans',sans-serif] pb-20 text-white">
      <div className="sticky top-0 z-40 bg-card text-foreground border-b border-border p-4 flex items-center gap-3">
        <button onClick={onBack}><ChevronLeft size={20} /></button>
        <h1 className="font-bold text-lg">Upcoming Events</h1>
      </div>
      <div className="p-4 max-w-2xl mx-auto flex flex-col gap-3">
        {EVENTS.map((ev) => (
          <div key={ev.id} className="bg-card text-foreground p-4 rounded-xl border border-border">
            <p className="font-semibold">{ev.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{ev.date} · {ev.time} · {ev.going} going</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Classifieds View ─────────────────────────────────────────────────────────
function ClassifiedsView({ posts, onBack }: { posts: Post[]; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-purple-950 font-['DM_Sans',sans-serif] pb-20 text-white">
      <div className="sticky top-0 z-40 bg-card text-foreground border-b border-border p-4 flex items-center gap-3">
        <button onClick={onBack}><ChevronLeft size={20} /></button>
        <h1 className="font-bold text-lg">Classifieds</h1>
      </div>
      <div className="p-4 max-w-2xl mx-auto flex flex-col gap-3">
        {posts.map((p) => (
          <div key={p.id} className="bg-card text-foreground p-4 rounded-xl border border-border">
            <p className="font-semibold">{p.title}</p>
            <p className="text-sm mt-1">{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Messages View ────────────────────────────────────────────────────────────
function MessagesView({
  currentUser,
  onBack,
}: {
  currentUser: string;
  onBack: () => void;
}) {
  const [activeContact, setActiveContact] = useState<string>("Maria Santos");
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: "Maria Santos", recipient: currentUser, text: "Hey! Welcome to Neighborly!", time: "10:30 AM" },
  ]);
  const [inputText, setInputText] = useState("");

  const contacts = ["Maria Santos", "James Whitfield", "Nadia Petrov", "Grace Okonkwo", "Martinez Plumbing"];

  const chatMessages = messages.filter(
    (m) =>
      (m.sender === currentUser && m.recipient === activeContact) ||
      (m.sender === activeContact && m.recipient === currentUser)
  );

  function handleSend() {
    if (!inputText.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: currentUser,
        recipient: activeContact,
        text: inputText.trim(),
        time: "Just now",
      },
    ]);
    setInputText("");
  }

  return (
    <div className="min-h-screen bg-purple-950 font-['DM_Sans',sans-serif] pb-20 text-white">
      <div className="sticky top-0 z-40 bg-card text-foreground border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-bold text-lg">Messages</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-120px)]">
        {/* Contacts Sidebar */}
        <div className="bg-card text-foreground rounded-2xl border border-border overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border font-semibold text-sm">Conversations</div>
          <div className="overflow-y-auto flex-1">
            {contacts.map((contact) => (
              <button
                key={contact}
                onClick={() => setActiveContact(contact)}
                className={`w-full flex items-center gap-3 p-3 text-left transition-colors border-b border-border/40 ${
                  activeContact === contact ? "bg-secondary font-semibold" : "hover:bg-secondary/50"
                }`}
              >
                <Avatar name={contact} size="sm" />
                <span className="text-sm truncate">{contact}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className="bg-card text-foreground rounded-2xl border border-border flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border flex items-center gap-3 bg-secondary/30">
            <Avatar name={activeContact} size="sm" />
            <span className="font-semibold text-sm">{activeContact}</span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
            {chatMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center my-auto">No messages yet. Say hello!</p>
            ) : (
              chatMessages.map((m) => {
                const isMe = m.sender === currentUser;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        isMe ? "bg-blue-600 text-white rounded-br-none" : "bg-muted text-foreground rounded-bl-none"
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">{m.time}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-border bg-secondary/30 flex gap-2">
            <input
              type="text"
              placeholder={`Message ${activeContact}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 text-foreground"
            />
            <button
              onClick={handleSend}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [composing, setComposing] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>("general");
  const [classifiedPosts, setClassifiedPosts] = useState<Post[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [view, setView] = useState<ActiveView>({ page: "auth", mode: "signin" });
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [activeLocation, setActiveLocation] = useState<LocationName>("All Areas");
  const [locationOpen, setLocationOpen] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string>("Ashlie Wyse");
  const [advertiseOpen, setAdvertiseOpen] = useState(false);
  const [groups, setGroups] = useState([
    { id: 1, name: "🪴 Plant & Garden Club", description: "Share tips, seeds, and local plant swaps", members: 142, joined: false, city: "Michigan City" },
    { id: 2, name: "🐾 Local Pet Owners", description: "Pet-friendly spots and vet recommendations", members: 98, joined: true, city: "Long Beach" },
  ]);

  function toggleJoinGroup(id: number) {
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, joined: !g.joined } : g));
  }

  function goToFeed() { setView({ page: "feed" }); }
  function goToUser(name: string) { if (USER_PROFILES[name]) setView({ page: "user", name }); }
  function goToBusiness(id: number) { setView({ page: "business", id }); }

  if (view.page === "auth") {
    return (
      <AuthView
        mode={view.mode}
        onSwitchMode={(mode) => setView({ page: "auth", mode })}
        onSuccess={(loggedInName) => {
          setCurrentUserName(loggedInName);
          if (!USER_PROFILES[loggedInName]) {
            USER_PROFILES[loggedInName] = {
              name: loggedInName,
              neighborhood: "Michigan City",
              city: "Michigan City",
              joinDate: "August 2026",
              bio: "Active member of the neighborhood community.",
              badges: ["newcomer"],
              posts: 0,
              neighbors: 1,
              helpfulVotes: 0,
              recsGiven: 0,
              rating: 5.0,
              ratingCount: 1,
              neighborReviews: [],
              galleryPhotos: [],
              recentActivity: [{ type: "post", text: "Joined Neighborly", time: "Just now" }],
            };
          }
          setView({ page: "feed" });
        }}
      />
    );
  }

  if (view.page === "business") {
    const biz = BUSINESSES.find((b) => b.id === view.id);
    if (biz) return <BusinessProfileView biz={biz} onBack={goToFeed} />;
  }

  if (view.page === "user") {
    const profile = USER_PROFILES[view.name];
    if (profile)
      return (
        <UserProfileView
          profile={profile}
          onBack={goToFeed}
          isOwnProfile={view.name === currentUserName}
          myAvatarUrl={view.name === currentUserName ? myAvatarUrl : null}
          onAvatarChange={view.name === currentUserName ? setMyAvatarUrl : undefined}
          onProfileUpdate={(updated) => {
            USER_PROFILES[view.name] = { ...profile, ...updated };
            if (updated.name && updated.name !== view.name) {
              USER_PROFILES[updated.name] = USER_PROFILES[view.name];
              delete USER_PROFILES[view.name];
              setCurrentUserName(updated.name);
              setView({ page: "user", name: updated.name });
            } else {
              setView({ ...view });
            }
          }}
        />
      );
  }

  if (view.page === "search") {
    return <SearchView onBack={goToFeed} onUserClick={goToUser} onBusinessClick={goToBusiness} groups={groups} activeLocation={activeLocation} />;
  }

  if (view.page === "events") {
    return <EventsView onBack={goToFeed} />;
  }

  if (view.page === "classifieds") {
    return <ClassifiedsView posts={classifiedPosts} onBack={goToFeed} />;
  }

  if (view.page === "messages") {
    return <MessagesView currentUser={currentUserName} onBack={goToFeed} />;
  }

  const locationFilteredPosts = activeLocation === "All Areas" ? posts : posts.filter((p) => p.city === activeLocation);
  const filteredPosts = activeTab === "all" ? locationFilteredPosts : locationFilteredPosts.filter((p) => p.category === activeTab);

  function handleCreatePost() {
    const text = newPostText.trim();
    if (!text) return;
    const postCity = activeLocation === "All Areas" ? "Michigan City" : activeLocation;
    const newPost: Post = {
      id: Date.now(),
      author: currentUserName,
      authorBadges: ["champion"],
      neighborhood: postCity,
      city: postCity,
      time: "Just now",
      category: selectedCategory,
      body: text,
      likes: 0,
      comments: [],
      bookmarked: false,
      liked: false,
    };
    setPosts([newPost, ...posts]);
    if (selectedCategory === "forsale") setClassifiedPosts([newPost, ...classifiedPosts]);
    setNewPostText("");
    setComposing(false);
  }

  return (
    <div className="min-h-screen bg-purple-950 font-['DM_Sans',sans-serif] relative pb-20 lg:pb-0">
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center gap-4">
          <span className="font-['Playfair_Display',serif] font-bold text-2xl bg-gradient-to-r from-purple-700 to-blue-500 bg-clip-text text-transparent tracking-tight">Neighborly</span>

          <div className="relative">
            <button onClick={() => setLocationOpen((o) => !o)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <MapPin size={14} className="text-primary" />
              <span className="font-medium">{activeLocation}</span>
              <ChevronDown size={13} />
            </button>
            {locationOpen && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                {LOCATIONS.map((loc) => (
                  <button key={loc} onClick={() => { setActiveLocation(loc); setLocationOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-secondary">
                    {loc}
                  </button>
                ))}
              </div>
            )}
          </div>

          <nav className="hidden lg:flex items-center gap-1 mx-auto">
            <button onClick={goToFeed} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-primary">Home</button>
            <button onClick={() => setView({ page: "events" })} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-primary">Events</button>
            <button onClick={() => setView({ page: "classifieds" })} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-primary">Classifieds</button>
            <button onClick={() => setView({ page: "messages" })} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-primary">Messages</button>
            <button onClick={() => setView({ page: "search" })} className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-primary">Search</button>
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setView({ page: "messages" })} className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground" title="Messages"><MessageSquare size={18} /></button>
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground"><Bell size={18} /></button>
            <button onClick={() => goToUser(currentUserName)}><Avatar name={currentUserName} size="sm" src={myAvatarUrl} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <section className="flex flex-col gap-4 min-w-0">
          {!composing ? (
            <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 cursor-pointer shadow-sm" onClick={() => setComposing(true)}>
              <Avatar name={currentUserName} size="md" src={myAvatarUrl} />
              <div className="flex-1 bg-muted rounded-lg px-4 py-2.5 text-sm text-muted-foreground">What's happening in your neighborhood?</div>
              <button className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium"><Plus size={14} /> Post</button>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-primary/30 p-4 shadow-sm flex flex-col gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Post Category</span>
              <div className="flex flex-wrap gap-1.5">
                {(["general", "news", "safety", "event", "forsale", "recommendation"] as PostCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                      selectedCategory === cat ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                    }`}
                  >
                    {CATEGORY_META[cat]?.label || cat}
                  </button>
                ))}
              </div>

              <textarea autoFocus placeholder="Share what's happening in your neighborhood..." value={newPostText} onChange={(e) => setNewPostText(e.target.value)} className="w-full bg-transparent text-sm focus:outline-none resize-none min-h-[90px] text-foreground mt-1" />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setComposing(false)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                <button onClick={handleCreatePost} className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Post</button>
              </div>
            </div>
          )}

          {filteredPosts.map((post) => (
            <article key={post.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => goToUser(post.author)}><Avatar name={post.author} size="md" /></button>
                  <div>
                    <button onClick={() => goToUser(post.author)} className="font-semibold text-sm hover:underline">{post.author}</button>
                    <p className="text-xs text-muted-foreground">{post.neighborhood} · {post.time}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_META[post.category]?.color || "bg-muted text-stone-600"}`}>
                  {CATEGORY_META[post.category]?.label || post.category}
                </span>
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">{post.body}</p>
            </article>
          ))}
        </section>

        <aside className="hidden lg:flex flex-col gap-4 self-start sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto pb-6">
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-center">
            <img src={neighborlyAppLogo} alt="Neighborly App" className="w-full h-auto object-contain" />
          </div>

          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Local Weather</h3>
              <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded">Maplewood Hts</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">74°F</p>
                <p className="text-xs text-muted-foreground">Partly Cloudy</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">🌤️</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 text-white shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone size={16} className="text-blue-200" />
              <h3 className="font-semibold text-sm">Grow Your Business</h3>
            </div>
            <p className="text-xs text-blue-100 mb-3 leading-relaxed">
              Reach thousands of neighbors in the feed. Packages start at $15/week.
            </p>
            <button onClick={() => setAdvertiseOpen(true)} className="w-full bg-white text-blue-700 font-semibold text-xs py-2 rounded-lg hover:bg-blue-50 transition-colors">
              Advertise With Us
            </button>
          </div>

          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Community Groups</h3>
            </div>
            <div className="flex flex-col gap-2">
              {groups.map((group) => (
                <div key={group.id} className="p-2.5 rounded-lg border border-border/60">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{group.name}</span>
                    <button onClick={() => toggleJoinGroup(group.id)} className={`text-xs px-2 py-0.5 rounded-full font-medium ${group.joined ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                      {group.joined ? "Joined" : "Join"}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Upcoming Events</h3>
            <div className="flex flex-col gap-3">
              {EVENTS.map((ev) => (
                <div key={ev.id} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-blue-600 flex-shrink-0">{ev.icon}</div>
                  <div>
                    <p className="text-sm font-medium">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{ev.date} · {ev.going} going</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-purple-900 border-t border-purple-800 flex items-stretch h-16 text-white">
        <button onClick={goToFeed} className="flex-1 flex flex-col items-center justify-center text-xs gap-1"><Home size={18} /> Home</button>
        <button onClick={() => setView({ page: "search" })} className="flex-1 flex flex-col items-center justify-center text-xs gap-1"><Search size={18} /> Search</button>
        <button onClick={() => { goToFeed(); setComposing(true); }} className="flex-1 flex flex-col items-center justify-center text-xs gap-1 bg-primary text-primary-foreground m-2 rounded-xl"><Plus size={18} /></button>
        <button onClick={() => setView({ page: "messages" })} className="flex-1 flex flex-col items-center justify-center text-xs gap-1"><MessageSquare size={18} /> Chat</button>
        <button onClick={() => setView({ page: "events" })} className="flex-1 flex flex-col items-center justify-center text-xs gap-1"><CalendarDays size={18} /> Events</button>
      </div>
    </div>
  );
}
