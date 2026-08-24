import React, { useState, useEffect, useRef } from "react";
import { Analytics } from "@vercel/analytics/react";
import { useLocation, useNavigate } from "react-router";
import { SettingsView } from "@/app/components/SettingsView";
import { supabase } from "@/lib/supabase";
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
  | { page: "search" }
  | { page: "events" }
  | { page: "classifieds" };

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
  authorAvatar?: string | null;
  likes: number;
  comments: Comment[];
  bookmarked: boolean;
  liked: boolean;
}

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
      const { data, error } = await supabase.from("posts").select("id, author_id, category, content, image_url, created_at").eq("author_id", ownerId).order("created_at", { ascending: false }).limit(50);
      if (!active) return;
      setItems(error ? [] : (data || [])); setLoading(false);
    })();
    return () => { active = false; };
  }, [profileName, profileType, profileOwnerId]);
  if (loading) return <div className="bg-white rounded-xl border border-border p-6 text-sm text-muted-foreground">Loading posts…</div>;
  if (!items.length) return <div className="bg-white rounded-xl border border-border p-6"><h3 className="font-semibold text-lg mb-2">Posts</h3><p className="text-sm text-muted-foreground">No posts from {profileName} yet.</p></div>;
  return <div className="space-y-4">{items.map((post:any) => <div key={post.id} className="bg-white rounded-xl border border-border p-4 sm:p-5"><div className="font-semibold mb-1">{profileName}</div><div className="text-xs text-muted-foreground mb-3">{new Date(post.created_at).toLocaleDateString()}</div><p className="text-sm sm:text-base whitespace-pre-wrap">{post.content}</p>{post.image_url && <img src={post.image_url} alt="Post" className="mt-3 w-full max-h-[480px] object-cover rounded-lg" />}</div>)}</div>;
}

function BusinessProfileView({
  biz,
  onBack,
  onUserClick,
  isOwnProfile = false,
  onLogoChange,
  onSettings,
}: {
  biz: Business;
  onBack: () => void;
  onUserClick: (name: string, authorId?: string) => void;
  isOwnProfile?: boolean;
  onLogoChange?: (url: string) => void;
  onSettings?: () => void;
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
            {isOwnProfile && onSettings && (
              <button onClick={onSettings} className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                ⚙️ Settings
              </button>
            )}
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
                <button className="flex flex-1 sm:flex-none justify-center items-center gap-1.5 border border-border bg-card px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors font-['DM_Sans',sans-serif]">
                  <MessageSquare size={13} /> Message
                </button>
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
                  <img
                    src={photo.url}
                    alt={photo.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
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
  isOwnProfile = false,
  myAvatarUrl = null,
  onAvatarChange,
  onSettings,
}: {
  profile: UserProfile;
  onBack: () => void;
  isOwnProfile?: boolean;
  myAvatarUrl?: string | null;
  onAvatarChange?: (url: string) => void;
  onSettings?: () => void;
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
          {isOwnProfile && onSettings && (
            <button onClick={onSettings} className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
              ⚙️ Settings
            </button>
          )}
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
                <button className={`flex items-center gap-1.5 ${T.btn} text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`}>
                  <Users size={13} /> Follow
                </button>
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
                  <img src={p.url} alt={p.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
  onBusinessClick,
  groups,
  activeLocation,
}: {
  onBack: () => void;
  onUserClick: (name: string, authorId?: string) => void;
  onBusinessClick: (id: number) => void;
  groups: { id: number; name: string; description: string; members: number; joined: boolean; city: string }[];
  activeLocation: LocationName;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "people" | "businesses" | "groups">("all");

  const q = query.toLowerCase().trim();
  const locFilter = (city: string) => activeLocation === "All Areas" || city === activeLocation;

  const matchedPeople = Object.values(USER_PROFILES).filter(
    (p) =>
      locFilter(p.city) &&
      (filter === "all" || filter === "people") &&
      (q === "" || p.name.toLowerCase().includes(q) || p.neighborhood.toLowerCase().includes(q)),
  );

  const matchedBusinesses = BUSINESSES.filter(
    (b) =>
      locFilter(b.city) &&
      (filter === "all" || filter === "businesses") &&
      (q === "" || b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q)),
  );

  const matchedGroups = groups.filter(
    (g) =>
      locFilter(g.city) &&
      (filter === "all" || filter === "groups") &&
      (q === "" || g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)),
  );

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
        {/* People */}
        {matchedPeople.length > 0 && (
          <section>
            {(filter === "all") && <h3 className="text-xs font-semibold uppercase tracking-wide text-purple-300 mb-2">People</h3>}
            <div className="flex flex-col gap-2">
              {matchedPeople.map((p) => (
                <button
                  key={p.name}
                  onClick={() => onUserClick(p.name)}
                  className="bg-card rounded-xl border border-border p-3 flex items-center gap-3 text-left hover:border-primary/30 transition-colors"
                >
                  <Avatar name={p.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.neighborhood} · {p.posts} posts</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Businesses */}
        {matchedBusinesses.length > 0 && (
          <section>
            {(filter === "all") && <h3 className="text-xs font-semibold uppercase tracking-wide text-purple-300 mb-2">Businesses</h3>}
            <div className="flex flex-col gap-2">
              {matchedBusinesses.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onBusinessClick(b.id)}
                  className="bg-card rounded-xl border border-border p-3 flex items-center gap-3 text-left hover:border-primary/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary text-primary flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    {b.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.category} · ⭐ {b.rating} ({b.reviewCount})</p>
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

        {q && matchedPeople.length === 0 && matchedBusinesses.length === 0 && matchedGroups.length === 0 && (
          <div className="text-center py-12">
            <Search size={32} className="text-purple-400 mx-auto mb-3" />
            <p className="text-purple-200 font-medium">No results for "{query}"</p>
            <p className="text-purple-400 text-sm mt-1">Try a different name or category</p>
          </div>
        )}

        {!q && (
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
  const visibleEvents = activeLocation === "All Areas" ? allEvents : allEvents.filter((e) => e.city === activeLocation);

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
          <span className="text-xs font-semibold uppercase tracking-wide text-purple-300 font-['DM_Sans',sans-serif]">{activeLocation}</span>
        </div>
      )}
      {visibleEvents.length === 0 && (
        <div className="text-center py-14 px-4">
          <CalendarDays size={32} className="text-purple-400 mx-auto mb-3" />
          <p className="text-purple-100 font-semibold font-['DM_Sans',sans-serif]">No events in {activeLocation}</p>
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

// ─── Classifieds View ─────────────────────────────────────────────────────────

function ClassifiedsView({
  posts,
  onBack,
  onUserClick,
  activeLocation,
}: {
  posts: Post[];
  onBack: () => void;
  onUserClick: (name: string, authorId?: string) => void;
  activeLocation: LocationName;
}) {
  const [search, setSearch] = useState("");
  const locationPosts = activeLocation === "All Areas" ? posts : posts.filter((p) => p.city === activeLocation);
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
                <img src={post.image} alt={post.title} className="w-full h-40 object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <button onClick={() => onUserClick(post.author, post.authorId)}>
                    <Avatar name={post.author} size="sm" src={post.authorAvatar || null} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => onUserClick(post.author, post.authorId)} className="font-semibold text-sm text-foreground hover:text-primary transition-colors">{post.author}</button>
                    <p className="text-xs text-muted-foreground">{post.neighborhood} · {post.time}</p>
                  </div>
                </div>
                {post.title && <p className="font-semibold text-foreground mt-2">{post.title}</p>}
                <p className="text-sm text-foreground/80 mt-1">{post.body}</p>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
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

// ─── Advertise Modal ─────────────────────────────────────────────────────────
function AdvertiseModal({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [pkg, setPkg] = useState("spotlight");

  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in-0 zoom-in-95" aria-describedby={undefined}>
          
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Dialog.Title className="font-semibold text-lg flex items-center gap-2">
              <Megaphone size={18} className="text-blue-600" /> Advertise With Us
            </Dialog.Title>
            <Dialog.Close onClick={onClose} className="text-muted-foreground hover:bg-muted p-1.5 rounded-lg transition-colors">
              <X size={16} />
            </Dialog.Close>
          </div>

          <div className="p-5">
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="font-semibold text-lg mb-2">Request Received!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Our team will review your ad request and reach out via email within 24 hours.
                </p>
                <button onClick={onClose} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  Done
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">Reach neighbors directly by promoting your local business on the Neighborly feed.</p>
                
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Select a Package</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setPkg("spotlight")}
                      className={`p-3 text-left border rounded-xl transition-colors ${pkg === "spotlight" ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-border hover:border-blue-600/40"}`}
                    >
                      <p className="font-semibold text-sm text-blue-700">Sidebar Spotlight</p>
                      <p className="text-xs text-muted-foreground mt-1">$15 / week</p>
                    </button>
                    <button 
                      onClick={() => setPkg("takeover")}
                      className={`p-3 text-left border rounded-xl transition-colors ${pkg === "takeover" ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500" : "border-border hover:border-amber-500/40"}`}
                    >
                      <p className="font-semibold text-sm text-amber-700">Feed Takeover</p>
                      <p className="text-xs text-muted-foreground mt-1">$30 / week</p>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 mt-2">
                  <input type="text" placeholder="Business Name" className="w-full bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent" />
                  <input type="text" placeholder="Headline (e.g., Grand Opening!)" className="w-full bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent" />
                  <textarea rows={2} placeholder="Ad description..." className="w-full bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent resize-none" />
                  <input type="url" placeholder="Website Link (Optional)" className="w-full bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent" />
                </div>

                <button 
                  onClick={() => setSubmitted(true)}
                  className="w-full mt-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Submit Ad Request
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

type ActiveTab = "all" | PostCategory;

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [newPostImagePreview, setNewPostImagePreview] = useState<string | null>(null);
  const postImageInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>("general");
  const [classifiedPosts, setClassifiedPosts] = useState<Post[]>(
    INITIAL_POSTS.filter((p) => p.category === "forsale"),
  );
  const [commentDraft, setCommentDraft] = useState<Record<number, string>>({});
  const [notifOpen, setNotifOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [view, setView] = useState<ActiveView>({ page: "feed" });
  const [advertiseOpen, setAdvertiseOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const postsLoadedRef = useRef(false);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [currentAccountType, setCurrentAccountType] = useState<"personal" | "business">("personal");
  const [authReady, setAuthReady] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [activeLocation, setActiveLocation] = useState<LocationName>("All Areas");
  const [locationOpen, setLocationOpen] = useState(false);
  const [groups, setGroups] = useState([
    { id: 1, name: "🪴 Plant & Garden Club", description: "Share tips, seeds, and local plant swaps", members: 142, joined: false, city: "Michigan City" },
    { id: 2, name: "🐾 Local Pet Owners", description: "Pet-friendly spots and vet recommendations", members: 98, joined: true, city: "Long Beach" },
    { id: 3, name: "🛠️ DIY & Handyman", description: "Home improvement tips from neighbors", members: 215, joined: false, city: "New Buffalo" },
    { id: 4, name: "📰 Local News Watch", description: "Breaking news and local updates for La Porte", members: 76, joined: false, city: "La Porte" },
  ]);

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
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", user.id),
    ]);

    const m = user.user_metadata || {};
    const accountType = (row?.account_type || m.account_type) === "business" ? "business" : "personal";
    setCurrentAccountType(accountType);

    const created = row?.created_at ? new Date(row.created_at) : new Date(user.created_at);
    const profile: UserProfile = {
      id: user.id,
      name: row?.full_name || m.full_name || user.email?.split("@")[0] || "Neighbor",
      neighborhood: row?.neighborhood || m.neighborhood || row?.city || m.city || "Your neighborhood",
      city: row?.city || m.city || "Michigan City",
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

    if (accountType === "business") {
      const { data: businessRow } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      const services = Array.isArray(businessRow?.services) ? businessRow.services : typeof businessRow?.services === "string" && businessRow.services.trim() ? businessRow.services.split(",").map((v: string) => v.trim()).filter(Boolean) : [];
      setCurrentBusiness({
        id: -1,
        name: businessRow?.business_name || m.business_name || profile.name,
        category: businessRow?.category || m.business_category || "Local Business",
        city: businessRow?.city || row?.city || m.city || "Michigan City",
        rating: 0, reviewCount: 0, badges: [],
        description: businessRow?.description || m.business_description || "",
        services, photos: [], phone: businessRow?.phone || m.business_phone || "", email: user.email || "",
        website: businessRow?.website || m.business_website || "",
        address: [businessRow?.neighborhood || row?.neighborhood || m.neighborhood, businessRow?.city || row?.city || m.city, businessRow?.zip_code || row?.zip_code || m.zip_code].filter(Boolean).join(", "),
        hours: [], founded: String(created.getFullYear()), owner: businessRow?.owner_name || profile.name, reviews: [],
      });
    } else setCurrentBusiness(null);

    if (row?.city && LOCATIONS.includes(row.city as LocationName)) setActiveLocation(row.city as LocationName);
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
        navigate("/sign-in", { replace: true });
      }
    });
    return () => { active = false; authListener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (location.pathname === "/settings") {
      setView({ page: "settings" });
    } else if (location.pathname === "/profile") {
      setView({ page: currentAccountType === "business" ? "my-business" : "me" });
    } else if (location.pathname === "/" && ["settings", "me", "my-business"].includes(view.page)) {
      setView({ page: "feed" });
    }
  }, [authReady, currentAccountType, location.pathname]);

  useEffect(() => {
    if (!authReady || postsLoadedRef.current) return;
    postsLoadedRef.current = true;
    (async () => {
      const { data: rows, error } = await supabase
        .from("posts")
        .select("id, author_id, category, content, image_url, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error || !rows?.length) return;

      const ids = [...new Set(rows.map((r: any) => r.author_id).filter(Boolean))];
      const [{ data: profileRows }, { data: businessRows }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, city, neighborhood, avatar_url, account_type").in("id", ids),
        supabase.from("business_profiles").select("user_id, business_name, city, neighborhood, logo_url").in("user_id", ids),
      ]);
      const profiles = new Map((profileRows || []).map((p: any) => [p.id, p]));
      const businesses = new Map((businessRows || []).map((b: any) => [b.user_id, b]));

      const loaded: Post[] = rows.map((r: any, index: number) => {
        const p: any = profiles.get(r.author_id);
        const b: any = businesses.get(r.author_id);
        const isBiz = p?.account_type === "business" || !!b;
        const created = new Date(r.created_at);
        return {
          id: created.getTime() + index,
          author: isBiz ? (b?.business_name || p?.full_name || "Local Business") : (p?.full_name || "Neighbor"),
          authorId: r.author_id,
          authorAvatar: isBiz ? (b?.logo_url || p?.avatar_url || null) : (p?.avatar_url || null),
          authorBadges: [],
          neighborhood: b?.neighborhood || p?.neighborhood || b?.city || p?.city || "Local Area",
          city: b?.city || p?.city || "Michigan City",
          time: created.toLocaleDateString() === new Date().toLocaleDateString() ? "Today" : created.toLocaleDateString(),
          category: (r.category || "general") as PostCategory,
          body: r.content,
          image: r.image_url || undefined,
          likes: 0, comments: [], bookmarked: false, liked: false,
        };
      });
      setPosts((prev) => [...loaded, ...prev.filter((p) => !loaded.some((d) => d.body === p.body && d.author === p.author))]);
    })();
  }, [authReady]);

  function toggleJoinGroup(id: number) {
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, joined: !g.joined } : g));
  }

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
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", row.id),
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

  if (!authReady) return <div className="min-h-screen bg-purple-950 flex items-center justify-center text-white">Loading your Neighborly profile…</div>;

  if (view.page === "settings") return <SettingsView onBack={goToFeed} />;
  if (view.page === "me" && currentProfile) return (
    <UserProfileView profile={currentProfile} onBack={goToFeed} isOwnProfile myAvatarUrl={myAvatarUrl} onAvatarChange={setMyAvatarUrl} onSettings={goToSettings} />
  );
  if (view.page === "my-business" && currentBusiness) return (
    <BusinessProfileView biz={currentBusiness} onBack={goToFeed} onUserClick={goToUser} isOwnProfile onLogoChange={setMyAvatarUrl} onSettings={goToSettings} />
  );
  if (view.page === "saved-business") return (
    <BusinessProfileView
      biz={view.business}
      onBack={goToFeed}
      onUserClick={goToUser}
    />
  );
  if (view.page === "business") {
    const biz = BUSINESSES.find((b) => b.id === view.id);
    if (biz)
      return (
        <BusinessProfileView
          biz={biz}
          onBack={goToFeed}
          onUserClick={goToUser}
        />
      );
  }
  if (view.page === "user") {
    return (
      <UserProfileView
        key={view.profile.id || view.profile.name}
        profile={view.profile}
        onBack={goToFeed}
      />
    );
  }

  if (view.page === "search") {
    return (
      <SearchView
        onBack={goToFeed}
        onUserClick={goToUser}
        onBusinessClick={(id) => setView({ page: "business", id })}
        groups={groups}
        activeLocation={activeLocation}
      />
    );
  }

  if (view.page === "events") {
    return <EventsView onBack={goToFeed} activeLocation={activeLocation} />;
  }

  if (view.page === "classifieds") {
    return (
      <ClassifiedsView
        posts={classifiedPosts}
        onBack={goToFeed}
        onUserClick={goToUser}
        activeLocation={activeLocation}
      />
    );
  }

  const locationFilteredPosts =
    activeLocation === "All Areas"
      ? posts
      : posts.filter((p) => p.city === activeLocation);

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
    const text = newPostText.trim();
    if (!text && !newPostImage) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let imageUrl: string | null = null;
    if (newPostImage) {
      const ext=(newPostImage.name.split(".").pop() || "jpg").toLowerCase();
      const path=user.id+"/posts/"+Date.now()+"-"+Math.random().toString(36).slice(2)+"."+ext;
      const { error: uploadError } = await supabase.storage.from("neighborly-media").upload(path,newPostImage,{ upsert:false, contentType:newPostImage.type || undefined });
      if (uploadError) { console.error("Could not upload post photo",uploadError); return; }
      const { data: publicData } = supabase.storage.from("neighborly-media").getPublicUrl(path);
      imageUrl=publicData.publicUrl;
    }

    const postCity = activeLocation === "All Areas" ? (currentBusiness?.city || currentProfile?.city || "Michigan City") : activeLocation;
    const postType = selectedCategory === "safety" ? "alert" : selectedCategory === "recommendation" ? "recommendation" : selectedCategory === "helpwanted" ? "help_wanted" : "discussion";
    const { data: saved, error } = await supabase.from("posts").insert({ author_id:user.id, post_type:postType, category:selectedCategory, content:text, image_url:imageUrl }).select("id, created_at").single();
    if (error) { console.error("Could not save post",error); return; }

    const authorName=currentAccountType === "business" ? (currentBusiness?.name || "Business") : (currentProfile?.name || "You");
    const newPost: Post={ id:new Date(saved.created_at).getTime(), author:authorName, authorId:user.id, authorAvatar:myAvatarUrl, authorBadges:[], neighborhood:postCity, city:postCity, time:"Just now", category:selectedCategory, body:text, image:imageUrl || undefined, likes:0, comments:[], bookmarked:false, liked:false };
    setPosts(prev=>[newPost,...prev]);
    if(selectedCategory === "forsale") setClassifiedPosts(prev=>[newPost,...prev]);
    setNewPostText(""); setSelectedCategory("general"); setComposing(false);
    if(newPostImagePreview) URL.revokeObjectURL(newPostImagePreview);
    setNewPostImage(null); setNewPostImagePreview(null); if(postImageInputRef.current) postImageInputRef.current.value="";
  }
  function submitComment(postId: number) {
    const text = (commentDraft[postId] || "").trim();
    if (!text) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [
                ...p.comments,
                {
                  id: Date.now(),
                  author: "You",
                  authorBadges: [],
                  body: text,
                  time: "Just now",
                  likes: 0,
                },
              ],
            }
          : p,
      ),
    );
    setCommentDraft((prev) => ({ ...prev, [postId]: "" }));
  }

  return (
    <div className="min-h-screen bg-purple-950 font-['DM_Sans',sans-serif] relative">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center gap-4">

          {/* Neighborly wordmark */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <span className="font-['Playfair_Display',serif] font-bold text-2xl bg-gradient-to-r from-purple-700 to-blue-500 bg-clip-text text-transparent tracking-tight leading-none">Neighborly</span>
          </div>

          {/* Location switcher */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setLocationOpen((o) => !o)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors font-['DM_Sans',sans-serif]"
            >
              <MapPin size={14} className="text-primary" />
              <span className="font-medium">{activeLocation}</span>
              <ChevronDown size={13} className={`transition-transform ${locationOpen ? "rotate-180" : ""}`} />
            </button>
            {locationOpen && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <p className="px-3 pt-2.5 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground font-['DM_Sans',sans-serif]">Choose Area</p>
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => { setActiveLocation(loc); setLocationOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors font-['DM_Sans',sans-serif] ${
                      activeLocation === loc
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <MapPin size={13} className={activeLocation === loc ? "text-primary" : "text-muted-foreground"} />
                    {loc}
                    {activeLocation === loc && <CheckCircle2 size={13} className="ml-auto text-primary" />}
                  </button>
                ))}
              </div>
            )}
            {locationOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setLocationOpen(false)} />
            )}
          </div>

          {/* Desktop nav — center */}
          <nav className="hidden lg:flex items-center gap-1 mx-auto">
            {[
              { icon: <Home size={16} />, label: "Home", page: "feed" as const },
              { icon: <CalendarDays size={16} />, label: "Events", page: "events" as const },
              { icon: <Briefcase size={16} />, label: "Businesses", page: "feed" as const },
              { icon: <ShoppingBag size={16} />, label: "Classifieds", page: "classifieds" as const },
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
            <button
              onClick={() => { setMessagesOpen(!messagesOpen); setNotifOpen(false); }}
              className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Messages"
              title="Messages"
            >
              <MessageSquare size={18} />
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full flex items-center justify-center">2</span>
            </button>
            <button
              onClick={() => { setNotifOpen(!notifOpen); setMessagesOpen(false); }}
              className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full border-2 border-white" />
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
            className="absolute top-14 right-4 w-80 bg-white rounded-xl shadow-2xl border border-border overflow-hidden"
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
            {[
              {
                msg: "James liked your comment on the cleanup post",
                time: "5m ago",
                unread: true,
              },
              {
                msg: "Priya commented on a Safety post you follow",
                time: "1h ago",
                unread: true,
              },
            ].map((n, i) => (
              <div
                key={i}
                className={`px-4 py-3 flex gap-3 items-start hover:bg-secondary/50 cursor-pointer transition-colors ${n.unread ? "bg-blue-50/60" : ""}`}
              >
                {n.unread && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm">{n.msg}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {messagesOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setMessagesOpen(false)}>
          <div
            className="absolute top-14 right-4 w-[min(24rem,calc(100vw-2rem))] bg-white rounded-xl shadow-2xl border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-primary" />
                <h3 className="font-semibold text-sm">Messages</h3>
              </div>
              <button
                onClick={() => setMessagesOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close messages"
              >
                <X size={15} />
              </button>
            </div>
            {[
              { name: "James Whitfield", preview: "Sounds good — Saturday works for me.", time: "5m", unread: true },
              { name: "Grace Okonkwo", preview: "Thanks for the recommendation!", time: "1h", unread: true },
              { name: "Nadia Petrov", preview: "I sent you the event details.", time: "Yesterday", unread: false },
            ].map((m) => (
              <button
                key={m.name}
                className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-secondary/50 transition-colors ${m.unread ? "bg-blue-50/60" : ""}`}
              >
                <Avatar name={m.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{m.name}</p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{m.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{m.preview}</p>
                </div>
                {m.unread && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
              </button>
            ))}
            <div className="p-3 border-t border-border bg-muted/30">
              <button className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                Open Messages
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-screen-2xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        
        {/* Feed */}
        <section className="flex flex-col gap-4 min-w-0">
          {!composing ? (
            <div
              className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setComposing(true)}
            >
              <Avatar name={currentAccountType === "business" ? (currentBusiness?.name || "Business") : (currentProfile?.name || "Neighbor")} size="md" src={myAvatarUrl} />
              <div className="flex-1 bg-muted rounded-lg px-4 py-2.5 text-sm text-muted-foreground font-['DM_Sans',sans-serif]">
                What's happening in Maplewood Heights?
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
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setComposing(false);
                          setNewPostText("");
                          setSelectedCategory("general");
                          if (newPostImagePreview) URL.revokeObjectURL(newPostImagePreview);
                          setNewPostImage(null);
                          setNewPostImagePreview(null);
                          if (postImageInputRef.current) postImageInputRef.current.value = "";
                        }}
                        className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-['DM_Sans',sans-serif]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreatePost}
                        disabled={!newPostText.trim() && !newPostImage}
                        className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 font-['DM_Sans',sans-serif]"
                      >
                        Post
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
              <p className="text-purple-100 font-semibold font-['DM_Sans',sans-serif]">No posts in {activeLocation}</p>
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
                        onClick={() => goToUser(post.author, post.authorId)}
                      >
                        <Avatar name={post.author} size="md" src={post.authorAvatar || (post.author === (currentAccountType === "business" ? currentBusiness?.name : currentProfile?.name) ? myAvatarUrl : null)} />
                      </button>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() =>
                              goToUser(post.author, post.authorId)
                            }
                            className="font-semibold text-sm hover:text-blue-600 transition-colors"
                          >
                            {post.author}
                          </button>
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
                    <button className="text-muted-foreground hover:text-foreground p-1 rounded">
                      <MoreHorizontal size={16} />
                    </button>
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
                  <div className="bg-muted">
                    <img
                      src={post.image}
                      alt={post.title || "Post image"}
                      className="w-full object-cover max-h-64"
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

                <div className="px-4 pb-3 flex items-center gap-1 border-t border-border pt-2">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${post.liked ? "bg-blue-600/10 text-blue-600" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  >
                    <Heart
                      size={14}
                      className={
                        post.liked
                          ? "fill-blue-600 text-blue-600"
                          : ""
                      }
                    />
                    {post.liked ? "Liked" : "Like"}
                  </button>
                  <button
                    onClick={() =>
                      setExpandedPost(expanded ? null : post.id)
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex-1 justify-center"
                  >
                    <MessageCircle size={14} />
                    Comment
                  </button>
                  <button
                    onClick={() => toggleBookmark(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${post.bookmarked ? "bg-amber-50 text-amber-700" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  >
                    <Bookmark
                      size={14}
                      className={
                        post.bookmarked
                          ? "fill-amber-600 text-amber-600"
                          : ""
                      }
                    />
                    Save
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex-1 justify-center">
                    <Share2 size={14} />
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
                            onClick={() => goToUser(c.author)}
                          >
                            <Avatar name={c.author} size="sm" />
                          </button>
                          <div className="flex-1 bg-card rounded-lg px-3 py-2 border border-border">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() =>
                                  goToUser(c.author)
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
                            <p className="text-sm text-foreground/85 mt-0.5">
                              {c.body}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2.5 items-center">
                      <Avatar name="Maria Santos" size="sm" src={myAvatarUrl} />
                      <div className="flex-1 flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2 focus-within:border-blue-600/40 transition-colors">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentDraft[post.id] || ""}
                          onChange={(e) =>
                            setCommentDraft((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            submitComment(post.id)
                          }
                          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                        />
                        <button
                          onClick={() => submitComment(post.id)}
                          className="text-blue-600 hover:text-blue-600/70 transition-colors"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </article>
              </React.Fragment>
            );
          })}
        </section>

        {/* Desktop sidebar — always visible on lg+ */}
        <aside className="hidden lg:flex flex-col gap-4 self-start sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto pb-6">

            {/* Logo card */}
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
                <button
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold px-2.5 py-1 rounded-lg transition-colors"
                >
                  + Create
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {(activeLocation === "All Areas" ? groups : groups.filter(g => g.city === activeLocation)).map((group) => (
                  <div key={group.id} className="p-2.5 rounded-lg border border-border/60 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold truncate flex-1 mr-2">{group.name}</span>
                      <button
                        onClick={() => toggleJoinGroup(group.id)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors flex-shrink-0 ${group.joined ? "bg-secondary text-muted-foreground hover:bg-secondary/80" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                      >
                        {group.joined ? "Joined" : "Join"}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{group.description}</p>
                    <span className="text-[10px] text-muted-foreground">{group.members} members</span>
                  </div>
                ))}
              </div>
            </div>

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

            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Active Neighbors</h3>
                <button className="text-xs text-blue-600 font-medium hover:underline">View all</button>
              </div>
              <div className="flex flex-col gap-2.5">
                {(["Nadia Petrov", "James Whitfield", "Grace Okonkwo"] as const).map((name) => {
                  return (
                    <div key={name} className="flex items-center gap-2.5">
                      <button onClick={() => goToUser(name)}><Avatar name={name} size="sm" /></button>
                      <div className="flex-1 min-w-0">
                        <button onClick={() => goToUser(name)} className="text-sm font-medium leading-tight hover:text-blue-600 transition-colors block">{name}</button>
                      </div>
                      <button className="text-xs text-blue-600 border border-blue-600/30 rounded-full px-2 py-0.5 hover:bg-secondary transition-colors flex-shrink-0">Follow</button>
                    </div>
                  );
                })}
              </div>
            </div>

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
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Local Weather</h3>
              <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded">Maplewood Hts</span>
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-2xl font-bold">74°F</p><p className="text-xs text-muted-foreground">Partly Cloudy</p></div>
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">🌤️</div>
            </div>
          </div>

          {/* Grow Your Business */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 text-white shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone size={16} className="text-blue-200" />
              <h3 className="font-semibold text-sm">Grow Your Business</h3>
            </div>
            <p className="text-xs text-blue-100 mb-3 leading-relaxed">
              Reach thousands of neighbors directly in the feed. Packages start at just $15/week.
            </p>
            <button onClick={() => setAdvertiseOpen(true)} className="w-full bg-white text-blue-700 font-semibold text-sm py-2 rounded-lg hover:bg-blue-50 transition-colors shadow-sm">
              Advertise With Us
            </button>
          </div>  

          {/* Community Groups */}
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Community Groups</h3>
              <button onClick={() => setIsCreateGroupOpen(true)} className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold px-2.5 py-1 rounded-lg transition-colors">+ Create</button>
            </div>
            <div className="flex flex-col gap-2">
              {(activeLocation === "All Areas" ? groups : groups.filter(g => g.city === activeLocation)).map((group) => (
                <div key={group.id} className="p-2.5 rounded-lg border border-border/60 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold truncate flex-1 mr-2">{group.name}</span>
                    <button onClick={() => toggleJoinGroup(group.id)} className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors flex-shrink-0 ${group.joined ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>{group.joined ? "Joined" : "Join"}</button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{group.description}</p>
                  <span className="text-[10px] text-muted-foreground">{group.members} members</span>
                </div>
              ))}
            </div>
          </div>

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

          {/* Active Neighbors */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Active Neighbors</h3>
            </div>
            <div className="flex flex-col gap-2.5">
              {(["Nadia Petrov", "James Whitfield", "Grace Okonkwo"] as const).map((name) => {
                return (
                  <div key={name} className="flex items-center gap-2.5">
                    <button onClick={() => { goToUser(name); setSidebarOpen(false); }}><Avatar name={name} size="sm" /></button>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => { goToUser(name); setSidebarOpen(false); }} className="text-sm font-medium leading-tight hover:text-blue-600 transition-colors block">{name}</button>
                    </div>
                    <button className="text-xs text-blue-600 border border-blue-600/30 rounded-full px-2 py-0.5 hover:bg-secondary transition-colors flex-shrink-0">Follow</button>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center px-2 pb-2">© 2026 Neighborly · Privacy · Terms · Help</p>
      </aside>

      {advertiseOpen && <AdvertiseModal onClose={() => setAdvertiseOpen(false)} />}

      {/* Fixed bottom nav — mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-purple-800 border-t border-purple-700 flex items-stretch h-16">
        {[
          { label: "Home", icon: <Home size={20} />, action: goToFeed, page: "feed" },
          { label: "Search", icon: <Search size={20} />, action: () => setView({ page: "search" }), page: "search" },
          { label: "Post", icon: <Plus size={20} />, action: () => { goToFeed(); setComposing(true); }, page: null },
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
