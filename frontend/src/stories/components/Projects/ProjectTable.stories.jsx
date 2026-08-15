import React from "react";
import { HttpResponse, http } from "msw";
import ProjectTable from "main/components/Projects/ProjectTable";
import projectsFixtures from "fixtures/projectsFixtures";
import { currentUserFixtures } from "fixtures/currentUserFixtures";

export default {
  title: "components/Projects/ProjectTable",
  component: ProjectTable,
};

const Template = (args) => <ProjectTable {...args} />;

const putHandler = http.put("/api/projects", async ({ request }) => {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  window.alert(
    `Would call PUT /api/projects with params:\n${JSON.stringify(params, null, 2)}`,
  );
  return HttpResponse.json({
    ...projectsFixtures.oneProject,
    ...params,
  });
});

const deleteHandler = http.delete("/api/projects", async ({ request }) => {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  window.alert(
    `Would call DELETE /api/projects with params:\n${JSON.stringify(params, null, 2)}`,
  );
  return HttpResponse.json({
    message: `Project with id ${params.projectId} deleted`,
  });
});

export const Empty = Template.bind({});
Empty.args = {
  projects: [],
  currentUser: currentUserFixtures.userOnly,
};

export const ThreeProjectsAsUser = Template.bind({});
ThreeProjectsAsUser.args = {
  projects: projectsFixtures.threeProjects,
  currentUser: currentUserFixtures.userOnly,
};

export const ThreeProjectsAsOwningResearcher = Template.bind({});
ThreeProjectsAsOwningResearcher.args = {
  projects: projectsFixtures.threeProjects,
  currentUser: currentUserFixtures.researcherUser,
};
ThreeProjectsAsOwningResearcher.parameters = {
  msw: {
    handlers: [putHandler, deleteHandler],
  },
};

export const ThreeProjectsAsAdmin = Template.bind({});
ThreeProjectsAsAdmin.args = {
  projects: projectsFixtures.threeProjects,
  currentUser: currentUserFixtures.adminUser,
};
ThreeProjectsAsAdmin.parameters = {
  msw: {
    handlers: [putHandler, deleteHandler],
  },
};
