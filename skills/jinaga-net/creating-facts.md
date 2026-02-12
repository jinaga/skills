# Creating New Facts in Jinaga

Use this guide when the user asks to create a new entity, add a property, or model something new in the system.

## Essential Steps

1. **Define the fact as a C# record** with `[FactType("MyApplication.Entity")]` attribute
2. **Include parent entity references** as required constructor parameters
3. **For mutable properties**, create separate fact types with `prior` array
4. **Use `DateTime createdAt`** for entities to distinguish between different instances of the same entity.

## Examples

### Root Entity
```csharp
[FactType("MyApplication.Customer")]
record Customer(Inspector inspector, DateTime createdAt);
```

### Mutable Property
```csharp
[FactType("MyApplication.Customer.Name")]
record CustomerName(Customer customer, string value, CustomerName[] prior);
```

### Saving the Facts
```csharp
Customer customer = await j.Fact(new Customer(inspector, DateTime.UtcNow));
CustomerName name = await j.Fact(new CustomerName(customer, "ABC Company", []));
```

## Key Patterns

- **Immutable by Design**: All facts are immutable C# records. Never use mutable properties.
- **Hierarchical Namespacing**: Use dot notation like `MyApplication.Customer.Name` to reflect entity hierarchy.
- **Historical Tracking**: The `prior` array preserves complete history of all previous values.
- **Parent References**: Child entities maintain clear ownership through parent references.

## Best Practices

- Use descriptive names following the pattern: `EntityProperty` (e.g., `CustomerName`, `ScaleIdentification`)
- For properties that change over time, always include `prior: <TypeName>[]` parameter
- Use `DateTime.UtcNow` when creating entities that have no other properties to distinguish between different instances of the same entity.
- Include `using Jinaga.Extensions;` for `Successors()` extension method
