# Encapsulating Specifications as Relations

Use this guide when the user wants to make queries reusable or attach them to entities.

## Essential Steps

1. **Add `Relation<T>` property** to the fact type
2. **Use `Relation.Define()`** to encapsulate the specification
3. **Reference the relation** in queries instead of repeating the specification

## Examples

### Defining a Relation on a Fact Type
```csharp
[FactType("Nawiis.Customer")]
public record Customer(Inspector inspector, DateTime createdAt)
{
    public Relation<CustomerName> Names => Relation.Define(_ =>
        this.Successors().OfType<CustomerName>(n => n.customer)
            .WhereCurrent((CustomerName next) => next.prior)
    );
}
```

### Using the Relation in a Query
```csharp
var namesSpec = Given<Customer>.Match(c => c.Names);
var names = await j.Query(namesSpec, customer);
```

### Multiple Relations on One Type
```csharp
[FactType("Nawiis.Customer")]
public record Customer(Inspector inspector, DateTime createdAt)
{
    public Relation<CustomerName> Names => Relation.Define(_ =>
        this.Successors().OfType<CustomerName>(n => n.customer)
            .WhereCurrent((CustomerName next) => next.prior)
    );

    public Relation<CustomerAddress> Addresses => Relation.Define(_ =>
        this.Successors().OfType<CustomerAddress>(a => a.customer)
            .WhereCurrent((CustomerAddress next) => next.prior)
    );

    public Relation<Scale> Scales => Relation.Define(_ =>
        this.Successors().OfType<Scale>(s => s.customer)
    );
}
```

### Extension Members for External Types
For types defined in external libraries (like `Jinaga.User`), use extension members:

```csharp
public static class UserExtensions
{
    extension(User user)
    {
        public Relation<Inspector> Inspectors => Relation.Define(_ =>
            user.Successors().OfType<Inspector>(i => i.user)
        );
    }
}
```

## Key Patterns

- **Relation Properties**: Use `Relation<T>` as the property type
- **Relation.Define()**: Takes a lambda with underscore parameter (unused)
- **Specification Reuse**: Relations can be referenced in multiple queries
- **Composability**: Relations can be used in projections with `.Select()`

## Best Practices

- Define relations for commonly queried relationships
- Use descriptive plural names for relations that return multiple items (e.g., `Names`, `Scales`)
- Include both current value relations (with `.WhereCurrent()`) and historical relations
- Document complex relations with XML comments
