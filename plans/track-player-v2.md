Alright Steve—here’s the single document you can hand to Claude and start building from. It’s the **full v1 blueprint**, including the new **instant voice switch** behavior. It’s opinionated, minimal where it should be, and explicit where bugs usually hide.

---

# Manifestation Player — v1 Build Blueprint

## 0) What we’re shipping (non-negotiables)

* Play **affirmation playlists** (2–4s clips) over a continuous **Background Sound (bed)**.
* Controls: **Gap** (1–15s, step 1s), **Shuffle** (avoid-repeat=8), **Loop** playlist, **Affirmation volume**, **Bed volume**, **Change bed mid-session** (crossfade), **Change voice instantly** (see §7).
* **No ducking** (bed never dips).
* **Background playback** (Spotify-style) and **lockscreen controls** (Play/Pause/Next/Prev + metadata).
* **Start flow**: Bed starts immediately → 3s “Breathe” overlay → first affirmation.
* **Failure policy**: 1 load >3s → skip & log; 3 consecutive failures → pause affirmations, keep bed playing, “Retry / Keep bed”.

---

## 1) Architecture overview

### Engines

* **Affirmations** → `react-native-track-player` (RNTP): queue, background service, remote controls, metadata.
* **Background Sound (bed)** → `expo-av` (`Audio.Sound`): loop-safe by default; auto-fallback to **dual-instance equal-power crossfade** at loop wrap (400ms) if gaps detected.

### Timing model

* **Gaps implemented as explicit silence tracks** between affirmation items (deterministic, background-safe).

### State & coordination

* **Zustand** store as the single source of truth (accessible from UI and headless code via getters).
* **RNTP service** ↔ **App**: mirror remote events through a tiny event bus/custom metadata to sync bed & affirmations.

---

## 2) Platform audio policy (exclusive focus)

* **iOS**: `AVAudioSessionCategoryPlayback`, **no** `mixWithOthers`, plays in silent mode.
* **Android**: request `AUDIOFOCUS_GAIN`. Pause on unplug. Auto-resume after transient loss if user didn’t manually pause.

---

## 3) Media standards

* **Affirmations**: AAC/M4A @ **96–128 kbps**, 44.1 kHz, **−16 LUFS**, TP ≤ −1 dBTP.
* **Beds**: AAC or MP3 @ ~**96 kbps**, 44.1 kHz, **≈ −24 LUFS**, TP ≤ −1 dBTP. Prefer **loop-safe 30s** clips (trim to zero-crossings @ 44.1 kHz).
* **CDN**: signed URLs (TTL ≥ **2–4h**), **content-hash** filenames.

**Server pipeline:** TTS → WAV → EBU R128 two-pass `loudnorm` → encode → store. Persist: `loudnessLUFS`, `durationSec`, `hash`.

---

## 4) Caching & soft-offline (SQLite, not JSON)

* **SQLite cache index** (atomic & queryable):

  ```sql
  CREATE TABLE IF NOT EXISTS audio_cache (
    remote_url TEXT PRIMARY KEY,
    local_uri  TEXT NOT NULL,
    file_size  INTEGER NOT NULL,
    last_used_at INTEGER NOT NULL,
    hash TEXT,
    protected INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_cache_last_used ON audio_cache(last_used_at);
  ```
* **Caps**: Beds ≈ **100 MB**; Affirmations ≈ **350 MB**; never evict **current bed** or **next 3** affirmations.
* **Prefetch**: **next 8** affirmations or **~180s**, **concurrency = 4**.
* **Eviction** (transactional LRU), protect current+next3 before delete.

---

## 5) Data model (server)

```ts
Affirmation { id, text, language, tags[], createdAt, updatedAt }
Voice { id, name, provider, style, sampleRate, bitrate, isDefault }
AudioVariant { id, affirmationId, voiceId, url, durationSec, hash, loudnessLUFS, sampleRate, bitrate, status }
Playlist { id, title, description, isPublic, coverImageUrl, ownerId? }
PlaylistAffirmation { playlistId, affirmationId, order, weight? }
BackgroundSound { id, title, type: 'loopSafe'|'longForm', url, durationSec, hash, loudnessLUFS, sampleRate, bitrate, loopCrossfadeMsDefault: 400 }
UserSettings { userId, defaultVoiceId?, backgroundSoundId, gapSeconds (1..15), affirmVolume (0..1), bedVolume (0..1), shuffle, loop }
```

---

## 6) API surface (lean)

* `GET /playlists/:id` → playlist meta + ordered affirmation IDs.
* `POST /session/resolve { playlistId, voiceId?, shuffle?, avoidLastN?: number }`

  * → `{ items: [{ affirmationId, audioUrl, durationSec, hash, loudnessLUFS }], backgroundSound: { id, url, type } }`
* `GET /background-sounds`
* (later) `/uploads/signed-url` (user recordings)

**URL policy:** TTL ≥ 2–4h. On **403** for non-cached item: re-resolve, retry once, else skip & log.

---

## 7) Instant **Voice Switch** design

### Session plan (voice-agnostic)

```ts
type SessionItem = { kind: 'affirmation'; affirmationId: string }
                 | { kind: 'gap'; seconds: number };

type SessionPlan = { items: SessionItem[]; avoidRepeatWindow: 8 };
```

### On playback, **materialize** tracks for RNTP

* Affirmations mapped to `(affirmationId, currentVoiceId) -> url` (signed)
* Gaps materialized as local silence assets (N× 1s).

### **Switch voice** behavior

* If **affirmation is playing**:

  1. Resolve new `url` for **same affirmation** + **new voice**.
  2. **Replace** current RNTP track at `currentIndex` with the new voice track and `skipToTrack(currentIndex); play()`.
  3. **Rebind tail**: replace URLs for upcoming affirmation tracks to the new voice (update next ~8 now; lazy update rest).
* If **gap is playing**:

  1. **Skip gap** to next affirmation.
  2. Replace that track with the new voice URL; `skipToTrack(nextAffIndex); play()`.
  3. Rebind tail as above.

**Debounce** rapid toggles (150–250ms). If variant resolve fails, retry via re-resolve once; otherwise fall back to previous voice for that item.

### Data access for variants

* Either `/session/resolve` includes a **small variant map** for the next chunk, or expose a **fast** `/audio-variant?affirmationId=&voiceId=` endpoint for on-demand signed URL minting.

---

## 8) Queue rules (RNTP)

### Build

* RNTP queue = `A1, GAPxN, A2, GAPxN, …` (where N = gapSeconds).
* Maintain helpers:

  * `replaceTrackAt(index, track)`
  * `skipOverGaps(direction)` – remote Next/Prev jump to nearest **affirmation**
  * `rebuildTailFrom(idx, newGap)` – remove downstream gaps, add new ones (batch ops), never touch current item
  * `rebindTailToVoice(fromIdx, voiceId, count=12)` – replace affirmation URLs from `fromIdx` forward

### Shuffle

* Fisher–Yates over **affirmation items**, then interleave gaps.
* **Avoid-repeat window = 8**; shrinks automatically if playlist small.

---

## 9) Bed loop engine (Expo AV)

### Default

* Single instance: `isLooping: true` with loop-safe file.

### Auto-fallback (dual instance)

* If measured discontinuity > ~10–20ms (or device in denylist), use **ping-pong**:

  * Instance A plays; at `duration - crossfadeMs`, start B at 0 (vol 0); equal-power crossfade 400ms; swap roles.

### Mid-session bed change

* Crossfade old → new bed over **400ms**; bed volume persists.

---

## 10) Prefetch manager (concurrency, protection)

* **Next 8** affirmation files or **~180s**, **concurrency = 4**.
* Always **protect**: current bed + next 3 affirmations from eviction.
* On track advance: bump `last_used_at`; schedule more prefetch if buffer < threshold.
* Reads/writes to SQLite (`audio_cache`); always prefer `local_uri` if present.

---

## 11) Lock screen metadata

Update per affirmation:

```ts
TrackPlayer.updateMetadataForTrack(trackId, {
  title: affirmation.text,
  artist: playlist.title,
  artwork: playlist.coverImageUrl
});
```

---

## 12) Error handling

* **Single failure**: if load/start > **3000ms**, skip & log `{ code, url, networkType, cacheHit }`.
* **3 consecutive failures**: pause affirmations, keep bed, show toast: “Connection issue — Retry / Keep bed”.
* **403** non-cached: `/session/resolve`, retry once, else skip.

---

## 13) Minimal state (Zustand)

```ts
type PlayerState = {
  isPlaying: boolean
  currentIndex: number
  gapSeconds: 1|2|...|15
  shuffle: boolean
  loop: boolean
  affirmVolume: number   // 0..1
  bedVolume: number      // 0..1
  backgroundSoundId: string
  voiceId: string
  // actions
  play(): Promise<void>
  pause(): Promise<void>
  next(): Promise<void>
  previous(): Promise<void>
  setGap(g: number): Promise<void>
  setVolumes(a: number, b: number): Promise<void>
  setBed(id: string): Promise<void>
  switchVoice(newVoiceId: string): Promise<void> // instant audition logic
}
```

Persist with AsyncStorage; hydrate on launch.

---

## 14) Pseudocode snippets (just enough to implement)

### A) Voice switch (affirmation playing)

```ts
async function switchVoice(newVoiceId: string) {
  const { currentIndex, voiceId } = usePlayerStore.getState()
  if (newVoiceId === voiceId) return
  usePlayerStore.setState({ voiceId: newVoiceId })

  const track = await TrackPlayer.getTrack(currentIndex)
  if (track?.kind === 'affirmation') {
    const aId = track.affirmationId
    const variant = await resolveVariant(aId, newVoiceId) // fast signed URL
    await TrackPlayer.remove([currentIndex])
    await TrackPlayer.add(materializeAffTrack(aId, variant), currentIndex)
    await TrackPlayer.skip(currentIndex)
    await TrackPlayer.play()
    await rebindTailToVoice(currentIndex + 1, newVoiceId, 12)
  } else {
    const nextAffIdx = findNextAffirmationIndex(currentIndex)
    const aId = (await TrackPlayer.getTrack(nextAffIdx)).affirmationId
    const variant = await resolveVariant(aId, newVoiceId)
    await TrackPlayer.remove([nextAffIdx])
    await TrackPlayer.add(materializeAffTrack(aId, variant), nextAffIdx)
    await TrackPlayer.skip(nextAffIdx)
    await TrackPlayer.play()
    await rebindTailToVoice(nextAffIdx + 1, newVoiceId, 12)
  }
}
```

### B) Build queue with gaps

```ts
function buildQueue(plan: SessionPlan, voiceId: string): Track[] {
  const out: Track[] = []
  for (const item of plan.items) {
    if (item.kind === 'affirmation') {
      const v = resolveVariantSyncOrPlaceholder(item.affirmationId, voiceId)
      out.push(materializeAffTrack(item.affirmationId, v))
    } else {
      out.push(...materializeGap(item.seconds)) // N × 1s silence
    }
  }
  return out
}
```

### C) Bed dual-instance loop (concept)

```ts
async function startBed(uri: string, loopSafe: boolean, vol: number) {
  if (loopSafe) return startSingleLoop(uri, vol)
  await startPingPongLoop(uri, vol) // A/B crossfade every wrap
}
```

---

## 15) Test matrix (catch real regressions)

1. **Bed loop soak** (Android mid-range): 10 min single-instance → ensure no clicks; verify auto-fallback works.
2. **Gap change mid-play**: 5s→12s while playing; rebuild tail; no stutter.
3. **Instant voice switch**: during affirmation → swaps immediately; during gap → skips to next affirmation.
4. **403 expiry** mid-session: re-resolve + retry transparent to user.
5. **Offline dip**: play from cache; prefetch resumes on reconnect.
6. **Remote controls**: Next/Prev skip **over gaps** to affirmations; metadata updates.
7. **Two-hour soak**: memory stable; battery acceptable.

---

## 16) Build order (milestones)

**M1 — Core playback**

* RNTP queue w/ gaps (fixed 5s), Expo-AV bed (single loop), exclusive focus, lockscreen metadata, 3s breathe start.

**M2 — Robustness**

* SQLite cache index + PrefetchManager (8/4), LRU protection, signed URL TTL 2–4h + 403 refresh.

**M3 — Voice & Bed polish**

* Instant **voice switch** (replace current + rebind tail), bed crossfade on change, dual-instance fallback for non-loop-safe.

**M4 — Failure handling & QA**

* 3-fail halt policy; debug loop harness; test matrix runs; perf polish.

---

## 17) What we’re intentionally **not** building in v1

* No ducking, no crossfades between affirmations, no multi-bed layering, no full “download playlist” UX, no local SQLite mirror for content (cache only), no analytics dashboards (only minimal error logs).

---

## 18) Open (not blocking)

* Micro-crossfade between affirmations if you later allow **0s gap**.
* Per-affirmation personal volume deltas (can be DB column later).
* User recordings (private uploads + normalization).
* Dynamic bed packs (seasonal SKUs/paths).

---

If Claude follows this doc, you’ll get a stable, elegant v1 with instant voice switching, tight timing, and no hidden dragons. When you’re ready, I can generate the starter files (store, RNTP service handlers, bed loop module, prefetch/SQLite helpers) exactly to this spec.

Absolutely—here’s a **phased implementation plan** you and Claude can follow step-by-step. Each phase has: **goal**, **scope**, **deliverables**, **app/server tasks**, **QA/DoD**, **feature flags/rollback**, and **dependencies**. No dates—just a clean sequencing so you can ship confidently.

---

# Phase 0 — Project Skeleton & Standards (Foundations)

**Goal:** Establish a stable base so later phases don’t churn.

**Scope**

* Install & configure: `react-native-track-player`, `expo-av`, `expo-file-system`, `@react-native-async-storage/async-storage`, `expo-sqlite`, `zustand`, `@tanstack/react-query`.
* App structure (`src/audio`, `src/state`, `src/services`, `src/lib/sqlite`, `src/screens`).
* iOS/Android audio session **exclusive focus** (no mixing).
* Env/config: CDN base, API base, signed URL TTL (2–4h).

**Deliverables**

* `playerStore` (Zustand) skeleton with persisted defaults.
* `trackPlayerService` registered, background + remote handlers wired.
* `BedPlayer` module with **single-instance loop** (no crossfade yet).
* Error/logging shim (console + optional `/logs` endpoint stub).
* Minimal **Now Playing** screen (transport, volumes, gap control UI).

**Server**

* Stubs for `/playlists/:id`, `/session/resolve`, `/background-sounds`.
* CORS, auth interceptor (if needed), consistent error payloads.

**QA / DoD**

* App builds on iOS/Android (device + sim), background audio works, lockscreen shows controls.
* Starting/stopping playback pauses other apps.
* Basic play/pause/next/prev via remote works.

**Feature flags**

* `FF_BED_DUAL_INSTANCE=false`
* `FF_PREFETCH=false` (enable next phase)

**Dependencies**

* None.

---

# Phase 1 — Core Playback Happy Path

**Goal:** Deterministic queue with gap tracks; bed continuous; metadata on lockscreen.

**Scope**

* **Gaps as explicit tracks**: build queue `A1, GAPxN, A2, ...` (N=gapSeconds).
* Shuffle (Fisher–Yates) + **avoid-repeat window=8** (auto-shrink for small lists).
* Lock screen metadata: title=affirmation text, artist=playlist title, artwork=cover.
* 3s “Breathe” overlay on start (bed starts immediately).

**Deliverables**

* `QueueBuilder.build(plan, voiceId)` returns RNTP tracks.
* Helpers: `replaceTrackAt`, `skipOverGaps`, `rebuildTailFrom`.
* `SessionPlan` (voice-agnostic) creation from playlist.

**Server**

* `/session/resolve` returns ordered affirmation items (+ bed selection).

**QA / DoD**

* Gap accuracy within ±100ms.
* Remote Next/Prev **skip gaps** correctly.
* Backgrounding retains correct state; resume works.
* Start flow: bed → breathe → first affirmation.

**Feature flags**

* `FF_GAP_TRACKS=true`
* `FF_METADATA=true`

**Dependencies**

* Phase 0.

---

# Phase 2 — Caching & Soft-Offline (SQLite + Prefetch)

**Goal:** Seamless playback on spotty networks with robust, crash-safe cache.

**Scope**

* **SQLite cache index** (not JSON):

  ```sql
  CREATE TABLE IF NOT EXISTS audio_cache (
    remote_url TEXT PRIMARY KEY,
    local_uri TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    last_used_at INTEGER NOT NULL,
    hash TEXT,
    protected INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_cache_last_used ON audio_cache(last_used_at);
  ```
* **PrefetchManager**:

  * Prefetch **next 8** affirmations or **~180s**, **concurrency=4**.
  * Protect current bed + next 3 affirmations from eviction.
  * Transactional LRU eviction to caps (Beds≈100MB, Affirm≈350MB).
* URL 403 refresh path: re-resolve & retry once.

**Deliverables**

* `AudioCache` lib (get/set/protect/evict).
* Prefetch triggers on track advance; respects cellular; small concurrency cap.

**Server**

* Signed URL **TTL ≥ 2–4h** (confirm).
* `/session/resolve` fast enough for refresh path.

**QA / DoD**

* Offline mid-session → continue from cache; prefetch resumes on reconnect.
* LRU never evicts current bed or next 3.
* Simulated 403 → transparent refresh, no user disruption.

**Feature flags**

* `FF_PREFETCH=true`

**Dependencies**

* Phases 0–1.

---

# Phase 3 — Bed Hardening & Crossfade

**Goal:** Guarantee continuous bed across devices; smooth bed switching.

**Scope**

* **Dual-instance ping-pong** fallback with **equal-power crossfade (400ms)**:

  * Auto-detect loop discontinuity (>10–20ms) → enable fallback.
  * Device denylist support (force fallback on known models).
* Bed change crossfade (old→new bed over 400ms).

**Deliverables**

* `BedPlayer` v2:

  * `start(uri, loopSafe)` chooses single vs dual-instance.
  * `switch(uri, loopSafe, crossfadeMs=400)` crossfades mid-session.
  * QA harness (hidden screen) to soak-test loops.

**QA / DoD**

* 10-minute loop soak on mid-tier Android with no clicks (in fallback).
* 10 rapid bed switches in 30s → no artifacts/leaks.

**Feature flags**

* `FF_BED_DUAL_INSTANCE=true` (toggle on by device/setting).

**Dependencies**

* Phases 0–2.

---

# Phase 4 — Instant Voice Switch (Audition & Rebind Tail)

**Goal:** Mid-session voice change is instant and predictable.

**Scope**

* **Voice-agnostic SessionPlan** retained; RNTP materialization updated **just-in-time**.
* On switch:

  * If playing **affirmation**: replace current track with same affirmation in new voice, `skipToTrack(currentIndex)`, `play()`.
  * If playing **gap**: skip gap, replace next affirmation with new voice, jump & play.
  * **Rebind tail**: update URLs for next ~8 affirmation tracks; lazy update rest.
* Debounce rapid toggles (150–250ms).
* Optional: prefetch 1–2 upcoming items for hovered voice in voice picker.

**Deliverables**

* `switchVoice(newVoiceId)` action in store implementing the above.
* `rebindTailToVoice(fromIdx, voiceId, count=12)` helper.

**Server**

* Either include fast variant lookup in `/session/resolve` response for next chunk, or add `/audio-variant?affirmationId=&voiceId=` for fast signed URL minting.

**QA / DoD**

* Switching during affirmation: **instant** swap; plays from start of same line.
* Switching during gap: jumps to **next** affirmation in new voice.
* Tail rebinding is smooth; no stutter.

**Feature flags**

* `FF_VOICE_SWITCH=true`

**Dependencies**

* Phases 0–2 (3 optional).

---

# Phase 5 — Failure Policy & Polish

**Goal:** Graceful degradation on repeated failures; UX polish; soak stability.

**Scope**

* **3-fail halt policy**: after 3 consecutive load failures → pause affirmations, keep bed playing, toast “Connection issue — Retry / Keep bed.”
* Robust remote metadata updates (cover/title) per track.
* Haptics on play/pause/skip; settings persistence; Recently Played hook on app start.

**Deliverables**

* Failure counters + reset logic.
* “Retry / Keep bed” flow.

**QA / DoD**

* Simulate 5 bad URLs → halt after 3, flows work.
* 2-hour soak: memory steady, battery within expectation.

**Feature flags**

* `FF_FAILURE_POLICY=true`

**Dependencies**

* Phases 0–4.

---

## Cross-phase Assets & Contracts

**Types**

```ts
type SessionItem = { kind: 'affirmation'; affirmationId: string }
                 | { kind: 'gap'; seconds: number }

type Variant = { url: string; durationSec: number; hash: string; lufs: number; sampleUrl?: string }
```

**Store (essentials)**

```ts
// persisted defaults: gap=5, shuffle=true, loop=true, volumes 0.8/0.5
voiceId: string
backgroundSoundId: string
gapSeconds: 1|...|15
affirmVolume: number
bedVolume: number
isPlaying: boolean
currentIndex: number
shuffle: boolean
loop: boolean

play/pause/next/previous()
setGap(n: number)           // rebuild tail only
setVolumes(a: number, b: number)
setBed(id: string)          // crossfade bed
switchVoice(newVoiceId: string) // instant audition, rebind tail
```

**Queue Helpers**

* `buildQueue(plan, voiceId)` → Track[]
* `replaceTrackAt(index, track)`
* `skipOverGaps(direction)`
* `rebuildTailFrom(index, newGap)`
* `rebindTailToVoice(fromIndex, voiceId, count=12)`

**Prefetch**

* Target **8** items / **~180s**, **concurrency=4**, protect current bed + next3.

**CDN/URLs**

* Signed URL TTL ≥ **2–4h**.
* On **403, not cached** → re-resolve; retry once → skip & log.

---

## QA Matrix (cumulative; run at end of each phase)

1. **Gap accuracy** (±100ms) across devices.
2. **Loop soak** (10 min) + **rapid bed switch** test.
3. **Voice switch** during affirmation & during gap.
4. **Offline dip** mid-session; recovery on reconnect.
5. **Consecutive failures** halt/continue behavior.
6. **Lockscreen controls** & metadata correctness.
7. **2-hour soak** (memory & battery).

---

## Kill Switches / Rollback

* `FF_BED_DUAL_INSTANCE` → disable fallback if it misbehaves (revert to single loop).
* `FF_PREFETCH` → disable prefetch if it causes stalls.
* `FF_VOICE_SWITCH` → revert to static voice per session if issues arise.
* `FF_FAILURE_POLICY` → revert to simple skip-on-error if needed.

---

## Open (non-blocking) after v1

* **0s gap mode** with micro-crossfade between affirmations (200ms).
* Weighted shuffle; per-affirmation personal gain.
* Full “Download playlist” UX (pin/unpin).
* User recordings (uploads + normalization).
* Seasonal/dynamic bed packs.

---

This phased plan keeps you shipping value **every phase**, while derisking the known dragons (loop gaps, cache integrity, mid-session voice switching). Hand this to Claude and start with **Phase 0 → Phase 1**; each phase ends with a verifiable DoD so you don’t slide.
s