import type { Meta, StoryObj } from "@storybook/react";
import LegacyConceptGraph from "main/components/LegacyHomePage/LegacyConceptGraph";

const meta: Meta<typeof LegacyConceptGraph> = {
  title: "components/LegacyHomePage/LegacyConceptGraph",
  component: LegacyConceptGraph,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof LegacyConceptGraph>;

export const Default: Story = {
  args: {
    highlightedIds: new Set<string>(),
    highlightedSubconcepts: new Map<string, Set<string>>(),
    onConceptClick: () => {},
    starredIds: new Set<string>(),
    onStarClick: () => {},
    onReset: () => {},
    masteredSubconcepts: new Set<string>(),
    onSubconceptMastered: () => {},
  },
};
