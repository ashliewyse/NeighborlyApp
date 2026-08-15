Context  
You have a Next.js App Router project called Neighborly. The app currently shows a green banner and placeholder profile pages. I want a production‑ready feature set and visual update so users can sign up, create personal or business profiles, upload photos, and see a ranking badge. Use Tailwind and Prisma where appropriate.

High‑level goals

Remove the green banner and any solid green backgrounds from badges or headers.

Replace the logo with public/logo.png and change the theme to a blue → purple palette.

Add Sign In and Sign Up links in the header and fully implement registration and login pages.

Implement profile creation flow for Personal and Business profiles with all Nextdoor‑style fields.

Add a client photo gallery with upload, preview, remove, and server upload support.

Add a dynamic ranking badge on profiles computed from reviews/ratings.

Constraints and tech stack

Next.js App Router (server and client components).

Tailwind CSS and the existing shadcn theme file. Update theme variables only in default_shadcn_theme.css.

Prisma for DB models and migrations. Use lib/prisma.ts helper.

Authentication: scaffold with NextAuth.js (email/password or credentials provider) or a simple session stub for testing. Provide clear hooks to swap in NextAuth.

All new files must be placed under app/, components/, lib/, prisma/, or public/.

Keep UI accessible and responsive. Use existing design tokens where possible.

Exact deliverables (files and behavior)

Theme and logo

Add public/logo.png (user will supply).

Edit default_shadcn_theme.css to set primary #0b5cff, secondary #6b46ff, accent #7c3aed, and matching muted/background values. Keep a mirrored .dark block.

Header

components/Header.tsx with logo, site name, tagline, and right‑aligned Sign In and Sign Up links. No solid green backgrounds. Sign Up button uses background: var(--primary).

Auth pages

app/login/page.tsx — email + password form, client validation, POST to /api/auth/login (or NextAuth signIn).

app/register/page.tsx — registration form with fields:

Account type: Personal | Business

Full name

Email

Password

Business fields shown when Business selected: Business name, slug, address, phone, hours, services, website, category, business description

Profile photo upload (optional)

Submit creates user and profile in DB and signs in the user

Server API route(s) to create user and profile: app/api/auth/register/route.ts and app/api/auth/login/route.ts (or NextAuth config). Include input validation and return JSON.

Prisma schema additions

Add or update prisma/schema.prisma with models: User (id, name, slug, email, avatarUrl, isBusiness, bio, phone, address, website, createdAt), Review, ReviewPhoto, AggregatedRating, Badge, BadgeAssignment. Provide migration command instructions.

Profiles pages and routing

app/profile/page.tsx (server) reads searchParams.name and fetches /api/profiles/[slug].

app/profile/[name]/page.tsx dynamic route fallback.

Optional middleware.ts at project root to rewrite /profile/<slug> → /profile?name=<slug>.

Profile UI

Profile header with avatar, name, business tag, badges, aggregated rating, and Ranking Badge component. Ranking badge text example: Top 8% in Neighborhood and shows an icon. Ranking computed from AggregatedRating relative to other profiles (provide SQL/Prisma logic or a simple percentile function).

Full profile fields: hours, services, address, contact, website, about, badges, reviews, photo gallery.

Photo gallery

components/PhotoGallery.tsx client component: upload multiple images, preview thumbnails, remove, reorder optional.

Server upload route app/api/uploads/route.ts that accepts multipart form data, stores files to local public/uploads for dev or to Cloudinary/S3 if env vars provided, and returns URLs. Include secure filename handling and size limits.

Reviews API

app/api/profiles/[slug]/route.ts GET profile by slug with badges and aggregated rating.

app/api/reviews/route.ts GET reviews and POST create review. POST updates AggregatedRating via transaction.

Badge component update

components/Badge.tsx updated to use bg-transparent for default/secondary and keep outline variant. Ensure no green backgrounds remain.

Verification steps

Commands to run:

npm install

set DATABASE_URL env var

npx prisma migrate dev --name init_profiles

npx prisma generate

npm run dev

Test URLs:

http://localhost:3000 — header shows new logo and Sign In / Sign Up links

http://localhost:3000/register — registration form creates account and redirects to /profile/<slug>

http://localhost:3000/profile?name=Beachside%20Cleaners and http://localhost:3000/profile/Beachside%20Cleaners — profile page shows gallery, reviews, ranking badge

Upload images via profile gallery and confirm files saved and URLs returned

Acceptance criteria

The green banner is fully removed from header and badges. No solid green backgrounds remain anywhere in header or badge components.

Sign Up creates a user and profile record in the database and logs the user in.

Photo gallery previews images client‑side and persists to server storage with accessible URLs.

Ranking badge displays a percentile computed from aggregated ratings and updates after new reviews.

Theme colors are blue/purple across header, buttons, accents, and badges.

Extras to include in the response

A single git apply patch that adds/edits the files above, or full file contents for each changed file if a patch is not possible.

Short code snippets for the critical server logic: registration handler, uploads route, aggregated rating update transaction, and ranking percentile calculation.

Do not

Do not change routing conventions beyond adding the profile pages and optional middleware.

Do not introduce new UI frameworks beyond Tailwind and existing shadcn components.

Do not commit secrets; use env vars for DB and cloud storage.