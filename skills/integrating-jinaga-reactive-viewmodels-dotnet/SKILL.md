---
name: integrating-jinaga-reactive-viewmodels-dotnet
description: >
  Use when wiring a Jinaga.NET specification into a view model — populating
  a reactive collection from `j.Watch()`, exposing computed properties for
  data binding, or working through the design-first modeling workflow before
  implementing a screen.
---

# Integrating Jinaga into .NET reactive view models

Once a specification exists (`authoring-jinaga-specifications-dotnet`), a
view model's job is to keep a UI-bindable collection in sync with it via
`j.Watch()`, and to dispose of that subscription cleanly. The examples use
Assisticant (`assisticant-view-models`); with CommunityToolkit.Mvvm or plain
`INotifyPropertyChanged`, the Jinaga half is the same: watch, marshal to the
UI thread, stop on dispose.

## Populate a collection from a watch

`j.Watch()` calls back once per matching fact with an add, and expects a
function back that runs on remove. Subscribe in the constructor — `Watch`
itself isn't async, so there's no reason to defer it to a separate `Load`
step:

```csharp
public class TaskListViewModel : IDisposable
{
    private readonly ObservableList<TaskProjection> _tasks = new();
    public IEnumerable<TaskProjection> Tasks => _tasks;

    private readonly IObserver _observer;

    public TaskListViewModel(JinagaClient j, Project project)
    {
        _observer = j.Watch(TasksInProjectQuery(), project, projection =>
        {
            _tasks.Add(projection);
            return () => _tasks.Remove(projection);
        });
    }

    public async Task Loaded()
    {
        await _observer.Loaded;
    }

    public void Dispose()
    {
        _observer.Stop();
    }
}
```

`IObserver.Loaded` is a `Task` **property**, not a method — `await
_observer.Loaded();` is a mistake that won't compile, not just a style
choice; the parens matter. Expose the view model's own `Loaded()` as an
`async Task` method wrapping it, per `testing-jinaga-dotnet` — a test
awaits *that*, not the observer directly, so a view model with more than
one observer can compose them (`Task.WhenAll(...)`) behind one call.

`IObserver.Cached` completes once results have been read from local
storage, before the replicator answers. Await it to show what the device
already has while offline; `Loaded` follows with the up-to-date view.

## Changes inside a row

The watch calls back once per row. A collection projected as
`IEnumerable<T>` holds what existed when the row was added, and does not
change afterward: a comment added to a task already on screen won't appear.
For a row whose contents change while it is displayed, project the
collection as `IObservableCollection<T>` (wrapped in `facts.Observable(...)`,
per `authoring-jinaga-specifications-dotnet`) and subscribe to it when the
row arrives:

```csharp
_observer = j.Watch(TaskCardsInProject(), project, card =>
{
    var row = new TaskRow(card.task);
    _rows.Add(row);
    card.comments.OnAdded(comment =>
    {
        row.Comments.Add(comment);
        return () => row.Comments.Remove(comment);
    });
    return () => _rows.Remove(row);
});
```

The same applies to a row's status when status is the existence of decision
facts (a completion, a departure): project those decisions as observable
collections, and the row updates when one arrives.

Expose derived values as computed properties rather than maintaining them by
hand. A single derived value is a plain computed property reading `_tasks`;
a derived *collection* — filtered, sorted, or reshaped from `_tasks` — is
Assisticant's `ComputedList<T>` instead, which tracks `_tasks` as a
dependency and recomputes only when it changes:

```csharp
private readonly ComputedList<TaskProjection> _overdueTasks;
public IEnumerable<TaskProjection> OverdueTasks => _overdueTasks;

// in the constructor, after _observer is set up:
_overdueTasks = new ComputedList<TaskProjection>(() =>
    _tasks.Where(t => t.DueDate < DateTime.UtcNow));
```

`ComputedList<T>` itself is a general Assisticant type, not a Jinaga one —
see `assisticant-view-models`'s
[computed-properties.md](../assisticant-view-models/computed-properties.md)
for the full API and when to reach for it over a plain computed property.
This is the Jinaga-specific half: the source it's computing over is data
`j.Watch()` populated.

## Marshal to the UI thread

`j.Watch()` callbacks can fire on a background thread. Anything that touches
UI-bound state — including an `ObservableList` a XAML binding is watching —
needs to run on the UI thread; dispatch explicitly rather than assuming the
callback already runs there. In .NET MAUI, dispatch both the add and the
remove:

```csharp
_observer = j.Watch(TasksInProjectQuery(), project, projection =>
{
    MainThread.BeginInvokeOnMainThread(() => _tasks.Add(projection));
    return () => MainThread.BeginInvokeOnMainThread(() => _tasks.Remove(projection));
});
```

Always implement `IDisposable` and stop the observer in it. A view model
that never stops its watch keeps its subscription (and everything it holds
a reference to) alive for the life of the `JinagaClient`, not the life of
the screen.

## Design-first: model, visualize, then implement

Before writing the view model — or the fact types, if the model is still in
flux — sketch the fact graph and confirm its shape against a couple of real
examples *before* wiring it into a view model and a XAML binding. A wrong
cardinality or a missing existential filter is much cheaper to notice at
this stage than after it's live in a screen. Two ways to do the "sketch
and confirm" part, combinable:

- **Diagram it** — draw the fact-type graph and a sample instance graph by
  hand, per `diagramming-historical-models`'s notation. For a model with
  many fact types, `Jinaga.Notebooks.Dot` generates the same notation from
  code: `Dot.Renderer.RenderTypes(typeof(...))` for fact types and
  `j.RenderFacts(...)` for instances, piped through `dot -Tsvg`.
- **Prove it with a test** — write a scratch `JinagaTest`-based test (per
  `testing-jinaga-dotnet`) that saves a couple of example facts and queries
  them back through the specification. This is the same "does the shape
  actually behave the way I think it does" check as the diagram, aimed at
  behavior instead of structure — cheap, disposable, and doesn't depend on
  any tooling beyond what's already needed to test the real thing.

Only once the shape is confirmed, copy the finished fact types and
specifications into the actual project and keep the test (or write a
proper one) rather than discarding it.
