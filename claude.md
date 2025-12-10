# InstantDB Performance Best Practices

This document captures performance lessons learned while building BattleBuddy with InstantDB.

## Problem Summary

We experienced slow database updates (300-370ms) when updating simple player fields like victory points and command points, even with InstantDB's local-first architecture. Through systematic testing, we discovered the issue was NOT with InstantDB itself, but with how we structured our queries.

## Key Findings

### 1. InstantDB Performance is Excellent When Used Correctly

A simple counter test showed InstantDB can achieve **0.5ms** `db.transact()` times for basic updates. The slowdown was entirely due to our query structure.

**Test Results:**
- Simple counter (no indexes): 0.5ms transact time
- Indexed counter (2 indexed fields): 0.4-0.5ms transact time
- Players table (with unscoped queries): 300-370ms transact time
- Players table (with properly scoped queries): **~9ms transact time**

### 2. Query Scoping is Critical

**Problem:** Unscoped queries that fetch all entities of a type across the entire database.

**Bad Example:**
```typescript
// DON'T: This loads ALL armies from ALL games
const { data } = db.useQuery({
  armies: {
    units: {
      models: {
        weapons: {}
      }
    }
  }
});
```

**Good Example:**
```typescript
// DO: Scope queries to only the data you need
const { data } = db.useQuery({
  armies: {
    units: {
      models: {
        weapons: {}
      }
    },
    $: {
      where: {
        gameId: gameId  // Only fetch armies for this game
      }
    }
  }
});
```

### 3. Separate Queries for Entities That Update Frequently

**Problem:** When you combine frequently-updated entities (like players) with large, complex entities (like armies with nested units/models/weapons) in a single query, every update to the frequently-updated entity triggers re-evaluation of the entire query.

**Bad Example:**
```typescript
// DON'T: Combining players with massive army tree
const { data } = db.useQuery({
  players: {
    $: { where: { gameId: game.id } }
  },
  armies: {
    units: {
      models: {
        weapons: {}
      }
    }
  }
});

// When you update a player, InstantDB re-evaluates the ENTIRE query
// including all armies, units, models, and weapons
```

**Good Example:**
```typescript
// DO: Separate frequently-updated entities from large data trees
const { data: playersData } = db.useQuery({
  players: {
    $: { where: { gameId: game.id } }
  }
});

const { data: armiesData } = db.useQuery({
  armies: {
    units: {
      models: {
        weapons: {}
      }
    },
    $: {
      where: { gameId: game.id }
    }
  }
});

// Now updating a player only triggers re-evaluation of the small players query
```

**Impact:** This change alone reduced our update time from 300-370ms to 180-210ms.

### 4. Avoid Loading Unnecessary Data

**Problem:** Loading entities you don't actually use in the component.

**Bad Example:**
```typescript
// DON'T: Loading the entire database schema when you only need games and players
const { data } = db.useQuery({
  games: {},
  players: {},
  armies: {},      // Not used
  units: {},       // Not used
  models: {},      // Not used
  weapons: {}      // Not used
});
```

**Good Example:**
```typescript
// DO: Only query what you actually need
const { data } = db.useQuery({
  games: {},
  players: {}
});
```

### 5. Indexes Are Not a Performance Problem

We tested counters with and without indexed fields:
- Simple counter (no indexes): 0.5ms
- Indexed counter (2 indexed fields): 0.4-0.5ms

**Conclusion:** Indexed fields in InstantDB do NOT cause slowdowns. Feel free to use `.indexed()` where appropriate for query filtering.

## Performance Optimization Checklist

When experiencing slow updates in InstantDB:

1. **Scope all queries** - Always use `where` clauses to limit data to what you need
2. **Separate query concerns** - Don't combine frequently-updated entities with large data trees
3. **Remove unused queries** - Don't load entities you don't actually use
4. **Test in isolation** - Create simple test pages to isolate performance issues
5. **Check all active queries** - Remember that multiple components may have active queries that all get re-evaluated on updates

## Debugging Performance Issues

### Create Isolated Test Pages

When debugging performance, create a minimal test page that isolates the issue:

```typescript
// Example: Simple counter to test baseline performance
export default function PerfTestPage() {
  const { data } = db.useQuery({
    perfCounters: {}
  });

  const counter = data?.perfCounters?.[0];

  const increment = () => {
    const tBefore = performance.now();
    db.transact(
      db.tx.perfCounters[counter.id].update({
        value: (counter.value || 0) + 1
      })
    );
    const tAfter = performance.now();
    console.log(`db.transact() took: ${(tAfter - tBefore).toFixed(2)}ms`);
  };

  // ... UI
}
```

### Timing Measurements

Use `performance.now()` for accurate timing:

```typescript
const tBefore = performance.now();
db.transact(/* ... */);
const tAfter = performance.now();
console.log(`Operation took: ${(tAfter - tBefore).toFixed(2)}ms`);
```

### Test Offline

Test with WiFi off to rule out network latency as the cause:
- If performance is the same online and offline, it's a local query evaluation issue
- If performance is worse online, it's a network/sync issue

## Our Specific Fixes

1. **Separated players query from armies query** in `/app/game/[code]/page.tsx`
2. **Added gameId scoping** to all armies queries
3. **Removed massive unscoped query** in `CurrentGamesPage.tsx` that was loading all entities
4. **Result:** 300-370ms → ~9ms (40x speedup)

## Conclusion

InstantDB's local-first architecture can deliver excellent performance (sub-millisecond updates), but requires careful query design:
- **Always scope queries** to the minimum data needed
- **Separate concerns** between frequently-updated and large entities
- **Don't load unnecessary data**

These practices ensure that database updates feel instant to users, even as your data grows.
