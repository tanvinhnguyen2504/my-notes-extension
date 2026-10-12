# Phase 2 — Memo domain model, storage slice and reducer actions

## Goal

Turn `IMemo` from a scaffold with `subType: any` into the real `memos` slice
type, give `memo.v1` a normalizer that can be trusted, and add the memo cases to
the reducer so that persistence works through the existing `persistChanged`.

## Tasks

- [ ] `src/core/types/memos.ts`: add `NOTE` to `EMemoType`.
- [ ] `src/core/types/memos.ts`: delete `enumEMemoSubType` and declare one
      sub-type enum per memo type:
      - `EMemoSubTypeGit` — `ANY_REPO`, `THIS_PROJECT`
      - `EMemoSubTypeDatabase` — `POSTGRESQL`, `MYSQL`, `SQLITE`, `MONGODB`
      - `EMemoSubTypeShell` — `BASH_ZSH`, `POWERSHELL`, `FISH`
      - `EMemoSubTypeConfig` — `ENV`, `JSON`, `YAML`, `TOML`
      - `EMemoSubTypeNote` — `PLAIN`, `MARKDOWN`
- [ ] `src/core/types/memos.ts`: `export type MemoSubType` as the union of those
      five enums, and replace `subType: any` with `subType: MemoSubType`.
      Remove the `TODO vincent` comment it answers.
- [ ] `src/core/types/memos.ts`: add `uses: number` to `IMemo`.
- [ ] `src/core/types/memos.ts`: export
      `MEMO_SUBTYPES: Record<EMemoType, readonly MemoSubType[]>` — the single
      source of which sub-types are legal for which type, and the order the
      editor's option row renders them in.
- [ ] `src/core/types.ts`: delete the reserved `Memo` interface and point
      `State.memos` at `IMemo[]`, re-exporting from `@/src/core/types/memos`.
- [ ] New `src/core/memo_utils.ts` (pure, DOM-free, no storage):
      - `newMemo(type: EMemoType): IMemo` — a blank memo with a fresh `newId()`,
        the type's first sub-type, `uses: 0`, `isPinned: false`.
      - `touchMemo(memo: IMemo): IMemo` — mirrors `touchItem`, stamps
        `updatedAt`.
      - `isMemoType` / `isMemoSubTypeFor(type, value)` — runtime guards for the
        normalizer.
      - `looksLikeSecret(body: string): boolean` — the `memo.md` §3 regex.
      - `defaultLabel(type: EMemoType): string` — `"Untitled git"` and friends,
        for the empty-title rule.
- [ ] `src/storages/memo.ts`: rewrite `normalizeMemos` against the real shape.
      Every field gets a complete value for every input: `label` → `String(…)`,
      `type` → clamped through `isMemoType` with `NOTE` as the fallback,
      `subType` → clamped through `isMemoSubTypeFor` against the **already
      resolved** type, `content` → `String(…)`, `isPinned` → `!!`,
      `uses` → `Number(…) || 0`, `updatedAt` → `Number(…) || null`.
      Delete the "Reserved: nothing reads or writes a memo yet" header comment.
- [ ] `src/core/reducer.ts`: add the memo actions to the `Action` union and a
      case for each —
      - `ADD_MEMO { memo: IMemo }`
      - `UPDATE_MEMO { id: string; changes: Partial<Omit<IMemo, 'id'>> }`
      - `DELETE_MEMO { id: string }`
      - `TOGGLE_MEMO_PIN { id: string }`
      - `COUNT_MEMO_COPY { id: string }`
- [ ] `src/core/reducer.ts`: add a `replaceMemo(memos, id, change)` helper
      mirroring `replaceItem`, but keyed on `id` and returning the **same array**
      when no memo matches.
- [ ] Drive the whole slice from a throwaway `npx tsx` scratchpad script:
      normalizer against `null`, `[]`, `[{}]`, a garbage `type`, a `subType`
      that is legal for a *different* type; then each reducer case for both its
      hit and its miss path.

## Implementation notes

**Memo actions take `id`, not `index`.** Every task action carries an index into
`state.tasks`, which is sound only because the task list renders in array order.
The library does not — it is chip-filtered, search-filtered, split into `PINNED`
and `RECENT`, and sorted by `updatedAt`. A rendered position carries no
information about the array. Do not copy the index pattern here; with a filter
active it would act on the wrong memo.

**`replaceMemo` must return the identical array reference on a miss.** That is
what makes a no-op action skip both the save and the render, and it is the
contract `persistChanged` relies on. Same for every case: a new `memos` array
*and* a new memo object. A memo mutated in place is a row that silently refuses
to re-render **and** a slice that silently fails to save.

**`subType` must be validated against the resolved `type`, in that order.** A
stored `{ type: "GIT", subType: "POSTGRESQL" }` has to come back as a `GIT` memo
with `ANY_REPO`, not as a `GIT` memo holding a database sub-type that matches no
option pill and no label. This is the one place the flat-`subType` decision
needs defending, so it is the normalizer's job and nowhere else's.

**No migration, and none is needed.** `CLAUDE.md` records that `memo.v1` "has
only ever held `[]`" and that its shape "can change freely". This phase is the
moment that licence gets spent; after it ships, `memo.v1` has a real shape and a
future change to it does need a plan.

`COUNT_MEMO_COPY` stamps `updatedAt` as well as incrementing `uses`, per
`memo.md` §2 ("increment uses, set updatedAt"). That is deliberate and it does
reorder the `RECENT` group — copying a memo floats it to the top, which is the
behaviour the design asks for.

`noUncheckedIndexedAccess` is on, so `MEMO_SUBTYPES[type][0]` is
`MemoSubType | undefined`. Give `newMemo` an explicit fallback rather than a
non-null assertion.

Keep `core/` free of `storages/` imports and free of DOM access — `memo_utils.ts`
is pure. `looksLikeSecret` takes a string and returns a boolean; it does not
know a textarea exists.

## Verify

- `npm run check` exits clean.
- The scratchpad script shows `normalizeMemos` returning a complete `IMemo[]`
  for `null`, `undefined`, `[]`, `[{}]` and `[{ type: 'NOPE', subType: 42 }]`,
  with no `undefined` field anywhere in the output.
- `normalizeMemos([{ type: 'GIT', subType: 'POSTGRESQL' }])` yields
  `subType: 'ANY_REPO'`.
- Each reducer case returns a **new** `state.memos` reference on a hit and the
  **same** reference on a miss, checked with `===` in the script.
- `DELETE_MEMO` with an unknown id returns the same `state` reference.
- Delete the scratchpad script once green. There is no suite to add it to.
