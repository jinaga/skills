# Creating Reactive View Models

Use this guide when you need reactive, auto-updating UI data that responds to changes in the Jinaga fact graph. This pattern uses `j.Watch()` for reactive queries and Assisticant for observable collections and computed properties.

## Essential Steps

1. **Create projection specification** using `Given<T>.Match()` (same as for `j.Query()`)
2. **Use `j.Watch()`** instead of `j.Query()` to get reactive updates
3. **Store results in `ObservableList<T>`** from Assisticant
4. **Use Assisticant computed properties** for derived values (or `ComputedList<T>` for collections)
5. **Implement `IDisposable`** to clean up observers
6. **Stop observers** in `Dispose()` method

## Prerequisites

```csharp
#r "nuget: Assisticant, 1.5.8"
using Assisticant;
using Assisticant.Collections;
```

## Integration with Assisticant

This skill integrates with [Assisticant view models](../assisticant-view-models/SKILL.md) for reactive data binding:

- **ObservableList**: Store watched data from `j.Watch()` in `ObservableList<T>`
- **Computed properties**: Use Assisticant's automatic computed properties for derived values
- **ComputedList**: Use `ComputedList<T>` for computed collections that depend on watched data
- **No INotifyPropertyChanged**: Assisticant handles change notification automatically

See [assisticant-view-models](../assisticant-view-models/SKILL.md) for details on:
- Observable properties and collections
- Computed properties
- View model patterns
- Validation (WPF only)

## Quick Start

**Basic reactive view model**: See [reactive-view-models/basic-usage.md](reactive-view-models/basic-usage.md) for a simple example with a single watch.

**Computed properties**: See [reactive-view-models/computed-properties.md](reactive-view-models/computed-properties.md) when you need derived data that automatically updates when source data changes.

**Multiple watches**: See [reactive-view-models/multiple-watches.md](reactive-view-models/multiple-watches.md) when managing several observers in one view model.

**Removal callbacks**: See [reactive-view-models/removal-callbacks.md](reactive-view-models/removal-callbacks.md) for handling removals when projections no longer match specifications.

**UI integration**: See [reactive-view-models/ui-integration.md](reactive-view-models/ui-integration.md) for integrating with .NET MAUI or other UI frameworks.

**Testing**: See [reactive-view-models/testing.md](reactive-view-models/testing.md) for testing reactive view models.

## Key Patterns

- **j.Watch() vs j.Query()**: Use `j.Watch()` for reactive data that updates automatically, `j.Query()` for one-time queries
- **ObservableList**: Stores watched data and notifies when items are added/removed (from Assisticant)
- **Removal Callbacks**: Return a function from the add callback to handle removals when projections no longer match
- **Computed Properties**: Use Assisticant computed properties for single values, `ComputedList<T>` for collections
- **Observer Management**: Store `IObserver` references and call `Stop()` in `Dispose()`
- **IDisposable Pattern**: Always implement `IDisposable` for view models with watches
- **Assisticant Integration**: Assisticant automatically tracks dependencies and updates bindings

## Differences from j.Query()

| Feature | j.Query() | j.Watch() |
|---------|-----------|-----------|
| **Updates** | One-time | Reactive/continuous |
| **Return Type** | `Task<ImmutableList<T>>` | `IObserver` |
| **Use Case** | Load data once | Auto-updating UI |
| **Performance** | Faster for one-time | Better for reactive UI |
| **Cleanup** | None needed | Must call `Stop()` |

## Important Notes

- **Watch Callbacks**: Called on background thread - marshal to UI thread if needed
- **Initial State**: Watch may not immediately populate - use `ComputedList` to handle empty states
- **Sync Updates**: Watches automatically receive updates from sync, no polling needed
- **Memory**: Observers hold references - always dispose to prevent leaks
- **Specification Reuse**: Same specifications work with both `j.Query()` and `j.Watch()`
