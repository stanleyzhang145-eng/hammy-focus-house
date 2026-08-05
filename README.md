# Hammy Focus House — One-Click Cloud Deployment

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/stanleyzhang145-eng/hammy-focus-house)

This deploys the website, Node.js server, PostgreSQL database, database
connection, automatic admin secret, cloud accounts, public gallery, reactions,
blocking, reporting, and moderation together.

The Blueprint automatically configures:

- Web service
- PostgreSQL database
- `DATABASE_URL`
- Random `ADMIN_KEY`
- Build and start commands
- Health check
- Automatic deployments

After deployment, open the new Render web-service address.

The moderation page is available at `/admin.html`.


## Version 21 — Reward Codes

The Account page now contains a Private Reward Codes section.

Initial code:

- `SUMMER27` — awards 200 coins
- Can be redeemed once per cloud account
- Validated by the cloud server
- Added directly to the current cloud save
- Protected against repeated or simultaneous redemption attempts

The database records each account and redeemed code in
`reward_code_redemptions`.


## Version 22 — Top Secret Admin Access

- Tap the **Build v22** badge seven times on the Account page.
- A hidden Top Secret Admin Access section appears.
- The private code is verified only by the server.
- The code is never stored in HTML or browser JavaScript.
- Successful login creates a signed admin session lasting 30 minutes.
- Five incorrect attempts temporarily lock admin login for 15 minutes.
- The one-click Render Blueprint generates `ADMIN_ACCESS_CODE` automatically.
- `admin.html` uses the same secure login and supports manual locking.


## Version 23 — Admin Live Operations

The Top Secret Admin panel now includes:

- Dashboard statistics
- Player lookup by Player ID or friend code
- Custom coin grants
- Apple, banana, berry, and mango grants
- Six exclusive collectibles
- Random global events
- Custom events with duration and rewards
- One event claim per cloud account
- Event claim counts
- End and cancel event controls
- Player-facing live event banner
- Equippable exclusive effects
- Admin audit history

Exclusive collectibles:

- Solar Crown
- Aurora Aura
- Star Trail
- Crystal Founder Badge
- Golden Focus Trophy
- Neon Profile Frame

Random event templates:

- Coin Shower
- Fruit Festival
- Cozy Weekend
- Star Drop
- Aurora Night
- Focus Festival

Admin reward grants and event claims update the latest cloud save using
database transactions and revision increments.


## Version 24 — Admin Command Center + Hammy Market

### Hamster position fix

v23 accidentally applied `position: relative` to the main hamster while adding
exclusive effects. That overrode the room's original absolute positioning and
could make the hamster appear to float or move into the page layout.

v24 removes that override and keeps the hamster grounded at the room floor.

### More admin tools

- Player search by Player ID, friend code, or nickname
- Set an exact coin balance
- Grant or revoke Premium preview
- Remove incorrectly granted exclusive items
- Create private reward codes from the admin panel
- Set code start/end times and maximum uses
- Enable or disable custom reward codes
- Publish player announcements
- Schedule announcements and choose priority
- Expanded account and economy analytics
- Export the admin audit log as JSON
- Schedule custom live events

### More ways to spend coins

The Hammy Market adds:

- Cozy Cocoa
- Joy Cookie
- Hammy Snack Pack
- Coin Booster for the next completed focus session
- Fruit Charm for the next completed focus session
- Star Garland
- Focus Banner
- Flower Trio
- Mini Fountain
- Cloud Beanbag
- Forest Hideaway theme
- Candy Cottage theme
- Starry Space theme
- Daily discounted item

The Fruit Pantry also sells:

- Apples
- Bananas
- Berries
- Mangoes
- Peaches
- Grapes
- Kiwis
- Watermelons


## Version 24.1 — Admin Login Hotfix

- A correct `ADMIN_ACCESS_CODE` now clears the temporary lock immediately.
- Incorrect guesses still trigger protection.
- The cooldown was reduced from 15 minutes to 2 minutes.
- The server uses the forwarded visitor address on Render instead of treating
  everyone as the same reverse-proxy address.
- The API returns the remaining cooldown in seconds.
- The admin screen displays a countdown.


## Version 24.2 — Global Rate-Limit Hotfix

The old limiter counted every request using Render's internal proxy address.
Images, CSS, JavaScript, page loads, and cloud polling could therefore block
the entire website and replace the homepage with a JSON 429 error.

v24.2 changes this behavior:

- Static HTML, CSS, JavaScript, icons, and images are never app-rate-limited.
- `/api/health` and `/api/health/ready` always remain reachable.
- `/api/admin/login` uses only its dedicated password-attempt protection.
- API reads have a separate 600-per-minute per-visitor limit.
- API writes have a separate 120-per-minute per-visitor limit.
- Render's forwarded visitor address is used instead of the shared proxy.
- Expired rate-limit buckets are cleaned automatically.


## Version 24.3 — Automatic Admin Delivery

- Admin rewards now arrive in normal gameplay without opening the Online page.
- The app checks for deliveries every 15 seconds and when it regains focus.
- False dirty-save changes during startup were removed.
- Admin changes merge with unsynced local progress.
- Coin corrections, Premium-preview changes, exclusive removal, and reward
  grants carry mergeable command records.
- Temporary 429 API responses retry automatically once.
- The Online tab is now labeled Friends.


## Version 24.4 — Cloud Account Stability

Cloud accounts, Player IDs, recovery codes, cross-device saves, friends, and
automatic admin delivery are retained.

The general request limiter was removed because it could block normal account
buttons on Render. Admin incorrect-password protection remains. Cloud requests
are combined and retried inside the app, account actions display in-app status,
and browser navigation falls back to the Hammy interface instead of raw JSON.


## Version 24.5 — Brand-New Cloud Account

The Account page can create a completely separate cloud account without
deleting the current one. Current device progress is uploaded to the new
account. The previous Player ID and recovery code are stored locally as a
backup, and the new account receives a new Player ID, recovery code, device
identity, friend list, profile, and cloud save.


## Version 24.6 — Replace Cloud Account

The Account page can now permanently delete the connected cloud account and
replace it with a completely fresh starter account. The new account is created
and verified before deletion. Failure rolls back to the old account, while an
interruption record allows the app to recover safely after a browser reload.


## Version 24.7 — Verified Admin Gift Delivery

Admin deliveries now update localStorage and the running game state together.
The client verifies coin, fruit, Premium, and exclusive changes, then syncs
the merged save and installs the server-confirmed result. The success message
is displayed only after the reward exists in the visible game state.


## Version 24.8 — Hamster Breeds

The Hamsters screen now has six breed tabs. Every breed offers White, Orange,
Black & White, Caramel, Silver, and Strawberry. White Normal is the only free
combination; all other breed/color combinations require Premium. Existing
skin saves migrate to the matching Normal-breed color, and the server enforces
the same entitlement rule for cloud saves.


## Version 24.9 — Breed and Admin Item Fix

Breed tabs no longer reset to the currently equipped hamster when tapped.
The selected breed stays open and displays its six matching colors.

Admin exclusives now auto-equip when granted and all six built-in exclusives
have visible room or hamster artwork. Existing owned items also display once
unless the player deliberately unequips them. Unknown custom exclusive IDs
remain visible using a fallback special-item card and effect.


## Version 25 — Real Breed Visuals

The breed system now changes actual hamster anatomy instead of mainly scaling
one model. Each breed has its own face, ear, muzzle, fur, paw, foot, marking,
and tail design. Breed details are shared by the home hamster, color cards,
clothing previews, and Premium room previews.


## Version 25.1 — Cute Breeds Polish

The special breeds keep their unique anatomy, but the faces and body proportions were softened to look cuter. Eyes are slightly larger, cheeks are softer, longcoat is less scraggly, satin is less sharp, and floppy-ear has a shorter baby-face muzzle while keeping its folded ears.


## Version 25.2 — Breed Look Chooser

The Hamsters page now has a saved Realistic-Cute versus Cartoon-Cute choosing
panel with live breed previews. The selected style updates the home hamster,
breed cards, clothing cards, and Premium previews without changing breed
ownership or colour access.


## Version 25.3 — Multi-Room Furniture

Eight new interactive furniture pieces were added. Rooms now hold six pieces.
Premium automatically generates additional rooms as needed, while free
players can unlock Room 2 with a 10-day streak. Home-room arrow buttons switch
between generated rooms, and furniture cards display their room location.


## Version 25.4 — Fitted Layered Clothing

Clothing now uses separate fitted torso, sleeve, collar, cuff, hood, pocket, trouser, cape, and accessory layers. Breed-specific measurements keep outfits attached to the hamster while the face and paws remain visible.


## Version 25.5 — Room Designer Mode

Rooms now support saved drag-and-drop furniture layouts, touch editing,
rotation, flipping, grid snapping, room transfers, storage, undo, and room
thumbnails. Invalid placements are shown in red and cannot cover Hammy, the
exit, or navigation controls. Existing fixed layouts migrate automatically.

Hammy now finds a route around furniture, walks to an open interaction point,
uses the furniture, and returns to a safe position instead of teleporting.
