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
