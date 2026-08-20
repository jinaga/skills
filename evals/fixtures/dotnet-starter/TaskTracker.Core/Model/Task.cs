using System;
using Jinaga;

namespace TaskTracker
{
    // Deliberately has no title yet — adding one, via the mutable-property
    // (`prior`-chain) pattern from authoring-jinaga-facts-dotnet, is what
    // the task-rename eval scenario asks an agent to do.
    //
    // Named to match the domain, not the runtime. Code outside this
    // namespace that needs both this type and `System.Threading.Tasks.Task`
    // should qualify this one as `TaskTracker.Task` rather than
    // `using TaskTracker;` wholesale — see TaskTracker.Core.Test for the
    // convention this fixture follows.
    [FactType("TaskTracker.Task")]
    public record Task(Project project, DateTime createdAt);
}
