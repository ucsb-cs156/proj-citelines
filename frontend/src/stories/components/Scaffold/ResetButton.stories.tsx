import type { Meta, StoryObj } from "@storybook/react";
import ResetButton from "main/components/Scaffold/ResetButton";

const meta: Meta<typeof ResetButton> = {
  title: "components/Scaffold/ResetButton",
  component: ResetButton,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ResetButton>;

export const Default: Story = {
  args: {
    onReset: () => {},
  },
};
