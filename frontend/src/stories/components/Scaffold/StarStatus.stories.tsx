import type { Meta, StoryObj } from "@storybook/react";
import StarStatus from "main/components/Scaffold/StarStatus";

const meta: Meta<typeof StarStatus> = {
  title: "components/Scaffold/StarStatus",
  component: StarStatus,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof StarStatus>;

export const NoneStarred: Story = {
  args: {
    numStarredConcepts: 0,
    numTotalConcepts: 12,
  },
};

export const SomeStarred: Story = {
  args: {
    numStarredConcepts: 5,
    numTotalConcepts: 12,
  },
};

export const AllStarred: Story = {
  args: {
    numStarredConcepts: 12,
    numTotalConcepts: 12,
  },
};
