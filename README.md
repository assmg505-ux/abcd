# GUBS - We Are Gubs!

A 3D toon-shaded arcade runner for Android. Squishy jelly Gubs run, dash, stomp and climb all the way to space.
The game is HTML5 (`app/src/main/assets`) rendered with a bundled copy of three.js (r160, MIT) inside a thin WebView app.
Everything works offline. If WebGL is unavailable the game falls back to a 2D renderer.

## Look
Ink-outlined toon 3D: hazy sunset skies, long soft shadows, puffy low-poly scenery and 10 worlds
(Candy Meadow, Sunset Dunes, Neon Night, Frosty Peaks, Lava Land, Haunted Hollow, Jungle Ruins,
Crystal Gardens, Toyland, Coral Reef), plus sky, stratosphere, space and deep space as you climb.
Settings has a GRAPHICS switch (HIGH / LOW). The game drops to LOW automatically on slow devices.

## Play
- **Jump**: tap anywhere. Let go early for a small hop, hold for a big jump. Extra air jumps are a shop upgrade (double up to penta).
- **Dash**: hold to keep dashing; it drains your charge, so burn it all for one long dash. Drag up/down on the button (or slide your finger in swipe mode) to steer.
- **Slide** ducks; in the air it **slams**. The purple button (or swipe left) uses your **ability**.
- Rescue baby Gubs: the squad is unlimited, absorbs hits and multiplies your score.
- Stomp or dash enemies for combos, grab close calls, grind rails, ride moving platforms, bounce on springs, climb wind columns.
- **Boss fights**: the Grump King appears every 1,400m. Survive its attacks, then stomp its head when it dives.

## Controls
Buttons (right / left / split / custom drag layout, 3 sizes) or swipe (up jump, right dash, down slide/slam, left ability).

## Modes
Classic, Sky Climb, Time Rush, Daily Run, Zen, Boss Rush, Gub Party.

## Progress
Player level and XP, chests (level-ups and bosses), 51 trophies, daily gift, missions.
Shop: daily rotating Gub skins (36 total, common to legendary), permanent upgrades, abilities, pets (8), trails and auras.

## Build
```
export ANDROID_HOME=$HOME/android-sdk   # platform 34 + build-tools 34.0.0
./gradlew assembleDebug                  # app/build/outputs/apk/debug/app-debug.apk
```
For a Play Store release, create `keystore.properties` (git-ignored) with `storeFile`, `storePassword`,
`keyAlias`, `keyPassword`, then run `./gradlew bundleRelease`.
