# GUBS - We Are Gubs!

An arcade runner for Android. Squishy jelly Gubs run, dash, stomp and climb all the way to space.
The game is plain HTML5 canvas (`app/src/main/assets`) wrapped in a thin WebView app.

## Play
- **Jump**: tap anywhere. Let go early for a small hop, hold for a big jump. Extra air jumps are a shop upgrade (double up to penta jump).
- **Dash**: hold to keep dashing; it drains your charge, so burn it all for one long dash. Drag up/down on the button (or slide your finger in swipe mode) to steer. Upgrades: recharge, length, speed, strength, upward lift.
- **Slide** ducks; in the air it **slams**.
- **Ability** button (or swipe left): shield, time warp, coin vacuum, bomb, rocket, phase, squad call.
- Rescue baby Gubs: the squad is unlimited, absorbs hits and multiplies your score.
- Climb springs, wind and cloud platforms up through the sky, stratosphere and space.

## Controls
Settings lets you switch between **buttons** (right / left / split / fully custom drag layout, 3 sizes)
and **swipe** controls (up jump, right dash, down slide/slam, left ability).

## Modes
Classic, Sky Climb, Time Rush (60s), Daily Run (seeded), Zen.

## Shop
Daily rotating Gub skins (common to legendary, with a daily deal and reroll), permanent upgrades,
equippable abilities, trails and auras.

## Build
```
export ANDROID_HOME=$HOME/android-sdk   # platform 34 + build-tools 34.0.0
./gradlew assembleDebug                  # app/build/outputs/apk/debug/app-debug.apk
```
For a Play Store release, create `keystore.properties` (git-ignored) with `storeFile`, `storePassword`,
`keyAlias`, `keyPassword`, then run `./gradlew bundleRelease`.
