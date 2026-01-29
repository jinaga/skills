# Creating UI Projections

Use this guide when the user needs to display data in the UI or combine multiple related facts.

## Essential Steps

1. **Start with `Given<T>.Match()`** where T is the starting point
2. **Use `.Select()`** to compose nested specifications
3. **Build anonymous or typed objects** with combined data
4. **Execute** with `await j.Query()` to get results

## Examples

### Simple Projection
```csharp
var customersWithNames = Given<Inspector>.Match(i =>
    i.Successors().OfType<Customer>(c => c.inspector)
        .Select(c => new
        {
            CustomerId = j.Hash(c),
            Name = c.Names.Select(n => n.value)
        })
);

var projections = await j.Query(customersWithNames, inspector);
```

### Complex Nested Projection
```csharp
var customersWithData = Given<Inspector>.Match(i =>
    i.Successors().OfType<Customer>(c => c.inspector)
        .Select(c => new
        {
            CustomerId = j.Hash(c),
            Name = c.Names.Select(n => n.value),
            Address = c.Addresses.Select(a => new {
                a.street,
                a.city,
                a.state,
                a.zip
            }),
            Scales = c.Scales.Select(s => j.Hash(s))
        })
);

var projections = await j.Query(customersWithData, inspector);
// Calculate counts in UI: projection.Scales.Count()
```

### Multi-Level Projection
```csharp
var inspectorDashboard = Given<Inspector>.Match(i =>
    i.Successors().OfType<Customer>(c => c.inspector)
        .Select(c => new
        {
            CustomerName = c.Names.Select(n => n.value),
            Scales = c.Scales.Select(s => new
            {
                ScaleId = j.Hash(s),
                Identification = s.Identifications.Select(id => new
                {
                    id.manufacturer,
                    id.model,
                    id.serialNumber
                }),
                // Include all inspections - sort/filter in UI after query
                Inspections = s.Inspections.Select(ins => new
                {
                    ins.createdAt,
                    Decision = ins.Decisions.Select(d => d.finalDecision)
                })
            })
        })
);

var projections = await j.Query(inspectorDashboard, inspector);
// Sort and get first in UI: scales.Inspections.OrderByDescending(i => i.createdAt).FirstOrDefault()
```

### Projection with Relationship Filtering
```csharp
// Filter by relationships only - not by field values
var inspectionsForScale = Given<Scale>.Match(s =>
    s.Successors().OfType<Inspection>(i => i.scale)
        .Select(i => new
        {
            Date = i.createdAt,
            Decision = i.Decisions.Select(d => d.finalDecision)
        })
);

var projections = await j.Query(inspectionsForScale, scale);
// Filter by date in UI: projections.Where(i => i.Date > DateTime.UtcNow.AddDays(-30))
```

## Key Patterns

- **Select Transformation**: Use `.Select()` to transform specifications into projections
- **Anonymous Types**: Create anonymous objects with data needed for UI
- **Nested Selections**: Combine multiple relations in nested `.Select()` calls
- **Singular vs Plural**: Use `.Select()` for collections, properties for singular values
- **Supported LINQ Methods**: `.Select()`, `.Where()` (for relationship filtering only)
- **NOT Supported in Specifications**: 
  - Aggregate functions: `.Count()`, `.Sum()`, `.Average()`, `.Max()`, `.Min()`
  - Sorting: `.OrderBy()`, `.OrderByDescending()`
  - Element access: `.First()`, `.FirstOrDefault()`, `.Single()`, `.SingleOrDefault()`
  - Grouping: `.GroupBy()`
  - Joins: `.Join()`
  - Field comparisons in `.Where()` clauses

## Best Practices

- Build projections specific to UI needs (don't over-fetch data)
- Use relations defined on fact types for cleaner code
- Name projection properties clearly for UI binding
- **Filter by relationships only**: Use `.Where()` to filter based on fact relationships, not field values
- **Include collections in projections**: Then sort, filter, and aggregate in C# code after querying
- **Realize results to memory**: Once you call `j.Query()` or receive results from `j.Watch()`, you can use full LINQ to Objects
- Consider performance - projections fetch all related data

## Working with Results

```csharp
var projections = await j.Query(customersWithNames, inspector);

// Projections is ImmutableList of anonymous types
foreach (var projection in projections)
{
    var customerId = projection.CustomerId;
    var names = projection.Name; // ImmutableList<string>
    var name = names.FirstOrDefault() ?? "Unnamed";
    
    // Calculate counts/aggregates in UI code (not in projection)
    var scaleCount = projection.Scales.Count(); // OK here, after query
}
```

## Important Limitations

Jinaga specifications have significant limitations compared to full LINQ. See [official documentation](https://jinaga.net/documents/linq/limitations/) for complete details.

### NOT Supported in Specifications

1. **Aggregate Functions**: `.Count()`, `.Sum()`, `.Average()`, `.Max()`, `.Min()`
   - **Workaround**: Include collections in projection, calculate in UI after query

2. **Sorting**: `.OrderBy()`, `.OrderByDescending()`
   - **Workaround**: Sort results in C# code after querying

3. **Element Access**: `.First()`, `.FirstOrDefault()`, `.Single()`, `.SingleOrDefault()`
   - **Workaround**: Get element from collection in C# code after querying

4. **Group By**: `.GroupBy()`
   - **Workaround**: Group results in C# code after querying

5. **Join**: `.Join()`
   - **Workaround**: Use additional `from` clauses with `facts.OfType<T>()` and `where` clauses to specify relationships

6. **Field Comparisons in Where**: Cannot compare field values (strings, dates, numbers) in `.Where()` clauses
   - **Exception**: Can filter by exact value if you use the fact as a query parameter
   - **Workaround**: Filter results in C# code after querying

### What IS Supported

- `.Select()` - Transform specifications into projections
- `.Where()` - Filter based on fact relationships (not field values)
- Multiple `from` clauses - Join facts through relationships
- Nested projections - Combine multiple related facts

### Overcoming Limitations

Once you call `j.Query()` or receive results from `j.Watch()`, the results are realized to memory as `ImmutableList<T>`. At that point, you can use full LINQ to Objects including all the methods listed above.
