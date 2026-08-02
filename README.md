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
