# UI Framework Integration

Use this guide when integrating reactive view models with UI frameworks like .NET MAUI, WPF, or other XAML-based frameworks.

## Assisticant Integration

Assisticant view models work directly with XAML data binding. See [assisticant-view-models](../../assisticant-view-models/SKILL.md) for:
- Observable properties and collections
- Computed properties
- ViewModelLocator pattern
- Validation (WPF only)

## .NET MAUI / XAML Integration

Assisticant collections work with .NET MAUI data binding. You can bind directly to `IEnumerable<T>` properties:

```csharp
public class InspectionViewModel : IDisposable
{
    private ObservableList<MandatoryTestPoint> testPoints = new();
    
    // Expose as IEnumerable for data binding
    public IEnumerable<MandatoryTestPoint> TestPoints => testPoints;
    
    // Assisticant automatically generates ObservableCollection<T> for binding
}
```

In XAML:

```xml
<ListView ItemsSource="{Binding TestPoints}">
    <!-- Item templates -->
</ListView>
```

If you need to bridge to MAUI `ObservableCollection` explicitly:

```csharp
public class InspectionPageViewModel : IDisposable
{
    private InspectionViewModel inspectionViewModel;
    
    public ObservableCollection<MandatoryTestPoint> TestPoints { get; } = new();
    
    public InspectionPageViewModel(JinagaClient j, Inspection inspection)
    {
        inspectionViewModel = new InspectionViewModel(j, inspection);
        
        // Bridge Assisticant to MAUI ObservableCollection
        foreach (var point in inspectionViewModel.MandatoryTestPoints)
        {
            TestPoints.Add(point);
        }
    }
    
    public void Dispose()
    {
        inspectionViewModel?.Dispose();
    }
}
```

## Threading Considerations

**Watch callbacks are called on background thread** - marshal to UI thread if needed:

```csharp
scaleObserver = j.Watch(scaleSpec, inspection,
    projection => {
        // Marshal to UI thread for UI updates
        MainThread.BeginInvokeOnMainThread(() => {
            this.scaleSpecifications.Add(projection);
        });
        return () => {
            MainThread.BeginInvokeOnMainThread(() => {
                this.scaleSpecifications.Remove(projection);
            });
        };
    });
```

## Data Binding

Assisticant collections work directly with XAML data binding:

- **MAUI**: Bind directly to `IEnumerable<T>` properties - Assisticant generates `ObservableCollection<T>` automatically
- **WPF**: Bind directly to `IEnumerable<T>` properties - Assisticant generates `ObservableCollection<T>` automatically
- **Blazor**: Use Assisticant collections directly or convert to arrays

Assisticant automatically manages `ObservableCollection<T>` and `BindingList<T>` for you. See [assisticant-view-models/collections.md](../../assisticant-view-models/collections.md) for details.

## Best Practices

- **Dispose View Models**: Always dispose view models when pages/views are destroyed
- **Thread Safety**: Marshal UI updates to main thread
- **Bridge Pattern**: Create adapter view models that bridge Assisticant to framework collections
- **Lifecycle Management**: Match view model lifecycle to UI component lifecycle
