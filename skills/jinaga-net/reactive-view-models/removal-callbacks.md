# Removal Callbacks

Use this pattern to handle removals when projections no longer match the specification. The add callback can optionally return a function that is called when the projection is removed.

## How j.Watch() Works

### Simple Overload (Adds Only)

```csharp
IObserver observer = j.Watch(specification, startingFact, 
    projection => {
        // Called when a new projection is added
        observableList.Add(projection);
    });
```

### Overload with Removal Callback

```csharp
IObserver observer = j.Watch(specification, startingFact, 
    projection => {
        // Called when a new projection is added
        observableList.Add(projection);
        
        // Return removal callback (optional)
        return () => {
            // Called when projection no longer matches specification
            observableList.Remove(projection);
        };
    });
```

## Why Use Removal Callbacks

- **Specification Include Existential Conditions**: When the specification includes existential conditions like `.Exists()`, removals occur when the condition is no longer met.
- **Handle Mutable Properties**: When using `.WhereCurrent()`, removals occur when new values replace old ones

## Example

```csharp
scaleObserver = j.Watch(scaleSpec, inspection,
    projection => {
        this.scaleSpecifications.Add(projection);
        // Return removal callback to handle when projection no longer matches
        return () => this.scaleSpecifications.Remove(projection);
    });
```

## Pattern

Always return a removal callback from the add callback when the specification includes existential conditions like `.Exists()`:

```csharp
observer = j.Watch(specification, startingFact,
    projection => {
        collection.Add(projection);
        return () => collection.Remove(projection);
    });
```

## When Removals Occur

- **Mutable Properties**: When a new value replaces the current value (using `.WhereCurrent()`)
- **Existential Conditions**: When the existential condition is no longer met (using `.Exists()`)
- **Sync Updates**: When remote changes cause local projections to no longer match

## Best Practices

- **Always Return Removal Callback**: Keeps collections accurate and prevents memory leaks
- **Match Add/Remove Operations**: Use the same collection and projection instance
- **Handle Edge Cases**: Ensure removal is safe even if projection was already removed
