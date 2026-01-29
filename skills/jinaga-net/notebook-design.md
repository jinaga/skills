---
name: jinaga-notebook-design
description: Guide for using Polyglot Notebooks to design Jinaga fact models, view models, and specifications with visual rendering. Use when designing new fact types, exploring data relationships, debugging queries, or visualizing Jinaga data structures in notebooks.
---

# Notebook-Based Jinaga Design

Use Polyglot Notebooks (.NET Interactive) to design, explore, and visualize Jinaga fact models, view models, and specifications. Notebooks provide interactive exploration with visual rendering capabilities.

## Setup

### Required Packages

```csharp
#r "nuget: Jinaga, 1.1.39"
#r "nuget: Jinaga.Notebooks, 1.1.8"
#r "nuget: Jinaga.UnitTest, 1.1.4"

using Jinaga;
using Jinaga.Extensions;
using Jinaga.Patterns;
using Jinaga.Notebooks;
using Jinaga.UnitTest;
```

### Create Test Client

```csharp
var j = JinagaTest.Create();
```

## Visualization Functions

### 1. Render Fact Types (`Renderer.RenderTypes`)

Visualize the structure and relationships of your fact type definitions.

**Usage:**
```csharp
Renderer.RenderTypes(
    typeof(Inspector),
    typeof(InspectorWeight),
    typeof(InspectorWeightQuantity),
    typeof(Customer),
    typeof(Scale),
    typeof(Inspection)
    // ... add all fact types
)
```

**Purpose:**
- Generate SVG diagram showing fact types as nodes
- Display relationships between fact types (e.g., `Inspector` → `InspectorWeight`)
- Show property relationships (e.g., `user`, `inspector`, `prior`)
- Validate fact type structure before implementation

**When to use:**
- Designing new fact models
- Reviewing existing fact type relationships
- Documenting data model structure
- Identifying missing relationships

### 2. Render Fact Instances (`j.RenderFacts`)

Visualize actual fact instances and their relationships at runtime.

**Usage:**
```csharp
// Single fact
j.RenderFacts(weight20kg)

// Multiple related facts
j.RenderFacts(
    scale,
    scaleIdentification,
    scaleSpecification,
    inspection,
    inspectionAvailableWeight20kg
)
```

**Purpose:**
- Generate SVG diagram showing actual fact instances
- Display fact properties and their values
- Show relationships between fact instances
- Debug data structures and verify fact creation

**When to use:**
- Debugging fact creation and relationships
- Understanding runtime data structures
- Verifying projections and queries
- Exploring fact graph connections

### 3. Render Collections as Tables (`AsTable`)

Display collections of objects (projections, view model data) in tabular format.

**Usage:**
```csharp
// From a list
var mandatoryTestPoints = inspectionViewModel.MandatoryTestPoints.ToList();
mandatoryTestPoints.AsTable()

// From a query result
var customers = await j.Query(customersSpec, inspector);
customers.AsTable()

// From a projection
var projections = await j.Query(projectionSpec, startingFact);
projections.AsTable()
```

**Purpose:**
- Convert `IEnumerable<T>` to HTML table
- Automatically create columns for each property
- Include index column for easy reference
- Display collections in readable format

**When to use:**
- Viewing projection results
- Inspecting view model collections
- Debugging query results
- Validating computed properties

## Design Workflow

### 1. Design Fact Types

```csharp
// Define fact types
[FactType("Nawiis.Customer")]
record Customer(Inspector inspector, DateTime createdAt);

[FactType("Nawiis.Customer.Name")]
record CustomerName(Customer customer, string value, CustomerName[] prior);

// Visualize structure
Renderer.RenderTypes(
    typeof(Customer),
    typeof(CustomerName)
)
```

### 2. Create and Test Facts

```csharp
// Create test data
var inspector = await j.Fact(new Inspector(user, DateTime.UtcNow));
var customer = await j.Fact(new Customer(inspector, DateTime.UtcNow));
var name = await j.Fact(new CustomerName(customer, "ABC Company", []));

// Visualize instances
j.RenderFacts(inspector, customer, name)
```

### 3. Design Specifications

```csharp
// Create specification
var namesSpec = Given<Customer>.Match(c =>
    c.Successors().OfType<CustomerName>(n => n.customer)
        .WhereCurrent((CustomerName next) => next.prior)
);

// Test query
var names = await j.Query(namesSpec, customer);
names.AsTable()
```

### 4. Build Projections

```csharp
// Define projection
record CustomerProjection(string Name, DateTime CreatedAt);

var projectionSpec = Given<Customer>.Match(c =>
    from name in c.Successors().OfType<CustomerName>(n => n.customer)
        .WhereCurrent((CustomerName next) => next.prior)
    select new CustomerProjection(name.value, c.createdAt)
);

// Test projection
var projections = await j.Query(projectionSpec, customer);
projections.AsTable()
```

### 5. Test Reactive Queries

Test reactive queries using `j.Watch()` with standard collections:

```csharp
// Create specification
var spec = Given<Inspector>.Match(i =>
    from customer in i.Successors().OfType<Customer>(c => c.inspector)
    from name in customer.Successors().OfType<CustomerName>(n => n.customer)
        .WhereCurrent((CustomerName next) => next.prior)
    select new CustomerProjection(name.value, customer.createdAt)
);

// Test watch with standard collection
var customers = new List<CustomerProjection>();
var observer = j.Watch(spec, inspector, projection => {
    customers.Add(projection);
    return () => customers.Remove(projection);
});

await Task.Delay(100); // Allow watch to initialize
customers.AsTable()
```

**Note:** For production view models with Assisticant integration, see the [Assisticant view models skill](../assisticant-view-models/SKILL.md).

## Troubleshooting

### Graphviz Installation Required

The `Renderer.RenderTypes()` and `j.RenderFacts()` functions require Graphviz `dot` command-line tool. If rendering fails, install Graphviz:

**macOS:**
```bash
brew install graphviz
```

**Windows:**
```powershell
# Using Chocolatey
choco install graphviz

# Or download from: https://graphviz.org/download/
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install graphviz

# Fedora/RHEL
sudo dnf install graphviz
```

**Verify Installation:**
```bash
dot -V
```

Should output version information if installed correctly.

**Common Issues:**
- **"dot command not found"**: Graphviz not in PATH - restart terminal/notebook after installation
- **Rendering fails silently**: Check Graphviz installation with `dot -V`
- **SVG output is empty**: Verify fact types are properly decorated with `[FactType]` attributes

### Notebook-Specific Tips

- **Restart kernel** after installing Graphviz
- **Use `JinagaTest.Create()`** for isolated test environments
- **Await async operations** before calling visualization functions
- **Convert collections to list** before calling `AsTable()`: `.ToList()`

## Best Practices

1. **Start with types**: Use `Renderer.RenderTypes()` to design fact model structure
2. **Validate with instances**: Create test facts and use `j.RenderFacts()` to verify relationships
3. **Test queries incrementally**: Build specifications step-by-step, visualizing results with `AsTable()`
4. **Document in notebooks**: Keep design decisions and explorations in notebook cells
5. **Iterate visually**: Use visualizations to identify missing relationships or incorrect structures

## Integration with Main Codebase

After designing in notebooks:
1. Copy fact type definitions to `Nawiis.Core/`
2. Copy specifications to appropriate locations
3. Copy view models to `Nawiis.Desktop/` or view model directory
4. Add unit tests based on notebook explorations
5. Keep notebook as documentation and reference
