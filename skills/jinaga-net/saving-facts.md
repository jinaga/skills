# Saving Facts in Jinaga

Use this guide when the user wants to create, update, or record new information.

## Essential Steps

1. **Create instance** of the fact type with appropriate values
2. **Use `await j.Fact()`** to persist the fact
3. **For updates to mutable properties**, include previous value in `prior` array

## Examples

### Create New Root Entity
```csharp
Customer customer = await j.Fact(new Customer(inspector, DateTime.UtcNow));
```

### Create Initial Mutable Property Value
```csharp
// First value has empty prior array
CustomerName name = await j.Fact(new CustomerName(
    customer, 
    "ABC Company",
    []  // empty prior array for first value
));
```

### Update Mutable Property
```csharp
// Query for current values
var namesSpec = Given<Customer>.Match(c => c.Names);
var currentNames = await j.Query(namesSpec, customer);

// Only create new fact if value changed or concurrent edits exist
if (currentNames.Count != 1 || currentNames[0].value != "ABC Company Ltd")
{
    CustomerName newName = await j.Fact(new CustomerName(
        customer, 
        "ABC Company Ltd",
        currentNames.ToArray()  // pass all current facts as prior
    ));
}
```

### Create Child Entity
```csharp
Scale scale = await j.Fact(new Scale(customer, DateTime.UtcNow));

ScaleIdentification identification = await j.Fact(new ScaleIdentification(
    scale,
    "Toledo",
    "8530",
    "SN12345",
    "NTEP-12-345",
    []
));
```

### Create Event Facts
```csharp
Inspection inspection = await j.Fact(new Inspection(scale, DateTime.UtcNow));

InspectionTest test = await j.Fact(new InspectionTest(inspection, 100.0));

InspectionTestResultAscending result = await j.Fact(
    new InspectionTestResultAscending(
        test,
        indicatorReading: 100.2,
        indicatorAdjustment: 0.0,
        DateTime.UtcNow
    )
);
```

## Key Patterns

- **Async Operation**: `j.Fact()` is asynchronous and returns the saved fact
- **Local and Remote**: Facts are saved to local SQLite store and queued for sync
- **Immutable Returns**: The returned fact is the same instance you passed in
- **Predecessor References**: Always pass existing facts as predecessor references

## Best Practices

- Use `DateTime.UtcNow` for timestamps (not `DateTime.Now`)
- For root entities, always include `createdAt` timestamp
- For mutable properties, query current value before creating update
- Empty `prior` array `[]` for first value, populated for updates
- Save facts in logical order (parent before children)

## Error Handling

```csharp
try
{
    Customer customer = await j.Fact(new Customer(inspector, DateTime.UtcNow));
}
catch (Exception ex)
{
    // Handle save errors
    // Note: Local saves rarely fail; sync errors are handled separately
}
```
