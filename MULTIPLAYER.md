# Shared realms and army controls

The GitHub Pages client connects over secure WebSockets to the authoritative Node host running on your PC. Cloudflare's temporary tunnel forwards only the host game port. GitHub Pages itself does not run the simulation.

## Joining and inviting

Choose **Play with friends**, enter a 2–20 character player name and a seed (3–32 letters, numbers, underscores or hyphens). Everyone must use the same host and seed. Names are unique within that world; five villages can be claimed. The other twelve governors remain AI controlled. Unclaimed player villages are dormant until joined.

The host assigns your city. A random reconnect key is saved in this browser and only its hash is stored by the host. Keep the same browser and site origin to return to your village. Opening the same player in another tab replaces the older connection. Clearing browser data, switching from localhost to Pages, or changing browsers requires the original reconnect data; this MVP has no account recovery. Choose a new name/room instead. The tunnel address can change without losing your identity on the same browser origin, because the host keeps a persistent identity in data/host-id.

**War room** shows the roster and connection state. **Copy invitation** includes the seed and public server address, never a reconnect key. Friends open it and choose their own names. The host's current address can also be configured with `npm run set-server -- https://...` before publishing.

On interruption the client freezes and retries with backoff; it never advances a separate multiplayer simulation. Rejected joins show errors and allow retrying or returning to solo. Multiplayer does not overwrite the solo save. Shared worlds use real time; pause and speed changes remain solo controls.

## Progression

- Upgrade the village hall, cottages, camps, storage, farms, barracks and watchtowers through five levels. Builders must reach the site to complete upgrades.
- Train villagers and spearmen immediately. Hall + barracks level 2 unlock archers; level 3 unlocks cavalry. Five recruits can queue.
- Weapons research adds 12% attack per level; armor adds 15% maximum HP. Three levels each. Each level needs a hall one level higher, real resources, and research time. One research project at a time.
- Resources enter the stockpile on delivery. Construction, recruitment, and research spend actual stock.

## Field orders

Open **Army** and deploy up to five units at a time from a trained garrison. Each player may have up to 80 soldiers in the field. Spearmen, archers, and mounted cavalry have distinct visuals, speeds, ranges, HP, and costs.

Enable army controls. Click your soldier to select, Shift-click to add, or drag a selection rectangle. **Select all**, **Hold**, and **Garrison** are keyboard-accessible buttons. Right-click ground for formation movement, an enemy soldier for combat, or an enemy building for a village attack. Enemy units cannot be selected as your own. Alt-drag or middle-drag pans while in army mode. On touch, select all and tap a destination. Arrow keys pan; Home centers your village; wheel or +/− zooms. Exit army controls for ordinary villager inspection and gathering orders.

The Neighbors panel also sends a visible spearman raid. Paths follow passable ground and roads. Soldiers fight hostile units, archers fire arrows, garrison spearmen deploy to intercept approaching attackers, and towers shoot at attackers. A village loses after its hall health is depleted; attackers carry limited spoils home. Surviving units return to reserve. There is no permanent city capture in this version. Villages recover for two minutes after a defeat; newly joined players have two minutes of protection. AI governors retain the earlier autonomous raid system for AI-versus-AI wars.

## Host operations

Run `npm run server`, then `cloudflared tunnel --url http://127.0.0.1:8787 --no-autoupdate`. This machine has a verified Cloudflare-signed executable at `tools/cloudflared.exe` in the writable run copy. It is ignored by git. Use `./tools/cloudflared.exe` if it is not on PATH. No router ports or Windows service installation are needed.

Stop the tunnel with Ctrl+C to remove internet access. Stop the host with Ctrl+C to save and shut down. Keep `data/` and its host-id when restarting or moving the host. Back it up while the server is stopped. Each seed uses a SHA-256 filename, with atomic writes every ten seconds and on normal disconnect/shutdown. Worlds with no clients pause. Restarts load existing rooms on demand. Three loaded rooms per process and five permanent player slots per room limit resource use; restarting releases the in-memory room list without deleting saves.

Anyone with the tunnel address can attempt to join a known seed. Treat invitations as friends-only, use an uncommon seed, and stop the tunnel when finished. The host caps connections, message size, join attempts and command rates, validates orders, and derives ownership from the authenticated session. These guest rooms are a small MVP rather than a public competitive service.

Optional `GAME_PORT`, `DATA_DIR`, and `ALLOWED_ORIGINS` are documented in README. To add a different client host, add its exact origin to `ALLOWED_ORIGINS`; do not use a wildcard. Keep localhost binding and use the tunnel for internet play.
