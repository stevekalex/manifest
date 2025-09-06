# Recently Played Playlists - MVP Implementation Plan

**Version:** 1.0  
**Date:** 2025-01-05  
**Status:** Planning  
**Effort:** 1-2 days implementation  

## Overview

This document outlines the MVP implementation for recently played playlists functionality using a simple, lightweight approach that can be implemented quickly and evolved later as needed.

## Problem Statement

Users need to see their recently played playlists for easy access to content they've recently engaged with. This improves user experience by reducing friction to re-access preferred content.

## Decision: MVP Approach

**Selected Architecture:** Simple Recently Played Table  
**Rationale:** Start simple, evolve complexity only when needed

### Why Not Complex Sessions Architecture?

The dual sessions architecture analyzed earlier would be over-engineering for V1 MVP because:
- ❌ Adds significant complexity for basic requirement
- ❌ Higher development and maintenance overhead  
- ❌ Complex data synchronization between layers
- ❌ Performance overhead for simple use case
- ❌ Privacy and compliance considerations
- ❌ Requires advanced monitoring and consistency management

### Why Simple Table Works for MVP

- ✅ Solves core requirement immediately
- ✅ Fast implementation (1-2 days vs weeks)
- ✅ Minimal complexity and maintenance
- ✅ Easy to understand and debug
- ✅ Clear evolution path when needed
- ✅ Integrates cleanly with existing audio system

## Technical Implementation

### Database Schema

```sql
-- Core recently played table (Postgres/Supabase)
CREATE TABLE IF NOT EXISTS recently_played (
  user_id UUID NOT NULL,
  playlist_id TEXT NOT NULL,
  last_played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  play_count INT NOT NULL DEFAULT 1,
  last_position_ms BIGINT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (user_id, playlist_id)
);

CREATE INDEX IF NOT EXISTS idx_recent_by_user ON recently_played (user_id, last_played_at DESC);

-- Optional: Future analytics foundation (can be added later behind feature flag)
CREATE TABLE IF NOT EXISTS play_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  playlist_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL CHECK (event_type IN ('playback_started','playback_completed')),
  source TEXT NULL,          -- e.g., 'home','search','recently_played','deeplink'
  device_os TEXT NULL,
  app_version TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_play_events_user_time ON play_events (user_id, occurred_at DESC);

-- UPSERT function for recently_played
-- Backend will use this pattern for atomic updates
/*
INSERT INTO recently_played (user_id, playlist_id, last_played_at, last_position_ms)
VALUES ($1, $2, NOW(), $3)
ON CONFLICT (user_id, playlist_id) DO UPDATE SET
  play_count = recently_played.play_count + 1,
  last_played_at = EXCLUDED.last_played_at,
  last_position_ms = COALESCE(EXCLUDED.last_position_ms, recently_played.last_position_ms),
  updated_at = NOW();
*/
```

### TypeScript Interfaces

```typescript
// types/recently-played.ts
export interface RecentlyPlayed {
  user_id: string;
  playlist_id: string;
  last_played_at: string;
  play_count: number;
  last_position_ms?: number;
  created_at: string;
  updated_at: string;
}

export interface PlayEvent {
  id: string;
  user_id: string;
  playlist_id: string;
  occurred_at: string;
  event_type: 'playback_started' | 'playback_completed';
  source?: string;
  device_os?: string;
  app_version?: string;
}

export interface RecentlyPlayedWithPlaylist {
  user_id: string;
  playlist_id: string;
  last_played_at: string;
  play_count: number;
  last_position_ms?: number;
  
  // Joined from playlists table
  name: string;
  description: string;
  image_url?: string;
  duration_estimate_ms?: number;
}

export interface RecentlyPlayedService {
  recordPlaylistPlay(userId: string, playlistId: string, positionMs?: number, source?: string): Promise<void>;
  getRecentlyPlayed(userId: string, limit?: number): Promise<RecentlyPlayedWithPlaylist[]>;
  getResumePosition(userId: string, playlistId: string): Promise<number | null>;
  updatePosition(userId: string, playlistId: string, positionMs: number): Promise<void>;
  
  // Offline support
  syncOfflineEvents(): Promise<void>;
}
```

### Service Implementation

```typescript
// services/recentlyPlayedService.ts
import { apiClient, ApiResponse } from '@/utils/api';
import type { RecentlyPlayed, RecentlyPlayedWithPlaylist, RecentlyPlayedService } from '@/types/recently-played';

class RecentlyPlayedServiceImpl implements RecentlyPlayedService {
  private basePath = '/api/v1/recently-played';

  /**
   * Record that a user played a playlist
   * Updates existing record or creates new one
   */
  async recordPlaylistPlay(userId: string, playlistId: string, positionMs?: number, source?: string): Promise<void> {
    const payload: any = {
      user_id: userId,
      playlist_id: playlistId,
      source: source || 'unknown'
    };
    
    // Only include position if it's actually provided (don't default to 0)
    if (positionMs !== undefined && positionMs > 0) {
      payload.last_position_ms = positionMs;
    }
    
    try {
      await apiClient.post(`${this.basePath}/play`, payload);
    } catch (error) {
      // Store offline for retry if network fails
      await this.storeOfflineEvent('recordPlay', { userId, playlistId, positionMs, source });
      throw error;
    }
  }

  /**
   * Get recently played playlists for a user
   * Ordered by most recent first
   */
  async getRecentlyPlayed(userId: string, limit: number = 10): Promise<RecentlyPlayedWithPlaylist[]> {
    const response = await apiClient.get<{recently_played: RecentlyPlayedWithPlaylist[]}>
      (`${this.basePath}?user_id=${userId}&limit=${limit}`);
    
    return response.data.recently_played;
  }

  /**
   * Get resume position for a specific playlist
   */
  async getResumePosition(userId: string, playlistId: string): Promise<number | null> {
    try {
      const response = await apiClient.get<{position_ms: number | null}>
        (`${this.basePath}/position?user_id=${userId}&playlist_id=${playlistId}`);
      
      return response.data.position_ms;
    } catch (error) {
      console.warn('Could not get resume position:', error);
      return null;
    }
  }

  /**
   * Update current position in playlist (for resume functionality)
   * Debounced to prevent excessive API calls
   */
  private positionUpdateTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  
  async updatePosition(userId: string, playlistId: string, positionMs: number): Promise<void> {
    const key = `${userId}:${playlistId}`;
    
    // Clear existing timeout
    const existingTimeout = this.positionUpdateTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Debounce position updates (update after 5 seconds of no new updates)
    const timeout = setTimeout(async () => {
      try {
        await apiClient.put(`${this.basePath}/position`, {
          user_id: userId,
          playlist_id: playlistId,
          position_ms: positionMs
        });
        this.positionUpdateTimeouts.delete(key);
      } catch (error) {
        console.warn('Could not update position:', error);
      }
    }, 5000);
    
    this.positionUpdateTimeouts.set(key, timeout);
  }
  
  /**
   * Store failed operations for offline retry
   */
  private async storeOfflineEvent(operation: string, data: any): Promise<void> {
    try {
      const { storage } = await import('@/utils/storage');
      const offlineEvents = await storage.getItem('offline_recently_played_events') || [];
      offlineEvents.push({
        operation,
        data,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substring(2)
      });
      await storage.setItem('offline_recently_played_events', offlineEvents);
    } catch (error) {
      console.warn('Could not store offline event:', error);
    }
  }
  
  /**
   * Sync offline events when connectivity restored
   */
  async syncOfflineEvents(): Promise<void> {
    try {
      const { storage } = await import('@/utils/storage');
      const offlineEvents = await storage.getItem('offline_recently_played_events') || [];
      
      if (offlineEvents.length === 0) return;
      
      // Process events in order
      for (const event of offlineEvents) {
        try {
          switch (event.operation) {
            case 'recordPlay':
              await this.recordPlaylistPlay(
                event.data.userId,
                event.data.playlistId,
                event.data.positionMs,
                event.data.source
              );
              break;
            case 'updatePosition':
              await this.updatePosition(
                event.data.userId,
                event.data.playlistId,
                event.data.positionMs
              );
              break;
          }
        } catch (error) {
          console.warn('Failed to sync offline event:', event.id, error);
          // Continue with other events
        }
      }
      
      // Clear synced events
      await storage.setItem('offline_recently_played_events', []);
    } catch (error) {
      console.warn('Could not sync offline events:', error);
    }
  }
}

export const recentlyPlayedService = new RecentlyPlayedServiceImpl();
```

### Integration with Existing Audio System

```typescript
// Integration in hooks/useAudioSystem.ts (or wherever audio playback is managed)
import { recentlyPlayedService } from '@/services/recentlyPlayedService';
import { useAuth } from '@/hooks/useAuth'; // Your auth hook

export function useAudioSystem() {
  const { userId } = useAuth();
  const [hasRecordedPlay, setHasRecordedPlay] = useState(false);
  
  // Record playlist play when actual playback starts (not on screen load)
  const handlePlaybackStart = useCallback(async (playlistId: string, source: string = 'player') => {
    if (userId && playlistId && !hasRecordedPlay) {
      try {
        await recentlyPlayedService.recordPlaylistPlay(userId, playlistId, undefined, source);
        setHasRecordedPlay(true);
        
        // Sync any offline events when online
        await recentlyPlayedService.syncOfflineEvents();
      } catch (error) {
        console.warn('Could not record playlist play:', error);
        // Playback continues regardless of tracking failure
      }
    }
  }, [userId, hasRecordedPlay]);
  
  // Update position during playback (debounced by service)
  const handlePositionUpdate = useCallback((playlistId: string, positionMs: number) => {
    if (userId && playlistId && positionMs > 0) {
      recentlyPlayedService.updatePosition(userId, playlistId, positionMs);
    }
  }, [userId]);
  
  // Reset tracking state when playlist changes
  useEffect(() => {
    setHasRecordedPlay(false);
  }, [playlistId]);
  
  // Your existing audio system logic...
  return {
    // ... existing returns
    handlePlaybackStart,
    handlePositionUpdate,
  };
}

// Usage in playlist player component
export default function PlaylistPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { handlePlaybackStart, handlePositionUpdate } = useAudioSystem();
  
  // Call handlePlaybackStart when user actually presses play
  // Call handlePositionUpdate during playback progress
  
  // Rest of existing component code...
}
```

### UI Component

```typescript
// components/home/RecentlyPlayedSection.tsx
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { recentlyPlayedService } from '@/services/recentlyPlayedService';
import { PlaylistCard } from '@/components/common/PlaylistCard';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { RecentlyPlayedWithPlaylist } from '@/types/recently-played';

interface RecentlyPlayedSectionProps {
  userId: string;
  limit?: number;
}

export function RecentlyPlayedSection({ userId, limit = 8 }: RecentlyPlayedSectionProps) {
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayedWithPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  useEffect(() => {
    loadRecentlyPlayed();
  }, [userId]);

  const loadRecentlyPlayed = async () => {
    try {
      setLoading(true);
      const data = await recentlyPlayedService.getRecentlyPlayed(userId, limit);
      setRecentlyPlayed(data);
    } catch (error) {
      console.error('Failed to load recently played:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaylistPress = (playlist: RecentlyPlayedWithPlaylist) => {
    router.push(`/playlists/${playlist.playlist_id}`);
  };

  const handleViewAllPress = () => {
    router.push('/recently-played');
  };

  if (loading || recentlyPlayed.length === 0) {
    return null; // Or loading skeleton
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>
          Recently Played
        </Text>
        <TouchableOpacity
          style={[styles.viewAllButton, { borderColor: tintColor }]}
          onPress={handleViewAllPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewAllText, { color: tintColor }]}>
            View all
          </Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recentlyPlayed.map((item, index) => (
          <Animated.View
            key={item.playlist_id}
            entering={FadeInDown.delay(index * 100).springify()}
            style={styles.cardContainer}
          >
            <PlaylistCard
              playlist={{
                id: item.playlist_id,
                name: item.name,
                description: item.description,
                image_url: item.image_url,
                duration_estimate_ms: item.duration_estimate_ms
              }}
              onPress={() => handlePlaylistPress(item)}
              showPlayCount={true}
              playCount={item.play_count}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  cardContainer: {
    width: 160,
  },
});
```

## Backend API Endpoints

```typescript
// Backend API specification (reference for backend team)

// POST /api/v1/recently-played/play
// Record playlist play (UPSERT operation)
{
  "user_id": "uuid",
  "playlist_id": "string", 
  "last_position_ms": "number?" // Only include if > 0, omit if undefined
  "source": "string" // e.g., 'player', 'home', 'search', 'recently_played'
}
// Response: 204 No Content (idempotent operation)

// GET /api/v1/recently-played?user_id={uuid}&limit={number}
// Get recently played playlists (sorted by last_played_at DESC)
Response: {
  "recently_played": [
    {
      "user_id": "uuid",
      "playlist_id": "string",
      "last_played_at": "timestamptz",
      "play_count": "number",
      "last_position_ms": "number?",
      
      // Enriched with playlist metadata (left join or app-side enrichment)
      "name": "string",
      "description": "string", 
      "image_url": "string?",
      "duration_estimate_ms": "number?"
    }
  ]
}

// GET /api/v1/recently-played/position?user_id={uuid}&playlist_id={string}
// Get resume position
Response: {
  "position_ms": "number?" // null if no position saved or playlist not in history
}

// PUT /api/v1/recently-played/position
// Update position (updates updated_at timestamp)
{
  "user_id": "uuid",
  "playlist_id": "string",
  "position_ms": "number" // Must be > 0
}
// Response: 204 No Content
```

## Implementation Phases

### Phase 1: Core Functionality (Day 1)
- [ ] Create recently_played table with Postgres schema
- [ ] Implement backend UPSERT logic and API endpoints
- [ ] Implement frontend service with offline support
- [ ] Hook tracking to actual playback start in audio system
- [ ] Test with existing playlists

### Phase 1.5: Optional Analytics Foundation
- [ ] Create play_events table (behind feature flag)
- [ ] Add minimal event tracking for playback_started events
- [ ] Verify events are captured without affecting MVP performance

### Phase 2: UI Integration (Day 2)
- [ ] Create RecentlyPlayedSection component
- [ ] Integrate with home screen
- [ ] Add "View all" screen (optional)
- [ ] Test user flows

### Phase 3: Polish & Testing
- [ ] Error handling and edge cases
- [ ] Loading states and skeletons
- [ ] Performance testing
- [ ] User acceptance testing

## Testing Strategy

### Unit Tests
```typescript
// services/__tests__/recentlyPlayedService.test.ts
describe('RecentlyPlayedService', () => {
  test('records playlist play correctly', async () => {
    await recentlyPlayedService.recordPlaylistPlay('user1', 'playlist1');
    const recent = await recentlyPlayedService.getRecentlyPlayed('user1');
    expect(recent[0].playlist_id).toBe('playlist1');
    expect(recent[0].play_count).toBe(1);
  });

  test('updates play count on repeat plays', async () => {
    await recentlyPlayedService.recordPlaylistPlay('user1', 'playlist1');
    await recentlyPlayedService.recordPlaylistPlay('user1', 'playlist1');
    const recent = await recentlyPlayedService.getRecentlyPlayed('user1');
    expect(recent[0].play_count).toBe(2);
  });

  test('orders by most recent first', async () => {
    await recentlyPlayedService.recordPlaylistPlay('user1', 'playlist1');
    await recentlyPlayedService.recordPlaylistPlay('user1', 'playlist2');
    const recent = await recentlyPlayedService.getRecentlyPlayed('user1');
    expect(recent[0].playlist_id).toBe('playlist2'); // Most recent first
  });

  test('debounces position updates', async () => {
    const spy = jest.spyOn(apiClient, 'put');
    
    // Rapid position updates
    await recentlyPlayedService.updatePosition('user1', 'playlist1', 1000);
    await recentlyPlayedService.updatePosition('user1', 'playlist1', 2000);
    await recentlyPlayedService.updatePosition('user1', 'playlist1', 3000);
    
    // Should only call API once after debounce delay
    await new Promise(resolve => setTimeout(resolve, 6000));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('/api/v1/recently-played/position', {
      user_id: 'user1',
      playlist_id: 'playlist1',
      position_ms: 3000
    });
  });
});
```

### Integration Tests
```typescript
// Integration test with audio system
describe('Recently Played Integration', () => {
  test('tracks playlist when user starts playback', async () => {
    const { getByText } = render(<PlaylistPlayerScreen />);
    
    // Simulate playlist start
    fireEvent.press(getByText('Play'));
    
    // Verify tracking was called
    await waitFor(() => {
      expect(mockRecentlyPlayedService.recordPlaylistPlay)
        .toHaveBeenCalledWith('user1', 'playlist1');
    });
  });
});
```

## Performance Considerations

### Database Optimization
- Primary key on `(user_id, playlist_id)` ensures fast upserts
- Index on `(user_id, last_played_at DESC)` optimizes recent queries  
- Limit recently played queries to prevent large result sets
- Use UUID v4 for user_id for better distribution and privacy
- TIMESTAMPTZ for proper timezone handling
- Conditional foreign key constraint (only if playlists table exists in backend)

### Caching Strategy
- Cache recently played data in React Query for 5 minutes
- Optimistic updates for immediate UI feedback
- Background refresh on app focus
- Offline event queue for reliability when network unavailable
- Automatic sync of offline events when connectivity restored

### API Optimization
- Debounced position updates reduce API calls
- Batch multiple operations when possible
- Use HTTP 304 caching for unchanged data

## Security & Privacy

### Data Protection
- User data is associated with authenticated user ID
- No sensitive information stored in recently played table
- Standard data retention policies apply

### Access Control
- Users can only access their own recently played data
- API endpoints require authentication
- Rate limiting to prevent abuse

## Migration & Rollback

### Rollout Strategy
- Feature flag controlled rollout
- A/B test with 10% of users initially
- Monitor for performance impact and user feedback
- Full rollout after validation

### Rollback Plan
- Feature flag can disable functionality immediately
- Database table can be dropped without affecting core functionality
- No breaking changes to existing audio system

## Evolution Path

### When to Add Complexity
Consider evolving to full sessions architecture when you have:
- **User demand** for detailed analytics
- **Business need** for advanced insights
- **Development capacity** for complex system maintenance
- **Clear requirements** for what additional data to track

### Future Enhancements (Post-MVP)
- Detailed session tracking (voice changes, pauses, etc.)
- Cross-device sync for resume positions
- Smart recommendations based on listening patterns  
- Analytics dashboard for user engagement
- Playlist completion tracking and goals

### Migration to Complex System
```typescript
// Future: Add sessions layer while keeping compatibility
interface PlaylistSession {
  id: string;
  user_id: string; 
  playlist_id: string;
  // ... detailed tracking fields
}

// Dual write pattern during migration
async recordPlaylistPlay(userId: string, playlistId: string) {
  // Layer 1: Simple tracking (existing)
  await this.updateRecentlyPlayed(userId, playlistId);
  
  // Layer 2: Detailed sessions (when ready)
  if (this.enableDetailedTracking) {
    await this.createPlaylistSession(userId, playlistId);
  }
}
```

## Success Metrics

### Technical Metrics
- API response time < 200ms for recently played queries
- Database query performance within acceptable limits
- Zero impact on existing audio system performance
- Error rate < 0.1% for tracking operations
- Offline event sync success rate > 95%
- No false positives from page views (only actual playback)

### User Metrics
- User engagement: % of users who interact with recently played
- Retention: Users returning to previously played content
- Time to replay: Reduced friction to access recent content
- User feedback: Positive response to feature

### Business Metrics
- Increased session duration from easy content re-access
- Higher playlist completion rates
- User retention and engagement improvements

## Risk Assessment

### Technical Risks
- **Low Risk:** Simple architecture with minimal complexity
- **Database Growth:** Bounded by user count × playlist count
- **Performance Impact:** Minimal with proper indexing

### User Experience Risks  
- **Privacy Concerns:** Users may not want tracking (mitigation: privacy controls)
- **Storage Concerns:** Minimal data footprint reduces concerns
- **Feature Creep:** Start simple, resist adding complexity early

### Mitigation Strategies
- Feature flags for gradual rollout and quick rollback
- Monitoring and alerting for performance degradation
- User feedback collection for UX validation
- Documentation for future team members

## Conclusion

This MVP approach provides immediate value with minimal complexity and clear evolution path. The simple recently played table solves the core user need while establishing foundation for future enhancements when business requirements justify the additional complexity.

**Key Benefits:**
- ✅ Fast implementation (1-2 days)
- ✅ Immediate user value
- ✅ Low maintenance overhead  
- ✅ Clear evolution path
- ✅ Minimal risk

**Next Steps:**
1. Get stakeholder approval for MVP approach
2. Create backend API endpoints with Postgres schema
3. Implement frontend service and UI with offline support
4. Deploy behind feature flag
5. Monitor metrics and user feedback
6. Iterate based on learnings

---

## GPT Review Updates (v1.1)

**Key improvements applied to make MVP more production-ready:**

### Technical Improvements
- ✅ **Postgres/Supabase optimized** - Updated schema to use UUID, TIMESTAMPTZ, proper UPSERT
- ✅ **React Native compatibility** - Fixed timeout types for mobile environment  
- ✅ **Improved API contracts** - Don't send position_ms as 0, better error handling
- ✅ **No false positives** - Track actual playback start, not page views

### Reliability Enhancements  
- ✅ **Offline support** - Queue failed operations for retry when connectivity restored
- ✅ **Atomic UPSERT logic** - Proper database-level consistency with play count increment
- ✅ **Optional analytics foundation** - Added play_events table for future segmentation (behind feature flag)

### Architecture Decisions
- ✅ **Conditional foreign keys** - Avoid coupling if playlists table doesn't exist in backend
- ✅ **Source tracking** - Track how users arrived at playlists ('home', 'search', etc.)
- ✅ **Better data quality** - Only store meaningful position data, not zeros

These changes maintain the simple MVP scope while ensuring production readiness and future extensibility.