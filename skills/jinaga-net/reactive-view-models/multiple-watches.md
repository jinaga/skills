# Multiple Watches

Use this pattern when your view model needs to watch multiple specifications and manage several observers.

## Example

```csharp
class CustomerViewModel : IDisposable
{
    private JinagaClient j;
    private Customer customer;

    private ObservableList<CustomerName> names = new();
    private ObservableList<CustomerAddress> addresses = new();
    
    private IObserver namesObserver;
    private IObserver addressesObserver;

    private ComputedList<string> displayName;
    public string DisplayName => displayName.FirstOrDefault() ?? "Unnamed";

    public CustomerViewModel(JinagaClient j, Customer customer)
    {
        this.j = j;
        this.customer = customer;

        var namesSpec = Given<Customer>.Match(c => c.Names);
        namesObserver = j.Watch(namesSpec, customer,
            name => {
                this.names.Add(name);
                return () => this.names.Remove(name);
            });

        var addressesSpec = Given<Customer>.Match(c => c.Addresses);
        addressesObserver = j.Watch(addressesSpec, customer,
            address => {
                this.addresses.Add(address);
                return () => this.addresses.Remove(address);
            });

        displayName = new ComputedList<string>(() =>
            names.Select(n => n.value)
        );
    }

    public void Dispose()
    {
        namesObserver.Stop();
        addressesObserver.Stop();
    }

    public async Task Loaded()
    {
        await Task.WhenAll(
            this.namesObserver.Loaded,
            this.addressesObserver.Loaded
        );
    }
}
```

## Pattern

1. **Separate ObservableList for each watch**: Each watch manages its own collection
2. **Store all observer references**: Keep track of every `IObserver` for cleanup
3. **Stop all observers in Dispose()**: Ensure all watches are stopped
4. **Expose Loaded() method**: Await all observers using `Task.WhenAll()` for testing
5. **ComputedList can depend on multiple sources**: Access multiple `ObservableList` properties in one computed property

## Best Practices

- **Single Responsibility**: Each watch should handle one type of projection
- **Store All Observers**: Keep references to all observers for cleanup
- **Stop All in Dispose**: Don't forget to stop every observer
- **Use ComputedList for Aggregation**: Combine multiple watched collections in computed properties
