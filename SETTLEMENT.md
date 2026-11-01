> Historical v2 engine notes. Current multiplayer and individual combat behavior is documented in [MULTIPLAYER.md](MULTIPLAYER.md); use [README.md](README.md) for current setup.

# Tiny Civilization v2 — Settlement strategy

## Graphics and game HUD update (v2.1)

The settlement now runs in a full-window playfield with a timber-and-brass HUD: resources and time controls across the top, an illustrated construction dock at the bottom, a framed minimap, and a collapsible orders panel. The outer page does not scroll; long orders/history lists scroll inside their own panel.

**O** toggles orders, **M** opens the world map, and **F** requests native fullscreen when the browser permits it. The top-right buttons provide the same controls. Existing building, recruitment, camera and save controls remain functional. On narrow screens the orders panel starts closed, and can be opened through the people icon. The camera compensates for the open panel on wider screens so your village stays visible.

The graphics use deterministic code-native textures and cached sprites: fine grass grain and vegetation, connected worn dirt paths, water banks and animated ripples, layered shaded trees, faceted stone/iron, shingled roofs, stone foundations, plaster/timber walls, crop rows and fences, logs, barrels, flags and smoke. Workers have job-specific clothing, tools, and recognizable carried loads. Build buttons and selection portraits use the same artwork as the live world. Cosmetic motion stops when paused or when reduced motion is requested.

There are no new runtime dependencies or remote art services. Visual variation uses a separate generator and does not advance the simulation RNG. Save formats and Classic mode remain unchanged. Two new camera tests check pointer/render alignment at multiple screen sizes and zoom levels; the complete test count is now 22.

The default game now puts you in charge of **Willowmere**, one settlement in a seeded 256 × 256 realm (65,536 tiles). Sixteen AI governors share the world by default; **My realm → Found a new village** supports 8, 16, 24, or 35 rival cities.

## Play

```powershell
cd tinyciv
npm start
```

Open `http://127.0.0.1:4173`. The included production build needs Node.js, but no dependency installation. If a server is already running there, refresh the tab after updating the files.

1. Watch the villagers leave the hall. Each worker walks along a traversable tile route, gathers a load, and carries it back. Inventory increases **on delivery**, not from a passive resource counter. Trees and mineral nodes have finite resources; farms renew food.
2. Use **Village → + / −** to move villagers between woodcutting, farming, stone gathering, iron mining, and building. The total workforce stays the same. Recruitment costs food and takes time; cottages provide population capacity.
3. Pick a building below the map and click clear land within the dotted village boundary. Resource costs are paid immediately. Builders have to reach the site before construction can progress. Multiple builders speed it up. Keep a clear entrance and one tile between structures.
4. Click your buildings to upgrade them. Cottages add housing, storage adds capacity, gathering buildings improve work speed, farms improve food gathering, barracks improve training, and towers improve defense. Existing capacity and production benefits remain during an upgrade.
5. Click a villager to inspect their task and load or change their job. With a villager selected, right-click a nearby tree, stone outcrop, or iron deposit to give a direct gathering order. A worker carrying a load must finish delivering it first. Clicking a deposit also offers **Send a worker here**.
6. Open **Realm map** or click the minimap to explore. **Neighbors → Visit this village** shows another governor's actual workers, stock-funded buildings, and troops. AI governors gather, build, recruit, and raid each other without your orders.
7. Train spearmen at your barracks. Pick a neighbor and send a raid. Armies follow a land route, resolve combat on arrival, and survivors bring carried loot home. Towers strengthen defenders. Food gifts improve relations. Warlords may attack weak players after five simulated minutes; other governors can attack in retaliation. A friendly relation of 25 or more prevents unprovoked warlord raids.

## Controls

- Drag the main map to pan; scroll or use + / − to zoom.
- **Home** centers your village. The Village and Realm map buttons switch between local and full-map views.
- **Space** pauses/resumes; 1×, 2× and 5× control simulation speed.
- **1–8** choose a building. With the blueprint active, arrow keys move it and **Enter** places it. **Escape** or right-click cancels.
- Arrow keys on the focused map pan when no blueprint is selected.
- **Chronicle** records your recruitment, construction, diplomacy and relevant battles.

## Saves and original simulator

Settlement mode saves automatically to the browser under `tiny-civ-settlement-v2`. **My realm** downloads and opens validated settlement world files. Terrain changes, resource amounts, workers' routes and cargo, construction, training, armies, and the seeded random state survive save/load. There is no background progress while the page is closed.

The original simulator is preserved at `/?mode=classic`, with its own existing save key, history replay, seed links, PNG snapshots, and WebM exports. Settlement files and Classic world files are different formats and are opened within their respective modes. The new game does not overwrite a Classic save. Timelapse export currently belongs to Classic mode.

## Development and validation

From the cloned repository:

```powershell
npm ci
npm test
npm run build
npm run dev
```

The 22 tests cover the original simulation plus large seeded realms, actual harvest/delivery timing, paid construction, placement constraints, job allocation, recruitment, AI economies, raids and loot, diplomacy, upgrade capacity preservation, hostile import validation, exact deterministic save continuation, and HUD/camera coordinate alignment. The production build uses strict TypeScript checking.

New implementation files: `src/settlement.ts` (simulation), `src/settlement-render.ts` (camera, sprites, workers and map), `src/game.ts` (controls and local persistence), and `src/game.css`. `src/classic.ts` retains the original experience; `src/main.ts` routes between modes. No new runtime dependencies were added.

Deploy `dist/` to an HTTPS static host after `npm test` and `npm run build`. No backend or environment variables are required; `PORT` optionally changes the local server port. External publication remains subject to the source-upload authorization from the first release.

This is single-player with AI rivals. Multiplayer accounts, city capture, territorial diplomacy, a combat formation system, a campaign ending, and settlement-mode timelapse are not implemented. Raids are troop-and-defense calculations after real travel, rather than individual combat AI. The NPC logistics and building work are simulated continuously and rendered directly.
