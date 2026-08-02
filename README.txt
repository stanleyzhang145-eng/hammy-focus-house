HAMMY FOCUS HOUSE V5 STABLE REBUILD

This version removes the unreliable sprite-sheet system.
It uses one full-body 2D cartoon hamster renderer for every skin.

TESTED FEATURES
- Tap the hamster to tickle
- Tickle button
- Visible laugh, wiggle, paw and foot reaction
- Treadmill start and stop
- One-button hamster selection
- Premium demo unlock
- Clothing wear and unequip
- Focus timer
- Fruit feeding
- Local browser saving

Upload the CONTENTS of this folder to Cloudflare Pages.
For an existing Cloudflare Pages project, create a new deployment with these files.


VERSION 6 — CLOTHING, ANIMATIONS, TASKS, AND TIME
- Clothing redrawn to fit the hamster body.
- Sleeves line up with paws.
- Hat sits around the ears and forehead.
- Scarf wraps around the neck with a hanging end.
- Added a fitted hoodie, cape, and glasses.
- Clothing moves together with running and tickling.
- Improved breathing, blinking, ears, tail, treadmill running, and tickle movement.
- Added 18 task choices plus a custom-task field.
- Added focus choices from 20 seconds up to 2 hours.


VERSION 7 — FURNITURE SHOP
- Added Cozy Bed, Tiny Sofa, Study Desk, Berry Plant, Mini Aquarium, Play Tunnel, Toy Box, and Book Shelf.
- Furniture can be bought, placed, and stored.
- Every placed furniture item has its own interaction animation.
- Added sleeping, sitting, reading, playing, crawling, smelling, and aquarium-watching poses.


VERSION 8 — LOOT, COSTUME MILESTONES, ANIMATIONS, AND MORE FURNITURE
- Better celebration, eating, dancing, wheel-running, castle-peeking, napping, and furniture animations.
- Added costumes for 3, 7, 10, 15, 21, 30, 45, 60, 90, and 100 practice days.
- Practice days count once per real calendar day after a completed focus session.
- Added Moon Lamp, Cloud Rug, Deluxe Wheel, Snack Table, Music Player, and Hamster Castle.
- Longer sessions and higher lifetime Loot Level give better Common, Uncommon, Rare, Epic, and Legendary rewards.
- Total focus minutes, practice days, day streak, next costume, and loot level are displayed.


VERSION 9 — FURNITURE PLACEMENT ANIMATIONS AND THEMES
- Nibbles now moves directly onto, inside, or beside every furniture item.
- Every furniture item has its own hamster pose and furniture reaction.
- The deluxe wheel places Nibbles inside the wheel.
- The castle places Nibbles inside the doorway.
- The cloud rug places Nibbles directly on the rug.
- The snack table, music player, lamp, bed, sofa, desk, and other furniture have custom positions.
- Added Settings page.
- Added Lavender, Mint, Sunset, Ocean, Strawberry, and Cozy Night themes.
- Theme selection saves automatically.


VERSION 10
- Shirts now wrap around the torso and include fitted sleeves and collars.
- Hoodies include fitted sleeves, a hood, collar, pocket detail, and drawstrings.
- Pajamas include sleeves, a collar, buttons, and a star pattern.
- Added overalls and aprons.
- Added costume milestones up to 365 practice days.
- Leaving or hiding the game during an active focus session immediately ends it.
- A failed session resets, gives no loot, no coins, no fruit, no practice day, and no streak progress.


VERSION 11 — PREMIUM EXPANSION
- Added Galaxy, Rainbow, Frost, Sakura, Golden, Ghost, Robot, Dragon, Axolotl and Custom hamsters.
- Added a Custom Hamster Creator for fur, belly, patch, eyes, ears and cheeks.
- Added the 3/7/15/30/45/60/90/100/180/365-day Premium costume path.
- Added 15 original Premium furniture items with room interactions.
- Added 12 Premium rooms.
- Added drag, rotate, resize, recolour, layer controls and 3 saved layouts.
- Added custom focus lengths, task presets, timer styles, goals, reminders, history, reports, heatmap, challenges and generated soundscapes.
- Added bonus Premium chests, Luck meter, shiny fruit, mystery eggs, badges and rare decorations.
- Added 8 personalities and 10 visual companions.
- Added 10 ticket-based mini-games.
- Added 12 Premium themes, completion effects, animated room backgrounds, loading screen and browser icon choices.
- Existing free features remain available.
- Premium is still a local demo entitlement; real store billing is not connected.


VERSION 12 — FURNISHED ROOMS, MOVABLE FURNITURE, WORKING MINI-GAMES
- All 12 Premium rooms receive a different furnished default setup.
- Existing customized rooms are preserved during migration.
- Furniture is now stored as individual items rather than one fixed item per type.
- Drag furniture with a mouse, finger, or stylus.
- Remove selected furniture to storage using the control panel or the × button.
- Place stored furniture in another room.
- Move a selected item directly to any other Premium room.
- Reset only the current room to its original furnished layout.
- Furniture counts and storage counts are shown.
- Premium preview grants 10 starter mini-game tickets once.
- All 10 mini-games have complete controls, scoring, rewards, best scores, and safe timer cleanup.
- Closing a mini-game stops all of its timers.


VERSION 13 — PREMIUM-ONLY ROOMS
- All 12 Premium rooms are now inaccessible to free players.
- Locked players cannot view furnished room layouts or room furniture.
- Room buttons display locks and cannot be opened.
- The Premium scene is covered by a clear locked screen.
- Furniture editing, storage, movement, room reset, atmosphere, lighting, wallpaper, flooring, and interactions are disabled while locked.
- Default room layouts are not initialized until Premium becomes active.
- Activating or restoring Premium immediately initializes and unlocks the furnished rooms.
- This build still uses the local Premium preview entitlement. Store payment verification must be connected before a paid public release.


VERSION 14 — PREMIUM ICON CHOOSER AND PAYMENT-READY UI
- Added 12 Premium app icon choices.
- Icon choice saves locally.
- The web version changes the browser-tab icon immediately.
- A native bridge hook can change the installed iOS or Android icon.
- Included native icon bridge starter notes.
- Added Buy Premium and Restore Store Purchase buttons.
- The browser build never pretends a payment succeeded.
- Premium unlocks from store buttons only after a native bridge returns verified:true.
- Product ID: hammy_premium_lifetime
- Intended product type: one-time non-consumable.
- Suggested display price: $4.99; a real app must display the localized store price.


VERSION 15 — REAL IPAD HOME SCREEN ICON
- Added apple-touch-icon.png at the website root.
- Added 192x192, 512x512, and maskable PNG icons.
- Added a direct apple-touch-icon link in index.html.
- Updated the web app manifest to use real PNG icon files.
- Removed the data-URI fallback icon from the initial page head.
- The Premium icon chooser still changes the browser-tab icon.
- A website already added to the Home Screen must be removed and added again to receive the new static Home Screen icon.


VERSION 16 — HAMMY FRIENDS ONLINE
- Added an Online navigation section.
- Players publish a nickname-only hamster profile and receive an 8-character friend code.
- Other players can view shared practice stats and a visual base preview.
- Added saved friend codes, refresh, remove, profile deletion, connection status, and demo profiles.
- Added free-house and Premium-room base snapshots.
- No chat, real name, age, email, location, task history, or global search is shared.
- Added a dependency-free Node server with rate limiting, validation, secret update tokens, and JSON persistence.
- The game remains usable offline.
- Real cross-device sharing requires server.js to be deployed on a Node-capable host.


VERSION 17 — PUBLIC GALLERY AND SHAREABLE LINKS
- Public or Unlisted profile privacy.
- Public profiles appear in a scrollable gallery.
- Unlisted profiles only open by friend code or direct link.
- Share links use ?profile=FRIENDCODE and open automatically.
- Newest, practice-day, and streak sorting.
- Automatic load-more while scrolling.
- No chat, comments, likes, real names, ages, schools, email, location, or task history.
