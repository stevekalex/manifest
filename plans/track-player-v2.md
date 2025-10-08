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

### Current Available APIs (Backend Ready)
* `GET /playlists/:playlistId/manifestations` → **ALL voice variants loaded** + playlist items
  ```ts
  {
    manifestations: [{ 
      position: number,
      manifestations: {
        id: string,
        content: string, 
        audio_versions: [{ voice_id: string, cdn_url: string, cdn_key: string }]
      }
    }],
    total: number
  }
  ```
* `GET /settings` + `PUT /settings` → user preferences (needs voice_preference field added)

### APIs to Create  
* `GET /background-sounds` → available ambient tracks for bed audio
  ```ts
  {
    background_sounds: [{
      id: string,
      title: string,
      type: 'loopSafe' | 'longForm',
      url: string,
      duration_sec: number,
      loop_crossfade_ms: 400,
      loudness_lufs: number
    }]
  }
  ```

### Resolution Strategy (Frontend-Based)
**Use FE resolution instead of `/session/resolve`** for instant voice switching:
1. Fetch playlist + all voice variants via existing `/playlists/:playlistId/manifestations`
2. Frontend creates voice-agnostic SessionPlan locally
3. Frontend materializes RNTP queues for current voice on-demand
4. Voice switching = instant local re-materialization (no API calls)

**URL policy:** TTL ≥ 2–4h. On **403** for non-cached item: refetch playlist data, retry once, else skip & log.

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

**Frontend-based voice variant management:**
* Load ALL voice variants upfront via `/playlists/:playlistId/manifestations` 
* Cache voice variant URLs locally in Zustand store
* Voice switching uses cached URLs (no API latency)
* Refresh variant URLs when 403 detected (batch refetch playlist data)

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

# 🚨 CRITICAL TECHNICAL RISKS IDENTIFIED

## FUNDAMENTAL ARCHITECTURE RISKS
1. **Dual-Engine Audio Coexistence**: RNTP + Expo AV may conflict on iOS/Android audio focus
2. **RNTP Queue Manipulation**: Real-time queue editing during playback is notoriously unreliable  
3. **Memory Explosion**: Loading all voice variants (50×6×2MB = 600MB+) will trigger OS kills
4. **Background Service Complexity**: SQLite + dual engines + state sync across app/service boundary

## SHOW-STOPPER QUESTIONS TO VALIDATE
- Can RNTP + Expo AV actually play simultaneously without audio focus conflicts?
- Does RNTP `remove()` + `add()` + `skip()` work reliably during background playback?
- What's the real memory limit before OS kills the app?
- How large are actual voice variant datasets from existing backend?

---

# REVISED PHASED IMPLEMENTATION PLAN

Each phase now includes **Core Assumptions to Test** and **Go/No-Go Decision Points**.

---

# Phase -1 — PROOF OF CONCEPT (MANDATORY GATE)

**Goal:** Prove the fundamental dual-engine architecture is technically possible.

**Core Assumptions to Test:**
1. ✅ RNTP + Expo AV can play simultaneously without audio session conflicts
2. ✅ Both engines maintain audio focus during backgrounding/interruptions  
3. ✅ Remote controls work correctly with dual engines
4. ✅ No memory leaks or crashes during 30-minute continuous playback

**Scope**
* Minimal test app: RNTP plays 30s loop + Expo AV plays background bed
* Test on iOS/Android, multiple devices (high-end + budget)
* Background service with both engines active
* Phone call interruption + resume testing

**Deliverables**
* Working dual-engine test app
* Device compatibility matrix
* Audio session configuration that works reliably
* **Go/No-Go Decision**: If dual engines don't work → pivot to single-engine architecture

**QA / DoD**
* 30-minute soak test on 3+ devices with no crashes
* Phone call interruption + clean resume
* App backgrounding + foregrounding maintains both audio streams
* Remote controls affect correct engine

**Dependencies**
* None - this validates the entire plan's feasibility

**Timeline Estimate:** 1 week

---

# Phase 0 — Project Skeleton & Standards (Foundations)

**Goal:** Establish stable foundation with proven dual-engine configuration.

**Core Assumptions to Test:**
1. ✅ Audio session configuration from Phase -1 works in full app context
2. ✅ Background service registration works reliably across app restarts
3. ✅ Remote control handling doesn't conflict between engines
4. ✅ Zustand store persists correctly across app lifecycle

**Scope**
* Install & configure: `react-native-track-player`, `expo-av`, `expo-file-system`, `@react-native-async-storage/async-storage`, `expo-sqlite`, `zustand`, `@tanstack/react-query`
* App structure (`src/audio`, `src/state`, `src/services`, `src/lib/sqlite`, `src/screens`)
* **Validated audio session config** from Phase -1
* Env/config: CDN base, API base, signed URL TTL (2–4h)

**Deliverables**
* `playerStore` (Zustand) skeleton with persisted defaults
* `trackPlayerService` registered with **validated background handlers**
* `BedPlayer` module with **single-instance loop** (using Phase -1 config)
* Error/logging shim (console + optional `/logs` endpoint stub)
* Minimal **Now Playing** screen (transport, volumes, gap control UI)

**Server**
* Stubs for `/background-sounds` API (main missing piece)
* `/playlists/:playlistId/manifestations` already exists with voice variants
* Add `voice_preference` field to `/settings` endpoint
* CORS, auth interceptor (if needed), consistent error payloads

**QA / DoD**
* App builds on iOS/Android (device + sim), background audio works, lockscreen shows controls
* Starting/stopping playback pauses other apps (audio focus working)
* Basic play/pause/next/prev via remote works without conflicts
* **Stress test**: 100 app restarts maintain service registration

**Feature Flags & Kill Switches**
* `FF_DUAL_ENGINE=true` (revert to single engine if issues)
* `FF_BED_DUAL_INSTANCE=false`
* `FF_PREFETCH=false`

**Dependencies**
* Phase -1 must pass with Go decision

**Timeline Estimate:** 2 weeks

---

# Phase 1 — Core Playback + Gap Implementation (Single Voice Only)

**Goal:** Deterministic queue with gap tracks; bed continuous; metadata on lockscreen. **SIMPLIFIED: Single voice only**.

**Core Assumptions to Test:**
1. ✅ Gap tracks (explicit silence) work correctly in RNTP queue
2. ✅ Remote Next/Prev can skip over gaps reliably
3. ✅ Metadata updates work correctly during gap transitions
4. ✅ Fisher-Yates shuffle with gap insertion is performant and correct
5. ✅ 3s "Breathe" overlay timing doesn't interfere with bed start

**Scope**
* **Gaps as explicit tracks**: build queue `A1, GAPxN, A2, ...` (N=gapSeconds)
* Generate silence tracks for gaps: 1s, 2s, 3s... up to 15s
* Shuffle (Fisher–Yates) + **avoid-repeat window=8** (auto-shrink for small lists)
* Lock screen metadata: title=affirmation text, artist=playlist title, artwork=cover
* 3s "Breathe" overlay on start (bed starts immediately)
* **SINGLE VOICE ONLY** - defer voice switching complexity

**Deliverables**
* `QueueBuilder.build(plan, voiceId)` returns RNTP tracks
* `GapGenerator.createSilenceTracks()` - generates/caches silence files
* Helpers: `skipOverGaps`, `rebuildTailFrom` (simplified for single voice)
* `SessionPlan` (voice-agnostic) creation from playlist

**Server**
* `/background-sounds` API implementation (bed selection)
* Use existing `/playlists/:playlistId/manifestations` for single voice variants

**QA / DoD**
* Gap accuracy within ±100ms on multiple devices
* Remote Next/Prev **skip gaps** correctly (no playing silence)
* Backgrounding retains correct state; resume works
* Start flow: bed → breathe → first affirmation
* **Stress test**: 2-hour continuous playback with shuffle + gaps
* Metadata shows correct affirmation text (not gap info)

**Feature Flags & Kill Switches**
* `FF_GAP_TRACKS=true` (revert to timer-based gaps)
* `FF_METADATA=true`
* `FF_SHUFFLE=true`

**Dependencies**
* Phase 0 passed

**Timeline Estimate:** 3 weeks

---

# Phase 2 — Memory Management + Voice Data Analysis

**Goal:** Understand real-world memory constraints and implement safe caching before attempting voice switching.

**Core Assumptions to Test:**
1. ✅ SQLite works reliably across app/background service boundary
2. ✅ LRU eviction works correctly under memory pressure
3. ✅ Voice variant dataset size is manageable (measure actual data)
4. ✅ Cache corruption recovery works during unexpected app termination
5. ✅ Prefetch concurrency doesn't overwhelm device or network

**Scope**
* **Real Voice Data Analysis**: Load actual `/playlists/:playlistId/manifestations` data and measure memory usage
* **SQLite cache index** with proper transaction boundaries:
  ```sql
  CREATE TABLE IF NOT EXISTS audio_cache (
    remote_url TEXT PRIMARY KEY,
    local_uri TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    last_used_at INTEGER NOT NULL,
    hash TEXT,
    protected INTEGER DEFAULT 0
  );
  ```
* **Conservative PrefetchManager**: Start with **next 3** affirmations, **concurrency=2**
* **Memory monitoring**: Track actual memory usage during caching
* URL 403 refresh path: re-resolve & retry once

**Deliverables**
* `VoiceDataAnalyzer` - measures real backend response sizes and memory impact
* `AudioCache` lib with transaction safety and corruption recovery
* `MemoryMonitor` - tracks cache memory usage and triggers eviction
* Conservative prefetch implementation (expand later if safe)

**Server**
* Signed URL **TTL ≥ 2–4h** (confirm with backend team)
* `/playlists/:playlistId/manifestations` performance optimization if needed

**QA / DoD**
* **Memory Analysis**: Document actual memory usage with 50+ manifestations
* Offline mid-session → continue from cache; prefetch resumes on reconnect
* LRU never evicts current bed or next 3 protected items
* Simulated 403 → transparent refresh, no user disruption
* **Corruption test**: Force-quit app during cache operations, verify recovery
* **Memory pressure test**: Load maximum reasonable voice data, verify no OS kills

**Feature Flags & Kill Switches**
* `FF_SQLITE_CACHE=true` (revert to in-memory cache)
* `FF_PREFETCH=true`
* `FF_MEMORY_MONITORING=true`

**Dependencies**
* Phases 0–1 passed

**Timeline Estimate:** 3-4 weeks

---

# Phase 3 — Queue Manipulation Validation (Critical Gate)

**Goal:** Prove RNTP queue manipulation works reliably before building voice switching on top.

**Core Assumptions to Test:**
1. ✅ `TrackPlayer.remove()` + `add()` + `skip()` works during background playback
2. ✅ Queue manipulation doesn't cause crashes or audio interruptions
3. ✅ Index tracking remains correct after queue modifications
4. ✅ Remote controls work correctly after queue changes
5. ✅ Background service handles queue manipulation without memory leaks

**Scope**
* **RNTP Queue Manipulation Testing**: Extensive testing of real-time queue editing
* Build test harness for queue operations during playback
* Validate `replaceTrackAt()` helper works reliably
* Test queue rebuilding under various conditions (backgrounded, during calls, etc.)
* **NO voice switching yet** - just prove the underlying mechanism works

**Deliverables**
* `QueueManipulator` lib with safe queue editing operations
* `QueueTestHarness` - stress tests queue operations
* `replaceTrackAt()`, `insertTrackAt()`, `removeTrackRange()` helpers
* Documentation of RNTP queue manipulation limitations and workarounds

**QA / DoD**
* **Stress test**: 1000 queue manipulations during 30-min playback, no crashes
* Queue manipulation during phone calls, app backgrounding, audio interruptions
* Index tracking remains accurate across all operations
* Remote controls work correctly after any queue modification
* **Go/No-Go Decision**: If queue manipulation proves unreliable → pivot to alternative voice switching strategy

**Feature Flags & Kill Switches**
* `FF_QUEUE_MANIPULATION=true` (disable if unreliable)
* `FF_QUEUE_STRESS_TESTING=true`

**Dependencies**
* Phases 0–2 passed

**Timeline Estimate:** 2-3 weeks

---

# Phase 4 — Voice Switching Strategy (Conservative Approach)

**Goal:** Implement voice switching using the safest possible approach based on Phase 3 results.

**Core Assumptions to Test:**
1. ✅ Voice variant preloading doesn't exceed memory limits (from Phase 2 analysis)
2. ✅ Voice switching UI provides good UX even if not "instant"
3. ✅ Queue rebuilding (if needed) works reliably during gaps
4. ✅ Voice switching gracefully handles missing voice variants
5. ✅ Debouncing prevents rapid switching from causing issues

**Scope - Two Implementation Strategies:**

**Strategy A: If Phase 3 proves queue manipulation works reliably:**
* **Real-time queue replacement**: Replace current + next 8 tracks with new voice
* Debounce rapid toggles (200ms)
* Graceful fallback if voice variant missing

**Strategy B: If Phase 3 shows queue manipulation is unreliable:**
* **Next-affirmation switching**: Voice change takes effect on next affirmation
* **OR Queue rebuilding**: Rebuild entire queue during gaps only
* Better UX messaging about when voice change takes effect

**Deliverables**
* `VoiceSwitchingStrategy` - implements chosen approach based on Phase 3 results
* `VoiceVariantManager` - handles voice data preloading with memory constraints
* `switchVoice(newVoiceId)` action with appropriate strategy
* User feedback for voice switching status

**Server**
* No additional APIs needed - voice variants already available via `/playlists/:playlistId/manifestations`

**QA / DoD**
* **If Strategy A**: Switching during affirmation swaps instantly, no audio glitches
* **If Strategy B**: Clear UX feedback about when voice change takes effect
* Voice switching works reliably for 30+ switches in a session
* Memory usage remains stable during voice switching
* Missing voice variants handled gracefully

**Feature Flags & Kill Switches**
* `FF_VOICE_SWITCH=true`
* `FF_VOICE_SWITCH_STRATEGY=A|B` (choose based on Phase 3)
* `FF_VOICE_PRELOADING=true`

**Dependencies**
* Phases 0–3 passed (Phase 3 determines implementation strategy)

**Timeline Estimate:** 3-4 weeks

---

# Phase 5 — Bed Hardening & Advanced Features

**Goal:** Professional bed audio handling and failure resilience.

**Core Assumptions to Test:**
1. ✅ Dual-instance bed fallback works on problematic devices
2. ✅ Bed crossfading doesn't cause audio artifacts
3. ✅ Failure policy prevents user frustration without being overly aggressive
4. ✅ Long-term memory and battery usage is acceptable
5. ✅ Loop discontinuity detection works correctly

**Scope**
* **Dual-instance ping-pong** fallback with **equal-power crossfade (400ms)**:
  * Auto-detect loop discontinuity (>10–20ms) → enable fallback
  * Device denylist support (force fallback on known models)
* Bed change crossfade (old→new bed over 400ms)
* **3-fail halt policy**: after 3 consecutive load failures → pause affirmations, keep bed playing
* Robust remote metadata updates (cover/title) per track
* Haptics on play/pause/skip; settings persistence

**Deliverables**
* `BedPlayer` v2 with single/dual-instance auto-switching
* Loop discontinuity detection and device denylist
* Failure counter system with "Retry / Keep bed" flow
* Battery and memory optimization
* QA harness for bed soak testing

**QA / DoD**
* 10-minute loop soak on mid-tier Android with no clicks (in fallback mode)
* 10 rapid bed switches in 30s → no artifacts/leaks
* Simulate 5 bad URLs → halt after 3, flows work correctly
* **2-hour soak test**: memory steady, battery within expectation
* Loop discontinuity detection works on known problematic devices

**Feature Flags & Kill Switches**
* `FF_BED_DUAL_INSTANCE=true` (toggle by device/setting)
* `FF_FAILURE_POLICY=true`
* `FF_LOOP_DETECTION=true`

**Dependencies**
* Phases 0–4 passed

**Timeline Estimate:** 2-3 weeks

---

# Phase 6 — Production Readiness & Optimization

**Goal:** Final polish and production deployment preparation.

**Core Assumptions to Test:**
1. ✅ All feature flags can be toggled safely in production
2. ✅ Error reporting provides actionable insights
3. ✅ Performance is acceptable across device range
4. ✅ User experience is smooth and professional
5. ✅ Rollback procedures work if issues arise

**Scope**
* Production error monitoring and reporting
* Performance optimization based on real usage data
* Final UX polish and accessibility improvements
* Documentation for deployment and monitoring
* Load testing with realistic user scenarios

**Deliverables**
* Production monitoring setup
* Performance benchmarks and optimization
* Accessibility compliance
* Deployment runbook and rollback procedures
* User acceptance testing completion

**QA / DoD**
* All automated tests pass consistently
* Performance meets defined benchmarks
* Accessibility audit passed
* Production deployment pipeline tested
* Rollback procedures validated

**Feature Flags & Kill Switches**
* All previous flags maintained for production safety

**Dependencies**
* Phases 0–5 passed

**Timeline Estimate:** 2 weeks

---

## UPDATED: Cross-phase Assets & Contracts

**Core Types**

```ts
type SessionItem = { kind: 'affirmation'; affirmationId: string }
                 | { kind: 'gap'; seconds: number }

type VoiceVariant = { 
  url: string; 
  durationSec: number; 
  hash: string; 
  lufs: number; 
  voiceId: string;
  fileSize?: number;
}

type QueueManipulationResult = { 
  success: boolean; 
  error?: string; 
  recoveryAction?: string 
}
```

**Store (essentials with error handling)**

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
memoryUsage: number                    // NEW: track memory consumption
queueManipulationEnabled: boolean      // NEW: based on Phase 3 results

// Actions with error handling
play(): Promise<QueueManipulationResult>
pause(): Promise<QueueManipulationResult>
next(): Promise<QueueManipulationResult>
previous(): Promise<QueueManipulationResult>
setGap(n: number): Promise<QueueManipulationResult>    // rebuild tail only
setVolumes(a: number, b: number): void
setBed(id: string): Promise<void>                      // crossfade bed
switchVoice(newVoiceId: string): Promise<QueueManipulationResult>  // strategy-dependent
```

**Queue Helpers (with safety)**

* `buildQueue(plan, voiceId)` → Track[]
* `safeReplaceTrackAt(index, track)` → QueueManipulationResult
* `skipOverGaps(direction)` → QueueManipulationResult
* `rebuildTailFrom(index, newGap)` → QueueManipulationResult
* `rebindTailToVoice(fromIndex, voiceId, count)` → QueueManipulationResult

**Memory & Prefetch (conservative)**

* Start with **3** items / **~60s**, **concurrency=2**
* Expand based on Phase 2 memory analysis results
* Protect current bed + next 2 (reduced from 3)

**CDN/URLs**

* Signed URL TTL ≥ **2–4h**
* On **403, not cached** → re-resolve; retry once → skip & log

---

## UPDATED: QA Matrix (cumulative; run at end of each phase)

1. **Dual-engine coexistence** (30-min soak without conflicts)
2. **Gap accuracy** (±100ms) across devices
3. **Queue manipulation reliability** (1000 operations without crashes)
4. **Memory usage bounds** (document actual consumption vs limits)
5. **Voice switching strategy effectiveness** (based on chosen implementation)
6. **Loop soak** (10 min) + **rapid bed switch** test
7. **Offline dip** mid-session; recovery on reconnect
8. **Consecutive failures** halt/continue behavior
9. **Lockscreen controls** & metadata correctness
10. **2-hour soak** (memory & battery stable)

---

## UPDATED: Kill Switches / Rollback (Comprehensive)

* `FF_DUAL_ENGINE=true` → **CRITICAL**: revert to single audio engine
* `FF_QUEUE_MANIPULATION=true` → disable real-time queue editing
* `FF_VOICE_SWITCH=true` → disable voice switching entirely
* `FF_VOICE_SWITCH_STRATEGY=A|B` → choose implementation based on Phase 3
* `FF_SQLITE_CACHE=true` → revert to in-memory cache
* `FF_BED_DUAL_INSTANCE=true` → disable bed fallback
* `FF_PREFETCH=true` → disable prefetching
* `FF_MEMORY_MONITORING=true` → disable memory tracking
* `FF_FAILURE_POLICY=true` → revert to simple skip-on-error

---

## CRITICAL SUCCESS METRICS (Gate Criteria)

### Phase -1 Gate:
- ✅ Dual engines play simultaneously for 30+ minutes without conflicts
- ✅ Audio focus maintained during interruptions  
- ✅ No crashes or memory leaks

### Phase 3 Gate: 
- ✅ 1000+ queue manipulations without crashes
- ✅ Index tracking remains accurate
- ✅ Decision: Queue manipulation viable or alternative needed

### Phase 4 Gate:
- ✅ Voice switching works reliably with chosen strategy
- ✅ Memory usage within acceptable bounds
- ✅ User experience meets quality standards

---

## Total Estimated Timeline: 16-22 weeks

- Phase -1: 1 week (CRITICAL GATE)
- Phase 0: 2 weeks  
- Phase 1: 3 weeks
- Phase 2: 3-4 weeks
- Phase 3: 2-3 weeks (CRITICAL GATE)
- Phase 4: 3-4 weeks
- Phase 5: 2-3 weeks
- Phase 6: 2 weeks

**Risk Buffer**: Add 25% buffer for integration issues and unknown complexities.

This revised plan acknowledges the **high technical risk** while providing **clear validation gates** to prevent building on unstable foundations. Each phase can be **safely abandoned or pivoted** if core assumptions prove false.