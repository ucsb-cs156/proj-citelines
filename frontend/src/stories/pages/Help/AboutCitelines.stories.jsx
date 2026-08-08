import React from "react";
import { HttpResponse, http } from "msw";
import { expect, within } from "storybook/test";
import AboutCitelines from "main/pages/Help/AboutCitelines";
import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";

export default {
  title: "pages/Help/AboutCitelines",
  component: AboutCitelines,
  parameters: {
    msw: {
      handlers: [
        http.get("/api/currentUser", () => {
          return HttpResponse.json(apiCurrentUserFixtures.userOnly);
        }),
        http.get("/api/systemInfo", () => {
          return HttpResponse.json(systemInfoFixtures.showingNeither);
        }),
      ],
    },
  },
};

const Template = () => <AboutCitelines />;

export const Default = Template.bind({});

Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    await canvas.findByRole("heading", { level: 1, name: "About Citelines" }),
  ).toBeInTheDocument();
};
