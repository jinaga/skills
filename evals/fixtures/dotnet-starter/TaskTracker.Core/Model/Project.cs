using System;
using Jinaga;

namespace TaskTracker
{
    [FactType("TaskTracker.Project")]
    public record Project(User creator, DateTime createdAt);
}
