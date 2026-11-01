# Validation

## v3 multiplayer and progression

- Strict TypeScript checking and production build pass. All 29 automated tests pass, including automatic builder assignment and actual construction completion for a second human city.
- Five real WebSocket clients join one room, receive shared state, and issue commands. A sixth is rejected. Another seed has separate state.
- Cross-owner building commands are rejected. Player ownership comes from the session even when a command supplies a forged owner.
- Reserved names require their reconnect key; reconnect restores a village. Host restart reloads the world, player slots, and troops from an atomic save.
- Unit tests verify deployment, movement, return to reserve, actual unit damage and death, siege loot/recovery/protection, advanced recruitment unlocks, research time/cost, and validated military save continuation.
- Two in-app browser clients joined the same PC host through the live public Cloudflare tunnel. Each received a distinct village; both deployed visible soldiers and the second client selected its own five soldiers after the host confirmed deployment.
- Browser box-selection and a right-click formation move returned a confirmed movement order. The war room showed both players and the shared invitation fields.
- The public tunnel health endpoint returned the game protocol successfully. The downloaded cloudflared executable has a valid Cloudflare Authenticode signature.
- A separate public-tunnel probe joined five simultaneous WebSocket clients with the Pages origin, rejected a sixth, and confirmed the fifth player's deployment on the authoritative map. This verifies the internet tunnel path with automated clients, rather than five humans on separate networks.
- GitHub CI passed all 29 tests and the production build on the uploaded release.
- Source uses relative asset paths, and a compiled Pages client is packaged under docs/. GitHub Pages activation and hosted-client verification are recorded separately from local checks.
- These checks do not establish five-human remote latency, long-duration internet uptime, a complete security/accessibility audit, or real-device/cross-browser coverage. Guest login has no account recovery. The temporary tunnel depends on the PC remaining online.

## Earlier releases

## v2.1 graphics and game HUD

- Strict TypeScript and production build pass; all 22 tests pass, including HUD/camera offset round-trip tests.
- Local Chromium rendering checked with the new textured terrain, trees, ore, buildings, workers, illustrated construction buttons and resource icons.
- Full-window layout checked at desktop and 390 × 844 CSS pixels. DOM dimensions confirm the phone layout is 390 × 844 with no outer document overflow; orders/history scroll inside their panel.
- Existing building inspection, command-panel visibility, and responsive controls exercised in the browser. The fullscreen control uses the browser API with an explicit unavailable/error state; native fullscreen availability depends on the embedding browser.
- Art is generated in Canvas from editable local code. No image-generation service, external asset pack, new runtime dependency, or new save format was introduced. This remains local Chromium verification, not a full accessibility or cross-browser audit.

## v2 settlement game

- Production build and strict TypeScript checks pass.
- All 20 tests pass, including the original nine tests and eleven settlement tests.
- Browser checks verified live resource deliveries, keyboard placement of a lumber camp, builder reassignment, construction progressing to completion, recruitment queues, realm view, a visit to an actual AI city, and a food gift changing relations.
- The original simulator remains available as Classic mode with a separate save. Settlement export uses a validated JSON file; video timelapse remains in Classic mode.
- Testing is local Chromium and engine-level verification. Real-device, cross-browser and full accessibility audits remain unrun. NPC work and travel are real simulation state; battles resolve numerically, and the other players are AI governors.

## Automated

- Strict TypeScript checking and Vite production build.
- Node simulation tests: seeded determinism; both map types and tribe counts; legal placements and tribe limit; resource and war invariants across three 1,000-year simulations; collapse; saved-state deterministic continuation; malformed or injectable import rejection; tile adjacency; compact-history snapshot isolation.

## Browser checks

Verified in the in-app Chromium browser against the local Vite preview:

- Map rendering and autonomous population/territory updates.
- Pause, civilization selection, and actual resource inspection.
- Timeline keyboard scrubbing restores historical statistics and events.
- Chronicle displays generated founding, growth, nature, and war events.
- Custom seed, archipelago, and three starting tribes create a new world.
- Responsive layout at a 390 × 844 viewport, including a fully fitted map and working playback controls.
- Real eight-second WebM downloaded (1,075,976 bytes in the first smoke check).
- Real PNG map downloaded (426,472 bytes in the first smoke check).
- Packaged app starts directly from the requested Tiny CIV folder with `npm start`, without node_modules.
- Seed link copied to clipboard; exact-state JSON world file downloaded successfully.

These checks establish local browser behavior. They are not a complete cross-browser, real-device, accessibility, security, or production-load audit. Video encoding and download UX vary by browser. These earlier checks cover the browser-only Classic simulator.
