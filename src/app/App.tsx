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

type PostCategory =
  | "news"
  | "safety"
  | "event"
  | "forsale"
  | "recommendation"
  | "general";
type ActiveView =
  | { page: "feed" }
  | { page: "business"; id: number }
  | { page: "user"; name: string }
  | { page: "auth"; mode: "signin" | "signup" }
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
  onSuccess: (name: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"person" | "business">("person");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [privateAddress, setPrivateAddress] = useState("");
  
  // Business fields
  const [businessName, setBusinessName] = useState("");
  const [aboutUs, setAboutUs] = useState("");
  const [servicesProvided, setServicesProvided] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [publishPhone, setPublishPhone] = useState(true);
  const [businessAddress, setBusinessAddress] = useState("");
  const [publishAddress, setPublishAddress] = useState(true);
  const [businessEmail, setBusinessEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [stateLicense, setStateLicense] = useState("");
  const [contractorLicense, setContractorLicense] = useState("");
  const [businessHours, setBusinessHours] = useState("");

  const handleSubmit = () => {
    const displayName = fullName.trim() || businessName.trim() || username.trim() || email.split("@")[0] || "Ashlie Wyse";
    onSuccess(displayName);
  };

  return (
    <div className="min-h-screen bg-purple-950 flex items-center justify-center p-4 font-['DM_Sans',sans-serif] overflow-y-auto py-10">
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
              ? "Sign in with your email to connect with your community"
              : "Create a personal or business profile"}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {mode === "signup" && (
            <div className="mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                Account Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType("person")}
                  className={`flex-1 py-2 text-sm rounded-lg font-medium border transition-colors ${
                    accountType === "person"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                  }`}
                >
                  Personal Profile
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("business")}
                  className={`flex-1 py-2 text-sm rounded-lg font-medium border transition-colors ${
                    accountType === "business"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                  }`}
                >
                  Business Profile
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
              Email (Login)
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

          {mode === "signup" && (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                  Username (Display Name Option)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ashlie_wyse"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-muted rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent focus:border-blue-600/20"
                />
              </div>

              {accountType === "person" ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="Ashlie Wyse"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-muted rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent focus:border-blue-600/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                      Home Address <span className="text-[10px] text-amber-600 font-normal">(Private — system placement only)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="123 Maple St, Michigan City"
                      value={privateAddress}
                      onChange={(e) => setPrivateAddress(e.target.value)}
                      className="w-full bg-muted rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent focus:border-blue-600/20"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      placeholder="Beachside Cleaners"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full bg-muted rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent focus:border-blue-600/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                      About Us
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Tell neighbors about your business..."
                      value={aboutUs}
                      onChange={(e) => setAboutUs(e.target.value)}
                      className="w-full bg-muted rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent focus:border-blue-600/20 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                      Services Provided
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Residential & Commercial Cleaning"
                      value={servicesProvided}
                      onChange={(e) => setServicesProvided(e.target.value)}
                      className="w-full bg-muted rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/30 border border-transparent focus:border-blue-600/20"
                    />
                  </div>
                </>
              )}
            </>
          )}

          <button
            onClick={handleSubmit}
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

function BusinessProfileView({
  biz,
  onBack,
  onUserClick,
}: {
  biz: Business;
  onBack: () => void;
  onUserClick: (name: string) => void;
}) {
  const [tab, setTab] = useState<
    "about" | "services" | "photos" | "contact" | "reviews"
  >("about");
  const [photosExpanded, setPhotosExpanded] = useState(false);
  const [reviewHelpful, setReviewHelpful] = useState<
    Record<number, boolean>
  >({});

  const visiblePhotos = photosExpanded
    ? biz.photos
    : biz.photos.slice(0, 4);

  return (
    <div className="min-h-screen bg-purple-950">
      <div className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors py-4 font-['DM_Sans',sans-serif]"
          >
            <ChevronLeft size={16} /> Back to feed
          </button>

          <div className="pb-0">
            <div className="flex items-end gap-4 pb-4">
              <div className="w-20 h-20 rounded-2xl bg-card border-4 border-card shadow-md flex items-center justify-center text-primary flex-shrink-0">
                <Briefcase size={28} />
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
              <div className="flex gap-2 pb-1 flex-shrink-0">
                <a
                  href={`tel:${biz.phone}`}
                  className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity font-['DM_Sans',sans-serif]"
                >
                  <Phone size={13} /> Call
                </a>
                <button className="flex items-center gap-1.5 border border-border bg-card px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors font-['DM_Sans',sans-serif]">
                  <MessageSquare size={13} /> Message
                </button>
              </div>
            </div>
          </div>

          <div className="flex border-t border-border">
            {(
              [
                "about",
                "services",
                "photos",
                "contact",
                "reviews",
              ] as const
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
                    ? `Photos (${biz.photos.length})`
                    : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── User Profile ─────────────────────────────────────────────────────────────

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
              <div className="absolute inset-0 border-2 border-white/70 rounded-xl pointer-events-none" />
            </div>

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
          </div>

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

const PROFILE_THEMES = {
  "Classic Blue":   { cover: "from-blue-700 to-blue-400",     btn: "bg-blue-600 hover:bg-blue-700",       accent: "text-blue-600",   bar: "bg-blue-600",    scrollbarColor: "#2563eb", tint: "bg-blue-50"    },
  "Ocean Breeze":   { cover: "from-cyan-700 to-teal-400",     btn: "bg-teal-600 hover:bg-teal-700",       accent: "text-teal-600",   bar: "bg-teal-600",    scrollbarColor: "#0d9488", tint: "bg-teal-50"    },
  "Sunset Glow":    { cover: "from-orange-500 to-rose-400",   btn: "bg-orange-500 hover:bg-orange-600",   accent: "text-orange-500", bar: "bg-orange-500",  scrollbarColor: "#f97316", tint: "bg-orange-50"  },
  "Emerald Forest": { cover: "from-emerald-800 to-green-500", btn: "bg-emerald-700 hover:bg-emerald-800", accent: "text-emerald-700",bar: "bg-emerald-700", scrollbarColor: "#059669", tint: "bg-emerald-50" },
  "Royal Purple":   { cover: "from-purple-800 to-violet-500", btn: "bg-purple-700 hover:bg-purple-800",   accent: "text-purple-700", bar: "bg-purple-700",  scrollbarColor: "#7c3aed", tint: "bg-purple-50"  },
  "Midnight Dark":  { cover: "from-slate-900 to-slate-600",   btn: "bg-slate-700 hover:bg-slate-800",     accent: "text-slate-700",  bar: "bg-slate-700",   scrollbarColor: "#475569", tint: "bg-slate-100"  },
} as const;
type ThemeName = keyof typeof PROFILE_THEMES;

function UserProfileView({
  profile,
  onBack,
  isOwnProfile = false,
  myAvatarUrl = null,
  onAvatarChange,
  onProfileUpdate,
}: {
  profile: UserProfile;
  onBack: () => void;
  isOwnProfile?: boolean;
  myAvatarUrl?: string | null;
  onAvatarChange?: (url: string) => void;
  onProfileUpdate?: (updated: Partial<UserProfile>) => void;
}) {
  const [tab, setTab] = useState<"about" | "photos" | "reviews">("about");
  const [theme, setTheme] = useState<ThemeName>("Classic Blue");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(myAvatarUrl);
  const [gallery, setGallery] = useState(profile.galleryPhotos);
  const [reviews, setReviews] = useState<NeighborReview[]>(profile.neighborReviews);
  const [hoverStar, setHoverStar] = useState(0);
  const [pickedStar, setPickedStar] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState<"avatar" | "cover">("avatar");

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editNeighborhood, setEditNeighborhood] = useState(profile.neighborhood);
  const [editBio, setEditBio] = useState(profile.bio);

  const T = PROFILE_THEMES[theme];

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
    if (f && isOwnProfile) { openCrop(f, "cover"); e.target.value = ""; }
  }
  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && isOwnProfile) { openCrop(f, "avatar"); e.target.value = ""; }
  }
  function applyAvatar(url: string) {
    setAvatarUrl(url);
    onAvatarChange?.(url);
  }
  function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files || []).forEach((f) => {
      setGallery((prev) => [
        ...prev,
        { url: URL.createObjectURL(f), alt: f.name },
      ]);
    });
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

  function handleSaveProfile() {
    onProfileUpdate?.({
      name: editName,
      neighborhood: editNeighborhood,
      bio: editBio,
    });
    setIsEditing(false);
  }

  return (
    <div className="min-h-screen bg-background">
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

            <div className="flex items-center gap-2 mt-12 flex-shrink-0">
              {isOwnProfile && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 border border-border bg-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-muted transition-colors"
                >
                  Edit Profile
                </button>
              )}
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
                          onClick={() => { setTheme(t); setThemeOpen(false); }}
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
            </div>
          </div>

          <div className="pb-3">
            {isEditing ? (
              <div className="flex flex-col gap-2 max-w-sm mt-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Full Name"
                  className="bg-white border border-border rounded-lg px-3 py-1.5 text-sm font-medium"
                />
                <input
                  type="text"
                  value={editNeighborhood}
                  onChange={(e) => setEditNeighborhood(e.target.value)}
                  placeholder="Neighborhood / City"
                  className="bg-white border border-border rounded-lg px-3 py-1.5 text-sm"
                />
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={handleSaveProfile}
                    className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 border border-border rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          <div className="flex border-t border-border">
            {(["about", "photos", "reviews"] as const).map((t) => (
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

      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {tab === "about" && (
          <div className="bg-white rounded-xl border border-border p-5">
            <h2 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${T.accent}`}>
              <Smile size={14} /> About
            </h2>
            {isEditing ? (
              <textarea
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Write your bio..."
                className="w-full bg-muted border border-border rounded-lg p-2.5 text-sm resize-none"
              />
            ) : (
              <p className="text-sm text-foreground/80 leading-relaxed">{profile.bio || "No bio yet."}</p>
            )}
          </div>
        )}
      </div>

      {cropSrc && (
        <CropModal
          src={cropSrc}
          mode={cropMode}
          onApply={(url) => {
            if (cropMode === "avatar") applyAvatar(url);
            else setCoverUrl(url);
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
  onUserClick: (name: string) => void;
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
        </div>
      </div>
    </div>
  );
}

// ─── Events View ──────────────────────────────────────────────────────────────

function EventsView({ onBack, activeLocation }: { onBack: () => void; activeLocation: LocationName }) {
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
  onUserClick: (name: string) => void;
  activeLocation: LocationName;
}) {
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
      </div>
    </div>
  );
}

// ─── Advertise Modal ─────────────────────────────────────────────────────────
function AdvertiseModal({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" aria-describedby={undefined}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Dialog.Title className="font-semibold text-lg flex items-center gap-2">
              <Megaphone size={18} className="text-blue-600" /> Advertise With Us
            </Dialog.Title>
            <Dialog.Close onClick={onClose} className="text-muted-foreground hover:bg-muted p-1.5 rounded-lg transition-colors">
              <X size={16} />
            </Dialog.Close>
          </div>
          <div className="p-5">
            <button onClick={() => setSubmitted(true)} className="w-full mt-2 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Submit Ad Request
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

type ActiveTab = "all" | PostCategory;

export default function App() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>("general");
  const [classifiedPosts, setClassifiedPosts] = useState<Post[]>(
    INITIAL_POSTS.filter((p) => p.category === "forsale"),
  );
  const [commentDraft, setCommentDraft] = useState<Record<number, string>>({});
  const [notifOpen, setNotifOpen] = useState(false);
  const [view, setView] = useState<ActiveView>({
    page: "auth",
    mode: "signin",
  });
  const [advertiseOpen, setAdvertiseOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [activeLocation, setActiveLocation] = useState<LocationName>("All Areas");
  const [locationOpen, setLocationOpen] = useState(false);
  
  // Track the logged-in user dynamically instead of hardcoding Maria Santos
  const [currentUserName, setCurrentUserName] = useState<string>("Ashlie Wyse");

  const [groups, setGroups] = useState([
    { id: 1, name: "🪴 Plant & Garden Club", description: "Share tips, seeds, and local plant swaps", members: 142, joined: false, city: "Michigan City" },
    { id: 2, name: "🐾 Local Pet Owners", description: "Pet-friendly spots and vet recommendations", members: 98, joined: true, city: "Long Beach" },
    { id: 3, name: "🛠️ DIY & Handyman", description: "Home improvement tips from neighbors", members: 215, joined: false, city: "New Buffalo" },
    { id: 4, name: "📰 Local News Watch", description: "Breaking news and local updates for La Porte", members: 76, joined: false, city: "La Porte" },
  ]);

  function toggleJoinGroup(id: number) {
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, joined: !g.joined } : g));
  }

  function goToBusiness(id: number) {
    setView({ page: "business", id });
    setNotifOpen(false);
  }
  function goToUser(name: string) {
    if (USER_PROFILES[name]) setView({ page: "user", name });
  }
  function goToFeed() {
    setView({ page: "feed" });
  }

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
    const profile = USER_PROFILES[view.name];
    if (profile)
      return (
        <UserProfileView
          profile={profile}
          onBack={goToFeed}
          isOwnProfile={view.name === currentUserName}
          myAvatarUrl={view.name === currentUserName ? myAvatarUrl : null}
          onAvatarChange={view.name === currentUserName ? setMyAvatarUrl : undefined}
        />
      );
  }

  if (view.page === "search") {
    return (
      <SearchView
        onBack={goToFeed}
        onUserClick={(name) => { if (USER_PROFILES[name]) setView({ page: "user", name }); }}
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
        onUserClick={(name) => { if (USER_PROFILES[name]) setView({ page: "user", name }); }}
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

  function handleCreatePost() {
    const text = newPostText.trim();
    if (!text) return;

    const postCity = activeLocation === "All Areas" ? "Michigan City" : activeLocation;
    const newPost: Post = {
      id: Date.now(),
      author: currentUserName, // Dynamically uses logged-in user
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

    setPosts((prev) => [newPost, ...prev]);

    if (selectedCategory === "forsale") {
      setClassifiedPosts((prev) => [newPost, ...prev]);
    }

    setNewPostText("");
    setSelectedCategory("general");
    setComposing(false);
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
                  author: currentUserName, // Dynamically uses logged-in user
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
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center gap-4">
          <div className="flex-shrink-0 flex items-center gap-2">
            <span className="font-['Playfair_Display',serif] font-bold text-2xl bg-gradient-to-r from-purple-700 to-blue-500 bg-clip-text text-transparent tracking-tight leading-none">Neighborly</span>
          </div>

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
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <button onClick={() => goToUser(currentUserName)}>
              <Avatar name={currentUserName} size="sm" src={myAvatarUrl} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <section className="flex flex-col gap-4 min-w-0">
          {!composing ? (
            <div
              className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setComposing(true)}
            >
              <Avatar name={currentUserName} size="md" src={myAvatarUrl} />
              <div className="flex-1 bg-muted rounded-lg px-4 py-2.5 text-sm text-muted-foreground font-['DM_Sans',sans-serif]">
                What's happening in your neighborhood?
              </div>
              <button className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                <Plus size={14} /> Post
              </button>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-primary/30 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Avatar name={currentUserName} size="md" src={myAvatarUrl} />
                <div className="flex-1">
                  <textarea
                    autoFocus
                    placeholder="Share something with your neighbors..."
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none min-h-[80px]"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setComposing(false)} className="px-3 py-1.5 text-sm text-muted-foreground">Cancel</button>
                    <button onClick={handleCreatePost} className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Post</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {filteredPosts.map((post) => (
            <article key={post.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <button onClick={() => goToUser(post.author)}><Avatar name={post.author} size="md" /></button>
                <div>
                  <button onClick={() => goToUser(post.author)} className="font-semibold text-sm">{post.author}</button>
                  <p className="text-xs text-muted-foreground">{post.neighborhood} · {post.time}</p>
                </div>
              </div>
              <p className="text-sm text-foreground/85 mt-3">{post.body}</p>
            </article>
          ))}
        </section>

        <aside className="hidden lg:flex flex-col gap-4 self-start sticky top-14">
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-center">
            <img src={neighborlyAppLogo} alt="Neighborly App" className="w-full h-auto object-contain" />
          </div>
        </aside>
      </main>
    </div>
  );
}