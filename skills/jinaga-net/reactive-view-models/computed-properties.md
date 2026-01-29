# Computed Properties with ComputedList

Use this pattern when you need derived collections that automatically recompute when source data changes. `ComputedList` tracks dependencies and updates automatically.

**Note**: For single computed values (not collections), use Assisticant's automatic computed properties instead. See [assisticant-view-models/computed-properties.md](../../assisticant-view-models/computed-properties.md) for details.

## Example

```csharp
record MandatoryTestPoint(
    double TargetWeight,
    string Description,
    bool isSystemGenerated
);

class InspectionViewModel : IDisposable
{
    private JinagaClient j;
    private Inspection inspection;

    private ObservableList<ScaleSpecificationProjection> scaleSpecifications = new();
    private IObserver scaleObserver;

    private ComputedList<MandatoryTestPoint> mandatoryTestPoints;
    public IEnumerable<MandatoryTestPoint> MandatoryTestPoints => mandatoryTestPoints;
    
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

        // ComputedList automatically recomputes when scaleSpecifications changes
        this.mandatoryTestPoints = new ComputedList<MandatoryTestPoint>(() =>
        {
            var specification = scaleSpecifications.FirstOrDefault();
            if (specification == null)
            {
                return Enumerable.Empty<MandatoryTestPoint>();
            }

            var testPoints = new List<MandatoryTestPoint>();

            // Compute test points based on specification
            if (specification.CapacityLow > 0)
            {
                testPoints.Add(new MandatoryTestPoint(
                    specification.CapacityLow,
                    "Minimum capacity",
                    isSystemGenerated: true
                ));
            }

            testPoints.Add(new MandatoryTestPoint(
                specification.CapacityHigh / 2,
                "50% of maximum capacity",
                isSystemGenerated: true
            ));

            testPoints.Add(new MandatoryTestPoint(
                specification.CapacityHigh,
                "Maximum capacity",
                isSystemGenerated: true
            ));

            return testPoints.OrderBy(tp => tp.TargetWeight);
        });
    }

    public void Dispose()
    {
        scaleObserver.Stop();
    }
}
```

## Key Points

- **Use for Collections**: `ComputedList` is for computed collections. Use Assisticant computed properties for single values
- **Automatic Dependency Tracking**: `ComputedList` tracks which `ObservableList` properties you access
- **Recomputes on Change**: When dependencies change, the computation function runs again
- **Handle Empty States**: Always check for null/empty collections in computed functions
- **Expose as IEnumerable**: Public property should return `IEnumerable<T>`, not `ComputedList<T>`

## When to Use ComputedList vs Computed Properties

- **ComputedList**: Use when you need a computed collection (list/array) that depends on watched data
- **Assisticant Computed Properties**: Use for single computed values (strings, numbers, booleans) that depend on watched data

Example of Assisticant computed property (single value):

```csharp
public class InspectionViewModel
{
    private ObservableList<ScaleSpecificationProjection> scaleSpecifications = new();

    // Assisticant automatically tracks dependencies and updates when scaleSpecifications changes
    public bool HasSpecification => scaleSpecifications.Any();
    public string SpecificationSummary => 
        scaleSpecifications.FirstOrDefault()?.AccuracyClass ?? "No specification";
}
```

## Pattern

```csharp
private ComputedList<DerivedType> computedProperty;
public IEnumerable<DerivedType> ComputedProperty => computedProperty;

// In constructor:
computedProperty = new ComputedList<DerivedType>(() =>
{
    // Access ObservableList properties here
    var source = sourceList.FirstOrDefault();
    if (source == null)
        return Enumerable.Empty<DerivedType>();
    
    // Compute derived values
    return ComputeDerivedValues(source);
});
```

## Computed Property from Multiple Sources

```csharp
private ComputedList<CustomerSummary> summaries;

summaries = new ComputedList<CustomerSummary>(() =>
    from customer in customers
    let name = customer.Names.FirstOrDefault()?.value ?? "Unnamed"
    let scaleCount = customer.Scales.Count()
    select new CustomerSummary(name, scaleCount)
);
```
