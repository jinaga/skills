using System;
using System.Threading.Tasks;
using Jinaga;
using Jinaga.UnitTest;
using Xunit;

// Deliberately not `namespace TaskTracker.Core.Test` — a namespace nested
// under `TaskTracker` would bring TaskTracker.Task into unqualified scope
// alongside System.Threading.Tasks.Task and make every `Task` in this file
// ambiguous. Fully-qualifying the fact types below (`TaskTracker.Project`,
// `TaskTracker.Task`) is the convention this fixture follows instead of
// `using TaskTracker;` — see authoring-jinaga-facts-dotnet's note on this.
namespace TaskTrackerCoreTests
{
    public class ModelTests
    {
        [Fact]
        public async Task CanSaveAndQueryATaskInAProject()
        {
            var j = JinagaTest.Create();

            var user = await j.Fact(new User("test-user"));
            var project = await j.Fact(new TaskTracker.Project(user, DateTime.UtcNow));
            var task = await j.Fact(new TaskTracker.Task(project, DateTime.UtcNow));

            var tasksInProject = await j.Query(TaskTracker.TaskSpecifications.TasksInProject, project);

            Assert.Single(tasksInProject);
            Assert.Equal(task, tasksInProject[0]);
        }
    }
}
