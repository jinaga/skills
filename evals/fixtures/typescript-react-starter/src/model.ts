import { buildModel, User, LabelOf } from "jinaga";

export class Project {
    static Type = "TaskTracker.Project" as const;
    type = Project.Type;

    constructor(
        public creator: User,
        public createdAt: Date | string
    ) { }

    static by(user: LabelOf<User>) {
        return user.successors(Project, project => project.creator);
    }
}

export class Task {
    static Type = "TaskTracker.Task" as const;
    type = Task.Type;

    constructor(
        public project: Project,
        public createdAt: Date | string
    ) { }

    static in(project: LabelOf<Project>) {
        return project.successors(Task, task => task.project);
    }
}

export class TaskTitle {
    static Type = "TaskTracker.Task.Title" as const;
    type = TaskTitle.Type;

    constructor(
        public task: Task,
        public value: string,
        public prior: TaskTitle[]
    ) { }

    static current(task: LabelOf<Task>) {
        return task.successors(TaskTitle, title => title.task)
            .notExists(title => title.successors(TaskTitle, next => next.prior));
    }
}

export const model = buildModel(b => b
    .type(Project, m => m.predecessor("creator", User))
    .type(Task, m => m.predecessor("project", Project))
    .type(TaskTitle, m => m
        .predecessor("task", Task)
        .predecessor("prior", TaskTitle)
    )
);

// Each task in a project, with its current title(s). More than one title
// means two people renamed the task concurrently.
export const tasksInProject = model.given(Project).match(project =>
    Task.in(project)
        .select(task => ({
            task,
            titles: TaskTitle.current(task).select(title => title.value)
        }))
);
