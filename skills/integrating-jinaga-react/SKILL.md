---
name: integrating-jinaga-react
description: >
  Use when wiring a Jinaga specification into a React component — building
  a hook around `useSpecification`, deciding what to render while data
  isn't ready yet, or writing a fact from an event handler.
---

# Integrating Jinaga into React

`useSpecification` (from `jinaga-react`) keeps a component in sync with a
specification's live results. Getting the *shape* of its result right — not
just calling it — is what this skill is about.

## The result has more than `loading`/`data`/`error`

```typescript
const { loading, data, error, distributionPending, distributionDiagnostic, clearError } =
    useSpecification(j, currentTitle, task);
```

- **`data: TProjection[] | null`** — `null` until the first read settles,
  an array (possibly empty) once it has. `null` and `[]` are both real,
  distinct states: `null` means "don't know yet," `[]` means "asked, and
  there's nothing."
- **`loading: boolean`** is *not* the settled signal. When the specification's
  result is already cached locally, the hook goes straight from its initial
  state to ready *without ever setting `loading` true* — so `!loading` is
  also true before the first read has happened at all. **Check `data !==
  null` to know whether a read has settled, not `!loading`.** This is the
  single most consequential idiom in this skill: code gating a decision,
  navigation, or write on "is this data ready" and using `!loading` instead
  of `data !== null` will act on a `null` it hasn't noticed yet.
- **`error`** is set for a *structural* problem that won't resolve on its
  own — a specification with no matching distribution rule, one asking for
  more than a rule grants, or an unauthenticated caller. Read
  `error` as `DistributionDeniedError` and branch on
  `distributionDiagnostic?.code` (e.g. `"not-authenticated"` to route to
  login) when the failure needs different handling than a generic error
  boundary.
- **`distributionPending`** is set for a denial that's expected to
  *self-heal* — a subscription race, or a caller who's authenticated but
  not yet in the authorized set because the fact granting access hasn't
  replicated in yet. Render this distinctly from both `loading` and
  `error`: it's not "still fetching" and it's not "something's wrong," it's
  "waiting for access that's expected to arrive." It clears automatically
  once the first result lands.
- **`clearError()`** resets `error` (e.g. after a retry action) without
  tearing down and re-subscribing the whole watch.

`error` and `distributionPending` are never both set — a structural error
always outranks a self-healing pending state.

## Writes go through `j.fact()` directly

```typescript
async function rename(j: Jinaga, task: LabelOf<Task>, current: TaskTitle[], value: string) {
    await j.fact(new TaskTitle(task, value, current));
}
```

There's no separate "mutation" API — authoring a fact *is* the write, and
its effects reach every subscribed `useSpecification` reactively once the
fact is saved (and, for a fact that changes shape distribution cares about,
once it's replicated and authorized — see `distributionPending` above).

## Combine related reads into one specification

As in `authoring-jinaga-specifications-typescript`: a component that would
otherwise call `useSpecification` more than once for data that's really one
view should get there with a single, richer projection instead — each hook
call is its own subscription and its own `loading`/`data`/`error` cycle to
reconcile against the others.
