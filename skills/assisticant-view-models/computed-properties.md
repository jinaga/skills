# Computed Properties

Computed properties in Assisticant automatically track dependencies and update when they change. No need to manually implement `INotifyPropertyChanged` or call `OnPropertyChanged`.

## Basic Pattern

```csharp
public class PersonViewModel
{
    private Observable<string> firstName = new Observable<string>();
    private Observable<string> lastName = new Observable<string>();

    public string FirstName
    {
        get => firstName;
        set => firstName.Value = value;
    }

    public string LastName
    {
        get => lastName;
        set => lastName.Value = value;
    }

    // Automatically recomputes when FirstName or LastName changes
    public string FullName => $"{FirstName} {LastName}".Trim();
}
```

## How It Works

Assisticant tracks which observable properties are accessed during property evaluation. When any of those dependencies change, the computed property automatically recomputes and notifies bindings.

## Common Patterns

### Combining Properties

```csharp
public string DisplayName => $"{LastName}, {FirstName}";
public string FullAddress => $"{Street}, {City}, {State} {ZipCode}";
```

### Default Values

```csharp
public string DisplayName => Name ?? "<New Person>";
public int TotalItems => Items?.Count() ?? 0;
```

### Conditional Logic

```csharp
public string Status => IsComplete ? "Complete" : "In Progress";
public bool CanSave => !string.IsNullOrWhiteSpace(Name) && Age > 0;
```

### Aggregations

```csharp
public decimal TotalPrice => Items.Sum(item => item.Price);
public int ItemCount => Items.Count();
public bool HasItems => Items.Any();
```

### Filtering and Projection

```csharp
public IEnumerable<Person> ActivePeople => 
    from person in People
    where person.IsActive
    select person;

public IEnumerable<string> Names => 
    from person in People
    select person.Name;
```

## Dependencies

Computed properties automatically track:
- Observable properties accessed during evaluation
- ObservableList collections accessed during evaluation
- Nested computed properties

```csharp
public class OrderViewModel
{
    private ObservableList<LineItem> items = new ObservableList<LineItem>();

    public IEnumerable<LineItem> Items => items;

    // Depends on Items collection
    public decimal Subtotal => Items.Sum(item => item.Price);

    // Depends on Subtotal (nested dependency)
    public decimal Tax => Subtotal * 0.08m;

    // Depends on both Subtotal and Tax
    public decimal Total => Subtotal + Tax;
}
```

## Performance

- Computed properties are evaluated lazily (only when accessed)
- Results are cached until dependencies change
- Only recomputes when a tracked dependency actually changes
- No manual invalidation needed

## Important Notes

- **Pure functions**: Computed properties should be pure (no side effects)
- **No parameters**: Computed properties cannot take parameters
- **Automatic tracking**: Dependencies are tracked automatically - no manual registration needed
- **Nested dependencies**: Can depend on other computed properties
