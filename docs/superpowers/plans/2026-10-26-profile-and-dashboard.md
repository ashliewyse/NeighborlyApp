# Neighborly profile and dashboard fixes

1. Restore personal profile header to its existing local theme values. Render visitor/owner in all six themes; ensure business still renders. Confirm regression fails before and passes after fix, including generated build source.
2. Add read-only AreaDirectory component to AreaReviewPanel before duplicate review. Read existing community_areas through existing authenticated client in stable pages. Search city, neighborhood and state, label city vs neighborhood and active status, show 50 at a time, separate loading/error/empty states. Add filter tests and verify desktop/mobile fixture UI. No database mutations or permissions changes.
3. Reduce feed right padding to 8px on desktop while retaining existing left padding and phone layout; color existing desktop navigation icons green/purple/blue/amber/teal. Inspect layout at desktop and mobile sizes.
4. Run regression suites and production build, retain only intended source changes (exclude generated patches), get independent code review, prepare PR, and verify deployed behavior if publishing is authorized.
5. Beachside ad schedule extension approved by user: existing paid active campaign now ends November 25, 2026, with no payment action. Verify on live feed.
