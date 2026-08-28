import React from "react";
import { Award, CalendarCheck, HandHeart, Leaf, Shield, ShieldCheck } from "lucide-react";

const RULES = [
  {
    title: "Treat your neighbors with respect",
    body: "Disagreements are allowed, but harassment, bullying, threats, personal attacks, hate speech, or intentionally humiliating another member are not allowed.",
  },
  {
    title: "Keep posts truthful and helpful",
    body: "Do not knowingly post false information, fake emergencies, misleading accusations, scams, or information intended to cause unnecessary fear.",
  },
  {
    title: "Use Safety posts responsibly",
    body: "Safety posts should be used for legitimate neighborhood concerns such as suspicious activity, road hazards, missing pets or people, weather emergencies, crime alerts, or other situations that may affect community safety. Do not use Safety posts to target, shame, or make unsupported accusations about another person.",
  },
  {
    title: "Protect people's privacy",
    body: "Do not post another person's private address, phone number, financial information, medical information, private messages, or other sensitive information without permission.",
  },
  {
    title: "Keep Neighborly appropriate for the community",
    body: "Sexually explicit material, graphic violence, illegal activity, dangerous challenges, or other content that is inappropriate for a community platform may be removed.",
  },
  {
    title: "No scams, spam, or deceptive advertising",
    body: "Businesses may promote themselves through the appropriate Neighborly features, but repetitive spam, fake reviews, misleading advertisements, or fraudulent offers are prohibited.",
  },
  {
    title: "Be especially careful when children are involved",
    body: "Neighborly Kids and any youth-related features have additional safety requirements. Adults may not use Neighborly to privately solicit children, request inappropriate personal information, or attempt to bypass parent or guardian protections.",
  },
  {
    title: "Report problems instead of escalating them",
    body: "If you believe a post, comment, message, business, or member violates Neighborly's rules, use the Report feature. Moderators and Neighborly Admin can review reports.",
  },
  {
    title: "Moderator decisions must remain fair",
    body: "Moderators may not use their position to retaliate against someone, favor friends or businesses, or settle personal disagreements. Moderator activity may be reviewed by Neighborly Admin.",
  },
  {
    title: "Serious or repeated violations can affect an account",
    body: "Neighborly may remove content, issue warnings, temporarily restrict features, suspend accounts, remove badges, or permanently remove an account when necessary to protect the community.",
  },
];

const BADGES = [
  {
    name: "New Neighbor",
    icon: <Leaf size={17} />,
    body: "Automatically shown for newer members during their introductory period, currently planned for the first 6 months.",
  },
  {
    name: "Helpful Neighbor",
    icon: <HandHeart size={17} />,
    body: "Recognizes members whose recent posts, comments, answers, or recommendations are consistently marked helpful by neighbors.",
  },
  {
    name: "Safety Watcher",
    icon: <Shield size={17} />,
    body: "Planned to be earned after 5 legitimate Safety posts and maintained using a rolling 90-day activity window. If a member stops participating in neighborhood safety, the badge can disappear until they qualify again.",
  },
  {
    name: "Event Organizer",
    icon: <CalendarCheck size={17} />,
    body: "Recognizes members who regularly organize legitimate community events and activities. Ongoing participation matters; activity badges are not intended to last forever after one burst of activity.",
  },
  {
    name: "Community Champion",
    icon: <Award size={17} />,
    body: "Higher-level recognition for members who consistently make meaningful positive contributions across Neighborly.",
  },
  {
    name: "Moderator",
    icon: <ShieldCheck size={17} />,
    body: "Not an earned activity badge. Neighborly Admin appoints moderators. The badge and moderator dashboard access exist only while that person holds the Moderator role.",
  },
];

export function CommunityGuidelines({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-5 text-sm text-foreground">
      <div>
        <h3 className="font-semibold text-base">Neighborly Community Guidelines</h3>
        <p className="text-muted-foreground mt-1">
          Neighborly is designed to help neighbors connect, help one another, share useful information, support local businesses, and build safer, stronger communities.
        </p>
      </div>

      <div className="space-y-3">
        {RULES.map((rule, index) => (
          <div key={rule.title} className={compact ? "" : "rounded-lg border border-border p-3 bg-muted/20"}>
            <div className="font-semibold">{index + 1}. {rule.title}</div>
            <p className="text-muted-foreground mt-1 leading-relaxed">{rule.body}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-5">
        <h3 className="font-semibold text-base">How Neighborly Badges Work</h3>
        <p className="text-muted-foreground mt-1">
          Badges recognize positive participation. Activity badges are based on recent behavior and can be earned, maintained, or lost as participation changes. Posting excessive, duplicate, misleading, or low-quality content simply to earn a badge does not count and can result in badge removal.
        </p>
        <div className="mt-3 space-y-3">
          {BADGES.map((badge) => (
            <div key={badge.name} className="flex gap-3 rounded-lg border border-border p-3 bg-white">
              <div className="mt-0.5 text-primary">{badge.icon}</div>
              <div>
                <div className="font-semibold">{badge.name}</div>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">{badge.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-5">
        <h3 className="font-semibold text-base">Reporting and Moderation</h3>
        <p className="text-muted-foreground mt-1 leading-relaxed">
          Members can report posts, comments, messages, businesses, or accounts that may violate these guidelines. Moderators will be able to review reports, document what occurred, mark urgent safety concerns, and send recommendations to Neighborly Admin. Neighborly Admin keeps final authority over permanent suspensions, major account restrictions, and moderator privileges.
        </p>
      </div>

      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        Neighborly may adjust badge requirements as the community grows so badges continue to represent meaningful participation. By creating an account, members agree to follow these Community Guidelines.
      </p>
    </div>
  );
}
