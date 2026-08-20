import { buildModel, User, LabelOf } from "jinaga";

// Deliberately has no title yet — adding one, via the mutable-property
// (`prior`-chain) pattern from authoring-jinaga-facts-typescript, is what
// the task-rename eval scenario asks an agent to do.

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

export const model = buildModel(b => b
    .type(Project, m => m.predecessor("creator", User))
    .type(Task, m => m.predecessor("project", Project))
);

export const tasksInProject = model.given(Project).match(project =>
    Task.in(project)
);
