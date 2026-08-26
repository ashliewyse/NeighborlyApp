import React, { useState, useEffect, useRef } from "react";
import { Analytics } from "@vercel/analytics/react";
import { useLocation, useNavigate } from "react-router";
import { SettingsView } from "@/app/components/SettingsView";
import {
  ActiveNeighbor,
  ActiveNeighborsCard,
  CommunityGroup,
  CommunityGroupsCard,
  CreateGroupDialog,
} from "@/app/components/CommunitySidebar";
import { MessagingModal } from "@/app/components/MessagingModal";
import { publicSupabase, supabase } from "@/lib/supabase";
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
  UserPlus,
  UserCheck,
  Pencil,
  Trash2,
  LayoutDashboard,
  CircleDollarSign,
  Reply,
  RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BusinessBadgeType =
  "neighbor-fave" | "verified-pro" | "elite";
type UserBadgeType =
  | "champion"
  | "helpful"
  | "organizer"
  | "safety-watcher"
  | "newcomer";

interface BusinessBadge {
  type: BusinessBadgeType;
}
interface UserBadge {
  type: UserBadgeType;
}

interface BusinessReview {
  id: number;
  author: string;
  authorId?: string;
  authorBadges: UserBadgeType[];
  rating: number;
  date: string;
  body: string;
  helpful: number;
}

interface Business {
  id: number;
  ownerId?: string;
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
  logoUrl?: string | null;
  coverUrl?: string | null;
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
  id?: string;
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
  avatarUrl?: string | null;
  coverUrl?: string | null;
  theme?: string | null;
}

interface MessageContact {
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

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
  responded_at: string | null;
}

interface PendingFriendRequest {
  id: string;
  requesterId: string;
  name: string;
  avatarUrl?: string | null;
  createdAt: string;
}

type AdvertisingTier = "starter" | "spotlight" | "featured";

interface LiveAdvertisement {
  id: string;
  tier: AdvertisingTier;
  businessName: string;
  headline: string;
  description: string;
  imageUrl: string;
  destinationUrl?: string | null;
  phone?: string | null;
  targetCity: string;
}

type FeedbackCategory = "idea" | "problem" | "question" | "safety" | "other";

interface SiteFeedback {
  id: string;
  user_id: string;
  sender_name: string;
  contact_email: string;
  category: FeedbackCategory;
  subject: string;
  message: string;
  status: "unread" | "read" | "resolved";
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
}

interface MemberAccessRequest {
  user_id: string;
  email: string;
  requested_name: string;
  account_type: "personal" | "business";
  status: "pending" | "approved" | "declined";
  requested_at: string;
  reviewed_at: string | null;
}

interface AdminAdvertisement {
  id: string;
  user_id: string;
  tier: AdvertisingTier;
  business_name: string;
  headline: string;
  description: string;
  image_url: string;
  destination_url: string | null;
  phone: string | null;
  contact_email: string;
  target_city: string;
  status: "pending" | "approved" | "active" | "paused" | "rejected" | "expired";
  billing_status: "unpaid" | "pending" | "paid" | "past_due" | "canceled" | "refunded";
  payment_method: "stripe" | "cash_app" | "bank_transfer" | "complimentary" | "other" | null;
  payment_reference: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

type PostCategory =
  | "news"
  | "safety"
  | "event"
  | "forsale"
  | "recommendation"
  | "general"
  | "helpwanted";
type ActiveView =
  | { page: "feed" }
  | { page: "business"; id: number }
  | { page: "saved-business"; business: Business }
  | { page: "user"; profile: UserProfile }
  | { page: "me" }
  | { page: "my-business" }
  | { page: "settings" }
  | { page: "admin" }
  | { page: "search" }
  | { page: "events" }
  | { page: "helpwanted" }
  | { page: "classifieds" };

interface Comment {
  id: number;
  databaseId?: string;
  author: string;
  authorId?: string;
  authorAvatar?: string | null;
  authorBadges: UserBadgeType[];
  body: string;
  image?: string;
  time: string;
  likes: number;
}

interface CommentImageDraft {
  file: File;
  previewUrl: string;
}
interface Post {
  id: number;
  databaseId?: string;
  author: string;
  authorId?: string;
  authorBadges: UserBadgeType[];
  neighborhood: string;
  city: string;
  time: string;
  category: PostCategory;
  title?: string;
  body: string;
  image?: string;
  authorAvatar?: string | null;
  isAdminPost?: boolean;
  likes: number;
  comments: Comment[];
  bookmarked: boolean;
  liked: boolean;
}

const ADVERTISING_TIERS: Array<{
  id: AdvertisingTier;
  name: string;
  price: number;
  placement: string;
  reach: string;
}> = [
  { id: "starter", name: "Starter", price: 15, placement: "Sidebar rotation", reach: "One local area" },
  { id: "spotlight", name: "Spotlight", price: 35, placement: "Priority sidebar", reach: "Citywide reach" },
  { id: "featured", name: "Featured", price: 75, placement: "Highest priority", reach: "All Neighborly areas" },
];

const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  idea: "Suggestion or idea",
  problem: "Something isn't working",
  question: "Question",
  safety: "Safety concern",
  other: "Other feedback",
};

const PAYMENT_METHOD_LABELS: Record<NonNullable<AdminAdvertisement["payment_method"]>, string> = {
  stripe: "Stripe",
  cash_app: "Cash App Business",
  bank_transfer: "First Source business bank payment",
  complimentary: "Complimentary / no charge",
  other: "Other",
};

// ─── Badge Meta ───────────────────────────────────────────────────────────────

const BIZ_BADGE_META: Record<
  BusinessBadgeType,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    desc: string;
  }
> = {
  "neighbor-fave": {
    label: "Neighbor Fave",
    icon: <Star size={10} className="fill-current" />,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Consistently top-rated by neighbors",
  },
  "verified-pro": {
    label: "Verified Local Pro",
    icon: <BadgeCheck size={10} />,
    color: "bg-sky-50 text-sky-700 border-sky-200",
    desc: "Identity and license verified by Neighborly",
  },
  elite: {
    label: "Elite Business",
    icon: <Trophy size={10} />,
    color: "bg-violet-50 text-violet-700 border-violet-200",
    desc: "Top 1% of businesses in the area",
  },
};

const USER_BADGE_META: Record<
  UserBadgeType,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    desc: string;
  }
> = {
  champion: {
    label: "Community Champion",
    icon: <Award size={10} />,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Outstanding community contributions",
  },
  helpful: {
    label: "Helpful Neighbor",
    icon: <HandHeart size={10} />,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Frequently marked helpful by neighbors",
  },
  organizer: {
    label: "Event Organizer",
    icon: <CalendarCheck size={10} />,
    color: "bg-violet-50 text-violet-700 border-violet-200",
    desc: "Hosts and organizes community events",
  },
  "safety-watcher": {
    label: "Safety Watcher",
    icon: <Shield size={10} />,
    color: "bg-red-50 text-red-700 border-red-200",
    desc: "Active in keeping the neighborhood safe",
  },
  newcomer: {
    label: "New Neighbor",
    icon: <Leaf size={10} />,
    color: "bg-teal-50 text-teal-700 border-teal-200",
    desc: "Joined within the past 6 months",
  },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const LOCATIONS = [
  "All Areas",
  "Michigan City",
  "La Porte",
  "New Buffalo",
  "Long Beach",
] as const;
type LocationName = string;

interface AreaOption {
  value: LocationName;
  city: string;
  neighborhood: string | null;
  label: string;
}

const NEIGHBORHOOD_LOCATION_PREFIX = "neighborhood:";

interface WeatherSnapshot {
  status: "loading" | "ready" | "error";
  temperature: number | null;
  description: string;
  icon: string;
}

const INITIAL_WEATHER: WeatherSnapshot = {
  status: "loading",
  temperature: null,
  description: "Loading conditions…",
  icon: "🌤️",
};

const LOCATION_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  "michigan city": { latitude: 41.7075, longitude: -86.895 },
  "la porte": { latitude: 41.6111, longitude: -86.7225 },
  "new buffalo": { latitude: 41.7939, longitude: -86.7439 },
  "long beach": { latitude: 41.7389, longitude: -86.8567 },
};

function locationKey(value?: string | null) {
  return (value || "").trim().toLocaleLowerCase();
}

function tidyAreaName(value?: string | null) {
  const trimmed = (value || "").trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed !== trimmed.toLocaleLowerCase() && trimmed !== trimmed.toLocaleUpperCase()) return trimmed;
  return trimmed.toLocaleLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

function canonicalLocation(value?: string | null) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "Michigan City";
  return LOCATIONS.find((locationName) => locationKey(locationName) === locationKey(trimmed)) || tidyAreaName(trimmed);
}

function sameLocation(left?: string | null, right?: string | null) {
  return locationKey(left) === locationKey(right);
}

function neighborhoodLocationValue(city?: string | null, neighborhood?: string | null): LocationName {
  const resolvedCity = canonicalLocation(city);
  const resolvedNeighborhood = tidyAreaName(neighborhood);
  if (!resolvedNeighborhood || sameLocation(resolvedCity, resolvedNeighborhood)) return resolvedCity;
  return `${NEIGHBORHOOD_LOCATION_PREFIX}${encodeURIComponent(resolvedCity)}:${encodeURIComponent(resolvedNeighborhood)}`;
}

function selectedLocationParts(value: LocationName) {
  if (value === "All Areas") return { city: null, neighborhood: null };
  if (!value.startsWith(NEIGHBORHOOD_LOCATION_PREFIX)) {
    return { city: canonicalLocation(value), neighborhood: null };
  }

  const encoded = value.slice(NEIGHBORHOOD_LOCATION_PREFIX.length);
  const separator = encoded.indexOf(":");
  if (separator < 0) return { city: canonicalLocation(value), neighborhood: null };
  try {
    return {
      city: canonicalLocation(decodeURIComponent(encoded.slice(0, separator))),
      neighborhood: decodeURIComponent(encoded.slice(separator + 1)).trim() || null,
    };
  } catch {
    return { city: canonicalLocation(value), neighborhood: null };
  }
}

function locationMenuLabel(value: LocationName) {
  if (value === "All Areas") return value;
  const { city, neighborhood } = selectedLocationParts(value);
  return neighborhood ? `${neighborhood}, ${city}` : city || "All Areas";
}

function locationPromptLabel(value: LocationName) {
  const { city, neighborhood } = selectedLocationParts(value);
  return neighborhood || city || "your area";
}

function matchesSelectedLocation(city: string | null | undefined, neighborhood: string | null | undefined, selected: LocationName) {
  if (selected === "All Areas") return true;
  const selectedParts = selectedLocationParts(selected);
  if (!sameLocation(city, selectedParts.city)) return false;
  return !selectedParts.neighborhood || sameLocation(neighborhood, selectedParts.neighborhood);
}

function weatherCondition(code: number, isDay: boolean) {
  if (code === 0) return { description: "Clear", icon: isDay ? "☀️" : "🌙" };
  if (code === 1) return { description: "Mostly Clear", icon: isDay ? "🌤️" : "🌙" };
  if (code === 2) return { description: "Partly Cloudy", icon: "⛅" };
  if (code === 3) return { description: "Cloudy", icon: "☁️" };
  if (code === 45 || code === 48) return { description: "Foggy", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { description: "Drizzle", icon: "🌦️" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { description: "Rain", icon: "🌧️" };
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return { description: "Snow", icon: "❄️" };
  if (code >= 95) return { description: "Thunderstorms", icon: "⛈️" };
  return { description: "Current Conditions", icon: "🌤️" };
}

async function fetchWeatherSnapshot(locationName: string, signal: AbortSignal): Promise<WeatherSnapshot> {
  let coordinates = LOCATION_COORDINATES[locationKey(locationName)];

  if (!coordinates) {
    const searchResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=5&language=en&format=json&countryCode=US`,
      { signal },
    );
    if (!searchResponse.ok) throw new Error("Could not find this location");
    const searchData = await searchResponse.json();
    const match = searchData.results?.find((result: any) => result.country_code === "US") || searchData.results?.[0];
    if (!match) throw new Error("Could not find this location");
    coordinates = { latitude: match.latitude, longitude: match.longitude };
  }

  const weatherResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit&timezone=auto`,
    { signal },
  );
  if (!weatherResponse.ok) throw new Error("Could not load weather");
  const weatherData = await weatherResponse.json();
  const temperature = Number(weatherData.current?.temperature_2m);
  const code = Number(weatherData.current?.weather_code);
  if (!Number.isFinite(temperature) || !Number.isFinite(code)) throw new Error("Weather data was incomplete");
  const condition = weatherCondition(code, weatherData.current?.is_day !== 0);
  return {
    status: "ready",
    temperature: Math.round(temperature),
    description: condition.description,
    icon: condition.icon,
  };
}

function WeatherCard({ locationName, weather }: { locationName: string; weather: WeatherSnapshot }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm" aria-live="polite">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="font-semibold text-sm">Local Weather</h3>
        <span
          className="max-w-36 truncate text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded"
          title={locationName}
        >
          {locationName}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold">{weather.temperature === null ? "--°" : `${weather.temperature}°F`}</p>
          <p className="text-xs text-muted-foreground">{weather.description}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center" aria-hidden="true">
          {weather.icon}
        </div>
      </div>
    </div>
  );
}

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
    description:
      "Family-owned plumbing company serving Maplewood Heights and surrounding neighborhoods for over 13 years. Rafael and his team specialize in emergency repairs, full remodels, and commercial work. We believe in transparent pricing, clean job sites, and treating your home like our own. Licensed and insured — all work is fully guaranteed.",
    services: [
      "Emergency Repairs",
      "Pipe Installation",
      "Water Heater Service",
      "Drain Cleaning",
      "Bathroom Remodels",
      "Kitchen Plumbing",
      "Sewer Line Inspection",
      "Leak Detection",
      "Commercial Plumbing",
      "Water Softeners",
    ],
    photos: [
      {
        url: "https://images.unsplash.com/photo-1676210134188-4c05dd172f89?w=600&h=400&fit=crop&auto=format",
        alt: "Plumber working on pipe in wall",
      },
      {
        url: "https://images.unsplash.com/photo-1542013936693-884638332954?w=600&h=400&fit=crop&auto=format",
        alt: "Kitchen faucet close-up",
      },
      {
        url: "https://images.unsplash.com/photo-1620653713380-7a34b773fef8?w=600&h=400&fit=crop&auto=format",
        alt: "Plumbing tools and fittings",
      },
      {
        url: "https://images.unsplash.com/photo-1676210133055-eab6ef033ce3?w=600&h=400&fit=crop&auto=format",
        alt: "Plumber working under cabinet",
      },
      {
        url: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&h=400&fit=crop&auto=format",
        alt: "Business open sign",
      },
      {
        url: "https://images.unsplash.com/photo-1761783536272-2fb78dd52c76?w=600&h=400&fit=crop&auto=format",
        alt: "Support local businesses sign",
      },
    ],
    phone: "(555) 842-3901",
    email: "rafael@martinezplumbing.com",
    website: "martinezplumbing.com",
    address: "112 Cedar Ave, Maplewood Heights",
    hours: [
      { day: "Mon – Fri", time: "7:00 AM – 6:00 PM" },
      { day: "Saturday", time: "8:00 AM – 4:00 PM" },
      { day: "Sunday", time: "Emergency calls only" },
    ],
    reviews: [
      {
        id: 1,
        author: "Grace Okonkwo",
        authorBadges: ["helpful"],
        rating: 5,
        date: "Aug 2, 2026",
        body: "Had a burst pipe emergency and they arrived in under 2 hours. Rafael and his team were professional, fast, and left the place spotless. Pricing was exactly what they quoted — no surprises. Will absolutely call them again.",
        helpful: 14,
      },
      {
        id: 2,
        author: "Tom Briggs",
        authorBadges: ["champion"],
        rating: 5,
        date: "Jul 18, 2026",
        body: "Used Martinez for a full bathroom remodel. The attention to detail was incredible and they finished ahead of schedule. Rafael personally followed up a week later to make sure everything was still working perfectly.",
        helpful: 9,
      },
      {
        id: 3,
        author: "Linda Kim",
        authorBadges: ["organizer"],
        rating: 4,
        date: "Jun 30, 2026",
        body: "Great work on our water heater replacement. Only minor issue was scheduling took a few days, but once they were there the job was done in 90 minutes and everything works perfectly.",
        helpful: 6,
      },
      {
        id: 4,
        author: "Ben Cho",
        authorBadges: [],
        rating: 5,
        date: "Jun 14, 2026",
        body: "Family business done right. They've been serving this neighborhood for years and it shows. Fair prices and genuine care for the community.",
        helpful: 4,
      },
    ],
  },
  {
    id: 2,
    name: "Corner Market Deli",
    category: "Food & Grocery",
    city: "La Porte",
    rating: 4.7,
    reviewCount: 203,
    badges: ["neighbor-fave", "elite"],
    owner: "Yolanda Reyes",
    founded: "1998",
    description:
      "A neighborhood institution since 1998. Yolanda and her family run this beloved corner market with fresh deli sandwiches, daily soups, specialty groceries, and a curated selection of local products. We stock items from over 20 local producers and bake fresh bread and pastries every morning.",
    services: [
      "Deli Sandwiches",
      "Fresh Daily Soups",
      "Local Produce",
      "Artisan Bread & Pastries",
      "Beer & Wine",
      "Catering Orders",
      "Online Pre-Order",
      "Senior Discount (Tues/Thurs)",
      "Dog Treats",
    ],
    photos: [
      {
        url: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&h=400&fit=crop&auto=format",
        alt: "Warm cafe interior",
      },
      {
        url: "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=600&h=400&fit=crop&auto=format",
        alt: "Deli seating area",
      },
      {
        url: "https://images.unsplash.com/photo-1511081692775-05d0f180a065?w=600&h=400&fit=crop&auto=format",
        alt: "Market interior with pendant lights",
      },
      {
        url: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&h=400&fit=crop&auto=format",
        alt: "Customers at the market",
      },
    ],
    phone: "(555) 214-6672",
    email: "hello@cornermarketdeli.com",
    website: "cornermarketdeli.com",
    address: "45 Main Street, Maplewood Heights",
    hours: [
      { day: "Mon – Fri", time: "6:30 AM – 8:00 PM" },
      { day: "Saturday", time: "7:00 AM – 7:00 PM" },
      { day: "Sunday", time: "8:00 AM – 4:00 PM" },
    ],
    reviews: [
      {
        id: 5,
        author: "Nadia Petrov",
        authorBadges: ["champion", "helpful"],
        rating: 5,
        date: "Aug 5, 2026",
        body: "The turkey avocado sandwich on their house sourdough is the best thing within 5 miles. Yolanda remembers everyone's name and order — this place is the heart of our neighborhood.",
        helpful: 31,
      },
      {
        id: 6,
        author: "Sam Lau",
        authorBadges: [],
        rating: 5,
        date: "Jul 22, 2026",
        body: "Incredible selection of local products. I love that I can get honey, jam, and eggs all from farms within 50 miles. Worth every penny over the big chain grocery.",
        helpful: 19,
      },
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
    posts: 84, neighbors: 231, helpfulVotes: 347, recsGiven: 29,
    rating: 4.8, ratingCount: 36,
    neighborReviews: [
      { id: 1, author: "James Whitfield", authorBadges: ["organizer"], rating: 5, date: "Aug 3, 2026", body: "Maria is the heart of this neighborhood. Always first to alert us about safety and organizes incredible community events. A true champion.", helpful: 18 },
      { id: 2, author: "Nadia Petrov", authorBadges: ["champion"], rating: 5, date: "Jul 20, 2026", body: "When I moved here Maria was the first neighbor to welcome me. Incredibly helpful and always in the know.", helpful: 11 },
      { id: 3, author: "Ben Cho", authorBadges: [], rating: 4, date: "Jun 15, 2026", body: "Very engaged and thoughtful neighbor. Her safety alerts have kept our street safer more than once.", helpful: 7 },
    ],
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&h=400&fit=crop&auto=format", alt: "Riverside Park" },
      { url: "https://images.unsplash.com/photo-1560472355-536de3962603?w=600&h=400&fit=crop&auto=format", alt: "Neighborhood street" },
      { url: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&h=400&fit=crop&auto=format", alt: "Garden in bloom" },
    ],
    recentActivity: [
      { type: "post", text: "Posted a safety alert about car break-ins on Elm & 4th", time: "2 hours ago" },
      { type: "comment", text: "Commented on Community Cleanup event", time: "1 day ago" },
      { type: "rec", text: "Recommended Maplewood Pediatrics", time: "3 days ago" },
      { type: "post", text: "Posted about suspicious activity near the park", time: "1 week ago" },
    ],
  },
  "James Whitfield": {
    name: "James Whitfield",
    neighborhood: "La Porte",
    city: "La Porte",
    joinDate: "January 2021",
    bio: "Retired teacher, now full-time community volunteer. I run the annual block party, organize the farmers market committee, and coach youth soccer on weekends. Ask me anything about our neighborhood's history!",
    badges: ["organizer", "champion"],
    posts: 52, neighbors: 189, helpfulVotes: 203, recsGiven: 17,
    rating: 4.9, ratingCount: 51,
    neighborReviews: [
      { id: 4, author: "Maria Santos", authorBadges: ["champion", "helpful"], rating: 5, date: "Aug 1, 2026", body: "James is the backbone of our community. He organized the cleanup, runs the farmers market committee, and coaches kids. Absolutely incredible.", helpful: 22 },
      { id: 5, author: "Linda Kim", authorBadges: ["organizer"], rating: 5, date: "Jul 10, 2026", body: "James knows everything about this neighborhood's history and is always ready to help new residents get settled.", helpful: 9 },
    ],
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=400&fit=crop&auto=format", alt: "Community gathering" },
      { url: "https://images.unsplash.com/photo-1508980880eba-12e4e6f68928?w=600&h=400&fit=crop&auto=format", alt: "Farmers market" },
    ],
    recentActivity: [
      { type: "post", text: "Organized the Community Cleanup event", time: "4 hours ago" },
      { type: "event", text: "Created Block Party Planning meetup", time: "2 days ago" },
      { type: "comment", text: "Commented on local news about new coffee shop", time: "3 days ago" },
    ],
  },
  "Nadia Petrov": {
    name: "Nadia Petrov",
    neighborhood: "Long Beach",
    city: "Long Beach",
    joinDate: "September 2022",
    bio: "Urban journalist and neighborhood enthusiast. I cover local news and love digging into what makes Maplewood Heights tick. If you see something newsworthy, tip me off!",
    badges: ["champion", "helpful"],
    posts: 61, neighbors: 144, helpfulVotes: 412, recsGiven: 38,
    rating: 4.7, ratingCount: 28,
    neighborReviews: [
      { id: 6, author: "Sam Lau", authorBadges: [], rating: 5, date: "Aug 4, 2026", body: "Nadia broke the news about the new coffee shop before anyone else knew. She has her finger on the pulse of this neighborhood.", helpful: 14 },
      { id: 7, author: "Yvette Morgan", authorBadges: [], rating: 4, date: "Jul 28, 2026", body: "Great neighbor and very informative posts. Always replies to questions and follows up with more info.", helpful: 8 },
    ],
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&h=400&fit=crop&auto=format", alt: "Local coffee shop" },
    ],
    recentActivity: [
      { type: "post", text: "Broke the news about Morning Ritual coffee shop", time: "Yesterday" },
      { type: "comment", text: "Replied to questions about the new coffee shop", time: "Yesterday" },
      { type: "rec", text: "Recommended Corner Market Deli", time: "5 days ago" },
    ],
  },
  "Grace Okonkwo": {
    name: "Grace Okonkwo",
    neighborhood: "New Buffalo",
    city: "New Buffalo",
    joinDate: "June 2023",
    bio: "Interior designer and proud homeowner. Love sharing tips about home improvement, local contractors I trust, and the best spots to find vintage furniture in the area.",
    badges: ["helpful", "newcomer"],
    posts: 18, neighbors: 67, helpfulVotes: 89, recsGiven: 12,
    rating: 4.6, ratingCount: 14,
    neighborReviews: [
      { id: 8, author: "Tom Briggs", authorBadges: ["champion"], rating: 5, date: "Jul 30, 2026", body: "Grace recommended Martinez Plumbing and it was spot on — saved us during a burst pipe situation. She clearly vets her recommendations carefully.", helpful: 6 },
    ],
    galleryPhotos: [
      { url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop&auto=format", alt: "Interior design" },
      { url: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=600&h=400&fit=crop&auto=format", alt: "Renovated room" },
    ],
    recentActivity: [
      { type: "rec", text: "Recommended Martinez Plumbing with 5 stars", time: "6 hours ago" },
      { type: "comment", text: "Commented on moving sale post", time: "2 days ago" },
    ],
  },
};

const AVATAR_COLORS = [
  "bg-emerald-700",
  "bg-amber-600",
  "bg-sky-700",
  "bg-rose-600",
  "bg-violet-700",
  "bg-teal-700",
];

const CATEGORY_META: Record<
  PostCategory,
  { label: string; color: string; icon: React.ReactNode }
> = {
  news: {
    label: "Local News",
    color: "text-sky-700 bg-sky-50 border-sky-200",
    icon: <Megaphone size={11} />,
  },
  safety: {
    label: "Safety",
    color: "text-red-700 bg-red-50 border-red-200",
    icon: <ShieldAlert size={11} />,
  },
  event: {
    label: "Event",
    color: "text-violet-700 bg-violet-50 border-violet-200",
    icon: <CalendarDays size={11} />,
  },
  forsale: {
    label: "For Sale",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    icon: <ShoppingBag size={11} />,
  },
  recommendation: {
    label: "Recommendation",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    icon: <Star size={11} />,
  },
  general: {
    label: "General",
    color: "text-stone-600 bg-stone-50 border-stone-200",
    icon: <Leaf size={11} />,
  },
  helpwanted: {
    label: "Help Wanted",
    color: "text-blue-700 bg-blue-50 border-blue-200",
    icon: <Briefcase size={11} />,
  },
};

function postTypeForCategory(category: PostCategory) {
  if (category === "safety") return "alert";
  if (category === "recommendation") return "recommendation";
  if (category === "helpwanted") return "help_wanted";
  return "discussion";
}

function postImageStoragePath(imageUrl?: string) {
  if (!imageUrl) return null;
  try {
    const marker = "/storage/v1/object/public/neighborly-media/";
    const path = new URL(imageUrl).pathname;
    const markerIndex = path.indexOf(marker);
    return markerIndex >= 0 ? decodeURIComponent(path.slice(markerIndex + marker.length)) : null;
  } catch {
    return null;
  }
}

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
    body: "There were two car break-ins last night on Elm Street near 4th Ave. Both vehicles had windows smashed. Please don't leave anything visible in your cars. I've filed a report with the non-emergency police line.",
    likes: 47,
    comments: [
      {
        id: 1,
        author: "Tom Briggs",
        authorBadges: ["champion"],
        body: "Thanks for the warning! Same thing happened on Oak St last week.",
        time: "1h ago",
        likes: 8,
      },
      {
        id: 2,
        author: "Priya Nair",
        authorBadges: [],
        body: "Saw a suspicious white sedan circling around 10pm. Reported to police too.",
        time: "45m ago",
        likes: 12,
      },
    ],
    bookmarked: false,
    liked: false,
  },
  {
    id: 2,
    author: "James Whitfield",
    authorBadges: ["organizer", "champion"],
    neighborhood: "La Porte",
    city: "La Porte",
    time: "4 hours ago",
    category: "event",
    title: "Community Cleanup — This Saturday 9am",
    body: "Organizing a neighborhood cleanup this Saturday starting at 9am at Riverside Park. Gloves and bags provided. Come meet your neighbors and help keep our streets beautiful!",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=400&fit=crop&auto=format",
    likes: 82,
    comments: [
      {
        id: 3,
        author: "Linda Kim",
        authorBadges: ["organizer"],
        body: "We'll be there! Bringing my daughter and her Girl Scout troop.",
        time: "3h ago",
        likes: 14,
      },
      {
        id: 4,
        author: "Roberto Fuentes",
        authorBadges: [],
        body: "Can we focus on the trail behind the park too? It's overgrown.",
        time: "2h ago",
        likes: 6,
      },
    ],
    bookmarked: true,
    liked: true,
  },
  {
    id: 3,
    author: "Grace Okonkwo",
    authorBadges: ["helpful"],
    neighborhood: "New Buffalo",
    city: "New Buffalo",
    time: "6 hours ago",
    category: "recommendation",
    title: "Best plumber in the area — highly recommend!",
    body: "Had a burst pipe emergency last week and called Martinez Plumbing on Cedar Ave. They arrived within 2 hours, fixed everything, and charged a very fair price. Rafael and his team were professional and respectful. 10/10.",
    likes: 31,
    comments: [
      {
        id: 5,
        author: "Ben Cho",
        authorBadges: [],
        body: "We've used Martinez too — great family business!",
        time: "5h ago",
        likes: 5,
      },
    ],
    bookmarked: false,
    liked: false,
  },
  {
    id: 4,
    author: "Nadia Petrov",
    authorBadges: ["champion", "helpful"],
    neighborhood: "Long Beach",
    city: "Long Beach",
    time: "Yesterday",
    category: "news",
    title: "New coffee shop opening on Main Street next month",
    body: 'Spotted a permit for "Morning Ritual" at the old florist space on Main & 7th. Opening expected mid-September. The neighborhood has needed this!',
    likes: 128,
    comments: [
      {
        id: 6,
        author: "Sam Lau",
        authorBadges: [],
        body: "Finally! That corner has been empty for two years.",
        time: "23h ago",
        likes: 21,
      },
    ],
    bookmarked: false,
    liked: true,
  },
];

const EVENTS = [
  {
    id: 1,
    title: "Community Cleanup",
    date: "Sat Aug 10",
    time: "9:00 AM",
    going: 34,
    icon: <Leaf size={14} />,
  },
  {
    id: 2,
    title: "Farmer's Market",
    date: "Sun Aug 11",
    time: "8:00 AM",
    going: 87,
    icon: <ShoppingBag size={14} />,
  },
  {
    id: 3,
    title: "Block Party Planning",
    date: "Tue Aug 13",
    time: "7:00 PM",
    going: 22,
    icon: <Users size={14} />,
  },
];

// ─── Shared Components ────────────────────────────────────────────────────────

function Avatar({
  name,
  size = "md",
  src,
}: {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  src?: string | null;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const color =
    AVATAR_COLORS[
      name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) %
        AVATAR_COLORS.length
    ];
  const sz = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-11 h-11 text-base",
    xl: "w-16 h-16 text-xl",
  }[size];
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sz} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
    >
      {initials}
    </div>
  );
}

function ExpandablePhoto({
  src,
  alt,
  imageClassName,
  buttonClassName = "block cursor-zoom-in",
}: {
  src: string;
  alt: string;
  imageClassName: string;
  buttonClassName?: string;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button" className={buttonClassName} aria-label={`View ${alt} full size`}>
          <img src={src} alt={alt} className={imageClassName} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed inset-0 z-[101] flex items-center justify-center p-3 outline-none sm:p-8"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">{alt}</Dialog.Title>
          <Dialog.Close tabIndex={-1} className="absolute inset-0 cursor-zoom-out" aria-label="Close full-size photo" />
          <img src={src} alt={alt} className="relative z-10 max-h-[calc(100dvh-1.5rem)] max-w-[calc(100vw-1.5rem)] object-contain sm:max-h-[calc(100dvh-4rem)] sm:max-w-[calc(100vw-4rem)]" />
          <Dialog.Close className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-black sm:right-6 sm:top-6" aria-label="Close full-size photo">
            <X size={18} /> Close
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BizBadgePill({ type }: { type: BusinessBadgeType }) {
  const m = BIZ_BADGE_META[type];
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${m.color}`}
      title={m.desc}
    >
      {m.icon} {m.label}
    </span>
  );
}

function UserBadgePill({
  type,
  compact,
}: {
  type: UserBadgeType;
  compact?: boolean;
}) {
  const m = USER_BADGE_META[type];
  if (compact)
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${m.color}`}
        title={m.desc}
      >
        {m.icon}
      </span>
    );
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${m.color}`}
      title={m.desc}
    >
      {m.icon} {m.label}
    </span>
  );
}

function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "lg";
}) {
  const starSize = size === "lg" ? 16 : 12;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={starSize}
          className={
            s <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-stone-200"
          }
        />
      ))}
    </div>
  );
}

// ─── Auth View ────────────────────────────────────────────────────────────────

function AuthView({
  mode,
  onSwitchMode,
  onSuccess,
}: {
  mode: "signin" | "signup";
  onSwitchMode: (m: "signin" | "signup") => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="min-h-screen bg-purple-950 flex items-center justify-center p-4 font-['DM_Sans',sans-serif]">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-36 mx-auto mb-4">
            <ImageWithFallback
              src={neighborlyLogo}
              alt="Neighborly App"
              className="w-full h-auto object-contain"
            />
          </div>
          <h1 className="font-['Playfair_Display',serif] font-bold text-2xl text-foreground">
            {mode === "signin"
              ? "Welcome back"
              : "Join your neighborhood"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin"
              ? "Sign in to connect with your community"
              : "Create an account to connect with neighbors"}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {mode === "signup" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Maria Santos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-muted rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent focus:border-blue-600/20"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-muted rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent focus:border-blue-600/20"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-muted rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent focus:border-blue-600/20"
            />
          </div>

          <button
            onClick={onSuccess}
            className="w-full mt-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {mode === "signin" ? "Sign In" : "Create Account"}
          </button>

          <div className="text-center mt-4">
            {mode === "signin" ? (
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  onClick={() => onSwitchMode("signup")}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  onClick={() => onSwitchMode("signin")}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Business Profile ─────────────────────────────────────────────────────────

function ProfilePostsFeed({ profileName, profileType, profileOwnerId }: { profileName: string; profileType: "business" | "personal"; profileOwnerId?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      let ownerId: string | null = profileOwnerId || null;
      if (!ownerId && profileType === "business") {
        const { data: businessRow } = await supabase.from("business_profiles").select("user_id").eq("business_name", profileName).maybeSingle();
        ownerId = businessRow?.user_id || null;
        // Own business fallback: the displayed business can be assembled in memory, but posts are always saved with auth user.id.
        if (!ownerId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: ownBusiness } = await supabase.from("business_profiles").select("business_name").eq("user_id", user.id).maybeSingle();
            if (ownBusiness?.business_name === profileName) ownerId = user.id;
          }
        }
      } else if (!ownerId) {
        const { data: profileRow } = await supabase.from("profiles").select("id").eq("full_name", profileName).maybeSingle();
        ownerId = profileRow?.id || null;
      }
      if (!ownerId) { if (active) { setItems([]); setLoading(false); } return; }
      const { data, error } = await supabase.from("posts").select("id, author_id, category, content, image_url, created_at").eq("author_id", ownerId).eq("is_admin_post", false).order("created_at", { ascending: false }).limit(50);
      if (!active) return;
      setItems(error ? [] : (data || [])); setLoading(false);
    })();
    return () => { active = false; };
  }, [profileName, profileType, profileOwnerId]);
  if (loading) return <div className="bg-white rounded-xl border border-border p-6 text-sm text-muted-foreground">Loading posts…</div>;
  if (!items.length) return <div className="bg-white rounded-xl border border-border p-6"><h3 className="font-semibold text-lg mb-2">Posts</h3><p className="text-sm text-muted-foreground">No posts from {profileName} yet.</p></div>;
  return <div className="space-y-4">{items.map((post:any) => <div key={post.id} className="bg-white rounded-xl border border-border p-4 sm:p-5"><div className="font-semibold mb-1">{profileName}</div><div className="text-xs text-muted-foreground mb-3">{new Date(post.created_at).toLocaleDateString()}</div><p className="text-sm sm:text-base whitespace-pre-wrap">{post.content}</p>{post.image_url && <div className="mt-3 flex max-h-[72vh] justify-center overflow-hidden rounded-lg bg-muted"><ExpandablePhoto src={post.image_url} alt={`${profileName}'s post photo`} buttonClassName="flex max-h-[72vh] max-w-full cursor-zoom-in justify-center" imageClassName="max-h-[72vh] max-w-full object-contain" /></div>}</div>)}</div>;
}

function BusinessProfileView({
  biz,
  onBack,
  onUserClick,
  onMessage,
  isOwnProfile = false,
  onLogoChange,
  onSettings,
  onAdmin,
}: {
  biz: Business;
  onBack: () => void;
  onUserClick: (name: string, authorId?: string) => void;
  onMessage?: (contact: MessageContact) => void;
  isOwnProfile?: boolean;
  onLogoChange?: (url: string) => void;
  onSettings?: () => void;
  onAdmin?: () => void;
}) {
  const [tab, setTab] = useState<
    "about" | "posts" | "services" | "photos" | "contact" | "reviews"
  >("about");
  const [photosExpanded, setPhotosExpanded] = useState(false);
  const [reviewHelpful, setReviewHelpful] = useState<Record<number, boolean>>({});
  const [businessPhotos, setBusinessPhotos] = useState(biz.photos);
  const [coverUrl, setCoverUrl] = useState<string | null>(biz.coverUrl || null);
  const [logoUrl, setLogoUrl] = useState<string | null>(biz.logoUrl || null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    if (isOwnProfile) return;
    setBusinessPhotos(biz.photos);
    setCoverUrl(biz.coverUrl || null);
    setLogoUrl(biz.logoUrl || null);
  }, [biz, isOwnProfile]);

  useEffect(() => {
    if (!isOwnProfile) return;
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const [{ data: businessRow }, { data: photos }, { data: profileRow }] = await Promise.all([
        supabase.from("business_profiles").select("logo_url, cover_url").eq("user_id", user.id).maybeSingle(),
        supabase.from("profile_photos").select("image_url, caption").eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      const persistedLogo = businessRow?.logo_url || profileRow?.avatar_url || null;
      setLogoUrl(persistedLogo);
      if (persistedLogo) onLogoChange?.(persistedLogo);
      setCoverUrl(businessRow?.cover_url || null);
      if (photos) setBusinessPhotos(photos.map((p: any) => ({ url: p.image_url, alt: p.caption || "Business photo" })));
    })();
    return () => { active = false; };
  }, [isOwnProfile]);

  async function uploadBusinessFile(file: File, kind: "logo" | "cover" | "gallery") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be signed in to upload photos.");
    const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const path = user.id + "/business-" + kind + "/" + Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;
    const { error } = await supabase.storage.from("neighborly-media").upload(path, file, { contentType: file.type || "image/jpeg", cacheControl: "3600", upsert: false });
    if (error) throw error;
    return supabase.storage.from("neighborly-media").getPublicUrl(path).data.publicUrl;
  }

  async function saveBusinessImage(e: React.ChangeEvent<HTMLInputElement>, kind: "logo" | "cover") {
    if (!isOwnProfile) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMediaBusy(true); setMediaError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in.");
      const publicUrl = await uploadBusinessFile(file, kind);
      const update = kind === "logo" ? { logo_url: publicUrl } : { cover_url: publicUrl };
      const { error } = await supabase.from("business_profiles").update({ ...update, updated_at: new Date().toISOString() }).eq("user_id", user.id);
      if (error) throw error;
      if (kind === "logo") {
        setLogoUrl(publicUrl);
        onLogoChange?.(publicUrl);
        const { error: profileError } = await supabase.from("profiles").update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id);
        if (profileError) throw profileError;
      } else setCoverUrl(publicUrl);
    } catch (e: any) { setMediaError(e?.message || "Could not save business photo."); }
    finally { setMediaBusy(false); }
  }

  async function saveBusinessGallery(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isOwnProfile) return;
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setMediaBusy(true); setMediaError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in.");
      for (const photo of files) {
        const publicUrl = await uploadBusinessFile(photo, "gallery");
        const { error } = await supabase.from("profile_photos").insert({ user_id: user.id, image_url: publicUrl, caption: photo.name });
        if (error) throw error;
        setBusinessPhotos((prev) => [...prev, { url: publicUrl, alt: photo.name }]);
      }
    } catch (e: any) { setMediaError(e?.message || "Could not save business photos."); }
    finally { setMediaBusy(false); }
  }

  const visiblePhotos = photosExpanded ? businessPhotos : businessPhotos.slice(0, 4);

  return (
    <div className="min-h-screen bg-purple-950">
      {/* Profile header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors font-['DM_Sans',sans-serif]"
            >
              <ChevronLeft size={16} /> Back to feed
            </button>
            <div className="flex items-center gap-2">
              {isOwnProfile && onAdmin && (
                <button onClick={onAdmin} className="inline-flex items-center gap-2 rounded-lg bg-purple-700 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-800">
                  <LayoutDashboard size={15} /> Admin
                </button>
              )}
              {isOwnProfile && onSettings && (
                <button onClick={onSettings} className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                  ⚙️ Settings
                </button>
              )}
            </div>
          </div>

          {/* Hero area */}
          <div className="pb-0">
            <div className="relative mb-4 h-36 sm:h-52 overflow-hidden rounded-xl bg-gradient-to-r from-blue-700 to-cyan-500">
              {coverUrl && <img src={coverUrl} alt={biz.name + " cover"} className="h-full w-full object-cover" />}
              {isOwnProfile && <label className="absolute right-3 bottom-3 cursor-pointer rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold shadow"><Camera size={13} className="inline mr-1" />Change Cover<input type="file" accept="image/*" className="hidden" onChange={(e) => void saveBusinessImage(e, "cover")} /></label>}
            </div>
            {mediaError && isOwnProfile && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{mediaError}</div>}
            {mediaBusy && isOwnProfile && <div className="mb-3 text-xs text-muted-foreground">Saving photo…</div>}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 pb-4">
              <div className="relative w-20 h-20 rounded-2xl bg-card border-4 border-card shadow-md flex items-center justify-center text-primary flex-shrink-0 overflow-hidden">
                {logoUrl ? <img src={logoUrl} alt={biz.name} className="w-full h-full object-cover" /> : <Briefcase size={28} />}
                {isOwnProfile && <label className="absolute inset-x-0 bottom-0 cursor-pointer bg-black/55 py-1 text-center text-[10px] text-white">Edit<input type="file" accept="image/*" className="hidden" onChange={(e) => void saveBusinessImage(e, "logo")} /></label>}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="font-['Playfair_Display',serif] font-bold text-xl">
                    {biz.name}
                  </h1>
                  {biz.badges.map((b) => (
                    <BizBadgePill key={b} type={b} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {biz.category} · Est. {biz.founded} · Owned by{" "}
                  {biz.owner}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <StarRating rating={biz.rating} />
                  <span className="text-sm font-semibold">
                    {biz.rating}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({biz.reviewCount} reviews)
                  </span>
                </div>
              </div>
              <div className="flex w-full sm:w-auto gap-2 pb-1 flex-shrink-0">
                <a
                  href={`tel:${biz.phone}`}
                  className="flex flex-1 sm:flex-none justify-center items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity font-['DM_Sans',sans-serif]"
                >
                  <Phone size={13} /> Call
                </a>
                {!isOwnProfile && biz.ownerId && (
                  <button
                    onClick={() => onMessage?.({ id: biz.ownerId!, name: biz.name, avatarUrl: logoUrl, accountType: "business" })}
                    className="flex flex-1 sm:flex-none justify-center items-center gap-1.5 border border-border bg-card px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors font-['DM_Sans',sans-serif]"
                  >
                    <MessageSquare size={13} /> Message
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto border-t border-border">
            {(
              ["about", "posts", "services", "photos", "contact", "reviews"] as const
            ).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px font-['DM_Sans',sans-serif] ${
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "reviews"
                  ? `Reviews (${biz.reviews.length})`
                  : t === "photos"
                    ? `Photos (${businessPhotos.length})`
                    : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {tab === "about" && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
            <div className="bg-white rounded-xl border border-border p-6">
              <h2 className="font-semibold mb-3">
                About {biz.name}
              </h2>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {biz.description}
              </p>

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-semibold text-sm mb-3">
                  Trust & Credentials
                </h3>
                <div className="flex flex-col gap-2.5">
                  {biz.badges.map((b) => {
                    const m = BIZ_BADGE_META[b];
                    return (
                      <div
                        key={b}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${m.color}`}
                      >
                        <div className="mt-0.5">
                          {React.cloneElement(
                            m.icon as React.ReactElement,
                            { size: 16 },
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {m.label}
                          </p>
                          <p className="text-xs opacity-80 mt-0.5">
                            {m.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-stone-50 text-stone-700 border-stone-200">
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm font-semibold">
                        Licensed & Insured
                      </p>
                      <p className="text-xs opacity-80 mt-0.5">
                        All work is fully bonded and guaranteed
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar quick info */}
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-xl border border-border p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-blue-600" />{" "}
                  Business Hours
                </h3>
                <div className="flex flex-col gap-2">
                  {biz.hours.map((h) => (
                    <div
                      key={h.day}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {h.day}
                      </span>
                      <span className="font-medium">
                        {h.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-border p-4">
                <h3 className="font-semibold text-sm mb-3">
                  Quick Stats
                </h3>
                <div className="grid grid-cols-2 gap-3 text-center">
                  {[
                    {
                      label: "Reviews",
                      value: biz.reviewCount,
                    },
                    {
                      label: "Years Open",
                      value: `${2026 - parseInt(biz.founded)}+`,
                    },
                    {
                      label: "Rating",
                      value: `${biz.rating}★`,
                    },
                    {
                      label: "Badges",
                      value: biz.badges.length,
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="bg-secondary rounded-lg py-2"
                    >
                      <p className="font-bold text-blue-600 text-sm">
                        {s.value}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "posts" && <ProfilePostsFeed profileName={biz.name} profileType="business" profileOwnerId={biz.ownerId} />}

        {tab === "services" && (
          <div className="bg-white rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">
                Services Offered
              </h2>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                {biz.services.length} services
              </span>
            </div>
            <div className="flex flex-wrap gap-2.5 mb-8">
              {biz.services.map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-4 py-2.5 hover:border-blue-600/30 transition-colors cursor-default group"
                >
                  <CheckCircle2
                    size={14}
                    className="text-blue-600 flex-shrink-0"
                  />
                  <span className="text-sm font-medium">
                    {s}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-5">
              <h3 className="font-semibold text-sm mb-3">
                Request a Quote
              </h3>
              <div className="bg-secondary/60 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Need one of these services?
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Send a message directly to {biz.owner} for a
                    free estimate.
                  </p>
                </div>
                <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0 font-['DM_Sans',sans-serif]">
                  Get a Quote
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "photos" && (
          <div className="bg-white rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">Photo Gallery</h2>
              <div className="flex items-center gap-2">
                {isOwnProfile && <label className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Upload Photos<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void saveBusinessGallery(e)} /></label>}
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full flex items-center gap-1.5"><Camera size={11} /> {businessPhotos.length} photos</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {visiblePhotos.map((photo, i) => (
                <div
                  key={i}
                  className="relative group overflow-hidden rounded-xl bg-muted aspect-[4/3]"
                >
                  <ExpandablePhoto
                    src={photo.url}
                    alt={photo.alt}
                    buttonClassName="h-full w-full cursor-zoom-in"
                    imageClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Eye
                      size={20}
                      className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                </div>
              ))}
            </div>
            {businessPhotos.length > 4 && (
              <button
                onClick={() =>
                  setPhotosExpanded(!photosExpanded)
                }
                className="mt-4 w-full py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-blue-600 hover:border-blue-600/30 transition-colors flex items-center justify-center gap-2"
              >
                {photosExpanded ? (
                  <>
                    <ChevronRight
                      size={14}
                      className="-rotate-90"
                    />{" "}
                    Show fewer photos
                  </>
                ) : (
                  <>
                    <Camera size={14} /> View{" "}
                    {businessPhotos.length - 4} more photos
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {tab === "contact" && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
            <div className="bg-white rounded-xl border border-border p-6">
              <h2 className="font-semibold mb-5">
                Contact Information
              </h2>
              <div className="flex flex-col gap-4">
                {[
                  {
                    icon: (
                      <Phone
                        size={16}
                        className="text-blue-600"
                      />
                    ),
                    label: "Phone",
                    value: biz.phone,
                    href: `tel:${biz.phone}`,
                    action: "Call now",
                  },
                  {
                    icon: (
                      <Mail
                        size={16}
                        className="text-blue-600"
                      />
                    ),
                    label: "Email",
                    value: biz.email,
                    href: `mailto:${biz.email}`,
                    action: "Send email",
                  },
                  {
                    icon: (
                      <Globe
                        size={16}
                        className="text-blue-600"
                      />
                    ),
                    label: "Website",
                    value: biz.website,
                    href: `https://${biz.website}`,
                    action: "Visit site",
                  },
                  {
                    icon: (
                      <MapPinned
                        size={16}
                        className="text-blue-600"
                      />
                    ),
                    label: "Address",
                    value: biz.address,
                    href: "#",
                    action: "Get directions",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-4 p-4 bg-secondary/40 rounded-xl border border-border hover:border-blue-600/20 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center flex-shrink-0 shadow-sm">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        {item.label}
                      </p>
                      <p className="text-sm font-medium mt-0.5 truncate">
                        {item.value}
                      </p>
                    </div>
                    <a
                      href={item.href}
                      className="text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 flex-shrink-0"
                    >
                      {item.action} <ExternalLink size={10} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-border p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Clock size={14} className="text-blue-600" />{" "}
                Hours
              </h3>
              <div className="flex flex-col gap-2.5">
                {biz.hours.map((h) => (
                  <div
                    key={h.day}
                    className="flex justify-between items-baseline text-sm border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-muted-foreground">
                      {h.day}
                    </span>
                    <span className="font-medium text-xs">
                      {h.time}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium">
                    Open now
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "reviews" && (
          <div className="flex flex-col gap-4">
            {/* Summary */}
            <div className="bg-white rounded-xl border border-border p-6">
              <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center">
                <div className="text-center">
                  <p className="font-['Playfair_Display',serif] font-bold text-5xl text-blue-600">
                    {biz.rating}
                  </p>
                  <StarRating rating={biz.rating} size="lg" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {biz.reviewCount} reviews
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = biz.reviews.filter(
                      (r) => Math.round(r.rating) === star,
                    ).length;
                    const pct = biz.reviews.length
                      ? (count / biz.reviews.length) * 100
                      : 0;
                    return (
                      <div
                        key={star}
                        className="flex items-center gap-2"
                      >
                        <span className="text-xs text-muted-foreground w-4 text-right">
                          {star}
                        </span>
                        <Star
                          size={10}
                          className="text-amber-400 fill-amber-400"
                        />
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-4">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {biz.reviews.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-border p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={r.author} size="md" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => onUserClick(r.author)}
                          className="font-semibold text-sm hover:text-blue-600 transition-colors"
                        >
                          {r.author}
                        </button>
                        {r.authorBadges.map((b) => (
                          <UserBadgePill key={b} type={b} />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRating rating={r.rating} />
                        <span className="text-xs text-muted-foreground">
                          {r.date}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed mt-3">
                  {r.body}
                </p>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() =>
                      setReviewHelpful((p) => ({
                        ...p,
                        [r.id]: !p[r.id],
                      }))
                    }
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors font-['DM_Sans',sans-serif] ${reviewHelpful[r.id] ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <ThumbsUp
                      size={12}
                      className={
                        reviewHelpful[r.id]
                          ? "fill-primary text-primary"
                          : ""
                      }
                    />
                    Helpful (
                    {r.helpful + (reviewHelpful[r.id] ? 1 : 0)})
                  </button>
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    <Flag size={11} /> Report
                  </button>
                </div>
              </div>
            ))}

            <div className="bg-white rounded-xl border border-border p-5">
              <h3 className="font-semibold text-sm mb-3">
                Write a Review
              </h3>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s}>
                    <Star
                      size={20}
                      className="text-stone-200 hover:text-amber-400 hover:fill-amber-400 transition-colors"
                    />
                  </button>
                ))}
              </div>
              <textarea
                placeholder={`How was your experience with ${biz.name}?`}
                rows={3}
                className="w-full bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 resize-none"
              />
              <button className="mt-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity font-['DM_Sans',sans-serif]">
                Submit Review
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── User Profile ─────────────────────────────────────────────────────────────

// ─── Canvas crop helper ───────────────────────────────────────────────────────
async function getCanvasCrop(
  imgEl: HTMLImageElement,
  centerX: number,
  centerY: number,
  displayScale: number,
  cropW: number,
  cropH: number,
  outW: number,
  outH: number,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  const srcX = centerX - cropW / (2 * displayScale);
  const srcY = centerY - cropH / (2 * displayScale);
  const srcW = cropW / displayScale;
  const srcH = cropH / displayScale;
  ctx.drawImage(imgEl, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(URL.createObjectURL(b!)), "image/jpeg", 0.92),
  );
}

// ─── Crop Modal ───────────────────────────────────────────────────────────────
const CROP_CFG = {
  avatar: { w: 340, h: 340, outW: 480,  outH: 480,  label: "Profile Photo" },
  cover:  { w: 680, h: 213, outW: 1200, outH: 375,  label: "Cover Photo"   },
} as const;

function CropModal({
  src,
  mode,
  onApply,
  onClose,
}: {
  src: string;
  mode: "avatar" | "cover";
  onApply: (url: string) => void;
  onClose: () => void;
}) {
  const cfg = CROP_CFG[mode];
  const imgRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [cx, setCx] = useState(0);
  const [cy, setCy] = useState(0);
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);
  const [baseScale, setBaseScale] = useState(1);
  const [applying, setApplying] = useState(false);
  const drag = useRef<{ sx: number; sy: number; scx: number; scy: number } | null>(null);

  const displayScale = baseScale * zoom;

  function onImgLoad() {
    const img = imgRef.current!;
    const nW = img.naturalWidth;
    const nH = img.naturalHeight;
    setNatW(nW);
    setNatH(nH);
    const bs = Math.max(cfg.w / nW, cfg.h / nH);
    setBaseScale(bs);
    setZoom(1);
    setCx(nW / 2);
    setCy(nH / 2);
  }

  function clamp(nx: number, ny: number, z: number) {
    const ds = baseScale * z;
    const hW = cfg.w / (2 * ds);
    const hH = cfg.h / (2 * ds);
    const cx = hW >= natW / 2 ? Math.max(0, Math.min(natW, nx)) : Math.max(hW, Math.min(natW - hW, nx));
    const cy = hH >= natH / 2 ? Math.max(0, Math.min(natH, ny)) : Math.max(hH, Math.min(natH - hH, ny));
    return { cx, cy };
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    drag.current = { sx: e.clientX, sy: e.clientY, scx: cx, scy: cy };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    const { cx: ncx, cy: ncy } = clamp(
      drag.current.scx - dx / displayScale,
      drag.current.scy - dy / displayScale,
      zoom,
    );
    setCx(ncx);
    setCy(ncy);
  }
  function onMouseUp() { drag.current = null; }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const next = Math.max(0.5, Math.min(5, zoom + (e.deltaY < 0 ? 0.1 : -0.1)));
    setZoom(next);
    const { cx: ncx, cy: ncy } = clamp(cx, cy, next);
    setCx(ncx);
    setCy(ncy);
  }

  async function apply() {
    if (!imgRef.current || !natW) return;
    setApplying(true);
    const url = await getCanvasCrop(
      imgRef.current, cx, cy, displayScale,
      cfg.w, cfg.h, cfg.outW, cfg.outH,
    );
    onApply(url);
    setApplying(false);
  }

  const imgL = cfg.w / 2 - cx * displayScale;
  const imgT = cfg.h / 2 - cy * displayScale;

  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/75 z-[60] backdrop-blur-sm animate-in fade-in-0 duration-200" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
          style={{ width: `min(95vw, ${cfg.w + 64}px)` }}
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <Dialog.Title className="font-semibold text-sm">
              Crop {cfg.label}
            </Dialog.Title>
            <Dialog.Close
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <X size={15} />
            </Dialog.Close>
          </div>

          {/* Viewport */}
          <div className="flex flex-col items-center gap-4 p-5">
            <div
              className="relative overflow-hidden rounded-xl bg-stone-900 select-none"
              style={{
                width: cfg.w,
                height: cfg.h,
                maxWidth: "100%",
                cursor: drag.current ? "grabbing" : "grab",
              }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onWheel={onWheel}
            >
              {/* Image */}
              <img
                ref={imgRef}
                src={src}
                alt=""
                onLoad={onImgLoad}
                draggable={false}
                style={{
                  position: "absolute",
                  left: imgL,
                  top: imgT,
                  width: natW * displayScale,
                  height: natH * displayScale,
                  maxWidth: "none",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
              {/* Crop frame */}
              <div className="absolute inset-0 border-2 border-white/70 rounded-xl pointer-events-none" />
              {/* Rule-of-thirds grid */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.25 }}>
                <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="white" strokeWidth="1" />
                <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="white" strokeWidth="1" />
                <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="white" strokeWidth="1" />
                <line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke="white" strokeWidth="1" />
              </svg>
            </div>

            {/* Zoom control */}
            <div className="flex items-center gap-3 w-full" style={{ maxWidth: cfg.w }}>
              <Camera size={12} className="text-muted-foreground flex-shrink-0" />
              <SliderPrimitive.Root
                className="relative flex flex-1 items-center select-none touch-none h-5"
                min={0.5} max={5} step={0.05}
                value={[zoom]}
                onValueChange={([v]) => {
                  setZoom(v);
                  const { cx: ncx, cy: ncy } = clamp(cx, cy, v);
                  setCx(ncx);
                  setCy(ncy);
                }}
              >
                <SliderPrimitive.Track className="relative grow rounded-full h-1.5 bg-muted">
                  <SliderPrimitive.Range className="absolute bg-primary rounded-full h-full" />
                </SliderPrimitive.Track>
                <SliderPrimitive.Thumb className="block w-4 h-4 rounded-full bg-white border-2 border-primary shadow focus:outline-none cursor-pointer" />
              </SliderPrimitive.Root>
              <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">{zoom.toFixed(2)}×</span>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Drag to reposition · Scroll or slide to zoom
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2.5 px-5 py-3.5 border-t border-border bg-muted/30">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={apply}
              disabled={applying || !natW}
              className="px-5 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
            >
              {applying ? "Applying…" : "Apply Crop"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ProfileConnectionActions({
  targetId,
  targetName,
  followButtonClass,
}: {
  targetId: string;
  targetName: string;
  followButtonClass: string;
}) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [friendship, setFriendship] = useState<FriendshipRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"follow" | "friend" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadConnectionStatus(showLoading = false) {
    if (showLoading) setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id === targetId) {
      setCurrentUserId(user?.id || null);
      setLoading(false);
      return;
    }
    setCurrentUserId(user.id);
    const [followResult, friendResult] = await Promise.all([
      supabase.from("profile_follows").select("follower_id").eq("follower_id", user.id).eq("followed_id", targetId).maybeSingle(),
      supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status, created_at, responded_at")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`)
        .maybeSingle(),
    ]);
    setFollowing(!!followResult.data);
    setFriendship((friendResult.data as FriendshipRow | null) || null);
    setError(followResult.error || friendResult.error ? "Connection status could not be loaded." : null);
    setLoading(false);
  }

  useEffect(() => {
    void loadConnectionStatus(true);
    const timer = window.setInterval(() => { void loadConnectionStatus(); }, 10000);
    return () => window.clearInterval(timer);
  }, [targetId]);

  async function toggleFollow() {
    if (!currentUserId || busy) return;
    setBusy("follow");
    setError(null);
    if (following) {
      const { error: followError } = await supabase.from("profile_follows").delete().eq("follower_id", currentUserId).eq("followed_id", targetId);
      if (followError) setError("Could not unfollow this profile.");
      else setFollowing(false);
    } else {
      const { error: followError } = await supabase.from("profile_follows").insert({ follower_id: currentUserId, followed_id: targetId });
      if (followError && followError.code !== "23505") setError("Could not follow this profile.");
      else setFollowing(true);
    }
    setBusy(null);
  }

  async function sendFriendRequest() {
    if (!currentUserId || busy) return;
    setBusy("friend");
    setError(null);
    const { data, error: friendError } = await supabase
      .from("friendships")
      .insert({ requester_id: currentUserId, addressee_id: targetId, status: "pending" })
      .select("id, requester_id, addressee_id, status, created_at, responded_at")
      .single();
    if (friendError) {
      if (friendError.code === "23505") await loadConnectionStatus();
      else setError("Could not send the friend request.");
    } else setFriendship(data as FriendshipRow);
    setBusy(null);
  }

  async function acceptFriendRequest() {
    if (!friendship || !currentUserId || busy) return;
    setBusy("friend");
    setError(null);
    const { data, error: friendError } = await supabase
      .from("friendships")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", friendship.id)
      .select("id, requester_id, addressee_id, status, created_at, responded_at")
      .single();
    if (friendError) setError("Could not accept the friend request.");
    else setFriendship(data as FriendshipRow);
    setBusy(null);
  }

  async function removeFriendship() {
    if (!friendship || busy) return;
    setBusy("friend");
    setError(null);
    const { error: friendError } = await supabase.from("friendships").delete().eq("id", friendship.id);
    if (friendError) setError("Could not update the friend request.");
    else setFriendship(null);
    setBusy(null);
  }

  if (!currentUserId || currentUserId === targetId) return null;

  const incomingRequest = friendship?.status === "pending" && friendship.addressee_id === currentUserId;
  const outgoingRequest = friendship?.status === "pending" && friendship.requester_id === currentUserId;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        onClick={() => { void toggleFollow(); }}
        disabled={loading || busy === "follow"}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${following ? "border border-primary bg-primary/10 text-primary hover:bg-primary/15" : `${followButtonClass} text-white`}`}
      >
        {following ? <CheckCircle2 size={13} /> : <Users size={13} />}
        {following ? "Following" : "Follow"}
      </button>

      {!friendship && (
        <button
          onClick={() => { void sendFriendRequest(); }}
          disabled={loading || busy === "friend"}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          <UserPlus size={13} /> <span><span className="hidden sm:inline">Add </span>Friend</span>
        </button>
      )}

      {outgoingRequest && (
        <button
          onClick={() => { if (window.confirm(`Cancel your friend request to ${targetName}?`)) void removeFriendship(); }}
          disabled={busy === "friend"}
          title="Cancel friend request"
          className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
        >
          <Clock size={13} /> <span className="hidden sm:inline">Request </span>Sent
        </button>
      )}

      {incomingRequest && (
        <>
          <button
            onClick={() => { void acceptFriendRequest(); }}
            disabled={busy === "friend"}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            <UserCheck size={13} /> Accept
          </button>
          <button
            onClick={() => { void removeFriendship(); }}
            disabled={busy === "friend"}
            aria-label={`Decline friend request from ${targetName}`}
            title="Decline request"
            className="rounded-lg border border-border bg-white p-2 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </>
      )}

      {friendship?.status === "accepted" && (
        <button
          onClick={() => { if (window.confirm(`Remove ${targetName} from your friends?`)) void removeFriendship(); }}
          disabled={busy === "friend"}
          title="Remove friend"
          className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
        >
          <UserCheck size={13} /> Friends
        </button>
      )}

      {error && <p className="w-full text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Profile theme definitions ────────────────────────────────────────────────
const PROFILE_THEMES = {
  "Classic Blue":   { cover: "from-blue-700 to-blue-400",     btn: "bg-blue-600 hover:bg-blue-700",       accent: "text-blue-600",   bar: "bg-blue-600",    scrollbarColor: "#2563eb", tint: "bg-blue-50"    },
  "Ocean Breeze":   { cover: "from-cyan-700 to-teal-400",     btn: "bg-teal-600 hover:bg-teal-700",       accent: "text-teal-600",   bar: "bg-teal-600",    scrollbarColor: "#0d9488", tint: "bg-teal-50"    },
  "Sunset Glow":    { cover: "from-orange-500 to-rose-400",   btn: "bg-orange-500 hover:bg-orange-600",   accent: "text-orange-500", bar: "bg-orange-500",  scrollbarColor: "#f97316", tint: "bg-orange-50"  },
  "Emerald Forest": { cover: "from-emerald-800 to-green-500", btn: "bg-emerald-700 hover:bg-emerald-800", accent: "text-emerald-700",bar: "bg-emerald-700", scrollbarColor: "#059669", tint: "bg-emerald-50" },
  "Royal Purple":   { cover: "from-purple-800 to-violet-500", btn: "bg-purple-700 hover:bg-purple-800",   accent: "text-purple-700", bar: "bg-purple-700",  scrollbarColor: "#7c3aed", tint: "bg-purple-50"  },
  "Midnight Dark":  { cover: "from-slate-900 to-slate-600",   btn: "bg-slate-700 hover:bg-slate-800",     accent: "text-slate-700",  bar: "bg-slate-700",   scrollbarColor: "#475569", tint: "bg-slate-100"  },
} as const;
type ThemeName = keyof typeof PROFILE_THEMES;

function resolveProfileTheme(value?: string | null): ThemeName {
  if (value && Object.prototype.hasOwnProperty.call(PROFILE_THEMES, value)) return value as ThemeName;
  const aliases: Record<string, ThemeName> = {
    "classic-blue": "Classic Blue",
    purple: "Royal Purple",
    "royal-purple": "Royal Purple",
    ocean: "Ocean Breeze",
    "ocean-breeze": "Ocean Breeze",
    sunset: "Sunset Glow",
    "sunset-glow": "Sunset Glow",
    emerald: "Emerald Forest",
    "emerald-forest": "Emerald Forest",
    midnight: "Midnight Dark",
    "midnight-dark": "Midnight Dark",
  };
  return aliases[value || ""] || "Classic Blue";
}

function UserProfileView({
  profile,
  onBack,
  onMessage,
  isOwnProfile = false,
  myAvatarUrl = null,
  onAvatarChange,
  onSettings,
  onAdmin,
}: {
  profile: UserProfile;
  onBack: () => void;
  onMessage?: (contact: MessageContact) => void;
  isOwnProfile?: boolean;
  myAvatarUrl?: string | null;
  onAvatarChange?: (url: string) => void;
  onSettings?: () => void;
  onAdmin?: () => void;
}) {
  const [tab, setTab] = useState<"about" | "posts" | "photos" | "reviews">("about");
  const [theme, setTheme] = useState<ThemeName>(() => resolveProfileTheme(profile.theme));
  const [coverUrl, setCoverUrl] = useState<string | null>(profile.coverUrl || null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(myAvatarUrl || profile.avatarUrl || null);
  const [gallery, setGallery] = useState(profile.galleryPhotos);
  const [reviews, setReviews] = useState<NeighborReview[]>(profile.neighborReviews);
  const [hoverStar, setHoverStar] = useState(0);
  const [pickedStar, setPickedStar] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [helpfulMap, setHelpfulMap] = useState<Record<number, boolean>>({});
  const [themeOpen, setThemeOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState<"avatar" | "cover">("avatar");
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const T = PROFILE_THEMES[theme];

  useEffect(() => {
    if (!isOwnProfile) return;
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const [{ data: row }, { data: photos }] = await Promise.all([
        supabase.from("profiles").select("avatar_url, cover_url, theme").eq("id", user.id).maybeSingle(),
        supabase.from("profile_photos").select("image_url, caption").eq("user_id", user.id).order("created_at", { ascending: true }),
      ]);
      if (!active) return;
      if (row?.avatar_url) { setAvatarUrl(row.avatar_url); onAvatarChange?.(row.avatar_url); }
      if (row?.cover_url) setCoverUrl(row.cover_url);
      if (row?.theme) setTheme(resolveProfileTheme(row.theme));
      if (photos) setGallery(photos.map((p: any) => ({ url: p.image_url, alt: p.caption || "Profile photo" })));
    })();
    return () => { active = false; };
  }, [isOwnProfile]);

  useEffect(() => {
    document.documentElement.style.setProperty("--scrollbar-thumb", T.scrollbarColor);
    return () => {
      document.documentElement.style.setProperty("--scrollbar-thumb", "#3b82f6");
    };
  }, [theme]);

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : profile.rating;
  const displayRating = avgRating.toFixed(1);

  function openCrop(file: File, mode: "avatar" | "cover") {
    setCropMode(mode);
    setCropSrc(URL.createObjectURL(file));
  }
  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { openCrop(f, "cover"); e.target.value = ""; }
  }
  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { openCrop(f, "avatar"); e.target.value = ""; }
  }
  async function uploadMedia(blob: Blob, kind: "avatar" | "cover" | "gallery", originalName = "image.jpg") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be signed in to upload photos.");
    const ext = (originalName.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const path = user.id + "/" + kind + "/" + Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;
    const { error } = await supabase.storage.from("neighborly-media").upload(path, blob, { contentType: blob.type || "image/jpeg", cacheControl: "3600", upsert: false });
    if (error) throw error;
    return supabase.storage.from("neighborly-media").getPublicUrl(path).data.publicUrl;
  }

  async function applyAvatar(url: string) {
    if (!isOwnProfile) return;
    setMediaBusy(true); setMediaError(null);
    try {
      const blob = await fetch(url).then((r) => r.blob());
      const publicUrl = await uploadMedia(blob, "avatar", "avatar.jpg");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.rpc("set_my_profile_media", { p_avatar_url: publicUrl, p_cover_url: null, p_theme: null });
      if (error) throw error;
      setAvatarUrl(publicUrl); onAvatarChange?.(publicUrl);
    } catch (e: any) { setMediaError(e?.message || "Could not save profile photo."); }
    finally { setMediaBusy(false); }
  }

  async function applyCover(url: string) {
    if (!isOwnProfile) return;
    setMediaBusy(true); setMediaError(null);
    try {
      const blob = await fetch(url).then((r) => r.blob());
      const publicUrl = await uploadMedia(blob, "cover", "cover.jpg");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.rpc("set_my_profile_media", { p_avatar_url: null, p_cover_url: publicUrl, p_theme: null });
      if (error) throw error;
      setCoverUrl(publicUrl);
    } catch (e: any) { setMediaError(e?.message || "Could not save cover photo."); }
    finally { setMediaBusy(false); }
  }

  async function saveTheme(t: ThemeName) {
    if (!isOwnProfile) return;
    setTheme(t); setThemeOpen(false); setMediaError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.rpc("set_my_profile_media", { p_avatar_url: null, p_cover_url: null, p_theme: t });
    if (error) setMediaError(error.message);
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isOwnProfile) return;
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setMediaBusy(true); setMediaError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to upload photos.");
      for (const f of files) {
        const publicUrl = await uploadMedia(f, "gallery", f.name);
        const { error } = await supabase.from("profile_photos").insert({ user_id: user.id, image_url: publicUrl, caption: f.name });
        if (error) throw error;
        setGallery((prev) => [...prev, { url: publicUrl, alt: f.name }]);
      }
    } catch (e: any) { setMediaError(e?.message || "Could not save profile photos."); }
    finally { setMediaBusy(false); }
  }
  function submitReview() {
    if (!pickedStar || !reviewText.trim()) return;
    setReviews((prev) => [
      { id: Date.now(), author: "You", authorBadges: [], rating: pickedStar, date: "Just now", body: reviewText.trim(), helpful: 0 },
      ...prev,
    ]);
    setReviewSubmitted(true);
    setPickedStar(0);
    setReviewText("");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <ChevronLeft size={16} /> Back to feed
          </button>
          <div className="flex items-center gap-2">
            {isOwnProfile && onAdmin && (
              <button onClick={onAdmin} className="inline-flex items-center gap-2 rounded-lg bg-purple-700 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-800">
                <LayoutDashboard size={15} /> Admin
              </button>
            )}
            {isOwnProfile && onSettings && (
              <button onClick={onSettings} className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                ⚙️ Settings
              </button>
            )}
          </div>
        </div>
      </div>
      {mediaError && isOwnProfile && <div className="mx-auto max-w-5xl px-4 pt-3"><div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{mediaError}</div></div>}
      {mediaBusy && isOwnProfile && <div className="mx-auto max-w-5xl px-4 pt-3 text-xs text-muted-foreground">Saving photo…</div>}
      <div className="relative h-44 md:h-56 overflow-hidden">
        {coverUrl
          ? <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
          : <div className={`w-full h-full bg-gradient-to-br ${T.cover}`} />
        }
        {isOwnProfile && (
          <label className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/40 hover:bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-colors backdrop-blur-sm">
            <Camera size={13} /> Change Cover
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
          </label>
        )}
      </div>

      <div className={`${isOwnProfile ? T.tint : "bg-white"} border-b border-border`}>
        <div className="max-w-3xl mx-auto px-4">
          {/* Avatar row + action buttons */}
          <div className="flex items-start justify-between -mt-10 pt-0 pb-2">
            <div className="relative flex-shrink-0 mt-1">
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-muted">
                {avatarUrl
                  ? <img src={avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                  : <Avatar name={profile.name} size="xl" />
                }
              </div>
              {isOwnProfile && (
                <label className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white border border-border shadow flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                  <Camera size={11} className="text-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              )}
            </div>

            {/* Action buttons — pushed down past avatar */}
            <div className="flex items-center gap-2 mt-12 flex-shrink-0 relative">
              {isOwnProfile && (
                <div className="relative">
                  <button
                    onClick={() => setThemeOpen((o) => !o)}
                    className="flex items-center gap-1.5 border border-border bg-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-muted transition-colors"
                  >
                    <span className={`w-3 h-3 rounded-full bg-gradient-to-br ${T.cover} inline-block`} />
                    {theme}
                    <ChevronDown size={12} />
                  </button>
                  {themeOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                      {(Object.keys(PROFILE_THEMES) as ThemeName[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => { void saveTheme(t); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted transition-colors ${t === theme ? "font-semibold" : ""}`}
                        >
                          <span className={`w-4 h-4 rounded-full bg-gradient-to-br ${PROFILE_THEMES[t].cover} flex-shrink-0`} />
                          {t}
                          {t === theme && <CheckCircle2 size={13} className="ml-auto text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {!isOwnProfile && (
                <>
                  {profile.id && (
                    <button
                      onClick={() => onMessage?.({ id: profile.id!, name: profile.name, avatarUrl, accountType: "personal" })}
                      className="flex items-center gap-1.5 border border-border bg-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                      aria-label={`Message ${profile.name}`}
                    >
                      <MessageSquare size={13} /> <span className="hidden sm:inline">Message</span>
                    </button>
                  )}
                  {profile.id && <ProfileConnectionActions targetId={profile.id} targetName={profile.name} followButtonClass={T.btn} />}
                </>
              )}
            </div>
          </div>

          {/* Name, stars, location — always full width */}
          <div className="pb-3">
            <h1 className="font-['Playfair_Display',serif] font-bold text-xl leading-tight">
              {profile.name}
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} size={14}
                  className={s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-stone-200"} />
              ))}
              <span className="text-sm font-semibold ml-0.5">{displayRating}</span>
              <span className="text-xs text-muted-foreground">({reviews.length} ratings)</span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin size={10} /> {profile.neighborhood} · Member since {profile.joinDate}
            </p>
          </div>

          {profile.badges.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-3">
              {profile.badges.map((b) => <UserBadgePill key={b} type={b} />)}
            </div>
          )}

          <div className="flex border-t border-border">
            {(["about", "posts", "photos", "reviews"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? `border-current ${T.accent}`
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "reviews" ? `Reviews (${reviews.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 pb-10">
        {tab === "posts" && <ProfilePostsFeed profileName={profile.name} profileType="personal" profileOwnerId={profile.id} />}

        {tab === "about" && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-5">
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-xl border border-border p-5">
                <h2 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${T.accent}`}>
                  <Smile size={14} /> About
                </h2>
                <p className="text-sm text-foreground/80 leading-relaxed">{profile.bio || "No bio yet."}</p>
              </div>

              <div className="bg-white rounded-xl border border-border p-5">
                <h2 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${T.accent}`}>
                  <Award size={14} /> Community Badges
                </h2>
                <div className="flex flex-col gap-2.5">
                  {profile.badges.map((b) => {
                    const m = USER_BADGE_META[b];
                    return (
                      <div key={b} className={`flex items-center gap-3 p-3 rounded-xl border ${m.color}`}>
                        <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                          {React.cloneElement(m.icon as React.ReactElement, { size: 16 })}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{m.label}</p>
                          <p className="text-xs opacity-75 mt-0.5">{m.desc}</p>
                        </div>
                        <Zap size={13} className="ml-auto opacity-30" />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-border p-5">
                <h2 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${T.accent}`}>
                  <Zap size={14} /> Recent Activity
                </h2>
                <div className="flex flex-col">
                  {profile.recentActivity.map((a, i) => {
                    const icons: Record<string, React.ReactNode> = { post: <Megaphone size={11} />, comment: <MessageCircle size={11} />, rec: <Star size={11} />, event: <CalendarDays size={11} /> };
                    const colors: Record<string, string> = { post: "bg-sky-50 text-sky-700", comment: "bg-stone-50 text-stone-600", rec: "bg-emerald-50 text-emerald-700", event: "bg-violet-50 text-violet-700" };
                    return (
                      <div key={i} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${colors[a.type] || "bg-muted"}`}>{icons[a.type]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground/85">{a.text}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-xl border border-border p-4">
                <h3 className="font-semibold text-sm mb-3">Community Stats</h3>
                {[
                  { label: "Posts", value: profile.posts, icon: <Megaphone size={13} className="text-sky-600" /> },
                  { label: "Neighbors", value: profile.neighbors, icon: <Users size={13} className="text-emerald-600" /> },
                  { label: "Helpful votes", value: profile.helpfulVotes, icon: <ThumbsUp size={13} className="text-amber-600" /> },
                  { label: "Recs given", value: profile.recsGiven, icon: <Star size={13} className="text-violet-600" /> },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">{s.icon} {s.label}</div>
                    <span className={`font-bold text-sm ${T.accent}`}>{s.value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-secondary/50 rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={14} className={T.accent} />
                  <h3 className="font-semibold text-sm">Neighborhood Rank</h3>
                </div>
                <p className={`font-['Playfair_Display',serif] font-bold text-2xl ${T.accent}`}>Top 5%</p>
                <p className="text-xs text-muted-foreground mt-0.5">contributor in {profile.neighborhood}</p>
                <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className={`h-full ${T.bar} rounded-full`} style={{ width: "95%" }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "photos" && (
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-semibold text-sm flex items-center gap-2 ${T.accent}`}>
                <Camera size={14} /> Photo Gallery ({gallery.length})
              </h2>
              <label className={`flex items-center gap-1.5 ${T.btn} text-white text-xs font-medium px-3 py-2 rounded-lg cursor-pointer transition-colors`}>
                <Plus size={13} /> Upload Photos
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {gallery.map((p, i) => (
                <div key={i} className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                  <ExpandablePhoto src={p.url} alt={p.alt} buttonClassName="h-full w-full cursor-zoom-in" imageClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
              ))}
              <label className="aspect-[4/3] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition-colors text-muted-foreground">
                <Plus size={20} className="mb-1 opacity-50" />
                <span className="text-xs">Add more</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
              </label>
            </div>
          </div>
        )}

        {tab === "reviews" && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-border p-5">
              <h2 className={`font-semibold text-sm mb-4 flex items-center gap-2 ${T.accent}`}>
                <Star size={14} /> Neighbor Ratings
              </h2>
              <div className="grid grid-cols-[auto_1fr] gap-6 items-center">
                <div className="text-center">
                  <p className={`font-['Playfair_Display',serif] font-bold text-5xl ${T.accent}`}>{displayRating}</p>
                  <div className="flex items-center gap-0.5 mt-1 justify-center">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} size={16} className={s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-stone-200"} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{reviews.length} ratings</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-border p-5">
              <h3 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${T.accent}`}>
                <MessageSquare size={14} /> Rate &amp; Review {profile.name.split(" ")[0]}
              </h3>
              {reviewSubmitted ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 text-sm">
                  <CheckCircle2 size={15} /> Your review was submitted — thank you!
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1 mb-3">
                    {[1,2,3,4,5].map((s) => (
                      <button
                        key={s}
                        onMouseEnter={() => setHoverStar(s)}
                        onMouseLeave={() => setHoverStar(0)}
                        onClick={() => setPickedStar(s)}
                        className="transition-transform hover:scale-125"
                      >
                        <Star size={30}
                          className={s <= (hoverStar || pickedStar) ? "fill-amber-400 text-amber-400" : "text-stone-200"} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    placeholder={`Share your experience as ${profile.name.split(" ")[0]}'s neighbor…`}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                  <button
                    onClick={submitReview}
                    disabled={!pickedStar || !reviewText.trim()}
                    className={`mt-2 ${T.btn} text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40`}
                  >
                    Submit Review
                  </button>
                </>
              )}
            </div>

            {reviews.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-start gap-3">
                  <Avatar name={r.author} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{r.author}</span>
                      <span className="text-xs text-muted-foreground">{r.date}</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed mt-2">{r.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cropSrc && (
        <CropModal
          src={cropSrc}
          mode={cropMode}
          onApply={(url) => {
            if (cropMode === "avatar") void applyAvatar(url);
            else void applyCover(url);
            setCropSrc(null);
          }}
          onClose={() => setCropSrc(null)}
        />
      )}

    </div>
  );
}

// ─── Search View ─────────────────────────────────────────────────────────────

function SearchView({
  onBack,
  onUserClick,
  groups,
  activeLocation,
}: {
  onBack: () => void;
  onUserClick: (name: string, authorId?: string) => void;
  groups: { id: string; name: string; description: string; members: number; joined: boolean; city: string }[];
  activeLocation: LocationName;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "people" | "businesses" | "groups">("all");
  const [people, setPeople] = useState<{
    id: string;
    name: string;
    city: string;
    neighborhood: string;
    avatarUrl?: string | null;
  }[]>([]);
  const [businesses, setBusinesses] = useState<{
    userId: string;
    name: string;
    category: string;
    city: string;
    neighborhood: string;
    logoUrl?: string | null;
  }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchTerm = query.replace(/[%_]/g, " ").trim();
  const q = searchTerm.toLocaleLowerCase();
  const activeArea = selectedLocationParts(activeLocation);

  const matchedGroups = searchTerm ? groups.filter(
    (g) =>
      (activeLocation === "All Areas" || sameLocation(g.city, activeArea.city)) &&
      (filter === "all" || filter === "groups") &&
      (g.name.toLocaleLowerCase().includes(q) || g.description.toLocaleLowerCase().includes(q)),
  ) : [];

  useEffect(() => {
    let cancelled = false;

    if (!searchTerm || filter === "groups") {
      setPeople([]);
      setBusinesses([]);
      setLoading(false);
      setSearchError(null);
      return () => { cancelled = true; };
    }

    setLoading(true);
    setSearchError(null);

    const timer = window.setTimeout(async () => {
      const peoplePromise = filter === "all" || filter === "people"
        ? (() => {
            let request = supabase
              .from("profiles")
              .select("id, full_name, city, neighborhood, avatar_url")
              .eq("account_type", "personal")
              .ilike("full_name", `%${searchTerm}%`)
              .limit(20);
            if (activeArea.city) request = request.ilike("city", activeArea.city);
            if (activeArea.neighborhood) request = request.ilike("neighborhood", activeArea.neighborhood);
            return request;
          })()
        : Promise.resolve({ data: [], error: null });

      const businessesPromise = filter === "all" || filter === "businesses"
        ? (() => {
            let request = supabase
              .from("business_profiles")
              .select("user_id, business_name, category, city, neighborhood, logo_url")
              .ilike("business_name", `%${searchTerm}%`)
              .limit(20);
            if (activeArea.city) request = request.ilike("city", activeArea.city);
            if (activeArea.neighborhood) request = request.ilike("neighborhood", activeArea.neighborhood);
            return request;
          })()
        : Promise.resolve({ data: [], error: null });

      const [peopleResult, businessesResult] = await Promise.all([peoplePromise, businessesPromise]);
      if (cancelled) return;

      if (peopleResult.error || businessesResult.error) {
        setPeople([]);
        setBusinesses([]);
        setSearchError("Search is temporarily unavailable. Please try again.");
      } else {
        setPeople((peopleResult.data || []).map((person: any) => ({
          id: person.id,
          name: person.full_name || "Neighbor",
          city: canonicalLocation(person.city),
          neighborhood: person.neighborhood || "Local neighbor",
          avatarUrl: person.avatar_url,
        })));
        setBusinesses((businessesResult.data || []).map((business: any) => ({
          userId: business.user_id,
          name: business.business_name || "Local Business",
          category: business.category || "Local Business",
          city: canonicalLocation(business.city),
          neighborhood: business.neighborhood || "Local business",
          logoUrl: business.logo_url,
        })));
      }
      setLoading(false);
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeLocation, activeArea.city, activeArea.neighborhood, filter, searchTerm]);

  const filters: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "people", label: "People" },
    { key: "businesses", label: "Businesses" },
    { key: "groups", label: "Groups" },
  ];

  return (
    <div className="min-h-screen bg-purple-950 font-['DM_Sans',sans-serif] pb-20">
      <div className="sticky top-0 z-40 bg-card border-b border-border shadow-sm px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
          <Search size={16} className="text-muted-foreground flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, businesses, groups…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 flex flex-col gap-4 pb-6">
        {searchError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {searchError}
          </div>
        )}

        {loading && (
          <div className="text-center py-12" aria-live="polite">
            <Search size={32} className="text-purple-400 mx-auto mb-3 animate-pulse" />
            <p className="text-purple-200 font-medium">Searching Neighborly…</p>
          </div>
        )}

        {/* People */}
        {!loading && people.length > 0 && (
          <section>
            {(filter === "all") && <h3 className="text-xs font-semibold uppercase tracking-wide text-purple-300 mb-2">People</h3>}
            <div className="flex flex-col gap-2">
              {people.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onUserClick(p.name, p.id)}
                  className="bg-card rounded-xl border border-border p-3 flex items-center gap-3 text-left hover:border-primary/30 transition-colors"
                >
                  <Avatar name={p.name} size="md" src={p.avatarUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.neighborhood} · {p.city}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Businesses */}
        {!loading && businesses.length > 0 && (
          <section>
            {(filter === "all") && <h3 className="text-xs font-semibold uppercase tracking-wide text-purple-300 mb-2">Businesses</h3>}
            <div className="flex flex-col gap-2">
              {businesses.map((b) => (
                <button
                  key={b.userId}
                  onClick={() => onUserClick(b.name, b.userId)}
                  className="bg-card rounded-xl border border-border p-3 flex items-center gap-3 text-left hover:border-primary/30 transition-colors"
                >
                  <Avatar name={b.name} size="md" src={b.logoUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{b.category} · {b.neighborhood} · {b.city}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Groups */}
        {matchedGroups.length > 0 && (
          <section>
            {(filter === "all") && <h3 className="text-xs font-semibold uppercase tracking-wide text-purple-300 mb-2">Groups</h3>}
            <div className="flex flex-col gap-2">
              {matchedGroups.map((g) => (
                <div key={g.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary text-primary flex items-center justify-center flex-shrink-0">
                    <Users size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{g.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{g.members} members</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && !searchError && searchTerm && people.length === 0 && businesses.length === 0 && matchedGroups.length === 0 && (
          <div className="text-center py-12">
            <Search size={32} className="text-purple-400 mx-auto mb-3" />
            <p className="text-purple-200 font-medium">No results for "{query}"</p>
            <p className="text-purple-400 text-sm mt-1">Try another name or switch to All Areas</p>
          </div>
        )}

        {!searchTerm && (
          <div className="text-center py-12">
            <Search size={32} className="text-purple-400 mx-auto mb-3" />
            <p className="text-purple-200 font-medium">Search Neighborly</p>
            <p className="text-purple-400 text-sm mt-1">Find neighbors, businesses, and community groups</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Events View ──────────────────────────────────────────────────────────────

function EventsView({ onBack, activeLocation }: { onBack: () => void; activeLocation: LocationName }) {
  const allEvents = [
    { id: 1, city: "Michigan City", title: "Community Cleanup", date: "Sat Aug 16", time: "9:00 AM", location: "Riverside Park", going: 34, icon: <Leaf size={16} />, color: "bg-emerald-50 text-emerald-700", desc: "Join neighbors for our monthly cleanup. Gloves and bags provided!" },
    { id: 2, city: "La Porte", title: "Farmer's Market", date: "Sun Aug 17", time: "8:00 AM", location: "Main Street Plaza", going: 87, icon: <ShoppingBag size={16} />, color: "bg-amber-50 text-amber-700", desc: "Local vendors, fresh produce, and homemade goods every Sunday." },
    { id: 3, city: "La Porte", title: "Block Party Planning", date: "Tue Aug 19", time: "7:00 PM", location: "Community Center", going: 22, icon: <Users size={16} />, color: "bg-blue-50 text-blue-700", desc: "Help plan the annual block party. All ideas welcome!" },
    { id: 4, city: "New Buffalo", title: "Book Club Meetup", date: "Thu Aug 21", time: "6:30 PM", location: "Public Library", going: 15, icon: <Star size={16} />, color: "bg-purple-50 text-purple-700", desc: "This month: 'The Midnight Library'. Newcomers always welcome." },
    { id: 5, city: "Long Beach", title: "Youth Soccer Practice", date: "Sat Aug 23", time: "10:00 AM", location: "Elm Street Field", going: 28, icon: <Zap size={16} />, color: "bg-rose-50 text-rose-700", desc: "Open practice for kids ages 6–12. Bring water and sunscreen." },
  ];
  const selectedCity = selectedLocationParts(activeLocation).city;
  const visibleEvents = activeLocation === "All Areas" ? allEvents : allEvents.filter((e) => sameLocation(e.city, selectedCity));

  return (
    <div className="min-h-screen bg-purple-950 font-['DM_Sans',sans-serif] pb-20">
      <div className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-primary" />
            <h1 className="font-['Playfair_Display',serif] font-bold text-lg text-foreground">Upcoming Events</h1>
          </div>
        </div>
      </div>

      {activeLocation !== "All Areas" && (
        <div className="px-4 pt-3 flex items-center gap-2">
          <MapPin size={13} className="text-purple-300" />
          <span className="text-xs font-semibold uppercase tracking-wide text-purple-300 font-['DM_Sans',sans-serif]">{locationMenuLabel(activeLocation)}</span>
        </div>
      )}
      {visibleEvents.length === 0 && (
        <div className="text-center py-14 px-4">
          <CalendarDays size={32} className="text-purple-400 mx-auto mb-3" />
          <p className="text-purple-100 font-semibold font-['DM_Sans',sans-serif]">No events in {locationPromptLabel(activeLocation)}</p>
          <p className="text-purple-400 text-sm mt-1 font-['DM_Sans',sans-serif]">Check back soon or switch to All Areas</p>
        </div>
      )}
      <div className="px-4 py-4 flex flex-col gap-3">
        {visibleEvents.map((ev) => (
          <div key={ev.id} className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/30 transition-colors">
            <div className="p-4 flex gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ev.color}`}>
                {ev.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{ev.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ev.date} · {ev.time} · {ev.location}</p>
                <p className="text-sm text-foreground/80 mt-1.5">{ev.desc}</p>
              </div>
            </div>
            <div className="px-4 pb-3 flex items-center justify-between border-t border-border pt-2">
              <span className="text-xs text-muted-foreground">{ev.going} going</span>
              <button className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
                Join Event
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PostOwnerMenu({
  post,
  currentUserId,
  busy,
  onEdit,
  onDelete,
}: {
  post: Post;
  currentUserId?: string;
  busy?: boolean;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!post.databaseId || !currentUserId || post.authorId !== currentUserId) return null;

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((current) => !current)}
        className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors"
        aria-label="Post options"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
      >
        <MoreHorizontal size={17} />
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} aria-label="Close post options" />
          <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-xl" role="menu">
            <button
              onClick={() => { setOpen(false); onEdit(post); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              role="menuitem"
            >
              <Pencil size={14} /> Edit post
            </button>
            <button
              onClick={() => { setOpen(false); onDelete(post); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              role="menuitem"
            >
              <Trash2 size={14} /> Delete post
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function EditPostDialog({
  post,
  busy,
  error,
  onClose,
  onSave,
}: {
  post: Post;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (body: string, category: PostCategory) => void;
}) {
  const [body, setBody] = useState(post.body);
  const [category, setCategory] = useState<PostCategory>(post.category);

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl" aria-describedby={undefined}>
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <Dialog.Title className="font-semibold text-lg">Edit post</Dialog.Title>
            <button onClick={onClose} disabled={busy} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-50" aria-label="Close edit post">
              <X size={17} />
            </button>
          </div>
          <div className="p-5">
            <label className="mb-2 block text-sm font-medium" htmlFor="edit-post-body">Post</label>
            <textarea
              id="edit-post-body"
              autoFocus
              maxLength={5000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-32 w-full resize-y rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white"
            />
            <p className="mb-4 mt-1 text-right text-xs text-muted-foreground">{body.length}/5000</p>
            <p className="mb-2 text-sm font-medium">Category</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_META) as PostCategory[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCategory(option)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${CATEGORY_META[option].color} ${category === option ? "ring-2 ring-current ring-offset-1" : "opacity-60 hover:opacity-100"}`}
                >
                  {CATEGORY_META[option].icon} {CATEGORY_META[option].label}
                </button>
              ))}
            </div>
            {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
            <button onClick={onClose} disabled={busy} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50">Cancel</button>
            <button
              onClick={() => onSave(body.trim(), category)}
              disabled={busy || !body.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function HelpWantedView({
  posts,
  onBack,
  onCreate,
  onUserClick,
  onMessage,
  onEdit,
  onDelete,
  busyPostId,
  currentUserId,
  activeLocation,
}: {
  posts: Post[];
  onBack: () => void;
  onCreate: () => void;
  onUserClick: (name: string, authorId?: string) => void;
  onMessage: (contact: MessageContact) => void;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
  busyPostId: string | null;
  currentUserId?: string;
  activeLocation: LocationName;
}) {
  const [search, setSearch] = useState("");
  const locationPosts = posts.filter((post) => matchesSelectedLocation(post.city, post.neighborhood, activeLocation));
  const filtered = locationPosts.filter((post) => {
    const query = search.trim().toLocaleLowerCase();
    return !query || post.body.toLocaleLowerCase().includes(query) || post.neighborhood.toLocaleLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen bg-purple-950 font-['DM_Sans',sans-serif] pb-20">
      <div className="sticky top-0 z-40 border-b border-border bg-card shadow-sm">
        <div className="flex min-h-14 items-center gap-3 px-4 py-2">
          <button onClick={onBack} className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Back to feed">
            <ChevronLeft size={20} />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <HandHeart size={19} className="text-primary" />
            <h1 className="truncate font-['Playfair_Display',serif] text-lg font-bold text-foreground">Help Wanted</h1>
          </div>
          <button onClick={onCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus size={14} /> Post a Request
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
            <Search size={14} className="flex-shrink-0 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests…" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4">
        {filtered.length === 0 ? (
          <div className="py-14 text-center">
            <HandHeart size={34} className="mx-auto mb-3 text-purple-400" />
            <p className="font-medium text-purple-100">No help requests here yet</p>
            <p className="mt-1 text-sm text-purple-400">Be the first neighbor to ask for help</p>
            <button onClick={onCreate} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Post a Request</button>
          </div>
        ) : filtered.map((post) => (
          <article key={post.id} className="overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/30">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <button onClick={() => !post.isAdminPost && onUserClick(post.author, post.authorId)} disabled={post.isAdminPost} aria-label={post.isAdminPost ? "Official Neighborly administrator" : `View ${post.author}'s profile`}>
                  <Avatar name={post.author} size="sm" src={post.authorAvatar || null} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button onClick={() => !post.isAdminPost && onUserClick(post.author, post.authorId)} disabled={post.isAdminPost} className="text-sm font-semibold enabled:hover:text-primary">{post.author}</button>
                    {post.isAdminPost && <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700"><BadgeCheck size={11} /> Official</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{post.neighborhood} · {post.time}</p>
                </div>
                <PostOwnerMenu post={post} currentUserId={currentUserId} busy={busyPostId === post.databaseId} onEdit={onEdit} onDelete={onDelete} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{post.body}</p>
              {post.image && <ExpandablePhoto src={post.image} alt="Help wanted post photo" buttonClassName="mt-3 flex max-h-72 w-full cursor-zoom-in justify-center overflow-hidden rounded-xl bg-muted" imageClassName="max-h-72 max-w-full object-contain" />}
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"><HandHeart size={12} /> Help Wanted</span>
                <button
                  onClick={() => post.authorId && onMessage({ id: post.authorId, name: post.author, avatarUrl: post.authorAvatar || null })}
                  disabled={!post.authorId || post.authorId === currentUserId || post.isAdminPost}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {post.authorId === currentUserId ? "Your Request" : "Offer Help"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ─── Classifieds View ─────────────────────────────────────────────────────────

function ClassifiedsView({
  posts,
  onBack,
  onUserClick,
  onMessage,
  onEdit,
  onDelete,
  busyPostId,
  currentUserId,
  activeLocation,
}: {
  posts: Post[];
  onBack: () => void;
  onUserClick: (name: string, authorId?: string) => void;
  onMessage: (contact: MessageContact) => void;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
  busyPostId: string | null;
  currentUserId?: string;
  activeLocation: LocationName;
}) {
  const [search, setSearch] = useState("");
  const locationPosts = posts.filter((post) => matchesSelectedLocation(post.city, post.neighborhood, activeLocation));
  const filtered = locationPosts.filter(
    (p) => search === "" || p.body.toLowerCase().includes(search.toLowerCase()) || (p.title ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-purple-950 font-['DM_Sans',sans-serif] pb-20">
      <div className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="px-4 h-14 flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-primary" />
            <h1 className="font-['Playfair_Display',serif] font-bold text-lg text-foreground">Classifieds</h1>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
            <Search size={14} className="text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search listings…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag size={32} className="text-purple-400 mx-auto mb-3" />
            <p className="text-purple-200 font-medium">No listings yet</p>
            <p className="text-purple-400 text-sm mt-1">Be the first to post something for sale</p>
          </div>
        ) : (
          filtered.map((post) => (
            <div key={post.id} className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/30 transition-colors">
              {post.image && (
                <ExpandablePhoto src={post.image} alt={post.title || "Classified listing photo"} buttonClassName="block h-40 w-full cursor-zoom-in overflow-hidden bg-muted" imageClassName="h-full w-full object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <button onClick={() => !post.isAdminPost && onUserClick(post.author, post.authorId)} disabled={post.isAdminPost} aria-label={post.isAdminPost ? "Official Neighborly administrator" : `View ${post.author}'s profile`}>
                    <Avatar name={post.author} size="sm" src={post.authorAvatar || null} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button onClick={() => !post.isAdminPost && onUserClick(post.author, post.authorId)} disabled={post.isAdminPost} className="font-semibold text-sm text-foreground enabled:hover:text-primary transition-colors">{post.author}</button>
                      {post.isAdminPost && <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700"><BadgeCheck size={11} /> Official</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{post.neighborhood} · {post.time}</p>
                  </div>
                  <PostOwnerMenu post={post} currentUserId={currentUserId} busy={busyPostId === post.databaseId} onEdit={onEdit} onDelete={onDelete} />
                </div>
                {post.title && <p className="font-semibold text-foreground mt-2">{post.title}</p>}
                <p className="text-sm text-foreground/80 mt-1">{post.body}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => post.authorId && onMessage({ id: post.authorId, name: post.author, avatarUrl: post.authorAvatar || null })}
                    disabled={!post.authorId || post.authorId === currentUserId || post.isAdminPost}
                    className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Message Seller
                  </button>
                  <button className="px-3 py-2 border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                    <Bookmark size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Feedback and Admin ──────────────────────────────────────────────────────

function FeedbackModal({
  open,
  onClose,
  senderName,
}: {
  open: boolean;
  onClose: () => void;
  senderName: string;
}) {
  const [category, setCategory] = useState<FeedbackCategory>("idea");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [recentFeedback, setRecentFeedback] = useState<SiteFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadMyFeedback() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setError("Please sign in again to send feedback.");
      setLoading(false);
      return;
    }
    setContactEmail((current) => current || user.email || "");
    const { data, error: loadError } = await supabase
      .from("site_feedback")
      .select("id, user_id, sender_name, contact_email, category, subject, message, status, admin_response, responded_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (loadError) setError("Your feedback history could not be loaded.");
    else setRecentFeedback((data || []) as SiteFeedback[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    void loadMyFeedback();
  }, [open]);

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setError("Please sign in again to send feedback.");
      setSubmitting(false);
      return;
    }
    const { error: insertError } = await supabase.from("site_feedback").insert({
      user_id: user.id,
      sender_name: senderName.trim() || "Neighbor",
      contact_email: contactEmail.trim(),
      category,
      subject: subject.trim(),
      message: message.trim(),
    });
    if (insertError) {
      console.error("Could not submit site feedback", insertError);
      setError("Your feedback could not be sent. Please try again.");
    } else {
      setSubject("");
      setMessage("");
      setCategory("idea");
      setSuccess("Thank you—your feedback is now in the admin inbox.");
      await loadMyFeedback();
    }
    setSubmitting(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] max-h-[90dvh] w-[min(42rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-2xl" aria-describedby={undefined}>
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-5 py-4">
            <Dialog.Title className="flex items-center gap-2 text-lg font-semibold">
              <MessageSquare size={18} className="text-purple-700" /> Send Feedback
            </Dialog.Title>
            <Dialog.Close className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close feedback">
              <X size={16} />
            </Dialog.Close>
          </div>
          <div className="space-y-6 p-5 sm:p-6">
            <form onSubmit={(event) => { void submitFeedback(event); }} className="space-y-4" aria-busy={submitting}>
              <p className="text-sm text-muted-foreground">Share an idea, report a problem, or ask a question. The Neighborly administrator will see it in the private admin inbox.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="feedback-category" className="mb-1 block text-xs font-semibold text-muted-foreground">Feedback type</label>
                  <select id="feedback-category" value={category} onChange={(event) => setCategory(event.target.value as FeedbackCategory)} className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-600/30">
                    {(Object.keys(FEEDBACK_CATEGORY_LABELS) as FeedbackCategory[]).map((item) => <option key={item} value={item}>{FEEDBACK_CATEGORY_LABELS[item]}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="feedback-email" className="mb-1 block text-xs font-semibold text-muted-foreground">Reply email</label>
                  <input id="feedback-email" required type="email" maxLength={254} value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-600/30" />
                </div>
              </div>
              <div>
                <label htmlFor="feedback-subject" className="mb-1 block text-xs font-semibold text-muted-foreground">Subject</label>
                <input id="feedback-subject" required minLength={2} maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="What would you like us to know?" className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-600/30" />
              </div>
              <div>
                <label htmlFor="feedback-message" className="mb-1 block text-xs font-semibold text-muted-foreground">Message</label>
                <textarea id="feedback-message" required minLength={5} maxLength={5000} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Include the details that will help us understand your feedback." className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-600/30" />
                <p className="mt-1 text-right text-[11px] text-muted-foreground">{message.length}/5000</p>
              </div>
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              {success && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
              <button type="submit" disabled={submitting} className="w-full rounded-lg bg-purple-700 py-3 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-50">
                {submitting ? "Sending Feedback…" : "Send Feedback"}
              </button>
            </form>

            <section className="border-t border-border pt-5">
              <h3 className="mb-3 text-sm font-semibold">Your recent feedback</h3>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading your messages…</p>
              ) : recentFeedback.length === 0 ? (
                <p className="rounded-xl bg-muted px-4 py-5 text-center text-sm text-muted-foreground">You haven't sent feedback yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentFeedback.map((item) => (
                    <article key={item.id} className="rounded-xl border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{item.subject}</p>
                          <p className="text-xs text-muted-foreground">{FEEDBACK_CATEGORY_LABELS[item.category]} · {new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${item.status === "resolved" ? "bg-emerald-100 text-emerald-700" : item.status === "read" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{item.status}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{item.message}</p>
                      {item.admin_response && (
                        <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
                          <p className="text-xs font-semibold text-purple-700">Administrator response</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-purple-950">{item.admin_response}</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AdminDashboard({
  onBack,
  defaultCity,
  defaultNeighborhood,
  onPostCreated,
}: {
  onBack: () => void;
  defaultCity: string;
  defaultNeighborhood: string;
  onPostCreated: (post: Post) => void;
}) {
  const [tab, setTab] = useState<"access" | "posts" | "feedback" | "advertising">("access");
  const [accessRequests, setAccessRequests] = useState<MemberAccessRequest[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<SiteFeedback[]>([]);
  const [advertisements, setAdvertisements] = useState<AdminAdvertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<string, NonNullable<AdminAdvertisement["payment_method"]>>>({});
  const [paymentReferences, setPaymentReferences] = useState<Record<string, string>>({});

  const [postBody, setPostBody] = useState("");
  const [postCategory, setPostCategory] = useState<PostCategory>("news");
  const [postCity, setPostCity] = useState(defaultCity);
  const [postNeighborhood, setPostNeighborhood] = useState(defaultNeighborhood);
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [postBusy, setPostBusy] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postSuccess, setPostSuccess] = useState<string | null>(null);
  const adminPostImageRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    const feedbackRequest = supabase
      .from("site_feedback")
      .select("id, user_id, sender_name, contact_email, category, subject, message, status, admin_response, responded_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    const advertisingRequest = supabase
      .from("advertising_campaigns")
      .select("id, user_id, tier, business_name, headline, description, image_url, destination_url, phone, contact_email, target_city, status, billing_status, payment_method, payment_reference, starts_at, ends_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    const accessRequest = supabase
      .from("member_access")
      .select("user_id, email, requested_name, account_type, status, requested_at, reviewed_at")
      .order("requested_at", { ascending: false })
      .limit(100);
    void Promise.all([accessRequest, feedbackRequest, advertisingRequest]).then(([accessResult, feedbackResult, advertisingResult]) => {
      if (cancelled) return;
      if (accessResult.error || feedbackResult.error || advertisingResult.error) {
        console.error("Could not load admin dashboard", accessResult.error || feedbackResult.error || advertisingResult.error);
        setLoadError("Some admin information could not be loaded. Please refresh.");
      }
      setAccessRequests((accessResult.data || []) as MemberAccessRequest[]);
      setFeedbackItems((feedbackResult.data || []) as SiteFeedback[]);
      setAdvertisements((advertisingResult.data || []) as AdminAdvertisement[]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => () => {
    if (postImagePreview) URL.revokeObjectURL(postImagePreview);
  }, [postImagePreview]);

  function choosePostImage(file: File | null) {
    setPostError(null);
    if (!file) {
      setPostImage(null);
      setPostImagePreview(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setPostError("Choose a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPostError("The post image must be 5 MB or smaller.");
      return;
    }
    setPostImage(file);
    setPostImagePreview(URL.createObjectURL(file));
  }

  async function publishAdminPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (postBusy || (!postBody.trim() && !postImage)) return;
    setPostBusy(true);
    setPostError(null);
    setPostSuccess(null);
    let uploadedPath: string | null = null;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Your session expired. Please sign in again.");
      let imageUrl: string | null = null;
      if (postImage) {
        const ext = (postImage.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
        uploadedPath = `${user.id}/posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("neighborly-media").upload(uploadedPath, postImage, { upsert: false, contentType: postImage.type });
        if (uploadError) throw uploadError;
        imageUrl = supabase.storage.from("neighborly-media").getPublicUrl(uploadedPath).data.publicUrl;
      }
      const { data: saved, error: insertError } = await supabase.from("posts").insert({
        author_id: user.id,
        is_admin_post: true,
        post_type: postTypeForCategory(postCategory),
        category: postCategory,
        content: postBody.trim(),
        image_url: imageUrl,
        city: postCity.trim(),
        neighborhood: postNeighborhood.trim(),
      }).select("id, created_at").single();
      if (insertError) {
        if (uploadedPath) await supabase.storage.from("neighborly-media").remove([uploadedPath]);
        throw insertError;
      }
      onPostCreated({
        id: new Date(saved.created_at).getTime(),
        databaseId: saved.id,
        author: "Neighborly Admin",
        authorId: user.id,
        authorBadges: [],
        authorAvatar: neighborlyLogo,
        isAdminPost: true,
        neighborhood: postNeighborhood.trim(),
        city: postCity.trim(),
        time: "Just now",
        category: postCategory,
        body: postBody.trim(),
        image: imageUrl || undefined,
        likes: 0,
        comments: [],
        bookmarked: false,
        liked: false,
      });
      setPostBody("");
      choosePostImage(null);
      if (adminPostImageRef.current) adminPostImageRef.current.value = "";
      setPostSuccess("Your post is live in the Neighborly feed.");
    } catch (postFailure: any) {
      console.error("Could not publish admin post", postFailure);
      setPostError(postFailure?.message || "The post could not be published.");
    } finally {
      setPostBusy(false);
    }
  }

  async function markFeedbackRead(item: SiteFeedback) {
    if (actionBusyId) return;
    setActionBusyId(item.id);
    setActionError(null);
    const { error } = await supabase.from("site_feedback").update({ status: "read", updated_at: new Date().toISOString() }).eq("id", item.id).select("id").single();
    if (error) setActionError("That feedback item could not be updated.");
    else setFeedbackItems((current) => current.map((row) => row.id === item.id ? { ...row, status: "read" } : row));
    setActionBusyId(null);
  }

  async function reviewMemberAccess(item: MemberAccessRequest, status: "approved" | "declined") {
    if (actionBusyId) return;
    setActionBusyId(item.user_id);
    setActionError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setActionError("Please sign in again before reviewing access requests.");
      setActionBusyId(null);
      return;
    }
    const reviewedAt = new Date().toISOString();
    const { error } = await supabase
      .from("member_access")
      .update({ status, reviewed_by: user.id, reviewed_at: reviewedAt, updated_at: reviewedAt })
      .eq("user_id", item.user_id)
      .select("user_id")
      .single();
    if (error) {
      console.error("Could not review member access", error);
      setActionError("That access request could not be updated.");
    } else {
      setAccessRequests((current) => current.map((request) => request.user_id === item.user_id ? { ...request, status, reviewed_at: reviewedAt } : request));
    }
    setActionBusyId(null);
  }

  async function saveFeedbackResponse(item: SiteFeedback) {
    const response = (responseDrafts[item.id] ?? item.admin_response ?? "").trim();
    if (!response || actionBusyId) return;
    setActionBusyId(item.id);
    setActionError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setActionError("Please sign in again before replying.");
      setActionBusyId(null);
      return;
    }
    const respondedAt = new Date().toISOString();
    const { error } = await supabase.from("site_feedback").update({
      admin_response: response,
      responded_by: user.id,
      responded_at: respondedAt,
      status: "resolved",
      updated_at: respondedAt,
    }).eq("id", item.id).select("id").single();
    if (error) setActionError("Your response could not be saved.");
    else setFeedbackItems((current) => current.map((row) => row.id === item.id ? { ...row, admin_response: response, responded_at: respondedAt, status: "resolved" } : row));
    setActionBusyId(null);
  }

  async function updateAdvertisement(id: string, changes: Partial<AdminAdvertisement>) {
    if (actionBusyId) return;
    setActionBusyId(id);
    setActionError(null);
    const { error } = await supabase.from("advertising_campaigns").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", id).select("id").single();
    if (error) {
      console.error("Could not update advertisement", error);
      setActionError("That advertisement could not be updated.");
    } else setAdvertisements((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
    setActionBusyId(null);
  }

  function activatePaidAdvertisement(item: AdminAdvertisement) {
    const method = paymentMethods[item.id] || item.payment_method || "bank_transfer";
    const reference = (paymentReferences[item.id] ?? item.payment_reference ?? "").trim();
    void updateAdvertisement(item.id, {
      status: "active",
      billing_status: "paid",
      payment_method: method,
      payment_reference: reference || null,
      starts_at: item.starts_at || new Date().toISOString(),
    });
  }

  const unreadFeedback = feedbackItems.filter((item) => item.status === "unread").length;
  const pendingAccessRequests = accessRequests.filter((item) => item.status === "pending");
  const reviewedAccessRequests = accessRequests.filter((item) => item.status !== "pending").slice(0, 20);
  const pendingAds = advertisements.filter((item) => item.status === "pending").length;
  const activeAds = advertisements.filter((item) => item.status === "active" && item.billing_status === "paid").length;

  return (
    <div className="min-h-screen bg-purple-950 pb-10 font-['DM_Sans',sans-serif]">
      <header className="sticky top-0 z-40 border-b border-purple-800 bg-purple-950/95 px-4 py-3 text-white backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-200 hover:text-white"><ChevronLeft size={17} /> Back to feed</button>
          <div className="flex items-center gap-2">
            <LayoutDashboard size={18} className="text-blue-300" />
            <h1 className="font-['Playfair_Display',serif] text-lg font-bold sm:text-xl">Neighborly Admin</h1>
          </div>
          <button onClick={() => setRefreshKey((value) => value + 1)} className="rounded-lg p-2 text-purple-200 hover:bg-purple-900 hover:text-white" aria-label="Refresh admin dashboard"><RefreshCw size={17} /></button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase text-muted-foreground">Access requests</p><p className="mt-1 text-2xl font-bold text-blue-700">{pendingAccessRequests.length}</p></div>
          <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase text-muted-foreground">Unread feedback</p><p className="mt-1 text-2xl font-bold text-purple-700">{unreadFeedback}</p></div>
          <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase text-muted-foreground">Pending ads</p><p className="mt-1 text-2xl font-bold text-amber-600">{pendingAds}</p></div>
          <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase text-muted-foreground">Active ads</p><p className="mt-1 text-2xl font-bold text-emerald-600">{activeAds}</p></div>
        </section>

        <nav className="grid grid-cols-2 overflow-hidden rounded-xl bg-white p-1 shadow-sm sm:grid-cols-4" aria-label="Admin sections">
          {([
            { id: "access" as const, label: `Access${pendingAccessRequests.length ? ` (${pendingAccessRequests.length})` : ""}`, icon: <UserCheck size={16} /> },
            { id: "posts" as const, label: "Create Posts", icon: <Megaphone size={16} /> },
            { id: "feedback" as const, label: `Feedback${unreadFeedback ? ` (${unreadFeedback})` : ""}`, icon: <MessageSquare size={16} /> },
            { id: "advertising" as const, label: `Advertising${pendingAds ? ` (${pendingAds})` : ""}`, icon: <CircleDollarSign size={16} /> },
          ]).map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} aria-pressed={tab === item.id} className={`flex items-center justify-center gap-2 rounded-lg px-2 py-3 text-xs font-semibold sm:text-sm ${tab === item.id ? "bg-purple-700 text-white" : "text-muted-foreground hover:bg-muted"}`}>{item.icon}<span>{item.label}</span></button>
          ))}
        </nav>

        {loadError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>}
        {actionError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>}

        {tab === "access" && (
          <section className="space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-semibold">Invite-only testing is active</p>
              <p className="mt-1 text-xs leading-relaxed">New accounts cannot enter Neighborly until you approve them here. Existing members kept their access.</p>
            </div>
            <div>
              <h2 className="mb-3 font-semibold text-white">Pending requests</h2>
              {loading ? <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">Loading access requests…</div> : pendingAccessRequests.length === 0 ? <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">No one is waiting for approval.</div> : (
                <div className="space-y-3">
                  {pendingAccessRequests.map((item) => (
                    <article key={item.user_id} className="rounded-2xl border-2 border-blue-300 bg-white p-5 shadow-sm">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.requested_name || "New Neighbor"}</h3><span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase text-blue-700">{item.account_type}</span></div>
                          <a href={`mailto:${item.email}`} className="mt-1 block break-all text-sm text-blue-600 hover:underline">{item.email}</a>
                          <p className="mt-1 text-xs text-muted-foreground">Requested {new Date(item.requested_at).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => { void reviewMemberAccess(item, "approved"); }} disabled={actionBusyId === item.user_id} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Approve access</button>
                          <button onClick={() => { void reviewMemberAccess(item, "declined"); }} disabled={actionBusyId === item.user_id} className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Decline</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
            {reviewedAccessRequests.length > 0 ? (
              <div>
                <h2 className="mb-3 font-semibold text-white">Recently reviewed</h2>
                <div className="space-y-2">
                  {reviewedAccessRequests.map((item) => (
                    <article key={item.user_id} className="flex flex-col justify-between gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                      <div className="min-w-0"><p className="font-semibold">{item.requested_name || "Neighbor"}</p><p className="truncate text-xs text-muted-foreground">{item.email}</p></div>
                      <div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${item.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{item.status}</span>{item.status === "declined" ? <button onClick={() => { void reviewMemberAccess(item, "approved"); }} disabled={actionBusyId === item.user_id} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">Approve now</button> : null}</div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        )}

        {tab === "posts" && (
          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <Avatar name="Neighborly Admin" size="md" src={neighborlyLogo} />
              <div><h2 className="font-semibold">Create an official feed post</h2><p className="text-xs text-muted-foreground">Posts publish as Neighborly Admin and do not link to your personal or business profile.</p></div>
            </div>
            <form onSubmit={(event) => { void publishAdminPost(event); }} className="space-y-4" aria-busy={postBusy}>
              <textarea required={!postImage} maxLength={5000} rows={6} value={postBody} onChange={(event) => setPostBody(event.target.value)} placeholder="Write a community announcement, update, or other post…" className="w-full resize-none rounded-xl border border-border bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-600/30" />
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Category</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CATEGORY_META) as PostCategory[]).map((item) => (
                    <button key={item} type="button" disabled={postBusy} onClick={() => setPostCategory(item)} aria-pressed={postCategory === item} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${CATEGORY_META[item].color} ${postCategory === item ? "ring-2 ring-current ring-offset-1" : "opacity-60 hover:opacity-100"}`}>{CATEGORY_META[item].icon}{CATEGORY_META[item].label}</button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label htmlFor="admin-post-city" className="mb-1 block text-xs font-semibold text-muted-foreground">City / area</label><input id="admin-post-city" required maxLength={120} value={postCity} onChange={(event) => setPostCity(event.target.value)} className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-600/30" /></div>
                <div><label htmlFor="admin-post-neighborhood" className="mb-1 block text-xs font-semibold text-muted-foreground">Neighborhood</label><input id="admin-post-neighborhood" required maxLength={120} value={postNeighborhood} onChange={(event) => setPostNeighborhood(event.target.value)} className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-600/30" /></div>
              </div>
              <input ref={adminPostImageRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => choosePostImage(event.target.files?.[0] || null)} />
              {postImagePreview ? (
                <div className="relative overflow-hidden rounded-xl border border-border"><img src={postImagePreview} alt="Post preview" className="max-h-80 w-full object-cover" /><button type="button" onClick={() => { choosePostImage(null); if (adminPostImageRef.current) adminPostImageRef.current.value = ""; }} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white" aria-label="Remove post image"><X size={14} /></button></div>
              ) : (
                <button type="button" onClick={() => adminPostImageRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"><Camera size={16} /> Add photo</button>
              )}
              {postError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{postError}</p>}
              {postSuccess && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{postSuccess}</p>}
              <button type="submit" disabled={postBusy || (!postBody.trim() && !postImage)} className="w-full rounded-lg bg-purple-700 py-3 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-50">{postBusy ? "Publishing…" : "Publish Post"}</button>
            </form>
          </section>
        )}

        {tab === "feedback" && (
          <section className="space-y-3">
            {loading ? <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">Loading feedback…</div> : feedbackItems.length === 0 ? <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">No feedback has been submitted yet.</div> : feedbackItems.map((item) => (
              <article key={item.id} className={`rounded-2xl bg-white p-5 shadow-sm ${item.status === "unread" ? "border-2 border-amber-300" : "border border-transparent"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-semibold">{item.subject}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.sender_name} · <a href={`mailto:${item.contact_email}`} className="text-blue-600 hover:underline">{item.contact_email}</a> · {new Date(item.created_at).toLocaleString()}</p></div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${item.status === "resolved" ? "bg-emerald-100 text-emerald-700" : item.status === "read" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{item.status}</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-purple-700">{FEEDBACK_CATEGORY_LABELS[item.category]}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{item.message}</p>
                <div className="mt-4 border-t border-border pt-4">
                  <label htmlFor={`feedback-response-${item.id}`} className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Reply size={13} /> Response visible to this user</label>
                  <textarea id={`feedback-response-${item.id}`} rows={3} maxLength={5000} value={responseDrafts[item.id] ?? item.admin_response ?? ""} onChange={(event) => setResponseDrafts((current) => ({ ...current, [item.id]: event.target.value }))} className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-600/30" placeholder="Write your response…" />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => { void saveFeedbackResponse(item); }} disabled={actionBusyId === item.id || !(responseDrafts[item.id] ?? item.admin_response ?? "").trim()} className="rounded-lg bg-purple-700 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-800 disabled:opacity-50">Save response & resolve</button>
                    {item.status === "unread" && <button onClick={() => { void markFeedbackRead(item); }} disabled={actionBusyId === item.id} className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50">Mark read</button>}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {tab === "advertising" && (
          <section className="space-y-4">
            {loading ? <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">Loading advertisement requests…</div> : advertisements.length === 0 ? <div className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">No advertisement requests have been submitted yet.</div> : advertisements.map((item) => {
              const selectedMethod = paymentMethods[item.id] || item.payment_method || "bank_transfer";
              return (
                <article key={item.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <div className="grid gap-0 md:grid-cols-[18rem_1fr]">
                    <img src={item.image_url} alt={`${item.business_name} advertisement`} className="aspect-video h-full max-h-72 w-full object-cover md:aspect-auto" />
                    <div className="space-y-4 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{item.tier} plan · {item.target_city}</p><h2 className="mt-1 text-lg font-bold">{item.business_name}</h2><p className="font-semibold text-foreground/85">{item.headline}</p></div>
                        <div className="flex gap-2"><span className="rounded-full bg-purple-100 px-2 py-1 text-[10px] font-semibold uppercase text-purple-700">{item.status}</span><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${item.billing_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{item.billing_status}</span></div>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2"><a href={`mailto:${item.contact_email}`} className="text-blue-600 hover:underline">{item.contact_email}</a><span>{item.phone || "No phone provided"}</span><span>Requested {new Date(item.created_at).toLocaleDateString()}</span>{item.destination_url && <a href={item.destination_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Open business link</a>}</div>

                      {item.status === "pending" && <div className="flex flex-wrap gap-2"><button onClick={() => { void updateAdvertisement(item.id, { status: "approved" }); }} disabled={actionBusyId === item.id} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Approve request</button><button onClick={() => { void updateAdvertisement(item.id, { status: "rejected" }); }} disabled={actionBusyId === item.id} className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Reject</button></div>}

                      {item.status === "approved" && item.billing_status !== "paid" && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                          <p className="mb-3 text-xs font-semibold text-emerald-800">Record a confirmed payment, then activate the ad</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <select value={selectedMethod} onChange={(event) => setPaymentMethods((current) => ({ ...current, [item.id]: event.target.value as NonNullable<AdminAdvertisement["payment_method"]> }))} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs outline-none"><option value="bank_transfer">First Source business bank payment</option><option value="cash_app">Cash App Business</option><option value="stripe">Stripe</option><option value="complimentary">Complimentary / no charge</option><option value="other">Other</option></select>
                            <input value={paymentReferences[item.id] ?? item.payment_reference ?? ""} onChange={(event) => setPaymentReferences((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={200} placeholder="Payment reference or note (optional)" className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs outline-none" />
                          </div>
                          <button onClick={() => activatePaidAdvertisement(item)} disabled={actionBusyId === item.id} className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Mark confirmed & activate</button>
                        </div>
                      )}

                      {item.status === "active" && <button onClick={() => { void updateAdvertisement(item.id, { status: "paused" }); }} disabled={actionBusyId === item.id} className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50">Pause advertisement</button>}
                      {item.status === "paused" && item.billing_status === "paid" && <button onClick={() => { void updateAdvertisement(item.id, { status: "active" }); }} disabled={actionBusyId === item.id} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Resume advertisement</button>}
                      {item.payment_method && <p className="text-xs text-muted-foreground">Payment: {PAYMENT_METHOD_LABELS[item.payment_method]}{item.payment_reference ? ` · ${item.payment_reference}` : ""}</p>}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

// ─── Advertise Modal ─────────────────────────────────────────────────────────
function AdvertiseModal({
  onClose,
  defaultBusinessName,
  defaultWebsite,
  defaultPhone,
  defaultCity,
}: {
  onClose: () => void;
  defaultBusinessName: string;
  defaultWebsite: string;
  defaultPhone: string;
  defaultCity: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [tier, setTier] = useState<AdvertisingTier>("starter");
  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState(defaultWebsite);
  const [phone, setPhone] = useState(defaultPhone);
  const [contactEmail, setContactEmail] = useState("");
  const [targetCity, setTargetCity] = useState(defaultCity);
  const [adImage, setAdImage] = useState<File | null>(null);
  const [adImagePreview, setAdImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const adImageInputRef = useRef<HTMLInputElement | null>(null);
  const selectedTier = ADVERTISING_TIERS.find((option) => option.id === tier) || ADVERTISING_TIERS[0];

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user?.email) setContactEmail((current) => current || data.user?.email || "");
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    if (adImagePreview) URL.revokeObjectURL(adImagePreview);
  }, [adImagePreview]);

  function selectAdImage(file: File | null) {
    setSubmitError(null);
    if (!file) {
      setAdImage(null);
      setAdImagePreview(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setSubmitError("Please choose a JPG, PNG, WebP, or GIF image.");
      if (adImageInputRef.current) adImageInputRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("The ad image must be 5 MB or smaller.");
      if (adImageInputRef.current) adImageInputRef.current.value = "";
      return;
    }
    setAdImage(file);
    setAdImagePreview(URL.createObjectURL(file));
  }

  async function submitAdRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!adImage) {
      setSubmitError("Please add a photo for your advertisement.");
      return;
    }

    let destinationUrl: string | null = null;
    if (website.trim()) {
      try {
        const parsed = new URL(website.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("Unsupported protocol");
        destinationUrl = parsed.toString();
      } catch {
        setSubmitError("Please enter a complete website address beginning with https://");
        return;
      }
    }

    setSubmitting(true);
    setSubmitError(null);
    let uploadedPath: string | null = null;

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setSubmitError("Your session expired. Please sign in again before submitting an ad.");
        return;
      }

      const ext = (adImage.name.split(".").pop() || "jpg").toLowerCase();
      uploadedPath = `${user.id}/business-features/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("neighborly-media")
        .upload(uploadedPath, adImage, { upsert: false, contentType: adImage.type });
      if (uploadError) {
        console.error("Could not upload advertisement image", uploadError);
        setSubmitError("We couldn't upload that photo. Please try again.");
        return;
      }

      const { data: publicImage } = supabase.storage.from("neighborly-media").getPublicUrl(uploadedPath);
      const { error: insertError } = await supabase.from("advertising_campaigns").insert({
        user_id: user.id,
        tier,
        business_name: businessName.trim(),
        headline: headline.trim(),
        description: description.trim(),
        image_url: publicImage.publicUrl,
        destination_url: destinationUrl,
        phone: phone.trim() || null,
        contact_email: contactEmail.trim(),
        target_city: targetCity.trim(),
      });

      if (insertError) {
        await supabase.storage.from("neighborly-media").remove([uploadedPath]);
        console.error("Could not save advertisement request", insertError);
        setSubmitError("We couldn't submit your advertisement. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch (unexpectedError) {
      if (uploadedPath) await supabase.storage.from("neighborly-media").remove([uploadedPath]);
      console.error("Unexpected advertisement submission error", unexpectedError);
      setSubmitError("Something went wrong while submitting your ad. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] bg-white rounded-2xl shadow-xl w-[calc(100%-1.5rem)] max-w-3xl max-h-[90dvh] overflow-y-auto animate-in fade-in-0 zoom-in-95" aria-describedby={undefined}>
          
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Dialog.Title className="font-semibold text-lg flex items-center gap-2">
              <Megaphone size={18} className="text-blue-600" /> Advertise With Us
            </Dialog.Title>
            <Dialog.Close onClick={onClose} className="text-muted-foreground hover:bg-muted p-1.5 rounded-lg transition-colors">
              <X size={16} />
            </Dialog.Close>
          </div>

          <div className="p-5 sm:p-6">
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="font-semibold text-lg mb-2">Advertisement Submitted!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your {selectedTier.name} request is saved for review. After approval, we'll send a secure monthly payment link to {contactEmail}.
                </p>
                <p className="mx-auto mb-5 max-w-md rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  Your ad will only go live after it is approved and payment is confirmed.
                </p>
                <button onClick={onClose} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={(event) => { void submitAdRequest(event); }} className="flex flex-col gap-5" aria-busy={submitting}>
                <p className="text-sm text-muted-foreground">Create a local advertisement with a photo, business details, and a clear call to action. Every ad is reviewed before payment and publication.</p>

                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Choose a Monthly Plan</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {ADVERTISING_TIERS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setTier(option.id)}
                        aria-pressed={tier === option.id}
                        disabled={submitting}
                        className={`relative p-3 text-left border rounded-xl transition-colors ${tier === option.id ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-border hover:border-blue-600/40"}`}
                      >
                        {tier === option.id && <CheckCircle2 size={16} className="absolute right-3 top-3 text-blue-600" />}
                        <p className="font-semibold text-sm text-blue-700">{option.name}</p>
                        <p className="mt-1 text-xl font-bold text-foreground">${option.price}<span className="text-xs font-medium text-muted-foreground">/month</span></p>
                        <p className="mt-2 text-xs text-muted-foreground">{option.placement}</p>
                        <p className="text-xs text-muted-foreground">{option.reach}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="ad-business-name" className="mb-1 block text-xs font-semibold text-muted-foreground">Business name</label>
                      <input id="ad-business-name" required minLength={2} maxLength={100} value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent" />
                    </div>
                    <div>
                      <label htmlFor="ad-headline" className="mb-1 block text-xs font-semibold text-muted-foreground">Ad headline</label>
                      <input id="ad-headline" required minLength={2} maxLength={100} value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Example: $50 off your first service" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent" />
                    </div>
                    <div>
                      <label htmlFor="ad-description" className="mb-1 block text-xs font-semibold text-muted-foreground">Description</label>
                      <textarea id="ad-description" required minLength={10} maxLength={500} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell neighbors what you offer and why they should contact you." className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent resize-none" />
                      <p className="mt-1 text-right text-[11px] text-muted-foreground">{description.length}/500</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">Advertisement photo</label>
                      <input ref={adImageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => selectAdImage(event.target.files?.[0] || null)} />
                      {adImagePreview ? (
                        <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
                          <img src={adImagePreview} alt="Advertisement preview" className="aspect-video w-full object-cover" />
                          <button type="button" disabled={submitting} onClick={() => { selectAdImage(null); if (adImageInputRef.current) adImageInputRef.current.value = ""; }} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white disabled:opacity-50" aria-label="Remove advertisement photo"><X size={14} /></button>
                        </div>
                      ) : (
                        <button type="button" disabled={submitting} onClick={() => adImageInputRef.current?.click()} className="flex aspect-video w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50">
                          <Camera size={24} />
                          <span className="mt-2 text-sm font-semibold">Add ad photo</span>
                          <span className="text-xs text-blue-600">JPG, PNG, WebP, or GIF · max 5 MB</span>
                        </button>
                      )}
                    </div>
                    <div>
                      <label htmlFor="ad-website" className="mb-1 block text-xs font-semibold text-muted-foreground">Website or booking link <span className="font-normal">(optional)</span></label>
                      <input id="ad-website" type="url" maxLength={2000} value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://yourbusiness.com" className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="ad-phone" className="mb-1 block text-xs font-semibold text-muted-foreground">Phone <span className="font-normal">(optional)</span></label>
                        <input id="ad-phone" type="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent" />
                      </div>
                      <div>
                        <label htmlFor="ad-city" className="mb-1 block text-xs font-semibold text-muted-foreground">Primary area</label>
                        <input id="ad-city" required maxLength={120} value={targetCity} onChange={(event) => setTargetCity(event.target.value)} className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="ad-email" className="mb-1 block text-xs font-semibold text-muted-foreground">Payment and approval email</label>
                      <input id="ad-email" required type="email" maxLength={254} value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="w-full bg-muted rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent" />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                  <strong>Payment after approval:</strong> submit your ad now. If approved, you'll receive a secure ${selectedTier.price}/month checkout link. You can cancel before the next renewal.
                </div>

                {submitError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}

                <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {submitting ? "Submitting Advertisement…" : "Submit Advertisement for Review"}
                </button>
              </form>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AdvertisingSidebarCard({ ad, onAdvertise }: { ad: LiveAdvertisement | null; onAdvertise: () => void }) {
  if (!ad) {
    return (
      <section aria-label="Local business feature" className="min-h-32 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 text-white shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Megaphone size={16} className="text-blue-200" />
          <h3 className="font-semibold text-sm">Local Business Spotlight</h3>
        </div>
        <p className="text-xs text-blue-100 mb-3 leading-relaxed">Share your business with local neighbors. Plans start at $15/month.</p>
        <button onClick={onAdvertise} className="w-full bg-white text-blue-700 font-semibold text-xs py-2 rounded-lg hover:bg-blue-50 transition-colors">Promote Your Business</button>
      </section>
    );
  }

  const safeWebsite = ad.destinationUrl && /^https?:\/\//i.test(ad.destinationUrl) ? ad.destinationUrl : null;
  const contactHref = safeWebsite || (ad.phone ? `tel:${ad.phone.replace(/[^+\d]/g, "")}` : null);

  return (
    <section aria-label="Local business feature" className="min-h-32 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
      <div className="relative min-h-16 bg-gradient-to-br from-blue-50 to-indigo-100">
        <img
          src={ad.imageUrl}
          alt={`${ad.businessName} local business feature`}
          className="aspect-video w-full object-cover"
          onError={(event) => { event.currentTarget.style.display = "none"; }}
        />
        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Paid Local Feature</span>
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{ad.businessName}</p>
        <h3 className="mt-1 text-sm font-bold text-foreground">{ad.headline}</h3>
        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{ad.description}</p>
        {contactHref && (
          <a href={contactHref} target={safeWebsite ? "_blank" : undefined} rel={safeWebsite ? "noreferrer" : undefined} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            Contact Business {safeWebsite && <ExternalLink size={12} />}
          </a>
        )}
        <button onClick={onAdvertise} className="mt-2 w-full text-center text-[11px] font-semibold text-blue-600 hover:underline">Promote Your Business</button>
      </div>
    </section>
  );
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function LegacyMessagingModal({
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
  initialContact: MessageContact | null;
  onUnreadChange: () => void;
  onProfileOpen: (contact: MessageContact) => void;
}) {
  const [contacts, setContacts] = useState<MessageContact[]>([]);
  const [activeContact, setActiveContact] = useState<MessageContact | null>(null);
  const [allMessages, setAllMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function loadInbox(showLoading = false) {
    if (showLoading) setLoading(true);
    const { data: rows, error: messagesError } = await supabase
      .from("direct_messages")
      .select("id, sender_id, recipient_id, body, read_at, created_at")
      .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
      .order("created_at", { ascending: true })
      .limit(500);

    if (messagesError) {
      setError("Messages could not be loaded. Please try again.");
      setLoading(false);
      return;
    }

    const messages = (rows || []) as DirectMessage[];
    setAllMessages(messages);
    const contactIds = new Set<string>();
    messages.forEach((message) => {
      contactIds.add(message.sender_id === currentUserId ? message.recipient_id : message.sender_id);
    });
    if (initialContact && initialContact.id !== currentUserId) contactIds.add(initialContact.id);

    const ids = [...contactIds];
    let profileRows: any[] = [];
    let businessRows: any[] = [];
    if (ids.length) {
      const [profilesResult, businessesResult] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, account_type").in("id", ids),
        supabase.from("business_profiles").select("user_id, business_name, logo_url").in("user_id", ids),
      ]);
      profileRows = profilesResult.data || [];
      businessRows = businessesResult.data || [];
    }

    const profilesById = new Map(profileRows.map((profile: any) => [profile.id, profile]));
    const businessesById = new Map(businessRows.map((business: any) => [business.user_id, business]));
    const lastMessageAt = new Map<string, number>();
    messages.forEach((message) => {
      const otherId = message.sender_id === currentUserId ? message.recipient_id : message.sender_id;
      lastMessageAt.set(otherId, new Date(message.created_at).getTime());
    });

    const nextContacts = ids
      .map((id): MessageContact => {
        const profile: any = profilesById.get(id);
        const business: any = businessesById.get(id);
        const preferred = initialContact?.id === id ? initialContact : null;
        const isBusiness = !!business || profile?.account_type === "business" || preferred?.accountType === "business";
        return {
          id,
          name: isBusiness
            ? business?.business_name || preferred?.name || profile?.full_name || "Local Business"
            : profile?.full_name || preferred?.name || "Neighbor",
          avatarUrl: isBusiness
            ? business?.logo_url || preferred?.avatarUrl || profile?.avatar_url || null
            : profile?.avatar_url || preferred?.avatarUrl || null,
          accountType: isBusiness ? "business" : "personal",
        };
      })
      .sort((a, b) => (lastMessageAt.get(b.id) || 0) - (lastMessageAt.get(a.id) || 0));

    setContacts(nextContacts);
    setActiveContact((existing) => {
      if (!showLoading) return existing ? nextContacts.find((contact) => contact.id === existing.id) || existing : null;
      if (initialContact) return nextContacts.find((contact) => contact.id === initialContact.id) || initialContact;
      if (existing) return nextContacts.find((contact) => contact.id === existing.id) || existing;
      return nextContacts[0] || null;
    });
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    if (!open) return;
    void loadInbox(true);
    const timer = window.setInterval(() => { void loadInbox(); }, 5000);
    return () => window.clearInterval(timer);
  }, [open, currentUserId, initialContact?.id]);

  const conversation = activeContact
    ? allMessages.filter((message) =>
        (message.sender_id === currentUserId && message.recipient_id === activeContact.id)
        || (message.sender_id === activeContact.id && message.recipient_id === currentUserId),
      )
    : [];

  useEffect(() => {
    if (!open || !activeContact) return;
    const hasUnread = allMessages.some((message) =>
      message.sender_id === activeContact.id
      && message.recipient_id === currentUserId
      && !message.read_at,
    );
    if (!hasUnread) return;
    let cancelled = false;
    (async () => {
      const readAt = new Date().toISOString();
      const { error: readError } = await supabase
        .from("direct_messages")
        .update({ read_at: readAt })
        .eq("sender_id", activeContact.id)
        .eq("recipient_id", currentUserId)
        .is("read_at", null);
      if (readError || cancelled) return;
      setAllMessages((current) => current.map((message) =>
        message.sender_id === activeContact.id && message.recipient_id === currentUserId && !message.read_at
          ? { ...message, read_at: readAt }
          : message,
      ));
      onUnreadChange();
    })();
    return () => { cancelled = true; };
  }, [open, activeContact?.id, allMessages, currentUserId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.length, activeContact?.id]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
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
    setAllMessages((current) => [...current, data as DirectMessage]);
    setSending(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
    void loadInbox();
  }

  function latestFor(contactId: string) {
    for (let index = allMessages.length - 1; index >= 0; index -= 1) {
      const message = allMessages[index];
      if (message.sender_id === contactId || message.recipient_id === contactId) return message;
    }
    return null;
  }

  function unreadFor(contactId: string) {
    return allMessages.filter((message) =>
      message.sender_id === contactId && message.recipient_id === currentUserId && !message.read_at,
    ).length;
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed inset-0 z-[81] h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-white shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[min(760px,92dvh)] sm:max-h-[92dvh] sm:w-[min(980px,94vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-border"
          aria-describedby={undefined}
        >
          <div className="flex h-full flex-col">
            <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border px-4">
              <Dialog.Title className="flex items-center gap-2 font-semibold">
                <MessageSquare size={18} className="text-primary" /> Messages
              </Dialog.Title>
              <Dialog.Close onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close messages">
                <X size={17} />
              </Dialog.Close>
            </div>

            <div className="grid min-h-0 flex-1 md:grid-cols-[300px_1fr]">
              <aside className={`${activeContact ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-border bg-muted/20`}>
                <div className="border-b border-border px-4 py-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="mb-2 inline-flex items-center gap-1 rounded-lg py-1 pr-2 text-sm font-medium text-primary hover:bg-secondary md:hidden"
                    aria-label="Close messages and go back"
                  >
                    <ChevronLeft size={18} /> Back
                  </button>
                  <p className="text-sm font-semibold">Conversations</p>
                  <p className="text-xs text-muted-foreground">Private messages with your neighbors</p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {loading ? (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading messages…</p>
                  ) : contacts.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <MessageSquare size={28} className="mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm font-medium">No conversations yet</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Open a neighbor’s profile and choose Message to start one.</p>
                    </div>
                  ) : contacts.map((contact) => {
                    const latest = latestFor(contact.id);
                    const unread = unreadFor(contact.id);
                    return (
                      <button
                        key={contact.id}
                        onClick={() => setActiveContact(contact)}
                        className={`flex w-full items-center gap-3 border-b border-border/70 px-4 py-3 text-left transition-colors hover:bg-secondary/70 ${activeContact?.id === contact.id ? "bg-primary/10" : ""}`}
                      >
                        <Avatar name={contact.name} size="sm" src={contact.avatarUrl || null} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold">{contact.name}</p>
                            {latest && <span className="flex-shrink-0 text-[11px] text-muted-foreground">{formatMessageTime(latest.created_at)}</span>}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{latest?.body || "Start a conversation"}</p>
                        </div>
                        {unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{unread}</span>}
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className={`${activeContact ? "flex" : "hidden md:flex"} min-h-0 flex-col bg-white`}>
                {activeContact ? (
                  <>
                    <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-border px-4">
                      <button onClick={() => setActiveContact(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted md:hidden" aria-label="Back to conversations">
                        <ChevronLeft size={19} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onProfileOpen(activeContact)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left hover:bg-muted"
                        aria-label={`View ${activeContact.name}'s profile`}
                      >
                        <Avatar name={activeContact.name} size="sm" src={activeContact.avatarUrl || null} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{activeContact.name}</p>
                          <p className="text-xs text-primary">View profile</p>
                        </div>
                        <ChevronRight size={16} className="flex-shrink-0 text-muted-foreground" />
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
                        aria-label="Close messages"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto bg-stone-50/70 px-4 py-5 sm:px-6">
                      {conversation.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                          <Avatar name={activeContact.name} size="lg" src={activeContact.avatarUrl || null} />
                          <p className="mt-3 font-semibold">Message {activeContact.name}</p>
                          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Say hello and start a private conversation.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {conversation.map((message) => {
                            const mine = message.sender_id === currentUserId;
                            return (
                              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 shadow-sm ${mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-white text-foreground"}`}>
                                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
                                  <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{formatMessageTime(message.created_at)}</p>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={endRef} />
                        </div>
                      )}
                    </div>
                    <form onSubmit={sendMessage} className="sticky bottom-0 z-10 flex-shrink-0 border-t border-border bg-white px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
                      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
                      <div className="flex items-center gap-2">
                        <input
                          ref={inputRef}
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          maxLength={2000}
                          autoComplete="off"
                          placeholder={`Message ${activeContact.name}…`}
                          className="min-w-0 flex-1 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:bg-white"
                        />
                        <button
                          type="submit"
                          disabled={!draft.trim() || sending}
                          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                          aria-label="Send message"
                        >
                          <Send size={17} />
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <MessageSquare size={36} className="mb-3 text-muted-foreground/40" />
                    <p className="font-semibold">Choose a conversation</p>
                    <p className="mt-1 text-sm text-muted-foreground">Select a neighbor to read or send messages.</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

type ActiveTab = "all" | PostCategory;
const POST_PAGE_SIZE = 25;
const COMMENT_IMAGE_MAX_BYTES = 6 * 1024 * 1024;
const COMMENT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const COMMENT_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [postActionBusyId, setPostActionBusyId] = useState<string | null>(null);
  const [postActionError, setPostActionError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [postCreateBusy, setPostCreateBusy] = useState(false);
  const [postCreateError, setPostCreateError] = useState<string | null>(null);
  const [newPostText, setNewPostText] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [newPostImagePreview, setNewPostImagePreview] = useState<string | null>(null);
  const postImageInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>("general");
  const [classifiedPosts, setClassifiedPosts] = useState<Post[]>(
    INITIAL_POSTS.filter((p) => p.category === "forsale"),
  );
  const [commentDraft, setCommentDraft] = useState<Record<number, string>>({});
  const [commentImageDraft, setCommentImageDraft] = useState<Record<number, CommentImageDraft>>({});
  const commentImageDraftRef = useRef<Record<number, CommentImageDraft>>({});
  const commentImageInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const commentPreviewUrlsRef = useRef<Set<string>>(new Set());
  const [commentBusy, setCommentBusy] = useState<Record<number, boolean>>({});
  const [commentError, setCommentError] = useState<Record<number, string>>({});
  const [notifOpen, setNotifOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState<MessageContact | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [pendingFriendRequests, setPendingFriendRequests] = useState<PendingFriendRequest[]>([]);
  const [friendRequestBusy, setFriendRequestBusy] = useState<string | null>(null);
  const [friendRequestError, setFriendRequestError] = useState<string | null>(null);
  const [view, setView] = useState<ActiveView>({ page: "feed" });
  const [advertiseOpen, setAdvertiseOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [liveAdvertisements, setLiveAdvertisements] = useState<LiveAdvertisement[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const postsLoadedRef = useRef(false);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [hasMoreDatabasePosts, setHasMoreDatabasePosts] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [morePostsError, setMorePostsError] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [currentAccountType, setCurrentAccountType] = useState<"personal" | "business">("personal");
  const [authReady, setAuthReady] = useState(false);
  const [isSiteAdmin, setIsSiteAdmin] = useState(false);
  const [adminStatusReady, setAdminStatusReady] = useState(false);
  const [adminAttentionCount, setAdminAttentionCount] = useState(0);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [groupActionBusyId, setGroupActionBusyId] = useState<string | null>(null);
  const [activeNeighbors, setActiveNeighbors] = useState<ActiveNeighbor[]>([]);
  const [activeNeighborsLoading, setActiveNeighborsLoading] = useState(true);
  const [activeNeighborBusyId, setActiveNeighborBusyId] = useState<string | null>(null);
  const [activeLocation, setActiveLocation] = useState<LocationName>("All Areas");
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [areaOptions, setAreaOptions] = useState<AreaOption[]>(() => [
    { value: "All Areas", city: "", neighborhood: null, label: "All Areas" },
    ...LOCATIONS.filter((locationName) => locationName !== "All Areas").map((city) => ({
      value: city,
      city,
      neighborhood: null,
      label: city,
    })),
  ]);
  const [weather, setWeather] = useState<WeatherSnapshot>(INITIAL_WEATHER);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);

  const commentAuthorName = currentAccountType === "business"
    ? currentBusiness?.name || currentProfile?.name || "Neighbor"
    : currentProfile?.name || "Neighbor";

  useEffect(() => {
    return () => {
      commentPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      commentPreviewUrlsRef.current.clear();
      commentImageDraftRef.current = {};
    };
  }, []);

  const homeLocation = canonicalLocation(currentBusiness?.city || currentProfile?.city);
  const homeArea = neighborhoodLocationValue(homeLocation, currentProfile?.neighborhood);
  const selectedArea = selectedLocationParts(activeLocation);
  const browsingLocation = activeLocation === "All Areas" ? homeLocation : canonicalLocation(selectedArea.city || homeLocation);
  const normalizedLocationSearch = locationSearch.trim().toLocaleLowerCase();
  const visibleAreaOptions = normalizedLocationSearch
    ? areaOptions.filter((option) => option.label.toLocaleLowerCase().includes(normalizedLocationSearch))
    : areaOptions;
  const visibleAdvertisements = liveAdvertisements
    .filter((ad) => ad.tier === "featured" || sameLocation(ad.targetCity, browsingLocation))
    .sort((left, right) => {
      const priority: Record<AdvertisingTier, number> = { starter: 1, spotlight: 2, featured: 3 };
      return priority[right.tier] - priority[left.tier];
    });
  const activeAdvertisement = visibleAdvertisements[0] || null;
  const visibleGroups = groups
    .filter((group) => {
      if (activeLocation === "All Areas") return true;
      if (!sameLocation(group.city, selectedArea.city)) return false;
      return !selectedArea.neighborhood || !group.neighborhood || sameLocation(group.neighborhood, selectedArea.neighborhood);
    })
    .slice(0, 6);
  const visibleActiveNeighbors = activeNeighbors
    .filter((neighbor) => matchesSelectedLocation(neighbor.city, neighbor.neighborhood, activeLocation))
    .slice(0, 8);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    const loadAdvertisements = async () => {
      const { data, error } = await publicSupabase
        .from("advertising_campaigns")
        .select("id, tier, business_name, headline, description, image_url, destination_url, phone, target_city")
        .eq("status", "active")
        .eq("billing_status", "paid")
        .order("created_at", { ascending: false })
        .limit(25);

      if (cancelled) return;
      if (error) {
        console.error("Could not load advertisements", error);
        return;
      }

      setLiveAdvertisements((data || []).map((row: any) => ({
        id: row.id,
        tier: row.tier as AdvertisingTier,
        businessName: row.business_name,
        headline: row.headline,
        description: row.description,
        imageUrl: row.image_url,
        destinationUrl: row.destination_url,
        phone: row.phone,
        targetCity: row.target_city,
      })));
    };

    const refreshVisibleAdvertisements = () => {
      if (document.visibilityState === "visible") void loadAdvertisements();
    };

    void loadAdvertisements();
    window.addEventListener("focus", refreshVisibleAdvertisements);
    document.addEventListener("visibilitychange", refreshVisibleAdvertisements);
    const refreshTimer = window.setInterval(() => { void loadAdvertisements(); }, 60_000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshVisibleAdvertisements);
      document.removeEventListener("visibilitychange", refreshVisibleAdvertisements);
      window.clearInterval(refreshTimer);
    };
  }, [authReady, view.page]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;

    (async () => {
      const { data: areaRows, error: areasError } = await supabase
        .from("community_areas")
        .select("city, neighborhood")
        .eq("is_active", true)
        .order("city", { ascending: true })
        .order("neighborhood", { ascending: true, nullsFirst: true });
      if (cancelled) return;

      if (areasError) {
        console.error("Could not load the community area directory", areasError);
        return;
      }

      const options = new Map<string, AreaOption>();
      const addArea = (cityValue?: string | null, neighborhoodValue?: string | null) => {
        const trimmedCity = (cityValue || "").trim();
        if (!trimmedCity) return;
        const city = canonicalLocation(trimmedCity);
        const neighborhood = tidyAreaName(neighborhoodValue);
        const normalizedNeighborhood = neighborhood && !sameLocation(city, neighborhood) ? neighborhood : null;
        const value = normalizedNeighborhood ? neighborhoodLocationValue(city, normalizedNeighborhood) : city;
        const key = `${locationKey(city)}::${locationKey(normalizedNeighborhood)}`;
        options.set(key, {
          value,
          city,
          neighborhood: normalizedNeighborhood,
          label: normalizedNeighborhood ? `${normalizedNeighborhood}, ${city}` : city,
        });
      };

      LOCATIONS.filter((locationName) => locationName !== "All Areas").forEach((city) => addArea(city));
      addArea(homeLocation);
      addArea(homeLocation, currentProfile?.neighborhood);
      (areaRows || []).forEach((row: any) => {
        addArea(row.city);
        addArea(row.city, row.neighborhood);
      });

      const sorted = [...options.values()].sort((left, right) => {
        const cityOrder = left.city.localeCompare(right.city);
        if (cityOrder) return cityOrder;
        if (!left.neighborhood) return -1;
        if (!right.neighborhood) return 1;
        return left.neighborhood.localeCompare(right.neighborhood);
      });
      setAreaOptions([{ value: "All Areas", city: "", neighborhood: null, label: "All Areas" }, ...sorted]);
    })();

    return () => { cancelled = true; };
  }, [authReady, currentProfile?.city, currentProfile?.neighborhood, currentBusiness?.city, homeLocation]);

  useEffect(() => {
    if (!authReady) return;
    const controller = new AbortController();

    const refreshWeather = async () => {
      setWeather(INITIAL_WEATHER);
      try {
        const snapshot = await fetchWeatherSnapshot(browsingLocation, controller.signal);
        setWeather(snapshot);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Could not load local weather", error);
        setWeather({ status: "error", temperature: null, description: "Weather unavailable", icon: "🌤️" });
      }
    };

    void refreshWeather();
    const timer = window.setInterval(() => { void refreshWeather(); }, 10 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [authReady, browsingLocation]);

  async function loadCurrentProfile(goToProfile = false) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCurrentProfile(null);
      setCurrentBusiness(null);
      setCurrentAccountType("personal");
      setAuthReady(true);
      return;
    }

    const [{ data: row }, { count: postCount }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", user.id).eq("is_admin_post", false),
    ]);

    const m = user.user_metadata || {};
    const accountType = (row?.account_type || m.account_type) === "business" ? "business" : "personal";
    setCurrentAccountType(accountType);

    const created = row?.created_at ? new Date(row.created_at) : new Date(user.created_at);
    const profile: UserProfile = {
      id: user.id,
      name: row?.full_name || m.full_name || user.email?.split("@")[0] || "Neighbor",
      neighborhood: row?.neighborhood || m.neighborhood || row?.city || m.city || "Your neighborhood",
      city: canonicalLocation(row?.city || m.city),
      joinDate: created.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      bio: row?.bio || m.bio || "",
      badges: ["newcomer"],
      posts: postCount || 0, neighbors: 0, helpfulVotes: 0, recsGiven: 0, rating: 0, ratingCount: 0,
      neighborReviews: [], galleryPhotos: [], recentActivity: [],
      avatarUrl: row?.avatar_url || null,
      coverUrl: row?.cover_url || null,
      theme: row?.theme || null,
    };

    setCurrentProfile(profile);
    setMyAvatarUrl(row?.avatar_url || null);
    let defaultLocation = neighborhoodLocationValue(profile.city, row?.neighborhood || m.neighborhood);

    if (accountType === "business") {
      const { data: businessRow } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      const services = Array.isArray(businessRow?.services) ? businessRow.services : typeof businessRow?.services === "string" && businessRow.services.trim() ? businessRow.services.split(",").map((v: string) => v.trim()).filter(Boolean) : [];
      setCurrentBusiness({
        id: -1,
        ownerId: user.id,
        name: businessRow?.business_name || m.business_name || profile.name,
        category: businessRow?.category || m.business_category || "Local Business",
        city: canonicalLocation(businessRow?.city || row?.city || m.city),
        rating: 0, reviewCount: 0, badges: [],
        description: businessRow?.description || m.business_description || "",
        services, photos: [], phone: businessRow?.phone || m.business_phone || "", email: user.email || "",
        website: businessRow?.website || m.business_website || "",
        address: [businessRow?.neighborhood || row?.neighborhood || m.neighborhood, businessRow?.city || row?.city || m.city, businessRow?.zip_code || row?.zip_code || m.zip_code].filter(Boolean).join(", "),
        hours: [], founded: String(created.getFullYear()), owner: businessRow?.owner_name || profile.name, reviews: [],
      });
      defaultLocation = neighborhoodLocationValue(
        businessRow?.city || row?.city || m.city,
        businessRow?.neighborhood || row?.neighborhood || m.neighborhood,
      );
    } else setCurrentBusiness(null);

    setActiveLocation(defaultLocation);
    setAuthReady(true);
    if (goToProfile || location.pathname === "/profile") {
      setView({ page: accountType === "business" ? "my-business" : "me" });
    } else if (location.pathname === "/settings") {
      setView({ page: "settings" });
    } else {
      setView({ page: "feed" });
    }
  }

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => { if (!active) return; if (data.session?.user) await loadCurrentProfile(false); else setAuthReady(true); });
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        setCurrentProfile(null);
        setCurrentBusiness(null);
        setCurrentAccountType("personal");
        setIsSiteAdmin(false);
        setAdminStatusReady(false);
        navigate("/sign-in", { replace: true });
      }
    });
    return () => { active = false; authListener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!authReady || !currentProfile?.id) {
      setIsSiteAdmin(false);
      setAdminStatusReady(authReady);
      return;
    }
    let cancelled = false;
    setAdminStatusReady(false);
    void supabase
      .from("site_admins")
      .select("user_id")
      .eq("user_id", currentProfile.id)
      .eq("enabled", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Could not check administrator access", error);
        setIsSiteAdmin(!!data && !error);
        setAdminStatusReady(true);
      });
    return () => { cancelled = true; };
  }, [authReady, currentProfile?.id]);

  useEffect(() => {
    if (!isSiteAdmin) {
      setAdminAttentionCount(0);
      return;
    }
    let cancelled = false;
    async function refreshAdminAttention() {
      const [accessResult, feedbackResult, advertisingResult] = await Promise.all([
        supabase.from("member_access").select("user_id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("site_feedback").select("id", { count: "exact", head: true }).eq("status", "unread"),
        supabase.from("advertising_campaigns").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      if (cancelled) return;
      if (!accessResult.error && !feedbackResult.error && !advertisingResult.error) {
        setAdminAttentionCount((accessResult.count || 0) + (feedbackResult.count || 0) + (advertisingResult.count || 0));
      }
    }
    void refreshAdminAttention();
    const timer = window.setInterval(() => { void refreshAdminAttention(); }, 30000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [isSiteAdmin]);

  async function refreshUnreadMessages() {
    const userId = currentProfile?.id;
    if (!userId) {
      setUnreadMessageCount(0);
      return;
    }
    const { count, error } = await supabase
      .from("direct_messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .is("read_at", null);
    if (!error) setUnreadMessageCount(count || 0);
  }

  useEffect(() => {
    if (!authReady || !currentProfile?.id) return;
    void refreshUnreadMessages();
  }, [authReady, currentProfile?.id]);

  async function refreshFriendRequests() {
    const userId = currentProfile?.id;
    if (!userId) {
      setPendingFriendRequests([]);
      return;
    }
    const { data: requests, error } = await supabase
      .from("friendships")
      .select("id, requester_id, created_at")
      .eq("addressee_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) {
      setFriendRequestError("Friend requests could not be loaded.");
      return;
    }

    const requesterIds = [...new Set((requests || []).map((request: any) => request.requester_id))];
    let profileRows: any[] = [];
    let businessRows: any[] = [];
    if (requesterIds.length) {
      const [profilesResult, businessesResult] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, account_type").in("id", requesterIds),
        supabase.from("business_profiles").select("user_id, business_name, logo_url").in("user_id", requesterIds),
      ]);
      profileRows = profilesResult.data || [];
      businessRows = businessesResult.data || [];
    }

    const profilesById = new Map(profileRows.map((profile: any) => [profile.id, profile]));
    const businessesById = new Map(businessRows.map((business: any) => [business.user_id, business]));
    setPendingFriendRequests((requests || []).map((request: any) => {
      const profile: any = profilesById.get(request.requester_id);
      const business: any = businessesById.get(request.requester_id);
      const isBusiness = !!business || profile?.account_type === "business";
      return {
        id: request.id,
        requesterId: request.requester_id,
        name: isBusiness ? business?.business_name || profile?.full_name || "Local Business" : profile?.full_name || "Neighbor",
        avatarUrl: isBusiness ? business?.logo_url || profile?.avatar_url || null : profile?.avatar_url || null,
        createdAt: request.created_at,
      };
    }));
    setFriendRequestError(null);
  }

  useEffect(() => {
    if (!authReady || !currentProfile?.id) return;
    void refreshFriendRequests();
  }, [authReady, currentProfile?.id]);

  useEffect(() => {
    const userId = currentProfile?.id;
    if (!authReady || !userId) return;

    const channel = supabase
      .channel(`user:${userId}:inbox`, { config: { private: true } })
      .on("broadcast", { event: "message_created" }, () => { void refreshUnreadMessages(); })
      .on("broadcast", { event: "friendship_changed" }, () => { void refreshFriendRequests(); })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [authReady, currentProfile?.id]);

  async function respondToFriendRequest(requestId: string, accept: boolean) {
    if (friendRequestBusy) return;
    setFriendRequestBusy(requestId);
    setFriendRequestError(null);
    const result = accept
      ? await supabase.from("friendships").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", requestId)
      : await supabase.from("friendships").delete().eq("id", requestId);
    if (result.error) setFriendRequestError(accept ? "Could not accept this friend request." : "Could not decline this friend request.");
    else setPendingFriendRequests((current) => current.filter((request) => request.id !== requestId));
    setFriendRequestBusy(null);
  }

  async function loadCommunityGroups() {
    const userId = currentProfile?.id;
    if (!userId) {
      setGroups([]);
      setGroupsLoading(false);
      return;
    }

    setGroupsLoading(true);
    const [directoryResult, membershipResult] = await Promise.all([
      supabase
        .from("community_groups_directory")
        .select("id, name, description, emoji, city, neighborhood, member_count, created_at")
        .eq("is_active", true)
        .order("member_count", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("community_group_members").select("group_id").eq("user_id", userId),
    ]);

    if (directoryResult.error || membershipResult.error) {
      console.error("Could not load community groups", directoryResult.error || membershipResult.error);
      setGroupsError("Community groups are temporarily unavailable.");
      setGroupsLoading(false);
      return;
    }

    const joinedIds = new Set((membershipResult.data || []).map((membership: any) => membership.group_id));
    setGroups((directoryResult.data || []).map((group: any): CommunityGroup => ({
      id: group.id,
      name: group.name,
      description: group.description,
      emoji: group.emoji || "🏘️",
      city: canonicalLocation(group.city),
      neighborhood: group.neighborhood || null,
      members: Number(group.member_count || 0),
      joined: joinedIds.has(group.id),
    })));
    setGroupsError(null);
    setGroupsLoading(false);
  }

  useEffect(() => {
    if (!authReady || !currentProfile?.id) return;
    void loadCommunityGroups();
  }, [authReady, currentProfile?.id]);

  async function toggleJoinGroup(group: CommunityGroup) {
    const userId = currentProfile?.id;
    if (!userId || groupActionBusyId) return;
    setGroupActionBusyId(group.id);
    setGroupsError(null);

    const result = group.joined
      ? await supabase.from("community_group_members").delete().eq("group_id", group.id).eq("user_id", userId)
      : await supabase.from("community_group_members").insert({ group_id: group.id, user_id: userId });

    if (result.error) {
      console.error("Could not update group membership", result.error);
      setGroupsError(group.joined ? "The group could not be left." : "The group could not be joined.");
    } else {
      setGroups((current) => current.map((item) => item.id === group.id
        ? { ...item, joined: !group.joined, members: Math.max(0, item.members + (group.joined ? -1 : 1)) }
        : item,
      ));
    }
    setGroupActionBusyId(null);
  }

  async function createCommunityGroup(values: { name: string; description: string; emoji: string; areaValue: string }) {
    const area = selectedLocationParts(values.areaValue);
    if (!area.city) throw new Error("Choose a city or neighborhood for this group.");
    const { error: createError } = await supabase.rpc("create_community_group", {
      group_name: values.name,
      group_description: values.description,
      group_emoji: values.emoji,
      group_city: area.city,
      group_neighborhood: area.neighborhood,
    });
    if (createError) {
      if (createError.code === "23505") throw new Error("A group with this name already exists in that area.");
      throw new Error("The group could not be created. Please try again.");
    }
    await loadCommunityGroups();
  }

  async function loadActiveNeighborProfiles(userIds: string[]) {
    const currentUserId = currentProfile?.id;
    const uniqueIds = [...new Set(userIds)].filter((id) => id && id !== currentUserId).slice(0, 50);
    if (!currentUserId || !uniqueIds.length) {
      setActiveNeighbors([]);
      setActiveNeighborsLoading(false);
      return;
    }

    const [profilesResult, businessesResult, followsResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name, city, neighborhood, avatar_url, account_type").in("id", uniqueIds),
      supabase.from("business_profiles").select("user_id, business_name, city, neighborhood, logo_url").in("user_id", uniqueIds),
      supabase.from("profile_follows").select("followed_id").eq("follower_id", currentUserId).in("followed_id", uniqueIds),
    ]);

    if (profilesResult.error || businessesResult.error || followsResult.error) {
      console.error("Could not load active neighbors", profilesResult.error || businessesResult.error || followsResult.error);
      setActiveNeighborsLoading(false);
      return;
    }

    const businessesById = new Map((businessesResult.data || []).map((business: any) => [business.user_id, business]));
    const followedIds = new Set((followsResult.data || []).map((follow: any) => follow.followed_id));
    setActiveNeighbors((profilesResult.data || []).map((profile: any): ActiveNeighbor => {
      const business: any = businessesById.get(profile.id);
      const isBusiness = profile.account_type === "business" || Boolean(business);
      return {
        id: profile.id,
        name: isBusiness ? business?.business_name || profile.full_name || "Local Business" : profile.full_name || "Neighbor",
        city: canonicalLocation(business?.city || profile.city),
        neighborhood: business?.neighborhood || profile.neighborhood || null,
        avatarUrl: isBusiness ? business?.logo_url || profile.avatar_url || null : profile.avatar_url || null,
        accountType: isBusiness ? "business" : "personal",
        following: followedIds.has(profile.id),
      };
    }).sort((left, right) => left.name.localeCompare(right.name)));
    setActiveNeighborsLoading(false);
  }

  useEffect(() => {
    const currentUserId = currentProfile?.id;
    if (!authReady || !currentUserId) return;
    setActiveNeighborsLoading(true);

    const topicLocation = encodeURIComponent(locationKey(browsingLocation) || "all");
    const channel = supabase
      .channel(`neighborly:active:${topicLocation}`, {
        config: { private: true, presence: { key: currentUserId } },
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, Array<{ user_id?: string }>>;
        const userIds = Object.values(state).flatMap((entries) => entries.map((entry) => entry.user_id).filter((id): id is string => Boolean(id)));
        void loadActiveNeighborProfiles(userIds);
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        void channel.track({
          user_id: currentUserId,
          city: currentProfile?.city || homeLocation,
          neighborhood: currentProfile?.neighborhood || null,
          online_at: new Date().toISOString(),
        });
      });

    return () => {
      setActiveNeighbors([]);
      void supabase.removeChannel(channel);
    };
  }, [authReady, currentProfile?.id, currentProfile?.city, currentProfile?.neighborhood, browsingLocation, homeLocation]);

  async function toggleActiveNeighborFollow(neighbor: ActiveNeighbor) {
    const currentUserId = currentProfile?.id;
    if (!currentUserId || activeNeighborBusyId) return;
    setActiveNeighborBusyId(neighbor.id);
    const result = neighbor.following
      ? await supabase.from("profile_follows").delete().eq("follower_id", currentUserId).eq("followed_id", neighbor.id)
      : await supabase.from("profile_follows").insert({ follower_id: currentUserId, followed_id: neighbor.id });
    if (!result.error) {
      setActiveNeighbors((current) => current.map((item) => item.id === neighbor.id ? { ...item, following: !neighbor.following } : item));
    }
    setActiveNeighborBusyId(null);
  }

  useEffect(() => {
    if (!authReady) return;
    if (location.pathname === "/admin") {
      if (!adminStatusReady) return;
      if (isSiteAdmin) setView({ page: "admin" });
      else {
        setView({ page: "feed" });
        navigate("/", { replace: true });
      }
    } else if (location.pathname === "/settings") {
      setView({ page: "settings" });
    } else if (location.pathname === "/profile") {
      setView({ page: currentAccountType === "business" ? "my-business" : "me" });
    } else if (location.pathname === "/" && ["settings", "admin", "me", "my-business"].includes(view.page)) {
      setView({ page: "feed" });
    }
  }, [adminStatusReady, authReady, currentAccountType, isSiteAdmin, location.pathname]);

  async function loadDatabasePostsPage(cursor?: string, reset = false) {
    if (loadingMorePosts) return;
    setLoadingMorePosts(true);
    setMorePostsError(null);

    let request = supabase
      .from("posts")
      .select("id, author_id, category, content, image_url, city, neighborhood, is_admin_post, created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(POST_PAGE_SIZE + 1);
    if (cursor) request = request.lt("created_at", cursor);

    const { data: rows, error } = await request;
    if (error) {
      console.error("Could not load the feed", error);
      setMorePostsError("More posts could not be loaded. Please try again.");
      setLoadingMorePosts(false);
      return;
    }

    const pageRows = (rows || []).slice(0, POST_PAGE_SIZE);
    setHasMoreDatabasePosts((rows || []).length > POST_PAGE_SIZE);
    if (!pageRows.length) {
      setLoadingMorePosts(false);
      return;
    }

    const postIds = pageRows.map((row: any) => row.id);
    const commentsResult = await supabase
      .from("post_comments")
      .select("id, post_id, author_id, body, image_path, created_at")
      .in("post_id", postIds)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (commentsResult.error) {
      console.error("Could not load post comments", commentsResult.error);
      setMorePostsError("Comments could not be loaded. Please try again.");
      setLoadingMorePosts(false);
      return;
    }

    const authorIds = [
      ...new Set([
        ...pageRows.map((row: any) => row.author_id),
        ...(commentsResult.data || []).map((comment: any) => comment.author_id),
      ].filter(Boolean)),
    ];
    const [profilesResult, businessesResult] = await Promise.all([
      supabase.from("profiles").select("id, full_name, city, neighborhood, avatar_url, account_type").in("id", authorIds),
      supabase.from("business_profiles").select("user_id, business_name, city, neighborhood, logo_url").in("user_id", authorIds),
    ]);
    if (profilesResult.error || businessesResult.error) {
      console.error("Could not load post authors", profilesResult.error || businessesResult.error);
      setMorePostsError("Post authors could not be loaded.");
      setLoadingMorePosts(false);
      return;
    }

    const profiles = new Map((profilesResult.data || []).map((profile: any) => [profile.id, profile]));
    const businesses = new Map((businessesResult.data || []).map((business: any) => [business.user_id, business]));
    const commentsByPost = new Map<string, Comment[]>();
    (commentsResult.data || []).forEach((comment: any, index: number) => {
      const profile: any = profiles.get(comment.author_id);
      const business: any = businesses.get(comment.author_id);
      const isBusiness = profile?.account_type === "business" || Boolean(business);
      const created = new Date(comment.created_at);
      const mappedComment: Comment = {
        id: created.getTime() + index,
        databaseId: comment.id,
        author: isBusiness
          ? business?.business_name || profile?.full_name || "Local Business"
          : profile?.full_name || "Neighbor",
        authorId: comment.author_id,
        authorAvatar: isBusiness
          ? business?.logo_url || profile?.avatar_url || null
          : profile?.avatar_url || null,
        authorBadges: [],
        body: comment.body,
        image: comment.image_path
          ? supabase.storage.from("neighborly-media").getPublicUrl(comment.image_path).data.publicUrl
          : undefined,
        time: formatMessageTime(comment.created_at),
        likes: 0,
      };
      commentsByPost.set(comment.post_id, [
        ...(commentsByPost.get(comment.post_id) || []),
        mappedComment,
      ]);
    });
    const loaded: Post[] = pageRows.map((row: any, index: number) => {
      const profile: any = profiles.get(row.author_id);
      const business: any = businesses.get(row.author_id);
      const isBusiness = profile?.account_type === "business" || Boolean(business);
      const created = new Date(row.created_at);
      return {
        id: created.getTime() + index,
        databaseId: row.id,
        author: row.is_admin_post ? "Neighborly Admin" : (isBusiness ? business?.business_name || profile?.full_name || "Local Business" : profile?.full_name || "Neighbor"),
        authorId: row.author_id,
        authorAvatar: row.is_admin_post ? neighborlyLogo : (isBusiness ? business?.logo_url || profile?.avatar_url || null : profile?.avatar_url || null),
        isAdminPost: Boolean(row.is_admin_post),
        authorBadges: [],
        neighborhood: row.neighborhood || business?.neighborhood || profile?.neighborhood || row.city || business?.city || profile?.city || "Local Area",
        city: canonicalLocation(row.city || business?.city || profile?.city),
        time: created.toLocaleDateString() === new Date().toLocaleDateString() ? "Today" : created.toLocaleDateString(),
        category: (row.category || "general") as PostCategory,
        body: row.content,
        image: row.image_url || undefined,
        likes: 0,
        comments: commentsByPost.get(row.id) || [],
        bookmarked: false,
        liked: false,
      };
    });

    setPosts((current) => {
      const existingIds = new Set(current.map((post) => post.databaseId).filter(Boolean));
      const uniqueLoaded = loaded.filter((post) => !existingIds.has(post.databaseId));
      const savedPosts = current.filter((post) => Boolean(post.databaseId));
      const demoPosts = current.filter((post) => !post.databaseId && !uniqueLoaded.some((loadedPost) => loadedPost.body === post.body && loadedPost.author === post.author));
      return reset ? [...uniqueLoaded, ...demoPosts] : [...savedPosts, ...uniqueLoaded, ...demoPosts];
    });
    setPostsCursor(pageRows[pageRows.length - 1].created_at);
    setLoadingMorePosts(false);
  }

  useEffect(() => {
    if (!authReady || postsLoadedRef.current) return;
    postsLoadedRef.current = true;
    void loadDatabasePostsPage(undefined, true);
  }, [authReady]);

  function goToBusiness(id: number) {
    setView({ page: "business", id });
    setNotifOpen(false);
  }
  async function goToUser(name: string, authorId?: string) {
    // Demo profiles have no database ID. Real profiles are never resolved from
    // this name-keyed collection because multiple users can share a display name.
    if (!authorId && USER_PROFILES[name]) {
      setView({ page: "user", profile: USER_PROFILES[name] });
      return;
    }

    // If this author owns a saved business profile and the displayed post name matches
    // that business, route to the business view before attempting a personal profile.
    if (authorId) {
      const [{ data: { user: signedInUser } }, { data: businessRow }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("business_profiles").select("*").eq("user_id", authorId).maybeSingle(),
      ]);

      // The signed-in user's own posts must always open the editable profile that
      // belongs to the active session, never another account with the same name.
      if (signedInUser?.id === authorId) {
        setView({ page: currentAccountType === "business" ? "my-business" : "me" });
        navigate("/profile");
        return;
      }

      if (businessRow?.business_name && businessRow.business_name.trim().toLowerCase() === name.trim().toLowerCase()) {
        const businessId = BUSINESSES.find((b) => b.name.trim().toLowerCase() === name.trim().toLowerCase())?.id;
        if (businessId) {
          setView({ page: "business", id: businessId });
          return;
        }

        const [{ data: ownerRow }, { data: photoRows }] = await Promise.all([
          supabase.from("profiles").select("full_name, avatar_url, created_at").eq("id", authorId).maybeSingle(),
          supabase.from("profile_photos").select("image_url, caption").eq("user_id", authorId).order("created_at", { ascending: true }),
        ]);
        const services = Array.isArray(businessRow.services)
          ? businessRow.services
          : typeof businessRow.services === "string" && businessRow.services.trim()
            ? businessRow.services.split(",").map((value: string) => value.trim()).filter(Boolean)
            : [];
        const created = businessRow.created_at ? new Date(businessRow.created_at) : null;

        setView({
          page: "saved-business",
          business: {
            id: -2,
            ownerId: authorId,
            name: businessRow.business_name,
            category: businessRow.category || "Local Business",
            city: businessRow.city || "Michigan City",
            rating: 0,
            reviewCount: 0,
            badges: [],
            description: businessRow.description || "",
            services,
            photos: (photoRows || []).map((photo: any) => ({ url: photo.image_url, alt: photo.caption || businessRow.business_name + " photo" })),
            phone: businessRow.phone || "",
            email: "",
            website: businessRow.website || "",
            address: [businessRow.neighborhood, businessRow.city, businessRow.zip_code].filter(Boolean).join(", "),
            hours: [],
            founded: created ? String(created.getFullYear()) : String(new Date().getFullYear()),
            owner: businessRow.owner_name || ownerRow?.full_name || "Local owner",
            reviews: [],
            logoUrl: businessRow.logo_url || ownerRow?.avatar_url || null,
            coverUrl: businessRow.cover_url || null,
          },
        });
        return;
      }
    }

    let row: any = null;
    if (authorId) {
      const { data } = await supabase.from("profiles").select("*").eq("id", authorId).maybeSingle();
      row = data;
    } else {
      const { data } = await supabase.from("profiles").select("*").ilike("full_name", name).eq("account_type", "personal").limit(1).maybeSingle();
      row = data;
      if (!row) {
        const { data: fallback } = await supabase.from("profiles").select("*").ilike("full_name", name).limit(1).maybeSingle();
        row = fallback;
      }
    }
    if (!row) return;

    const resolvedName = row.full_name || name;
    const [{ data: photoRows }, { count: postCount }] = await Promise.all([
      supabase.from("profile_photos").select("image_url, caption").eq("user_id", row.id).order("created_at", { ascending: true }),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", row.id).eq("is_admin_post", false),
    ]);
    const profile: UserProfile = {
      id: row.id,
      name: resolvedName,
      neighborhood: row.neighborhood || row.city || "",
      city: row.city || "Michigan City",
      joinDate: row.created_at
        ? new Date(row.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
        : "",
      bio: row.bio || "",
      badges: [],
      posts: postCount || 0,
      neighbors: 0,
      helpfulVotes: 0,
      recsGiven: 0,
      rating: 0,
      ratingCount: 0,
      neighborReviews: [],
      galleryPhotos: (photoRows || []).map((photo: any) => ({ url: photo.image_url, alt: photo.caption || resolvedName + " photo" })),
      recentActivity: [],
      avatarUrl: row.avatar_url || null,
      coverUrl: row.cover_url || null,
      theme: row.theme || null,
    };
    setView({ page: "user", profile });
  }
  function goToFeed() {
    setView({ page: "feed" });
    navigate("/");
  }
  function goToOwnProfile() {
    setView({ page: currentAccountType === "business" ? "my-business" : "me" });
    navigate("/profile");
  }
  function goToSettings() {
    setView({ page: "settings" });
    navigate("/settings");
  }
  function goToAdmin() {
    if (!isSiteAdmin) return;
    setView({ page: "admin" });
    navigate("/admin");
  }
  function openMessages(contact: MessageContact | null = null) {
    if (contact?.id === currentProfile?.id) return;
    setMessageRecipient(contact);
    setMessagesOpen(true);
    setNotifOpen(false);
  }

  function openProfileFromMessages(contact: MessageContact) {
    setMessagesOpen(false);
    setMessageRecipient(null);
    void goToUser(contact.name, contact.id);
  }

  function startHelpWantedPost() {
    setSelectedCategory("helpwanted");
    setPostCreateError(null);
    setComposing(true);
    goToFeed();
  }

  function openEditPost(post: Post) {
    setPostActionError(null);
    setEditingPost(post);
  }

  async function savePostEdits(body: string, category: PostCategory) {
    if (!editingPost?.databaseId || postActionBusyId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || editingPost.authorId !== user.id) {
      setPostActionError("Only the author can edit this post.");
      return;
    }

    setPostActionBusyId(editingPost.databaseId);
    setPostActionError(null);
    const { error } = await supabase
      .from("posts")
      .update({ content: body, category, post_type: postTypeForCategory(category) })
      .eq("id", editingPost.databaseId)
      .eq("author_id", user.id)
      .select("id")
      .single();

    if (error) {
      console.error("Could not edit post", error);
      setPostActionError("Your post could not be updated. Please try again.");
      setPostActionBusyId(null);
      return;
    }

    const updatedPost = { ...editingPost, body, category };
    setPosts((current) => current.map((post) => post.databaseId === updatedPost.databaseId ? updatedPost : post));
    setClassifiedPosts((current) => {
      if (category !== "forsale") return current.filter((post) => post.databaseId !== updatedPost.databaseId);
      return current.some((post) => post.databaseId === updatedPost.databaseId)
        ? current.map((post) => post.databaseId === updatedPost.databaseId ? updatedPost : post)
        : [updatedPost, ...current];
    });
    setEditingPost(null);
    setPostActionBusyId(null);
  }

  async function deletePost(post: Post) {
    if (!post.databaseId || postActionBusyId) return;
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || post.authorId !== user.id) {
      window.alert("Only the author can delete this post.");
      return;
    }

    setPostActionBusyId(post.databaseId);
    setPostActionError(null);
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", post.databaseId)
      .eq("author_id", user.id)
      .select("id")
      .single();

    if (error) {
      console.error("Could not delete post", error);
      setPostActionError("Your post could not be deleted. Please try again.");
      window.alert("Your post could not be deleted. Please try again.");
      setPostActionBusyId(null);
      return;
    }

    const storagePath = postImageStoragePath(post.image);
    if (storagePath) {
      const { error: storageError } = await supabase.storage.from("neighborly-media").remove([storagePath]);
      if (storageError) console.error("The post was deleted, but its photo could not be removed", storageError);
    }
    setPosts((current) => current.filter((item) => item.databaseId !== post.databaseId));
    setClassifiedPosts((current) => current.filter((item) => item.databaseId !== post.databaseId));
    if (editingPost?.databaseId === post.databaseId) setEditingPost(null);
    setPostActionBusyId(null);
  }

  const postEditDialog = editingPost ? (
    <EditPostDialog
      key={editingPost.databaseId}
      post={editingPost}
      busy={postActionBusyId === editingPost.databaseId}
      error={postActionError}
      onClose={() => { setEditingPost(null); setPostActionError(null); }}
      onSave={(body, category) => { void savePostEdits(body, category); }}
    />
  ) : null;

  const messagingModal = currentProfile?.id ? (
    <MessagingModal
      key={messageRecipient?.id || "message-inbox"}
      open={messagesOpen}
      onClose={() => setMessagesOpen(false)}
      currentUserId={currentProfile.id}
      initialContact={messageRecipient}
      onUnreadChange={() => { void refreshUnreadMessages(); }}
      onProfileOpen={openProfileFromMessages}
    />
  ) : null;

  if (!authReady) return <div className="min-h-screen bg-purple-950 flex items-center justify-center text-white">Loading your Neighborly profile…</div>;

  if (view.page === "admin" && currentProfile && isSiteAdmin) return (
    <AdminDashboard
      onBack={goToFeed}
      defaultCity={browsingLocation}
      defaultNeighborhood={currentBusiness?.address.split(",")[0] || currentProfile.neighborhood || browsingLocation}
      onPostCreated={(post) => {
        setPosts((current) => [post, ...current]);
        if (post.category === "forsale") setClassifiedPosts((current) => [post, ...current]);
      }}
    />
  );
  if (view.page === "settings") return <SettingsView onBack={goToFeed} onProfileSaved={() => { void loadCurrentProfile(false); }} />;
  if (view.page === "me" && currentProfile) return (
    <>
      <UserProfileView profile={currentProfile} onBack={goToFeed} isOwnProfile myAvatarUrl={myAvatarUrl} onAvatarChange={setMyAvatarUrl} onSettings={goToSettings} onAdmin={isSiteAdmin ? goToAdmin : undefined} />
      {messagingModal}
    </>
  );
  if (view.page === "my-business" && currentBusiness) return (
    <>
      <BusinessProfileView biz={currentBusiness} onBack={goToFeed} onUserClick={goToUser} isOwnProfile onLogoChange={setMyAvatarUrl} onSettings={goToSettings} onAdmin={isSiteAdmin ? goToAdmin : undefined} />
      {messagingModal}
    </>
  );
  if (view.page === "saved-business") return (
    <>
      <BusinessProfileView
        biz={view.business}
        onBack={goToFeed}
        onUserClick={goToUser}
        onMessage={openMessages}
      />
      {messagingModal}
    </>
  );
  if (view.page === "business") {
    const biz = BUSINESSES.find((b) => b.id === view.id);
    if (biz)
      return (
        <>
          <BusinessProfileView
            biz={biz}
            onBack={goToFeed}
            onUserClick={goToUser}
            onMessage={openMessages}
          />
          {messagingModal}
        </>
      );
  }
  if (view.page === "user") {
    return (
      <>
        <UserProfileView
          key={view.profile.id || view.profile.name}
          profile={view.profile}
          onBack={goToFeed}
          onMessage={openMessages}
        />
        {messagingModal}
      </>
    );
  }

  if (view.page === "search") {
    return (
      <SearchView
        onBack={goToFeed}
        onUserClick={goToUser}
        groups={groups}
        activeLocation={activeLocation}
      />
    );
  }

  if (view.page === "events") {
    return <EventsView onBack={goToFeed} activeLocation={activeLocation} />;
  }

  if (view.page === "helpwanted") {
    return (
      <>
        <HelpWantedView
          posts={posts.filter((post) => post.category === "helpwanted")}
          onBack={goToFeed}
          onCreate={startHelpWantedPost}
          onUserClick={goToUser}
          onMessage={openMessages}
          onEdit={openEditPost}
          onDelete={(post) => { void deletePost(post); }}
          busyPostId={postActionBusyId}
          currentUserId={currentProfile?.id}
          activeLocation={activeLocation}
        />
        {messagingModal}
        {postEditDialog}
      </>
    );
  }

  if (view.page === "classifieds") {
    return (
      <>
        <ClassifiedsView
          posts={classifiedPosts}
          onBack={goToFeed}
          onUserClick={goToUser}
          onMessage={openMessages}
          onEdit={openEditPost}
          onDelete={(post) => { void deletePost(post); }}
          busyPostId={postActionBusyId}
          currentUserId={currentProfile?.id}
          activeLocation={activeLocation}
        />
        {messagingModal}
        {postEditDialog}
      </>
    );
  }

  const locationFilteredPosts = posts.filter((post) =>
    matchesSelectedLocation(post.city, post.neighborhood, activeLocation),
  );

  const filteredPosts =
    activeTab === "all"
      ? locationFilteredPosts
      : locationFilteredPosts.filter((p) => p.category === activeTab);

  function toggleLike(id: number) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              liked: !p.liked,
              likes: p.liked ? p.likes - 1 : p.likes + 1,
            }
          : p,
      ),
    );
  }
  function toggleBookmark(id: number) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, bookmarked: !p.bookmarked } : p,
      ),
    );
  }
  async function handleCreatePost() {
    if (postCreateBusy) return;
    const text = newPostText.trim();
    if (!text && !newPostImage) return;
    setPostCreateBusy(true);
    setPostCreateError(null);
    let uploadedPath: string | null = null;

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setPostCreateError("Your session expired. Please sign in again before posting.");
        return;
      }

      let imageUrl: string | null = null;
      if (newPostImage) {
        const ext=(newPostImage.name.split(".").pop() || "jpg").toLowerCase();
        uploadedPath=user.id+"/posts/"+Date.now()+"-"+Math.random().toString(36).slice(2)+"."+ext;
        const { error: uploadError } = await supabase.storage.from("neighborly-media").upload(uploadedPath,newPostImage,{ upsert:false, contentType:newPostImage.type || undefined });
        if (uploadError) {
          console.error("Could not upload post photo",uploadError);
          setPostCreateError("We couldn't upload that photo. Please try again.");
          return;
        }
        const { data: publicData } = supabase.storage.from("neighborly-media").getPublicUrl(uploadedPath);
        imageUrl=publicData.publicUrl;
      }

      const postCity = browsingLocation;
      const homeNeighborhood = currentBusiness?.address.split(",")[0] || currentProfile?.neighborhood || postCity;
      const postNeighborhood = selectedArea.neighborhood
        || (sameLocation(postCity, homeLocation) ? homeNeighborhood : postCity);
      const postType = postTypeForCategory(selectedCategory);
      const { data: saved, error } = await supabase.from("posts").insert({ author_id:user.id, post_type:postType, category:selectedCategory, content:text, image_url:imageUrl, city:postCity, neighborhood:postNeighborhood }).select("id, created_at").single();
      if (error) {
        if (uploadedPath) await supabase.storage.from("neighborly-media").remove([uploadedPath]);
        console.error("Could not save post",error);
        setPostCreateError("We couldn't publish your post. Please try again.");
        return;
      }

      const authorName=currentAccountType === "business" ? (currentBusiness?.name || "Business") : (currentProfile?.name || "You");
      const newPost: Post={ id:new Date(saved.created_at).getTime(), databaseId:saved.id, author:authorName, authorId:user.id, authorAvatar:myAvatarUrl, authorBadges:[], neighborhood:postNeighborhood, city:postCity, time:"Just now", category:selectedCategory, body:text, image:imageUrl || undefined, likes:0, comments:[], bookmarked:false, liked:false };
      setPosts(prev=>[newPost,...prev]);
      if(selectedCategory === "forsale") setClassifiedPosts(prev=>[newPost,...prev]);
      setNewPostText(""); setSelectedCategory("general"); setComposing(false);
      if(newPostImagePreview) URL.revokeObjectURL(newPostImagePreview);
      setNewPostImage(null); setNewPostImagePreview(null); if(postImageInputRef.current) postImageInputRef.current.value="";
    } catch (unexpectedError) {
      console.error("Unexpected error while creating post", unexpectedError);
      setPostCreateError("Something went wrong while publishing. Please try again.");
    } finally {
      setPostCreateBusy(false);
    }
  }
  function clearCommentImage(postId: number) {
    const current = commentImageDraftRef.current[postId];
    if (current) {
      URL.revokeObjectURL(current.previewUrl);
      commentPreviewUrlsRef.current.delete(current.previewUrl);
      delete commentImageDraftRef.current[postId];
    }
    setCommentImageDraft((previous) => {
      const next = { ...previous };
      delete next[postId];
      return next;
    });
    const input = commentImageInputRefs.current[postId];
    if (input) input.value = "";
  }

  function chooseCommentImage(postId: number, file: File | null) {
    clearCommentImage(postId);
    if (!file) return;
    if (!COMMENT_IMAGE_TYPES.has(file.type)) {
      setCommentError((previous) => ({
        ...previous,
        [postId]: "Please choose a JPG, PNG, WebP, or GIF image.",
      }));
      return;
    }
    if (file.size > COMMENT_IMAGE_MAX_BYTES) {
      setCommentError((previous) => ({
        ...previous,
        [postId]: "That photo is larger than 6 MB. Please choose a smaller image.",
      }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const draft = { file, previewUrl };
    commentPreviewUrlsRef.current.add(previewUrl);
    commentImageDraftRef.current[postId] = draft;
    setCommentImageDraft((previous) => ({ ...previous, [postId]: draft }));
    setCommentError((previous) => ({ ...previous, [postId]: "" }));
  }

  async function submitComment(postId: number) {
    if (commentBusy[postId]) return;
    const text = (commentDraft[postId] || "").trim();
    const imageDraft = commentImageDraftRef.current[postId];
    if (!text && !imageDraft) return;
    const post = posts.find((candidate) => candidate.id === postId);
    if (!post?.databaseId) {
      setCommentError((prev) => ({ ...prev, [postId]: "This sample post cannot accept comments." }));
      return;
    }

    setCommentBusy((prev) => ({ ...prev, [postId]: true }));
    setCommentError((prev) => ({ ...prev, [postId]: "" }));
    let uploadedPath: string | null = null;
    let commentSaved = false;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setCommentError((prev) => ({ ...prev, [postId]: "Your session expired. Please sign in again." }));
        return;
      }

      if (imageDraft) {
        const extension = COMMENT_IMAGE_EXTENSIONS[imageDraft.file.type];
        const uniqueName = Math.random().toString(36).slice(2) || "photo";
        uploadedPath = `${user.id}/comments/${post.databaseId}/${Date.now()}-${uniqueName}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("neighborly-media")
          .upload(uploadedPath, imageDraft.file, {
            cacheControl: "3600",
            contentType: imageDraft.file.type,
            upsert: false,
          });
        if (uploadError) {
          console.error("Could not upload comment photo", uploadError);
          setCommentError((prev) => ({ ...prev, [postId]: "Your photo could not be uploaded. Please try again." }));
          return;
        }
      }

      const { data: saved, error } = await supabase
        .from("post_comments")
        .insert({
          post_id: post.databaseId,
          author_id: user.id,
          body: text,
          image_path: uploadedPath,
        })
        .select("id, created_at, image_path")
        .single();
      if (error) {
        if (uploadedPath) {
          await supabase.storage.from("neighborly-media").remove([uploadedPath]);
          uploadedPath = null;
        }
        console.error("Could not save comment", error);
        setCommentError((prev) => ({ ...prev, [postId]: "Your comment could not be saved. Please try again." }));
        return;
      }
      commentSaved = true;

      const newComment: Comment = {
        id: new Date(saved.created_at).getTime(),
        databaseId: saved.id,
        author: commentAuthorName,
        authorId: user.id,
        authorAvatar: myAvatarUrl,
        authorBadges: [],
        body: text,
        image: saved.image_path
          ? supabase.storage.from("neighborly-media").getPublicUrl(saved.image_path).data.publicUrl
          : undefined,
        time: "Just now",
        likes: 0,
      };
      setPosts((prev) => prev.map((candidate) =>
        candidate.id === postId
          ? { ...candidate, comments: [...candidate.comments, newComment] }
          : candidate,
      ));
      setCommentDraft((prev) => ({ ...prev, [postId]: "" }));
      clearCommentImage(postId);
    } catch (unexpectedError) {
      if (uploadedPath && !commentSaved) {
        await supabase.storage.from("neighborly-media").remove([uploadedPath]);
      }
      console.error("Unexpected error while saving comment", unexpectedError);
      setCommentError((prev) => ({ ...prev, [postId]: "Something went wrong. Please try again." }));
    } finally {
      setCommentBusy((prev) => ({ ...prev, [postId]: false }));
    }
  }

  return (
    <div className="min-h-screen bg-purple-950 font-['DM_Sans',sans-serif] relative">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 h-16 flex items-center gap-2 sm:gap-4">

          {/* Neighborly wordmark */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <span className="font-['Playfair_Display',serif] font-bold text-xl sm:text-2xl bg-gradient-to-r from-purple-700 to-blue-500 bg-clip-text text-transparent tracking-tight leading-none">Neighborly</span>
          </div>

          {/* Location switcher */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => {
                setLocationOpen((open) => !open);
                setLocationSearch("");
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors font-['DM_Sans',sans-serif]"
              aria-expanded={locationOpen}
              aria-haspopup="listbox"
            >
              <MapPin size={14} className="text-primary" />
              <span className="max-w-28 truncate font-medium sm:max-w-48">{locationMenuLabel(activeLocation)}</span>
              <ChevronDown size={13} className={`transition-transform ${locationOpen ? "rotate-180" : ""}`} />
            </button>
            {locationOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                <div className="border-b border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground font-['DM_Sans',sans-serif]">Areas &amp; neighborhoods</p>
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                    <Search size={14} className="flex-shrink-0 text-muted-foreground" />
                    <input
                      autoFocus
                      value={locationSearch}
                      onChange={(event) => setLocationSearch(event.target.value)}
                      placeholder="Search city or neighborhood"
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto" role="listbox" aria-label="Choose an area or neighborhood">
                  {visibleAreaOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={activeLocation === option.value}
                      onClick={() => {
                        setActiveLocation(option.value);
                        setLocationOpen(false);
                        setLocationSearch("");
                      }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors font-['DM_Sans',sans-serif] ${
                        activeLocation === option.value
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      {option.neighborhood ? <Users size={13} /> : <MapPin size={13} />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{option.label}</span>
                        {option.neighborhood && <span className="block text-[11px] font-normal text-muted-foreground">Neighborhood</span>}
                      </span>
                      {option.value === homeArea && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Home</span>}
                      {activeLocation === option.value && <CheckCircle2 size={13} className="flex-shrink-0 text-primary" />}
                    </button>
                  ))}
                  {visibleAreaOptions.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">No matching areas yet</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocationOpen(false);
                    setLocationSearch("");
                    goToSettings();
                  }}
                  className="flex w-full items-center gap-2 border-t border-border bg-secondary/40 px-3 py-3 text-left text-sm font-semibold text-primary hover:bg-secondary"
                >
                  <Plus size={14} /> Add or update my neighborhood
                </button>
              </div>
            )}
            {locationOpen && (
              <div className="fixed inset-0 z-40" onClick={() => { setLocationOpen(false); setLocationSearch(""); }} />
            )}
          </div>

          {/* Desktop nav — center */}
          <nav className="hidden lg:flex items-center gap-1 mx-auto">
            {[
              { icon: <HandHeart size={16} />, label: "Help Wanted", page: "helpwanted" as const },
              { icon: <CalendarDays size={16} />, label: "Events", page: "events" as const },
              { icon: <Briefcase size={16} />, label: "Businesses", page: "feed" as const },
              { icon: <ShoppingBag size={16} />, label: "Classifieds", page: "classifieds" as const },
              { icon: <Search size={16} />, label: "Search", page: "search" as const },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => setView({ page: item.page })}
                className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors text-xs font-medium ${
                  view.page === item.page && item.page !== "feed"
                    ? "text-primary bg-secondary"
                    : "text-muted-foreground hover:bg-secondary hover:text-primary"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right side — messages + bell + avatar */}
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {isSiteAdmin && (
              <button
                onClick={goToAdmin}
                className="hidden items-center gap-1.5 rounded-lg bg-purple-700 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-800 sm:inline-flex"
                aria-label="Open admin dashboard"
                title="Admin dashboard"
              >
                <Shield size={15} /> Admin
                {adminAttentionCount > 0 && <span className="flex min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-purple-700">{adminAttentionCount > 99 ? "99+" : adminAttentionCount}</span>}
              </button>
            )}
            <button
              onClick={() => openMessages()}
              className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Messages"
              title="Messages"
            >
              <MessageSquare size={18} />
              {unreadMessageCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full flex items-center justify-center">
                  {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setNotifOpen(!notifOpen); setMessagesOpen(false); }}
              className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={18} />
              {pendingFriendRequests.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-blue-600 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                  {pendingFriendRequests.length > 99 ? "99+" : pendingFriendRequests.length}
                </span>
              )}
            </button>
            <button onClick={goToOwnProfile} aria-label="View profile">
              <Avatar name={currentAccountType === "business" ? (currentBusiness?.name || "Business") : (currentProfile?.name || "Neighbor")} size="sm" src={myAvatarUrl} />
            </button>
          </div>
        </div>
      </header>

      {/* Floating Edge Toggle Button - Attached to Left Edge of Sidebar */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed top-1/2 -translate-y-1/2 z-50 lg:hidden bg-purple-900 text-white p-2.5 rounded-l-xl shadow-lg hover:bg-purple-800 transition-all duration-300 ease-in-out flex items-center justify-center border-l border-t border-b border-purple-700 ${
          sidebarOpen ? "right-72" : "right-0 rounded-l-xl rounded-r-none"
        }`}
        aria-label="Toggle Sidebar"
      >
        {sidebarOpen ? (
          <ChevronRight size={20} className="text-white" />
        ) : (
          <ChevronLeft size={20} className="text-white animate-pulse" />
        )}
      </button>

      {notifOpen && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setNotifOpen(false)}
        >
          <div
            className="absolute top-14 right-4 w-[min(22rem,calc(100vw-2rem))] bg-white rounded-xl shadow-2xl border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">Notifications</h3>
              <button
                onClick={() => setNotifOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={15} />
              </button>
            </div>
            {friendRequestError && <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{friendRequestError}</p>}
            {pendingFriendRequests.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Bell size={24} className="mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm font-medium">No new notifications</p>
                <p className="mt-1 text-xs text-muted-foreground">Friend requests will appear here.</p>
              </div>
            ) : pendingFriendRequests.map((request) => (
              <div key={request.id} className="border-b border-border bg-blue-50/50 px-4 py-3 last:border-b-0">
                <div className="flex items-start gap-3">
                  <button onClick={() => { setNotifOpen(false); void goToUser(request.name, request.requesterId); }} aria-label={`View ${request.name}'s profile`}>
                    <Avatar name={request.name} size="sm" src={request.avatarUrl || null} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => { setNotifOpen(false); void goToUser(request.name, request.requesterId); }} className="text-left text-sm leading-snug">
                      <span className="font-semibold">{request.name}</span> sent you a friend request.
                    </button>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatMessageTime(request.createdAt)}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => { void respondToFriendRequest(request.id, true); }}
                        disabled={friendRequestBusy === request.id}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => { void respondToFriendRequest(request.id, false); }}
                        disabled={friendRequestBusy === request.id}
                        className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {messagingModal}
      {postEditDialog}

      <main className="max-w-screen-2xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        
        {/* Feed */}
        <section className="flex flex-col gap-4 min-w-0">
          {!composing ? (
            <div
              className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => { setPostCreateError(null); setComposing(true); }}
            >
              <Avatar name={currentAccountType === "business" ? (currentBusiness?.name || "Business") : (currentProfile?.name || "Neighbor")} size="md" src={myAvatarUrl} />
              <div className="flex-1 bg-muted rounded-lg px-4 py-2.5 text-sm text-muted-foreground font-['DM_Sans',sans-serif]">
                What's happening in {activeLocation === "All Areas" ? homeLocation : locationPromptLabel(activeLocation)}?
              </div>
              <button className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                <Plus size={14} /> Post
              </button>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-primary/30 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Avatar name={currentAccountType === "business" ? (currentBusiness?.name || "Business") : (currentProfile?.name || "Neighbor")} size="md" src={myAvatarUrl} />
                <div className="flex-1">
                  <textarea
                    autoFocus
                    placeholder="Share something with your neighbors..."
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none min-h-[80px] font-['DM_Sans',sans-serif]"
                  />
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2 font-['DM_Sans',sans-serif]">Category</p>
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {(Object.keys(CATEGORY_META) as PostCategory[]).map((cat) => {
                        const active = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all font-['DM_Sans',sans-serif] ${CATEGORY_META[cat].color} ${
                              active
                                ? "ring-2 ring-offset-1 ring-current scale-105 shadow-sm"
                                : "opacity-50 hover:opacity-80"
                            }`}
                          >
                            {CATEGORY_META[cat].icon}
                            {CATEGORY_META[cat].label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mb-3">
                      <input ref={postImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f=e.target.files?.[0] || null; setNewPostImage(f); if(newPostImagePreview) URL.revokeObjectURL(newPostImagePreview); setNewPostImagePreview(f ? URL.createObjectURL(f) : null); }} />
                      <button type="button" onClick={() => postImageInputRef.current?.click()} className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors font-medium">
                        <Camera size={14} /> Add Photo
                      </button>
                      {newPostImagePreview && <div className="relative mt-2 w-fit"><img src={newPostImagePreview} alt="Post preview" className="max-h-48 max-w-full rounded-lg object-cover border border-border" /><button type="button" aria-label="Remove photo" onClick={() => { if(newPostImagePreview) URL.revokeObjectURL(newPostImagePreview); setNewPostImage(null); setNewPostImagePreview(null); if(postImageInputRef.current) postImageInputRef.current.value=""; }} className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1"><X size={13}/></button></div>}
                    </div>
                    {selectedCategory === "forsale" && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg mb-2 flex items-center gap-1.5 font-['DM_Sans',sans-serif]">
                        <ShoppingBag size={11} /> This post will also appear in Classifieds
                      </p>
                    )}
                    {selectedCategory === "helpwanted" && (
                      <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg mb-2 flex items-center gap-1.5 font-['DM_Sans',sans-serif]">
                        <HandHeart size={11} /> This post will also appear on the Help Wanted page
                      </p>
                    )}
                    {postCreateError && (
                      <p role="alert" className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                        {postCreateError}
                      </p>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setComposing(false);
                          setPostCreateError(null);
                          setNewPostText("");
                          setSelectedCategory("general");
                          if (newPostImagePreview) URL.revokeObjectURL(newPostImagePreview);
                          setNewPostImage(null);
                          setNewPostImagePreview(null);
                          if (postImageInputRef.current) postImageInputRef.current.value = "";
                        }}
                        disabled={postCreateBusy}
                        className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 font-['DM_Sans',sans-serif]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { void handleCreatePost(); }}
                        disabled={postCreateBusy || (!newPostText.trim() && !newPostImage)}
                        className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 font-['DM_Sans',sans-serif]"
                      >
                        {postCreateBusy ? "Posting…" : "Post"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Location empty state */}
          {filteredPosts.length === 0 && (
            <div className="text-center py-14">
              <MapPin size={32} className="text-purple-400 mx-auto mb-3" />
              <p className="text-purple-100 font-semibold font-['DM_Sans',sans-serif]">No posts in {locationPromptLabel(activeLocation)}</p>
              <p className="text-purple-400 text-sm mt-1 font-['DM_Sans',sans-serif]">Be the first to post something here</p>
            </div>
          )}

          {filteredPosts.map((post, idx) => {
            const showCityHeader =
              activeLocation === "All Areas" &&
              (idx === 0 || filteredPosts[idx - 1].city !== post.city);
            const isLastInCity =
              activeLocation === "All Areas" &&
              (idx === filteredPosts.length - 1 || filteredPosts[idx + 1].city !== post.city);
            const meta = CATEGORY_META[post.category];
            const expanded = expandedPost === post.id;
            return (
              <React.Fragment key={post.id}>
                {showCityHeader && (
                  <div className={`flex items-center gap-2 px-1 ${idx > 0 ? "mt-2" : ""}`}>
                    <MapPin size={13} className="text-purple-300 flex-shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-purple-300 font-['DM_Sans',sans-serif]">
                      {post.city}
                    </span>
                    <div className="flex-1 h-px bg-purple-800/40" />
                  </div>
                )}
              <article
                className="bg-card rounded-xl border border-border hover:border-primary/20 transition-colors overflow-hidden"
              >
                <div className="p-4 pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => !post.isAdminPost && goToUser(post.author, post.authorId)}
                        disabled={post.isAdminPost}
                        aria-label={post.isAdminPost ? "Official Neighborly administrator" : `View ${post.author}'s profile`}
                      >
                        <Avatar name={post.author} size="md" src={post.authorAvatar || (post.author === (currentAccountType === "business" ? currentBusiness?.name : currentProfile?.name) ? myAvatarUrl : null)} />
                      </button>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() =>
                              !post.isAdminPost && goToUser(post.author, post.authorId)
                            }
                            disabled={post.isAdminPost}
                            className="font-semibold text-sm enabled:hover:text-blue-600 transition-colors"
                          >
                            {post.author}
                          </button>
                          {post.isAdminPost && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              <BadgeCheck size={11} /> Official
                            </span>
                          )}
                          {post.authorBadges
                            .slice(0, 2)
                            .map((b) => (
                              <UserBadgePill
                                key={b}
                                type={b}
                                compact
                              />
                            ))}
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${meta.color}`}
                          >
                            {meta.icon} {meta.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {post.neighborhood} · {post.time}
                        </p>
                      </div>
                    </div>
                    <PostOwnerMenu
                      post={post}
                      currentUserId={currentProfile?.id}
                      busy={postActionBusyId === post.databaseId}
                      onEdit={openEditPost}
                      onDelete={(ownedPost) => { void deletePost(ownedPost); }}
                    />
                  </div>
                  <div className="mt-3 mb-3">
                    {post.title && (
                      <h2 className="font-['Playfair_Display',serif] font-semibold text-base mb-1.5 leading-snug">
                        {post.title}
                      </h2>
                    )}
                    <p className="text-sm text-foreground/85 leading-relaxed">
                      {post.body}
                    </p>
                  </div>
                </div>
                {post.image && (
                  <div className="bg-muted lg:flex lg:max-h-[72vh] lg:justify-center lg:overflow-hidden">
                    <ExpandablePhoto
                      src={post.image}
                      alt={post.title || "Post image"}
                      buttonClassName="flex max-h-64 w-full cursor-zoom-in justify-center overflow-hidden lg:max-h-[72vh] lg:w-auto lg:max-w-full"
                      imageClassName="max-h-64 w-full object-cover lg:h-auto lg:max-h-[72vh] lg:w-auto lg:max-w-full lg:object-contain"
                    />
                  </div>
                )}

                <div className="px-4 py-2.5 flex items-center justify-between border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                      <ThumbsUp
                        size={8}
                        className="text-white"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {post.likes} neighbors
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setExpandedPost(expanded ? null : post.id)
                    }
                    className="text-xs text-muted-foreground hover:text-blue-600 transition-colors"
                  >
                    {post.comments.length} comments
                  </button>
                </div>

                <div className="grid grid-cols-4 items-center gap-0.5 border-t border-border px-2 pb-3 pt-2 sm:gap-1 sm:px-4">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 sm:text-sm ${post.liked ? "bg-blue-600/10 text-blue-600" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  >
                    <Heart
                      size={14}
                      className={`shrink-0 ${post.liked ? "fill-blue-600 text-blue-600" : ""}`}
                    />
                    {post.liked ? "Liked" : "Like"}
                  </button>
                  <button
                    onClick={() =>
                      setExpandedPost(expanded ? null : post.id)
                    }
                    className="flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:gap-1.5 sm:px-3 sm:text-sm"
                  >
                    <MessageCircle size={14} className="shrink-0" />
                    Comment
                  </button>
                  <button
                    onClick={() => toggleBookmark(post.id)}
                    className={`flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 sm:text-sm ${post.bookmarked ? "bg-amber-50 text-amber-700" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  >
                    <Bookmark
                      size={14}
                      className={`shrink-0 ${post.bookmarked ? "fill-amber-600 text-amber-600" : ""}`}
                    />
                    Save
                  </button>
                  <button className="flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:gap-1.5 sm:px-3 sm:text-sm">
                    <Share2 size={14} className="shrink-0" />
                    Share
                  </button>
                </div>

                {expanded && (
                  <div className="border-t border-border bg-muted/40 px-4 py-3">
                    <div className="flex flex-col gap-3 mb-3">
                      {post.comments.map((c) => (
                        <div
                          key={c.id}
                          className="flex gap-2.5"
                        >
                          <button
                            onClick={() => goToUser(c.author, c.authorId)}
                            aria-label={`View ${c.author}'s profile`}
                          >
                            <Avatar
                              name={c.author}
                              size="sm"
                              src={c.authorId === currentProfile?.id ? myAvatarUrl : c.authorAvatar}
                            />
                          </button>
                          <div className="flex-1 bg-card rounded-lg px-3 py-2 border border-border">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() =>
                                  goToUser(c.author, c.authorId)
                                }
                                className="text-sm font-semibold hover:text-blue-600 transition-colors"
                              >
                                {c.author}
                              </button>
                              {c.authorBadges
                                .slice(0, 1)
                                .map((b) => (
                                  <UserBadgePill
                                    key={b}
                                    type={b}
                                    compact
                                  />
                                ))}
                              <span className="text-xs text-muted-foreground">
                                {c.time}
                              </span>
                            </div>
                            {c.body && (
                              <p className="text-sm text-foreground/85 mt-0.5">
                                {c.body}
                              </p>
                            )}
                            {c.image && (
                              <ExpandablePhoto
                                src={c.image}
                                alt={`Photo shared by ${c.author}`}
                                buttonClassName="mt-2 block w-full max-w-lg cursor-zoom-in overflow-hidden rounded-lg border border-border bg-muted"
                                imageClassName="max-h-80 w-full object-cover"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <div className="mt-1">
                        <Avatar name={commentAuthorName} size="sm" src={myAvatarUrl} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-colors focus-within:border-blue-600/40">
                          <input
                            type="text"
                            maxLength={2000}
                            placeholder="Write a comment or add a photo..."
                            value={commentDraft[post.id] || ""}
                            onChange={(e) =>
                              setCommentDraft((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void submitComment(post.id);
                              }
                            }}
                            disabled={commentBusy[post.id]}
                            className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                          />
                          <input
                            ref={(element) => {
                              commentImageInputRefs.current[post.id] = element;
                            }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            disabled={commentBusy[post.id]}
                            onChange={(event) => {
                              chooseCommentImage(post.id, event.target.files?.[0] || null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => commentImageInputRefs.current[post.id]?.click()}
                            disabled={commentBusy[post.id]}
                            aria-label="Add a photo to this comment"
                            title="Add photo"
                            className="text-muted-foreground transition-colors hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Camera size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => { void submitComment(post.id); }}
                            disabled={
                              commentBusy[post.id]
                              || (!(commentDraft[post.id] || "").trim() && !commentImageDraft[post.id])
                            }
                            aria-label={commentBusy[post.id] ? "Saving comment" : "Post comment"}
                            className="text-blue-600 transition-colors hover:text-blue-600/70 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                        {commentImageDraft[post.id] && (
                          <div className="relative mt-2 w-fit max-w-full">
                            <img
                              src={commentImageDraft[post.id].previewUrl}
                              alt="Selected comment photo preview"
                              className="max-h-40 max-w-full rounded-lg border border-border object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => clearCommentImage(post.id)}
                              disabled={commentBusy[post.id]}
                              aria-label="Remove comment photo"
                              className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white disabled:opacity-50"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {commentError[post.id] && (
                      <p className="ml-10 mt-2 text-xs text-red-600" role="alert">{commentError[post.id]}</p>
                    )}
                  </div>
                )}
              </article>
              </React.Fragment>
            );
          })}

          {morePostsError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">{morePostsError}</p>
          )}
          {hasMoreDatabasePosts && (
            <button
              onClick={() => { void loadDatabasePostsPage(postsCursor || undefined); }}
              disabled={loadingMorePosts}
              className="mx-auto rounded-full border border-purple-300 bg-white px-5 py-2 text-sm font-semibold text-purple-700 shadow-sm transition-colors hover:bg-purple-50 disabled:opacity-50"
            >
              {loadingMorePosts ? "Loading more posts…" : "Load more posts"}
            </button>
          )}
        </section>

        {/* Desktop sidebar — always visible on lg+ */}
        <aside className="hidden lg:flex flex-col gap-4 self-start sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto pb-6">

            {/* Logo card */}
            <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-center">
              <img src={neighborlyAppLogo} alt="Neighborly App" className="w-full h-auto object-contain" />
            </div>

            <WeatherCard locationName={browsingLocation} weather={weather} />

            <AdvertisingSidebarCard ad={activeAdvertisement} onAdvertise={() => setAdvertiseOpen(true)} />

            <button onClick={() => setFeedbackOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-purple-700 shadow-sm hover:bg-purple-50">
              <MessageSquare size={16} /> Send Feedback
            </button>

            <CommunityGroupsCard
              groups={visibleGroups}
              loading={groupsLoading}
              error={groupsError}
              busyGroupId={groupActionBusyId}
              onToggleMembership={(group) => { void toggleJoinGroup(group); }}
              onCreate={() => setIsCreateGroupOpen(true)}
            />

            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Upcoming Events</h3>
                <button className="text-xs text-blue-600 font-medium hover:underline">See all</button>
              </div>
              <div className="flex flex-col gap-3">
                {EVENTS.map((ev) => (
                  <div key={ev.id} className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-blue-600 flex-shrink-0">{ev.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">{ev.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.date} · {ev.time}</p>
                      <p className="text-xs text-muted-foreground">{ev.going} going</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Local Businesses</h3>
                <button className="text-xs text-blue-600 font-medium hover:underline">Browse</button>
              </div>
              <div className="flex flex-col gap-3">
                {BUSINESSES.map((biz) => (
                  <button key={biz.id} onClick={() => goToBusiness(biz.id)} className="flex items-start gap-2.5 w-full text-left group">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                      <Briefcase size={13} className="text-amber-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight group-hover:text-blue-600 transition-colors">{biz.name}</p>
                      <p className="text-xs text-muted-foreground">{biz.category}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star size={10} className="fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium">{biz.rating}</span>
                        <span className="text-xs text-muted-foreground">({biz.reviewCount})</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <ActiveNeighborsCard
              neighbors={visibleActiveNeighbors}
              loading={activeNeighborsLoading}
              busyNeighborId={activeNeighborBusyId}
              onOpenProfile={(neighbor) => { void goToUser(neighbor.name, neighbor.id); }}
              onToggleFollow={(neighbor) => { void toggleActiveNeighborFollow(neighbor); }}
            />

            <p className="text-xs text-muted-foreground text-center px-2">© 2026 Neighborly · Privacy · Terms · Help</p>
        </aside>
      </main>
      
      {/* Mobile sliding drawer — backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile sliding drawer — panel */}
      <aside className={`fixed top-0 right-0 bottom-0 z-50 w-72 lg:hidden bg-purple-950 overflow-y-auto flex flex-col gap-4 p-4 shadow-2xl transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}>
          {/* Logo card */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-center">
            <img src={neighborlyAppLogo} alt="Neighborly App" className="w-full h-auto object-contain" />
          </div>

          {/* Weather */}
          <WeatherCard locationName={browsingLocation} weather={weather} />

          {/* Local business feature */}
          <AdvertisingSidebarCard ad={activeAdvertisement} onAdvertise={() => setAdvertiseOpen(true)} />

          {isSiteAdmin && (
            <button onClick={() => { goToAdmin(); setSidebarOpen(false); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-800">
              <LayoutDashboard size={16} /> Admin Dashboard
            </button>
          )}

          <button onClick={() => { setFeedbackOpen(true); setSidebarOpen(false); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-300 bg-white px-4 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50">
            <MessageSquare size={16} /> Send Feedback
          </button>

          <CommunityGroupsCard
            groups={visibleGroups}
            loading={groupsLoading}
            error={groupsError}
            busyGroupId={groupActionBusyId}
            onToggleMembership={(group) => { void toggleJoinGroup(group); }}
            onCreate={() => setIsCreateGroupOpen(true)}
          />

          {/* Upcoming Events */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Upcoming Events</h3>
              <button className="text-xs text-blue-600 font-medium hover:underline">See all</button>
            </div>
            <div className="flex flex-col gap-3">
              {EVENTS.map((ev) => (
                <div key={ev.id} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-blue-600 flex-shrink-0">{ev.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ev.date} · {ev.time}</p>
                    <p className="text-xs text-muted-foreground">{ev.going} going</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Local Businesses */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Local Businesses</h3>
              <button className="text-xs text-blue-600 font-medium hover:underline">Browse</button>
            </div>
            <div className="flex flex-col gap-3">
              {BUSINESSES.map((biz) => (
                <button key={biz.id} onClick={() => { goToBusiness(biz.id); setSidebarOpen(false); }} className="flex items-start gap-2.5 w-full text-left group">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0"><Briefcase size={13} className="text-amber-700" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight group-hover:text-blue-600 transition-colors">{biz.name}</p>
                    <p className="text-xs text-muted-foreground">{biz.category}</p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground mt-1 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <ActiveNeighborsCard
            neighbors={visibleActiveNeighbors}
            loading={activeNeighborsLoading}
            busyNeighborId={activeNeighborBusyId}
            onOpenProfile={(neighbor) => {
              setSidebarOpen(false);
              void goToUser(neighbor.name, neighbor.id);
            }}
            onToggleFollow={(neighbor) => { void toggleActiveNeighborFollow(neighbor); }}
          />

          <p className="text-xs text-muted-foreground text-center px-2 pb-2">© 2026 Neighborly · Privacy · Terms · Help</p>
      </aside>

      {advertiseOpen && (
        <AdvertiseModal
          onClose={() => setAdvertiseOpen(false)}
          defaultBusinessName={currentBusiness?.name || ""}
          defaultWebsite={currentBusiness?.website || ""}
          defaultPhone={currentBusiness?.phone || ""}
          defaultCity={browsingLocation}
        />
      )}

      {feedbackOpen && (
        <FeedbackModal
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          senderName={currentAccountType === "business" ? currentBusiness?.name || currentProfile?.name || "Neighbor" : currentProfile?.name || "Neighbor"}
        />
      )}

      <CreateGroupDialog
        open={isCreateGroupOpen}
        areas={areaOptions}
        defaultAreaValue={activeLocation === "All Areas" ? homeArea : activeLocation}
        onOpenChange={setIsCreateGroupOpen}
        onCreate={createCommunityGroup}
      />

      {/* Fixed bottom nav — mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-purple-800 border-t border-purple-700 flex items-stretch h-16">
        {[
          { label: "Help Wanted", icon: <HandHeart size={20} />, action: () => setView({ page: "helpwanted" }), page: "helpwanted" },
          { label: "Search", icon: <Search size={20} />, action: () => setView({ page: "search" }), page: "search" },
          { label: "Post", icon: <Plus size={20} />, action: () => { goToFeed(); setPostCreateError(null); setComposing(true); }, page: null },
          { label: "Events", icon: <CalendarDays size={20} />, action: () => setView({ page: "events" }), page: "events" },
          { label: "Sell", icon: <ShoppingBag size={20} />, action: () => setView({ page: "classifieds" }), page: "classifieds" },
        ].map(({ label, icon, action, page }) => (
          <button
            key={label}
            onClick={action}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
              label === "Post"
                ? "bg-primary text-primary-foreground mx-3 my-2 rounded-xl"
                : view.page === page
                ? "text-white"
                : "text-purple-200 hover:text-white"
            }`}
          >
            {icon}
            {label !== "Post" && label}
          </button>
        ))}
    

      </div>
      <Analytics />
    </div>
  );
}
