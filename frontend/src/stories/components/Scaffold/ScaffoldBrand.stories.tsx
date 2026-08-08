import type { Meta, StoryObj } from "@storybook/react";
import ScaffoldBrand from "main/components/Scaffold/ScaffoldBrand";

const meta: Meta<typeof ScaffoldBrand> = {
  title: "components/Scaffold/ScaffoldBrand",
  component: ScaffoldBrand,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ScaffoldBrand>;

export const Default: Story = {};
