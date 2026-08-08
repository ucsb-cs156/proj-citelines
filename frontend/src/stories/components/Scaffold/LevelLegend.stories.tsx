import type { Meta, StoryObj } from "@storybook/react";
import LevelLegend from "main/components/Scaffold/LevelLegend";

const meta: Meta<typeof LevelLegend> = {
  title: "components/Scaffold/LevelLegend",
  component: LevelLegend,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof LevelLegend>;

export const Default: Story = {};
