import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import PatSection from "main/components/Profile/PatSection";

const meta: Meta<typeof PatSection> = {
  title: "components/Profile/PatSection",
  component: PatSection,
  tags: ["autodocs"],
  args: {
    title: "GitHub PAT",
    endpoint: "/api/pat/github",
    testIdPrefix: "PatSection",
  },
};

export default meta;
type Story = StoryObj<typeof PatSection>;

export const NoPatSet: Story = {
  parameters: {
    msw: [
      http.get("/api/pat/github", () =>
        HttpResponse.json(
          { type: "EntityNotFoundException", message: "not found" },
          { status: 404 },
        ),
      ),
    ],
  },
};

export const PatOnFile: Story = {
  parameters: {
    msw: [
      http.get("/api/pat/github", () =>
        HttpResponse.json({
          id: 7,
          userId: 1,
          platform: "GITHUB",
          lastFour: "3f2a",
          expiresAt: "2026-12-31",
        }),
      ),
    ],
  },
};

export const PrairieLearn: Story = {
  args: {
    title: "PrairieLearn PAT",
    endpoint: "/api/pat/pl",
  },
  parameters: {
    msw: [
      http.get("/api/pat/pl", () =>
        HttpResponse.json(
          { type: "EntityNotFoundException", message: "not found" },
          { status: 404 },
        ),
      ),
    ],
  },
};
