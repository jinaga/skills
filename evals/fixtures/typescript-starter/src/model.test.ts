import { describe, it, expect } from "vitest";
import { JinagaTest, User, Jinaga } from "jinaga";
import { model, Project, Task, tasksInProject } from "./model";

describe("model", () => {
    it("saves and queries a task in a project", async () => {
        const j = JinagaTest.create({ model });
        const user = new User("--- test user ---");
        const project = await j.fact(new Project(user, new Date()));
        const task = await j.fact(new Task(project, new Date()));

        const tasks = await j.query(tasksInProject, project);

        expect(tasks).toHaveLength(1);
        expect(Jinaga.hash(tasks[0])).toEqual(Jinaga.hash(task));
    });
});
