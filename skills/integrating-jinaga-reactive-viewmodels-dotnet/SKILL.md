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
`j.Watch()`, and to dispose of that subscription cleanly.

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

Expose derived values as computed properties rather than maintaining them by
hand — a reactive framework (e.g. Assisticant's `ComputedList`) recomputes
them automatically whenever `_tasks` changes, which keeps the view model from
accumulating manual update calls scattered across every mutation site.

## Marshal to the UI thread

`j.Watch()` callbacks can fire on a background thread. Anything that touches
UI-bound state — including an `ObservableList` a XAML binding is watching —
needs to run on the UI thread; dispatch explicitly rather than assuming the
callback already runs there.

Always implement `IDisposable` and stop the observer in it. A view model
that never stops its watch keeps its subscription (and everything it holds
a reference to) alive for the life of the `JinagaClient`, not the life of
the screen.

## Design-first: model, visualize, then implement

Before writing the view model — or the fact types, if the model is still in
flux — sketch the fact graph and a couple of example specifications in a
notebook (a Polyglot Notebook works well for this), render the type graph
and a sample instance graph with Graphviz (`diagramming-historical-models`
covers the notation), and confirm the shape against a couple of real
examples. Only once that's settled, copy the finished fact types and
specifications into the actual project and add tests
(`testing-jinaga-dotnet`). Designing directly in the application project
tends to hide problems that a quick, disposable notebook surfaces
immediately — a wrong cardinality or a missing existential filter is much
cheaper to notice before it's wired into a view model and a XAML binding.
