import React from "react";
import { http, HttpResponse } from "msw";
import JobTabComponent from "main/components/Courses/TabComponent/JobTabComponent";

export default {
  title: "components/Courses/TabComponents/JobTabComponent",
  component: JobTabComponent,
};

const Template = (args) => <JobTabComponent {...args} />;

export const Empty = Template.bind({});
Empty.args = {
  courseId: 1,
  testIdPrefix: "storybook",
};
Empty.parameters = {
  msw: [http.get("/api/jobs/course", () => HttpResponse.json([]))],
};

export const WithJobs = Template.bind({});
WithJobs.args = {
  courseId: 1,
  testIdPrefix: "storybook",
};
WithJobs.parameters = {
  msw: [
    http.get("/api/jobs/course", () =>
      HttpResponse.json([
        {
          id: 2,
          status: "running",
          jobName: "SyncCourseWithPlRepoJob",
          createdAt: "2026-07-11T12:01:00",
          updatedAt: "2026-07-11T12:01:30",
          log: "Syncing course 1 (CS156) with PrairieLearn",
        },
        {
          id: 1,
          status: "complete",
          jobName: "SyncCourseWithPlRepoJob",
          createdAt: "2026-07-11T12:00:00",
          updatedAt: "2026-07-11T12:00:45",
          log: "Syncing course 1 (CS156) with PrairieLearn\nQuestions: 3 added, 0 updated, 0 deleted, 0 unchanged",
        },
      ]),
    ),
  ],
};
