# Neighborly Beta QA Checklist

Use this checklist before opening the beta to more people and after major authentication, moderation, messaging, or database changes.

## Test accounts

Use separate test accounts so permissions can be verified without risking the owner/admin account.

- Personal member A
- Personal member B
- Business member
- Moderator
- Neighborly administrator
- One fresh email address that has never registered before

Never use a real moderator/admin account for destructive suspension or ban tests.

## 1. Fresh personal sign-up

- [ ] Open Neighborly in a private/incognito browser.
- [ ] Choose Personal account.
- [ ] Complete all required profile fields.
- [ ] Choose a profile color and confirm the live preview changes.
- [ ] Agree to Community Guidelines.
- [ ] Submit sign-up.
- [ ] Confirmation email arrives from Neighborly's custom sender.
- [ ] Confirmation link returns to Neighborly successfully.
- [ ] Account shows invite-only/pending approval screen.
- [ ] Admin sees the access request.
- [ ] Admin approves it.
- [ ] Member can enter Neighborly after refreshing/checking approval.
- [ ] Profile values and chosen theme persist after sign-out/sign-in.

## 2. Fresh business sign-up

- [ ] Repeat sign-up with a fresh business test account.
- [ ] Business name, category, description, location, phone/website persist.
- [ ] Admin approves the account.
- [ ] Business profile is created correctly.
- [ ] Automatic New Local Business announcement appears.
- [ ] Business name in the announcement opens the business profile.

## 3. Authentication recovery

- [ ] Sign out.
- [ ] Wrong password gets a friendly error.
- [ ] Forgot Password sends a reset email.
- [ ] Reset link opens Neighborly's password-reset screen.
- [ ] A new password of fewer than 8 characters is rejected.
- [ ] A valid new password saves.
- [ ] Old password no longer signs in.
- [ ] New password signs in.

## 4. Profiles and media

- [ ] Personal avatar upload/crop/save works.
- [ ] Personal cover upload/crop/save works.
- [ ] Profile theme changes persist.
- [ ] Only the profile owner sees profile color-edit controls.
- [ ] Message button appears on someone else's profile.
- [ ] Business logo/cover/gallery uploads work.
- [ ] Business profile Report button appears to another member.
- [ ] Personal profile Report button appears to another member.
- [ ] Reporting your own profile/business is not offered.

## 5. Feed and posts

- [ ] Create a general post.
- [ ] Create a post with a photo.
- [ ] Edit your own post.
- [ ] Delete your own post.
- [ ] Another member cannot edit/delete it.
- [ ] Like a post, refresh the browser, and confirm the like/count persists.
- [ ] Unlike it, refresh, and confirm the change persists.
- [ ] Help Wanted posts show in the Help Wanted view.
- [ ] Classified posts show in Classifieds.
- [ ] Location filtering behaves correctly.

## 6. Comments

- [ ] Add a text comment.
- [ ] Add a comment with a photo.
- [ ] Comment remains after refresh.
- [ ] A Report option appears for another member's saved comment.
- [ ] The author does not get a Report option on their own comment.

## 7. Messaging

- [ ] Member A opens Member B's profile and starts a message.
- [ ] Member B receives/reads the message.
- [ ] Incoming message shows Report.
- [ ] Outgoing message does not show Report.
- [ ] Reporting an incoming message creates a Safety report with only that selected message snapshot, not the whole conversation.
- [ ] Mobile keyboard does not hide the send button.
- [ ] Back/close controls work on a phone-sized screen.

## 8. Friends, follows, and blocking

- [ ] Send and accept a friend request.
- [ ] Follow another member.
- [ ] Block that member from a post menu.
- [ ] Admin receives the block alert.
- [ ] Blocked member is not notified of the block.
- [ ] The two accounts can no longer see each other's profiles/posts/comments.
- [ ] Direct messaging between them is blocked.
- [ ] Friend/follow relationship between them is removed.
- [ ] New friend/follow attempts between them are prevented.
- [ ] Blocker sees the member in Settings > Blocked members.
- [ ] Unblock works.
- [ ] The two accounts can interact normally again after unblock.

## 9. Safety reports

From a non-owner account, submit each report type at least once:

- [ ] Post
- [ ] Comment
- [ ] Personal profile
- [ ] Business profile
- [ ] Incoming direct message

For each report:

- [ ] Reporter can choose a reason.
- [ ] Optional details save.
- [ ] Duplicate report is handled cleanly.
- [ ] Admin/moderator notification appears.
- [ ] Safety dashboard shows reporter, reported member, reason, details, saved snapshot, type, and timestamp.
- [ ] Report can move to Reviewing.
- [ ] Report can be Escalated.
- [ ] Escalating as moderator notifies an administrator.
- [ ] Report can be Resolved.
- [ ] Report can be Dismissed.

## 10. Moderator permissions

Using the administrator account:

- [ ] Open Admin > Members.
- [ ] Find the moderator.
- [ ] Remove Review reports permission; moderator can no longer view/review reports.
- [ ] Re-enable Review reports.
- [ ] Remove View block activity; block history disappears from moderator tools.
- [ ] Re-enable it.
- [ ] Remove Hide reported posts; Hide Post action disappears.
- [ ] Re-enable it.
- [ ] Remove Hide reported comments; Hide Comment action disappears.
- [ ] Re-enable it.
- [ ] Remove Warn members; Warn action disappears.
- [ ] Re-enable it.
- [ ] Moderator cannot approve sign-ups.
- [ ] Moderator cannot manage ads.
- [ ] Moderator cannot suspend or ban an account.

## 11. Content moderation

Using a test post/comment:

- [ ] Moderator hides a reported post.
- [ ] Regular users can no longer see it.
- [ ] Staff can still see the report/snapshot in moderation history.
- [ ] Moderator hides a reported comment.
- [ ] Regular users can no longer see it.
- [ ] Warning a member sends the member a moderation warning notification.
- [ ] Moderation action appears in the private audit log.

## 12. Admin member management

Using a disposable test member:

- [ ] Admin search finds member by name.
- [ ] Admin search finds member by email.
- [ ] Admin sees account type, access status, warnings, open report count, and location.
- [ ] Safety History shows reports, block history, and staff actions.
- [ ] Warn action works.
- [ ] Suspend 7 days prevents community access.
- [ ] Suspended member gets a clear account-status screen with reason and end time.
- [ ] Restore returns access.
- [ ] Ban prevents community access.
- [ ] Banned member gets a clear account-status screen.
- [ ] Restore returns access.
- [ ] Administrator accounts cannot be suspended/banned from this screen.
- [ ] Moderator access can be granted and removed from Admin > Members.

## 13. Admin audit and notifications

- [ ] Recent Moderation Activity records warn/suspend/ban/restore actions.
- [ ] It records moderator grants/removals and permission changes.
- [ ] It records report status changes and content hiding.
- [ ] Admin bell count includes open/escalated safety reports.
- [ ] Block and safety notifications link/route sensibly.

## 14. Advertising

- [ ] Submit a test ad request.
- [ ] Admin sees it.
- [ ] Mark payment/status as appropriate.
- [ ] Active ad appears where expected.
- [ ] Featured/full-price behavior is not limited by browsing area if that is the configured tier behavior.
- [ ] Mobile ad card does not clip text/buttons.

## 15. Mobile layout pass

Test at minimum one real Android browser plus browser emulation for a small iPhone-sized viewport.

- [ ] Welcome/sign-in/sign-up pages fit without sideways scrolling.
- [ ] Feed controls fit.
- [ ] Post menu is reachable.
- [ ] Report dialog fits and scrolls.
- [ ] Admin navigation is usable.
- [ ] Member management cards/buttons wrap without clipping.
- [ ] Moderator tools are usable.
- [ ] Messages remain usable with keyboard open.
- [ ] Profile cover/avatar controls are reachable.
- [ ] Share/ad buttons do not clip.

## 16. Build/deployment health

- [ ] `pnpm run build` succeeds.
- [ ] Build patch runner reports all patch modules verified.
- [ ] Vercel deployment reaches READY.
- [ ] `neighborshelpingneighbors.online` resolves to the newest READY production deployment.
- [ ] Supabase Security Advisor has no unexpected new warnings.
- [ ] Supabase Performance Advisor has no unindexed foreign-key warnings.

## 17. Before widening the beta

- [ ] Complete one fresh personal signup end-to-end.
- [ ] Complete one fresh business signup end-to-end.
- [ ] Complete one password reset end-to-end.
- [ ] Test one report/block workflow with a real moderator account.
- [ ] Confirm Privacy Policy and Terms of Service are present and linked from signup/footer/settings.
- [ ] Decide whether to enable CAPTCHA after configuring a Turnstile or hCaptcha provider.
- [ ] Decide whether the Supabase plan justifies leaked-password protection.
- [ ] Keep Neighborly Kids disabled until its separate child-safety/legal/payment design is complete.
