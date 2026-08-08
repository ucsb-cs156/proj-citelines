import React from "react";
import { http, HttpResponse } from "msw";
import PLTabComponent from "main/components/Courses/TabComponent/PLTabComponent";

export default {
  title: "components/Courses/TabComponents/PLTabComponent",
  component: PLTabComponent,
};

const Template = (args) => <PLTabComponent {...args} />;

export const Default = Template.bind({});
Default.args = {
  courseId: 1,
  testIdPrefix: "storybook",
};
Default.parameters = {
  msw: [
    http.get("/api/courses/1", () =>
      HttpResponse.json({ id: 1, plRepoId: null, plInstanceId: null }),
    ),
    http.put("/api/courses/updateGithubRepo", () =>
      HttpResponse.json({ id: 1, plRepoId: 9 }),
    ),
  ],
};

export const FullyConfigured = Template.bind({});
FullyConfigured.args = {
  courseId: 1,
  testIdPrefix: "storybook",
};
FullyConfigured.parameters = {
  msw: [
    http.get("/api/courses/1", () =>
      HttpResponse.json({
        id: 1,
        plRepoId: 9,
        plRepoName: "ucsb-cs156/pl-demo",
        plInstanceId: 55,
        plInstanceShortName: "S26",
        plInstanceNumericId: 213133,
      }),
    ),
  ],
};

export const InstanceNotFound = Template.bind({});
InstanceNotFound.args = {
  courseId: 1,
  testIdPrefix: "storybook",
};
InstanceNotFound.parameters = {
  msw: [
    http.put("/api/courses/updateGithubRepo", () =>
      HttpResponse.json({ id: 1, plRepoId: 9 }),
    ),
    http.put("/api/courses/updatePLInstance", () =>
      HttpResponse.json(
        { type: "ForbiddenException", message: "course instance id not found" },
        { status: 403 },
      ),
    ),
  ],
};

export const MissingPat = Template.bind({});
MissingPat.args = {
  courseId: 1,
  testIdPrefix: "storybook",
};
MissingPat.parameters = {
  msw: [
    http.put("/api/courses/updateGithubRepo", () =>
      HttpResponse.json(
        { type: "ForbiddenException", message: "must set up Github PAT first" },
        { status: 403 },
      ),
    ),
    http.put("/api/courses/updatePLInstance", () =>
      HttpResponse.json(
        {
          type: "ForbiddenException",
          message: "must set up PrairieLearn PAT first",
        },
        { status: 403 },
      ),
    ),
  ],
};
