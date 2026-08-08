import type { Meta, StoryObj } from "@storybook/react";
import LinkToScaffold from "main/components/Scaffold/LinkToScaffold";

const meta: Meta<typeof LinkToScaffold> = {
  title: "components/Scaffold/LinkToScaffold",
  component: LinkToScaffold,
  tags: ["autodocs"],
  args: {
    course: { id: 1, courseName: "CMPSC 156" },
  },
};

export default meta;
type Story = StoryObj<typeof LinkToScaffold>;

export const Default: Story = {};
