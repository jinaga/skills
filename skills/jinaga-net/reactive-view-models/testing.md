# Testing Reactive View Models

Use this guide when writing unit tests for reactive view models that use `j.Watch()`.

## View Model Pattern

View models should expose a `Loaded()` method that awaits the observer's `Loaded` property:

```csharp
class CustomerViewModel : IDisposable
{
    private IObserver namesObserver;
    
    public async Task Loaded()
    {
        await this.namesObserver.Loaded;
    }
    
    // ... rest of view model
}
```

## Example Test

```csharp
[Fact]
public async Task ViewModelUpdatesWhenFactsChange()
{
    var j = JinagaTest.Create();
    var inspector = await j.Fact(new Inspector(user));
    var customer = await j.Fact(new Customer(inspector, DateTime.UtcNow));
    
    var viewModel = new CustomerViewModel(j, customer);
    
    // Wait for initial load to complete
    await viewModel.Loaded();
    
    // Initially empty
    Assert.Empty(viewModel.Names);
    
    // Add a name
    await j.Fact(new CustomerName(customer, "ABC Company", []));
    
    // Wait for watch to process the new fact
    await viewModel.Loaded();
    
    // View model should have updated
    Assert.Single(viewModel.Names);
    Assert.Equal("ABC Company", viewModel.Names.First().value);
    
    viewModel.Dispose();
}
```

## Testing Patterns

### Test Initial State

```csharp
var viewModel = new InspectionViewModel(j, inspection);
await viewModel.Loaded();
Assert.Empty(viewModel.ScaleSpecifications);
viewModel.Dispose();
```

### Test Additions

```csharp
var viewModel = new InspectionViewModel(j, inspection);
await viewModel.Loaded();

await j.Fact(new ScaleSpecification(scale, 1000, 2000, "F2", 0.1, []));
await viewModel.Loaded(); // Wait for watch to process

Assert.Single(viewModel.ScaleSpecifications);
```

### Test Removals

```csharp
var viewModel = new CustomerViewModel(j, customer);
await viewModel.Loaded();

// Add initial value
await j.Fact(new CustomerName(customer, "Old Name", []));
await viewModel.Loaded();

// Replace with new value (old should be removed)
var oldName = viewModel.Names.First();
await j.Fact(new CustomerName(customer, "New Name", [oldName]));
await viewModel.Loaded();

Assert.Single(viewModel.Names);
Assert.Equal("New Name", viewModel.Names.First().value);
```

### Test Computed Properties

```csharp
var viewModel = new InspectionViewModel(j, inspection);
await viewModel.Loaded();

await j.Fact(new ScaleSpecification(scale, 1000, 2000, "F2", 0.1, []));
await viewModel.Loaded();

var testPoints = viewModel.MandatoryTestPoints.ToList();
Assert.NotEmpty(testPoints);
Assert.Contains(testPoints, tp => tp.TargetWeight == 1000);
```

## Important Notes

- **Use JinagaTest.Create()**: Creates a test client for unit tests
- **Use Loaded() Method**: Call `await viewModel.Loaded()` instead of `Task.Delay()` to wait for watches to process
- **Wait After Each Change**: Call `Loaded()` after creating facts to ensure watches have processed updates
- **Always Dispose**: Clean up view models in test teardown
- **Test Both Add and Remove**: Verify removal callbacks work correctly
- **Test Computed Properties**: Ensure computed properties update when dependencies change

## Error Handling Tests

```csharp
[Fact]
public async Task ViewModelHandlesMissingData()
{
    var j = JinagaTest.Create();
    var inspection = await j.Fact(new Inspection(scale, DateTime.UtcNow));
    
    var viewModel = new InspectionViewModel(j, inspection);
    await viewModel.Loaded();
    
    // Computed property should handle empty state
    var testPoints = viewModel.MandatoryTestPoints.ToList();
    Assert.Empty(testPoints);
    
    viewModel.Dispose();
}
```

## Multiple Observers

When a view model has multiple observers, expose a `Loaded()` method that awaits all observers:

```csharp
class CustomerViewModel : IDisposable
{
    private IObserver namesObserver;
    private IObserver addressesObserver;
    
    public async Task Loaded()
    {
        await Task.WhenAll(
            this.namesObserver.Loaded,
            this.addressesObserver.Loaded
        );
    }
    
    // ... rest of view model
}
```
