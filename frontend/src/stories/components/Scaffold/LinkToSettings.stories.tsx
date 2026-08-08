import type { Meta, StoryObj } from "@storybook/react";
import LinkToSettings from "main/components/Scaffold/LinkToSettings";

const meta: Meta<typeof LinkToSettings> = {
  title: "components/Scaffold/LinkToSettings",
  component: LinkToSettings,
  tags: ["autodocs"],
  args: {
    course: { id: 1, courseName: "CMPSC 156" },
  },
};

export default meta;
type Story = StoryObj<typeof LinkToSettings>;

export const Default: Story = {};
