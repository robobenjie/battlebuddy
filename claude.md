# Basic usage:
- After completing a feature, run tests with `npm test` and check for typescript errors with `npm build`
- When informed of a bug always try to create a failing test, verify the test is failing and then fix the bug.
- Never put rules-jon in a test: tests should reference rules in lib/rules-engine/test-rules.json
- Never try to support two different data formats. Never maintain backwards compatability. There should be one representation for things used in code, data and tests.

# Rules Schema guidelines:
design doc linves in rules-schema-guidelines.md


# How to test Rules Engine:
## IMPORTANT: all rules for unit tests should be in lib/rules-engine/test-rules.json
When creating a new unit test, never put the rule in the unit test: instead find a rule in test-rules.json or add one if needed. That way all our rules in all tests can be validated and the schema can be migrated together. We want to avoid old versions of rules masking bugs by keeping unit tests passing when we update rules formats.


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

## Conclusion

InstantDB's local-first architecture can deliver excellent performance (sub-millisecond updates), but requires careful query design:
- **Always scope queries** to the minimum data needed
- **Separate concerns** between frequently-updated and large entities
- **Don't load unnecessary data**

These practices ensure that database updates feel instant to users, even as your data grows.
