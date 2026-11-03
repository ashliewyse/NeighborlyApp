# Group discussions, invitations, and sharing

Requested by Ashlie: give real groups a discussion page, join controls and member invitations; share Neighborly and other members' posts through email, text, copying links, and phone sharing.

## Behavior
- Open a group by its name. Signed-in neighbors can see its description and join/leave. Group members can create text discussions, reply, invite an existing member, and share the group link. Only joined members can read discussions. Authors can remove their own posts/replies; group owners and administrators can remove content.
- An invitation does not enroll its recipient. Pending invitations appear in the existing notification panel and on the group page, where the recipient can accept or decline. Only members can send invitations; blocked neighbors cannot invite each other. Duplicate invitations produce an understandable message.
- Share Neighborly from the welcome page and feed. Share an existing post by its durable URL. The share dialog offers the device share sheet when supported, email, text message, and copy link. No messages are sent automatically. Sharing a link preserves access controls and original authorship; it does not copy private content into the share text.
- Direct post and group URLs survive sign-in, switching to registration, and email confirmation. Deleted, hidden, blocked or inaccessible content has a useful unavailable state.
- Keep the existing branding and mobile layout. Do not create sample accounts, posts, replies or invitations in production. Existing testing group remains real.

## Implementation choices
Separate group discussion tables avoid leaking member-only conversations into the main feed. Use the existing group membership and RLS helpers, with new RLS policies for discussions, replies, and invitations. Keep current groups open to join; private/invite-only groups are out of scope. Post sharing means an external link to the original post, not an internal repost feature.

Add small React components and one idempotent build patch for the existing generated App.tsx/AuthView.tsx, following the repository's patch pipeline. Preserve direct changes in dedicated components/router. Additive database migration precedes the UI release.
