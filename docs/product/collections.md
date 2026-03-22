# Collections Brief

## Problem

Favorites already track learning state through `toMemorize`, `review`, and `mastered`, but they do not let users group words by topic, exam, or personal goal. That makes the current Favorites screen useful for stage-based review, but weak for organization once saved word volume grows.

## Scope Options

### Option A: Folders

- One word belongs to one folder.
- Simple mental model, but it overlaps awkwardly with the existing status buckets.
- Poor fit if a word should appear in both a topic group and a later review state.

### Option B: Collections

- Named user-defined groups that sit beside the existing status model.
- Works with the current Favorites architecture because status remains the learning-state axis.
- Can ship in v1 with single membership and expand later if needed.

### Option C: Tags

- Flexible multi-label model.
- Highest query, UX, and migration complexity.
- Overkill for the current app size and current Favorites UI.

## Recommendation

Use `collections` as the product concept and ship v1 with:

- non-hierarchical named collections
- single optional collection membership per favorite word
- status and collection treated as separate dimensions
- an implicit "All words" view that is not stored as a real collection

This keeps the current status tabs intact while adding one clean organizational layer. It is materially safer than tags and more extensible than folders.

## Recommended Runtime Model

Keep `FavoriteWordEntry` focused on word + status. Store collections beside favorites, not inside the favorite entry.

### Entities

- `CollectionRecord`
    - `id`
    - `name`
    - `createdAt`
    - `updatedAt`
- `FavoriteCollectionMembership`
    - `wordKey`
    - `collectionId | null`
    - `updatedAt`

### Rules

- Membership is per user.
- A favorite can belong to zero or one collection in v1.
- Removing a collection must not remove favorites; it should clear membership only.
- Search remains the entry point for adding favorites.
- Favorites keeps its current status buckets; collection is an additional filter and batch-action target.

## UI Scope For Follow-up PRs

- Search: allow assigning a collection after saving a favorite.
- Favorites: keep the current status segments and add collection filtering within that surface.
- Batch actions: move selected favorites to a collection, clear collection, or remove favorites.

## Migration And Backup Impact

Runtime migration:

- Existing users start with zero collections and zero memberships.
- Existing favorites stay unchanged.
- No status remapping is required.

Backup strategy:

- Current backup payload is version `1` and only covers `users`, `favorites`, and `searchHistory`.
- Shipping collections without backup support would cause silent data loss on export/import.
- Recommended approach is to introduce backup payload version `2` with optional top-level keys:
    - `collections`
    - `favoriteCollections`
- Import must support both versions:
    - `v1`: restore existing data and initialize empty collections state
    - `v2`: restore collections and memberships when present

## Acceptance Criteria

- Users can create, rename, and delete collections.
- Users can assign or clear a collection for a saved favorite.
- Deleting a collection does not delete the underlying favorite words.
- Favorites still work by status even when no collections exist.
- Search save flow still works when collections are disabled or absent.
- Backup import/export is explicitly versioned so collection data is not silently dropped.

## Validation / Release Checks

- Add focused tests for collection CRUD and membership updates.
- Add Favorites screen tests for status + collection filtering.
- Add backup validation tests for `v1` compatibility and `v2` collection payloads.
- Run `npm test -- --watch=false` because favorites and backup are shared flows.
- Keep the feature behind a flag until Search and Favorites entry points are both implemented.

## Open Questions

- Should "Unassigned" be a visible filter chip or only an implicit default state?
- What are the max collection count and max name length for v1?
- Should batch move allow creating a new collection inline, or only selecting an existing one?
- Should the first release expose collections in Search only, Favorites only, or both together?
