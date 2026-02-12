---
name: jinaga
description: Comprehensive guide for working with Jinaga in a .NET application. Use when creating facts, querying data, building projections, handling concurrent edits, creating reactive view models, or working with the Jinaga fact-based data model.
---

# Working with Jinaga

Use this skill when working with Jinaga, the immutable fact-based data modeling framework used in a .NET application. This guide covers all aspects of working with Jinaga facts, queries, projections, and reactive view models.

## Quick Navigation

**Core Operations**:
- **Creating facts**: See [creating-facts.md](creating-facts.md) for defining new fact types and entities
- **Saving facts**: See [saving-facts.md](saving-facts.md) for persisting facts to Jinaga
- **Querying facts**: See [querying-facts.md](querying-facts.md) for retrieving data from the fact graph

**Advanced Patterns**:
- **Projections**: See [projections.md](projections.md) for building UI-ready data structures
- **Encapsulating specifications**: See [encapsulating-specifications.md](encapsulating-specifications.md) for reusable query patterns
- **Concurrent edits**: See [concurrent-edits.md](concurrent-edits.md) for handling conflicts

**Design & Exploration**:
- **Notebook design**: See [notebook-design.md](notebook-design.md) for using Polyglot Notebooks to design and visualize fact models, view models, and specifications

**Reactive View Models**:
- **Overview**: See [reactive-view-models.md](reactive-view-models.md) for creating auto-updating UI data
- **Basic usage**: See [reactive-view-models/basic-usage.md](reactive-view-models/basic-usage.md) for simple single-watch patterns
- **Computed properties**: See [reactive-view-models/computed-properties.md](reactive-view-models/computed-properties.md) for derived collections
- **Multiple watches**: See [reactive-view-models/multiple-watches.md](reactive-view-models/multiple-watches.md) for managing several observers
- **Removal callbacks**: See [reactive-view-models/removal-callbacks.md](reactive-view-models/removal-callbacks.md) for handling removals
- **UI integration**: See [reactive-view-models/ui-integration.md](reactive-view-models/ui-integration.md) for .NET MAUI/WPF integration
- **Testing**: See [reactive-view-models/testing.md](reactive-view-models/testing.md) for unit testing patterns

## Essential Concepts

### Facts
Facts are immutable C# records that represent entities and their properties in the system. All facts are stored in an immutable fact graph.

### Specifications
Specifications define queries using `Given<T>.Match()` patterns. They describe what facts to retrieve based on relationships in the fact graph.

### Mutable Properties
Properties that change over time use a `prior` array to track history. Use `.WhereCurrent()` in queries to get only the current value.

### Relations
Encapsulate specifications as reusable `Relation<T>` properties on fact types for cleaner, more maintainable code.

### Reactive Queries
Use `j.Watch()` instead of `j.Query()` when you need UI data that automatically updates when facts change.

## Common Workflows

### Creating a New Entity with Properties

1. Define fact types: See [creating-facts.md](creating-facts.md)
2. Save initial facts: See [saving-facts.md](saving-facts.md)
3. Query for display: See [querying-facts.md](querying-facts.md) or [projections.md](projections.md)

### Building a Reactive View Model

1. Create projection specification: See [projections.md](projections.md)
2. Use `j.Watch()`: See [reactive-view-models.md](reactive-view-models.md)
3. Store in `ObservableList`: See [reactive-view-models/basic-usage.md](reactive-view-models/basic-usage.md)
4. Add computed properties: See [reactive-view-models/computed-properties.md](reactive-view-models/computed-properties.md)

### Handling Concurrent Edits

1. Detect multiple current values: See [concurrent-edits.md](concurrent-edits.md)
2. Resolve conflict: See [concurrent-edits.md](concurrent-edits.md)
3. Merge with `prior` array: See [concurrent-edits.md](concurrent-edits.md)

## Key Patterns

### Fact Type Definition
```csharp
[FactType("MyApplication.Customer")]
record Customer(Inspector inspector, DateTime createdAt);

[FactType("MyApplication.Customer.Name")]
record CustomerName(Customer customer, string value, CustomerName[] prior);
```

### Query Specification
```csharp
var namesSpec = Given<Customer>.Match(c =>
    c.Successors().OfType<CustomerName>(n => n.customer)
        .WhereCurrent((CustomerName next) => next.prior)
);
```

### Saving Facts
```csharp
Customer customer = await j.Fact(new Customer(inspector, DateTime.UtcNow));
CustomerName name = await j.Fact(new CustomerName(customer, "ABC Company", []));
```

### Reactive Watch
```csharp
var observer = j.Watch(spec, startingFact, projection => {
    observableList.Add(projection);
    return () => observableList.Remove(projection);
});
```

## Best Practices

- **Always use C# records** for fact types (never classes)
- **Include `using Jinaga.Extensions;`** for `Successors()` extension method
- **Use `DateTime.UtcNow`** for timestamps (not `DateTime.Now`)
- **Query before updating** mutable properties to handle concurrent edits
- **Always dispose** view models with watches to prevent memory leaks
- **Use relations** to encapsulate commonly-used specifications
- **Filter in C# code** after querying - specifications have limited LINQ support

## Integration with Assisticant

Reactive view models integrate with Assisticant for data binding:
- See [assisticant-view-models](../assisticant-view-models/SKILL.md) for observable properties and computed values
- Assisticant automatically handles change notification for XAML data binding
- Use `ObservableList<T>` from Assisticant to store watched data

## Testing

- Use `JinagaTest.Create()` for unit tests
- Test both save and query operations
- Test concurrent edit scenarios
- For reactive view models, expose `Loaded()` method and await it in tests
