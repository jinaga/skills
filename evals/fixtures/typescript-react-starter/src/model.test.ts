import { describe, it, expect } from "vitest";
import { JinagaTest, User, Jinaga } from "jinaga";
import { model, Project, Task, TaskTitle, tasksInProject } from "./model";

describe("model", () => {
    it("reads each task in a project with its current title", async () => {
        const j = JinagaTest.create({ model });
        const user = new User("--- test user ---");
        const project = await j.fact(new Project(user, new Date()));
        const task = await j.fact(new Task(project, new Date()));
        const first = await j.fact(new TaskTitle(task, "Draft", []));
        await j.fact(new TaskTitle(task, "Final", [first]));

        const tasks = await j.query(tasksInProject, project);

        expect(tasks).toHaveLength(1);
        expect(Jinaga.hash(tasks[0].task)).toEqual(Jinaga.hash(task));
        expect(tasks[0].titles).toEqual(["Final"]);
    });
});
