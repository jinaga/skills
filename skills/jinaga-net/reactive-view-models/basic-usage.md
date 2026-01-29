# Basic Reactive View Model

Use this pattern when you need a simple reactive view model with a single watch that automatically updates when facts change.

## Example

```csharp
record ScaleSpecificationProjection(
    double CapacityLow,
    double CapacityHigh,
    string AccuracyClass,
    double VerificationDivisions
);

class InspectionViewModel : IDisposable
{
    private JinagaClient j;
    private Inspection inspection;

    private ObservableList<ScaleSpecificationProjection> scaleSpecifications = new();
    private IObserver scaleObserver;

    // Expose as IEnumerable for Assisticant data binding
    public IEnumerable<ScaleSpecificationProjection> ScaleSpecifications => scaleSpecifications;

    public InspectionViewModel(JinagaClient j, Inspection inspection)
    {
        this.j = j;
        this.inspection = inspection;

        var scaleSpec = Given<Inspection>.Match(inspection =>
            from scaleSpecification in inspection.scale.Successors()
                .OfType<ScaleSpecification>(scaleSpecification => scaleSpecification.scale)
                    .WhereCurrent(next => next.prior)
            select new ScaleSpecificationProjection(
                scaleSpecification.capacityLow,
                scaleSpecification.capacityHigh,
                scaleSpecification.accuracyClass,
                scaleSpecification.verificationDivisions)
        );

        scaleObserver = j.Watch(scaleSpec, inspection,
            projection => {
                this.scaleSpecifications.Add(projection);
                return () => this.scaleSpecifications.Remove(projection);
            });
    }

    public void Dispose()
    {
        scaleObserver.Stop();
    }

    public async Task Loaded()
    {
        await this.scaleObserver.Loaded;
    }
}
```

## Pattern

1. Create `ObservableList<T>` to store watched projections (from Assisticant)
2. Expose as `IEnumerable<T>` property for data binding (Assisticant pattern)
3. Store `IObserver` reference for cleanup
4. Use `j.Watch()` with specification and starting fact
5. Return removal callback from add callback
6. Implement `IDisposable` and stop observer in `Dispose()`
7. Expose `Loaded()` method that awaits observer's `Loaded` property for testing

**Note**: Assisticant automatically generates `ObservableCollection<T>` for `IEnumerable<T>` properties when used in data binding. See [assisticant-view-models/collections.md](../../assisticant-view-models/collections.md) for details.

## Common Patterns

### Watching Current Values

```csharp
var namesSpec = Given<Customer>.Match(c =>
    c.Successors().OfType<CustomerName>(n => n.customer)
        .WhereCurrent((CustomerName next) => next.prior)
);

namesObserver = j.Watch(namesSpec, customer,
    name => {
        this.names.Add(name);
        return () => this.names.Remove(name);
    });
```

### Watching Collections

```csharp
var scalesSpec = Given<Customer>.Match(c =>
    c.Successors().OfType<Scale>(s => s.customer)
);

scalesObserver = j.Watch(scalesSpec, customer,
    scale => {
        this.scales.Add(scale);
        return () => this.scales.Remove(scale);
    });
```
