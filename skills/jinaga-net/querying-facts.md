# Querying Facts in Jinaga

Use this guide when the user asks to retrieve, display, or query data from the system.

## Essential Steps

1. **Define specification** with `Given<T>.Match()`
2. **Use `Successors().OfType<T>()`** to traverse relationships
3. **Use `.WhereCurrent()`** for mutable properties to get current values
4. **Execute** with `await j.Query(spec, startingFact)`

## Examples

### Query for Current Mutable Property Values
```csharp
var namesOfCustomer = Given<Customer>.Match(c =>
    c.Successors().OfType<CustomerName>(n => n.customer)
        .WhereCurrent((CustomerName next) => next.prior)
);

var names = await j.Query(namesOfCustomer, customer);
```

### Query for Successors
```csharp
var customersOfInspector = Given<Inspector>.Match(i =>
    i.Successors().OfType<Customer>(c => c.inspector)
);

var customers = await j.Query(customersOfInspector, inspector);
```

## Key Patterns

- **Given/Match Pattern**: Start with `Given<T>.Match()` where T is the starting point type
- **Successors Navigation**: Use `Successors().OfType<T>()` to find related facts
- **Lambda Relationships**: The lambda shows how successors relate to predecessors
- **WhereCurrent**: Filters to values with no successors in `prior` chains

## Best Practices

- Always include `using Jinaga.Extensions;` for `Successors()` extension method
- Use `.WhereCurrent()` for mutable properties to avoid getting historical values
- Query returns `ImmutableList<T>` - use LINQ methods like `.Select()` to transform
- Store specifications as variables for reusability
