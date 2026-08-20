using Jinaga;
using Jinaga.Extensions;

namespace TaskTracker
{
    public static class TaskSpecifications
    {
        public static readonly Specification<Project, Task> TasksInProject =
            Given<Project>.Match(project =>
                project.Successors().OfType<Task>(task => task.project));
    }
}
