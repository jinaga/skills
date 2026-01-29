# Handling Concurrent Edits

Use this guide when multiple values exist for a mutable property (detected by query returning multiple results).

## Essential Steps

1. **Query for all current values** using the specification
2. **Identify the correct value** (user decision or conflict resolution logic)
3. **Create new fact** with correct value and ALL candidates in `prior` array

## Examples

### Detecting Concurrent Edits
```csharp
var namesOfCustomer = Given<Customer>.Match(c =>
    c.Successors().OfType<CustomerName>(n => n.customer)
        .WhereCurrent((CustomerName next) => next.prior)
);

var allNames = await j.Query(namesOfCustomer, customer);

if (allNames.Count > 1)
{
    // Multiple concurrent edits detected!
    // Two users edited the name at the same time
}
```

### Manual Conflict Resolution
```csharp
var allNames = await j.Query(namesOfCustomer, customer);

if (allNames.Count > 1)
{
    // Present options to user
    Console.WriteLine("Multiple names found:");
    for (int i = 0; i < allNames.Count; i++)
    {
        Console.WriteLine($"{i + 1}. {allNames[i].value}");
    }
    
    // Get user choice
    int choice = GetUserChoice();
    string resolvedValue = allNames[choice - 1].value;
    
    // Merge by including all candidates in prior
    await j.Fact(new CustomerName(
        customer, 
        resolvedValue, 
        allNames.ToArray()
    ));
}
```

### Automatic Conflict Resolution
```csharp
var allNames = await j.Query(namesOfCustomer, customer);

if (allNames.Count > 1)
{
    // Use application-specific deterministic logic based on the information
    // in the candidate facts.
    string resolvedValue = ResolveConflict(allNames);
    
    // Merge by including all candidates in prior
    await j.Fact(new CustomerName(
        customer, 
        resolvedValue, 
        allNames.ToArray()
    ));
}
```

### Resolution Helper Function
```csharp
private string ResolveConflict(ImmutableList<CustomerName> names)
{
    // Example strategies:
    
    // 1. Longest name
    return names.OrderByDescending(n => n.value.Length).First().value;
    
    // 2. Alphabetically first
    // return names.OrderBy(n => n.value).First().value;
    
    // 3. User preference (if stored elsewhere)
    // return GetUserPreference(names);
}
```

## Key Patterns

- **Detection**: Query returns `Count > 1` for current values
- **Fork**: Multiple successors with no further successors (all are "current")
- **Merge**: New fact with ALL candidates in `prior` array
- **Consensus**: After merge, only one current value remains

## Best Practices

- Always include ALL candidates in the `prior` array when merging
- Use application-specific deterministic logic for resolution (last-write-wins, user choice, merge values, etc.)
- Consider adding UI indicators when forks are detected
- Test concurrent edit scenarios in unit tests

## Testing Concurrent Edits

```csharp
[Fact]
public async Task HandlesConcurrentNameEdits()
{
    var j = JinagaTest.Create();
    var inspector = await j.Fact(new Inspector(user));
    var customer = await j.Fact(new Customer(inspector, DateTime.UtcNow));
    
    // Simulate concurrent edits
    var name1 = await j.Fact(new CustomerName(customer, "ABC Co", []));
    var name2 = await j.Fact(new CustomerName(customer, "ABC Inc", []));
    
    // Both are current (fork)
    var namesSpec = Given<Customer>.Match(c => c.Names);
    var allNames = await j.Query(namesSpec, customer);
    
    Assert.Equal(2, allNames.Count);
    
    // Merge
    await j.Fact(new CustomerName(
        customer, 
        "ABC Company", 
        [name1, name2]
    ));
    
    // Now only one current
    allNames = await j.Query(namesSpec, customer);
    Assert.Single(allNames);
    Assert.Equal("ABC Company", allNames[0].value);
}
```
