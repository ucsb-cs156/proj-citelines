import React from "react";
import { HttpResponse, http } from "msw";
import { expect, within } from "storybook/test";
import AboutScaffold from "main/pages/Help/AboutScaffold";
import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";

export default {
  title: "pages/Help/AboutScaffold",
  component: AboutScaffold,
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

const Template = () => <AboutScaffold />;

export const Default = Template.bind({});

Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(
    await canvas.findByRole("heading", { level: 1, name: "About Scaffold" }),
  ).toBeInTheDocument();
  await expect(
    canvas.getByRole("heading", { level: 2, name: "What Scaffold is for" }),
  ).toBeInTheDocument();
  await expect(
    canvas.getByRole("heading", {
      level: 2,
      name: "Where did Scaffold come from",
    }),
  ).toBeInTheDocument();
};
