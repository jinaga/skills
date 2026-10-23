---
name: integrating-jinaga-react
description: >
  Use when wiring a Jinaga specification into a React component — building
  a hook around `useSpecification`, deciding what to render while data
  isn't ready yet or a read has failed, or writing a fact from an event
  handler.
---

# Integrating Jinaga into React

`useSpecification` (from `jinaga-react` 6 or later) keeps a component in
sync with a specification's live results. Getting the *rendering* of its
result right, not just calling it, is what this skill is about.

## Three independent fields, rendered independently

```tsx
const { data, loading, failure } = useSpecification(j, titlesOfTask, task);

return <>
    {loading && <Spinner />}
    {failure && <Failure error={failure.error} onRetry={failure.retry} />}
    {data === null ? null : data.length === 0 ? <NoTitle /> : <Title value={data[0]} />}
</>;
```

Each field is one instruction to the UI, and every combination of the
three is meaningful. That's why they're rendered side by side, not as an
`if`/`else` chain:

- **`data: TProjection[] | null`** says what to show. `null` means show
  *nothing*: the answer hasn't arrived. `[]` is a real answer: show the
  empty state. When rows are present, show them, even next to a failure.
  `data` always belongs to the current given; it is never the previous
  given's rows.
- **`loading: boolean`** is the *only* signal for an indicator. It's true
  while a fetch is underway with nothing to show, or while a retry the user
  asked for is running. A background refresh of cached data leaves it
  false.
- **`failure: { error, retry } | null`** says the most recent completed
  attempt failed. A new attempt doesn't clear it; only a successful answer
  does. `retry` starts a new attempt for the same given, and it's `null`
  when retrying can't help: a structural distribution denial
  (`no-matching-rule`, `spec-more-restrictive-than-rule`) or
  `not-authenticated`, whose way out is signing in. Show a retry action only
  when `retry` isn't `null`.

## Habits from request-cache libraries are wrong here

These read naturally to anyone who knows TanStack Query or SWR, and each one
breaks a combination the hook is designed to show:

```tsx
// Wrong: flashes a spinner before cached data appears. `data` is null only
// until the local cache has been read, which TanStack's isPending doesn't
// model.
if (data === null) return <Spinner />;

// Wrong: hides the saved rows that are still in `data` when a background
// refresh fails.
if (failure) return <Failure error={failure.error} />;

// Wrong: `loading` implies nothing about `data` or `failure`, so this hides
// a failure, and any saved rows, behind the spinner while a retry runs.
if (loading) return <Spinner />;
```

**No early return on `data`, `loading` or `failure`.** Render the three
expressions above unconditionally and let each one decide for itself.

## Gate decisions on `data !== null`, not `!loading`

When code needs to *act* on a read — navigate, redirect, write a
follow-up fact — check `data !== null`. `loading` is false before the first
read completes and false after a failed one, so `!loading` doesn't mean
"the answer is in." An effect gated on `!loading` acts on a `null` it
hasn't noticed yet.

```tsx
React.useEffect(() => {
    if (data !== null && data.length === 0) navigate("/tasks/new");
}, [data]);
```

## Distribution decisions are not a separate UI state

A `reactive` decision (the authorizing fact hasn't reached the replicator
yet) or a `principal-excluded` denial arrives as `data: []`, the empty
state, like any other empty result. Don't build a "waiting for access"
screen. To route an unauthenticated user to login, check the error itself:

```tsx
import { DistributionDeniedError } from "jinaga";

const needsLogin = failure?.error instanceof DistributionDeniedError &&
    failure.error.diagnostics.some(d => d.code === "not-authenticated");
```

`jinaga-react` 5.x returned `error`, `clearError`, `distributionPending` and
`distributionDiagnostic`. None of them exist in 6. Never use `clearError` as
a retry: it showed the empty state for a read that never answered.

## Writes go through `j.fact()` directly

```typescript
async function rename(j: Jinaga, task: Task, current: TaskTitle[], value: string) {
    await j.fact(new TaskTitle(task, value, current));
}
```

There's no separate "mutation" API. Authoring a fact *is* the write, and
its effects reach every subscribed `useSpecification` reactively once the
fact is saved.

## Combine related reads into one specification

As in `authoring-jinaga-specifications-typescript`: a component that would
otherwise call `useSpecification` more than once for data that's really one
view should get there with a single, richer projection instead. Each hook
call is its own subscription, with its own `data`/`loading`/`failure` to
render.
