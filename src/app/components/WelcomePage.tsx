import { ArrowRight, BadgeCheck, Briefcase, HandHeart, MapPin, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import neighborlyLogo from "@/imports/Copilot_20260807_041314.png";

const communityHighlights = [
  {
    icon: Users,
    title: "Connect with neighbors",
    description: "Share updates, ask questions, join groups, and get to know the people in your area.",
  },
  {
    icon: HandHeart,
    title: "Find and offer help",
    description: "Post help-wanted requests, discover community resources, and lend a hand when you can.",
  },
  {
    icon: Briefcase,
    title: "Support local businesses",
    description: "Discover nearby services, read profiles, and connect directly with trusted local owners.",
  },
];

const betaSteps = [
  ["1", "Request access", "Choose a personal or business account and create your Neighborly profile."],
  ["2", "Verify your email", "Use the secure email from Neighborly to confirm that the address belongs to you."],
  ["3", "Join the community", "After approval, sign in to post, message, follow neighbors, and explore your area."],
] as const;

export function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-slate-950 text-white font-['DM_Sans',sans-serif]">
      <header className="border-b border-white/10 bg-purple-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" aria-label="Neighborly welcome page" className="block w-36 sm:w-44">
            <ImageWithFallback src={neighborlyLogo} alt="Neighborly" className="h-auto w-full object-contain" />
          </Link>
          <nav className="flex items-center gap-2" aria-label="Welcome page navigation">
            <a href="#how-it-works" className="hidden px-3 py-2 text-sm font-medium text-purple-100 hover:text-white sm:inline-flex">
              How it works
            </a>
            <Link to="/sign-in" className="rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 sm:px-4">
              Sign In
            </Link>
            <Link to="/sign-up" className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-purple-900 shadow-sm hover:bg-purple-50 sm:px-4">
              Request Access
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-purple-300/30 bg-purple-300/10 px-3 py-1.5 text-xs font-semibold text-purple-100">
              <MapPin size={14} /> Beginning in Michigan City and nearby communities
            </div>
            <h1 className="max-w-3xl font-['Playfair_Display',serif] text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Neighbors helping neighbors starts here.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-purple-100 sm:text-lg">
              Neighborly is a welcoming local community where residents and businesses can connect, share what is happening, find help, and support the people around them.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/sign-up" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-semibold text-purple-900 shadow-lg shadow-black/15 hover:bg-purple-50">
                Request Beta Access <ArrowRight size={18} />
              </Link>
              <Link to="/sign-in" className="inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3.5 font-semibold text-white hover:bg-white/10">
                I Already Have an Account
              </Link>
            </div>
            <p className="mt-4 text-sm text-purple-200">Neighborly is invite-only while the community is being tested and improved.</p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/25 backdrop-blur sm:p-6" aria-label="Neighborly community preview">
            <div className="rounded-2xl bg-white p-5 text-slate-900 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">What’s happening nearby</p>
                  <h2 className="mt-1 text-xl font-bold">Your community, in one place</h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Local</span>
              </div>
              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700"><MessageCircle size={17} /></div>
                    <div><p className="text-sm font-semibold">Share and stay informed</p><p className="mt-1 text-xs leading-5 text-slate-600">Community posts, events, recommendations, photos, and neighborhood conversations.</p></div>
                  </div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"><HandHeart size={17} /></div>
                    <div><p className="text-sm font-semibold">Ask for help—or offer it</p><p className="mt-1 text-xs leading-5 text-slate-600">Make useful local connections while building a stronger, more supportive community.</p></div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-4 text-xs font-medium text-slate-600">
                <ShieldCheck size={16} className="text-emerald-600" /> Community guidelines and member approval help keep Neighborly welcoming.
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 text-slate-900">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-700">A place to belong locally</p>
              <h2 className="mt-3 font-['Playfair_Display',serif] text-3xl font-bold sm:text-4xl">Made for everyday community connections</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {communityHighlights.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><Icon size={22} /></div>
                  <h3 className="mt-4 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-purple-50 py-16 text-slate-900 scroll-mt-6">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-700">Invite-only beta</p>
              <h2 className="mt-3 font-['Playfair_Display',serif] text-3xl font-bold">Joining is simple</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">The approval step helps Neighborly grow carefully while the experience and safety tools are still being tested.</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {betaSteps.map(([number, title, description]) => (
                <article key={number} className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-700 text-sm font-bold text-white">{number}</span>
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16 text-slate-900">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 rounded-3xl bg-gradient-to-r from-purple-800 to-indigo-700 px-6 py-10 text-center text-white shadow-xl sm:px-10 md:flex-row md:text-left">
            <div>
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-purple-100 md:justify-start"><BadgeCheck size={18} /> Help shape Neighborly during beta</div>
              <h2 className="mt-2 font-['Playfair_Display',serif] text-3xl font-bold">Ready to meet your Neighborly community?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-purple-100">Create your profile, request access, and share feedback as Neighborly grows.</p>
            </div>
            <Link to="/sign-up" className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-purple-900 hover:bg-purple-50">
              Request Access <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-7 text-center text-xs text-purple-200">
        © 2026 Neighborly · Neighbors helping neighbors
      </footer>
    </div>
  );
}
