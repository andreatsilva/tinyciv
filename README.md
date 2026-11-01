# Tiny Civilization Simulator

A playable medieval settlement RTS for one player or up to five friends. Villagers walk to resources, gather, carry, deliver, and construct your village. Build an economy, upgrade your hall and barracks, research weapons and armor, and command individual soldiers across a 256 × 256 seeded realm.

## Play in 30 seconds

1. Run `npm start` and open http://127.0.0.1:4173.
2. In **Village**, assign workers or build a lumber camp with the construction dock.
3. Open **Army → Deploy 5**. Drag to select soldiers; right-click to move or attack.
4. For multiplayer choose **Play with friends**, enter your own name, a shared seed, and the host address. **War room → Copy invitation** shares both seed and server.

Spearmen are available immediately. Level 2 hall + barracks unlock archers; level 3 unlocks cavalry. Buildings upgrade to level 5; weapons and armor research to level 3. Soldiers fight on the map, village garrisons deploy defenders, watchtowers fire, and victorious attackers return with loot. Defeated villages receive two minutes to rebuild; new players receive two minutes of protection.

## Local setup

Node.js **22.18+** and npm:

```powershell
npm ci
npm test
npm run build
npm start
```

The included prebuilt client in `docs/` (or `dist/` after a build) runs with `npm start` without installing dependencies. Development: `npm run dev`. The original autonomous simulator, PNG snapshots, and WebM timelapse exporter remain at `?mode=classic`; its save is separate.

## Host five friends on your PC

See [MULTIPLAYER.md](MULTIPLAYER.md) for the full operating guide.

In one terminal:

```powershell
npm ci
npm run server
```

In another, with Cloudflare's official `cloudflared` installed:

```powershell
cloudflared tunnel --url http://127.0.0.1:8787 --no-autoupdate
```

Copy the printed HTTPS address, then run:

```powershell
npm run set-server -- https://YOUR-ADDRESS.trycloudflare.com
```

Join locally or from Pages and share **War room → Copy invitation**. No router port forwarding or paid host is required for this temporary setup. Keep the PC, host, and tunnel running. The tunnel URL changes when restarted; update the configuration and invitations. Names and reconnect keys survive tunnel changes when the host's `data/` is retained.

## Ship to GitHub Pages

Repository: https://github.com/andreatsilva/tinyciv

```powershell
npm ci
npm test
npm run ship
git add .
git commit -m "Release Tiny Civilization"
git push origin main
```

Once, in GitHub **Settings → Pages → Deploy from a branch**, select **main /docs** and Save. The project address is https://andreatsilva.github.io/tinyciv/. `npm run ship` type-checks, builds, and refreshes `docs/`; relative asset paths work under the repository URL. CI checks tests and builds on pushes and pull requests.

After restarting a tunnel, `npm run set-server -- https://NEW-ADDRESS.trycloudflare.com` updates the runtime config without rebuilding JS. Commit and push `public/multiplayer.json` and `docs/multiplayer.json`.

Never publish `data/`, `tools/`, local logs, or browser reconnect keys. The git ignore excludes server saves and downloaded binaries.

## Configuration and limits

No API keys or environment variables are required. Optional variables:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4173` | Static preview port |
| `GAME_PORT` | `8787` | Game host port, loopback only |
| `DATA_DIR` | `./data` | Persistent room saves and host identity |
| `ALLOWED_ORIGINS` | Pages + local preview/dev origins | Comma-separated exact browser origins |

The server supports five permanent player slots per seed, three loaded worlds per process, 80 field units per player, and 32 sockets overall. It runs at 1× while at least one player is connected; empty worlds pause. All players see the realm, resources, and armies; there is no fog of war. This is guest multiplayer for friends: no email/password accounts, matchmaking, alliances, conquest, or paid integration. Clearing browser storage loses its reconnect key; use a new name in a new room or restore the browser data. Disconnecting does not free a village slot.

Simulation state and command ownership live on the host; client snapshots cannot create resources or control someone else's city. Saves are written atomically every ten seconds and on normal disconnect/shutdown. Keep backups of `data/`.

Fonts optionally load from Google Fonts, with system fallbacks. The game uses original procedural Canvas art. No player analytics or invented testimonials.

Read [SETTLEMENT.md](SETTLEMENT.md) for the village engine, [MULTIPLAYER.md](MULTIPLAYER.md) for controls and hosting, and [VALIDATION.md](VALIDATION.md) for verified behavior and limits.
