Run `npx vite --config tests/profile-crop/vite.config.ts` and open
http://127.0.0.1:3012/tests/profile-crop/.

This renders the actual business profile and shared cropper with a fake Supabase
boundary. No credentials or live backend are used. Reload to reset recorded calls.
Use `sample.svg` for both photo inputs.

Check each of **Change Cover** and **Edit**:

1. Selecting a file opens the corresponding crop dialog; no uploads or updates occur.
2. Cancel leaves the image unchanged and the recorded calls empty.
3. Selecting the same file again opens the dialog. Zoom and reposition, then Apply Crop.
4. Exactly one JPEG uploads: cover 1200×375, profile 480×480. The displayed image changes.
   Cover updates `business_profiles.cover_url`; profile updates both
   `business_profiles.logo_url` and `profiles.avatar_url`.
5. Open with `?visitor` and verify neither edit control appears.
6. Enable **Delay crop processing**, open a crop, Apply, then Cancel while Applying.
   After processing finishes there must be no upload or metadata update.
