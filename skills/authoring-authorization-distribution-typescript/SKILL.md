---
name: authoring-authorization-distribution-typescript
description: >
  Use when deciding or implementing who can create a fact (authorization)
  or who can read it back (distribution) in a Jinaga TypeScript app, or
  when a write or a query is being rejected unexpectedly.
---

# Authorization and distribution rules in TypeScript

Two separate, independently-enforced concerns: **authorization** decides
who may *create* a fact; **distribution** decides who may *read* it back.
A model can get one right and the other wrong — always check both. Design
each rule as a Factual specification first
(`authoring-factual-specifications`), including the constraints every rule
must meet, then write it here.

## Authorization: deny by default, including for `User` itself

```typescript
import { AuthorizationRules } from "jinaga";

export const authorization = (a: AuthorizationRules) => a
    .any(User)
    .type(Project, project => project.creator);
```

**Every fact type needs an explicit rule, with no exceptions — including
the built-in `Jinaga.User` fact.** A fact type with no rule at all is
rejected outright ("has no authorization rules"), not implicitly allowed —
and this applies to `User` exactly like any application fact type. Skipping
a rule for `User` doesn't just block one feature; it rejects login/signup
itself, since the current user's own identity fact needs to be created
before anything else can be. `.any(FactClass)` allows anyone to create it
(the common choice for `User`, since its content is the caller's own
cryptographic identity); `.type(FactClass, selector)` restricts creation to
whoever the selector reaches from the fact being created.

The selector can be a direct predecessor reference (`project =>
project.creator`) or a full traversal (`event => event.tenant.predecessor()
.selectMany(t => Administrator.usersOf(t))`) — both forms are valid,
picked by how far the authorizing user is from the fact being authorized.

## Distribution: who can read a share back

```typescript
import { DistributionRules } from "jinaga";

export const distribution = (d: DistributionRules) => d
    .share(Task.in(project))
    .with(model.given(Project).match(p => p.creator.predecessor()));
```

`.share(specification)` names what's being shared; `.with(userSpecification)`
names who it's shared with, as its own specification reaching from the same
given down to a `User`. The user is reached with `.predecessor()`, which
declares it as a label: a specification projects only declared labels
(`authoring-factual-specifications`), so `p => p.creator` is refused when
the specification is built. `.withEveryone()` skips the user check entirely,
for public reads. Share the specifications the application runs, so each
screen's query is covered by the rule written for it.

## A rejected write throws; a rejected read depends on why

`j.fact(...)` on an unauthorized fact rejects the promise. A read can be
refused for two kinds of reason:

- **Structural**: no rule shares the specification (`no-matching-rule`), or
  it is narrower than the rule that would (`spec-more-restrictive-than-rule`).
  This never fixes itself, so `j.query()` rejects with
  `DistributionDeniedError`. Fix the specification or add the share.
- **Who the user is**: the rule doesn't name this user
  (`principal-excluded`), or nobody is logged in (`not-authenticated`). A
  later fact can change that, so the read resolves with no results.
  `j.queryWithDiagnostics()` returns the decision alongside the results, and
  `useSpecification` shows it as the empty state
  (`integrating-jinaga-react`).

`testing-jinaga-typescript` shows how to assert each.

## Deploy the rules the code defines

A replicator enforces authorization, distribution, and purge rules from a
policy file in Factual, not by running the TypeScript. Generate that file
from the same `authorization` and `distribution` functions with the `jinaga`
package's `describeAuthorizationRules` and `describeDistributionRules`, as
part of the build or deploy, and mount it where the replicator reads
policies. A rule that can never pass, such as one
that seeks successors of the fact it authorizes, is refused when the policy
file is loaded, so a bad rule stops the deploy instead of refusing every
write.
