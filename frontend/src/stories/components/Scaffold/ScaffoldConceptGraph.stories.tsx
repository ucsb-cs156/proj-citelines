import type { Meta, StoryObj } from "@storybook/react";
import ScaffoldConceptGraph from "main/components/Scaffold/ScaffoldConceptGraph";

const meta: Meta<typeof ScaffoldConceptGraph> = {
  title: "components/Scaffold/ScaffoldConceptGraph",
  component: ScaffoldConceptGraph,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh" }}>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ScaffoldConceptGraph>;

const sampleMajorConcepts = [
  {
    id: 1,
    labelHtml: "Recursion",
    color: "#fe9a71",
    subconcepts: [
      { id: 2, parentId: 1, labelHtml: "Base case" },
      { id: 3, parentId: 1, labelHtml: "State change" },
    ],
  },
  {
    id: 4,
    labelHtml: "Loops",
    color: "#93ebff",
    subconcepts: [{ id: 5, parentId: 4, labelHtml: "For loops" }],
  },
  {
    id: 6,
    labelHtml: "Scaffold",
    color: "#c99ffe",
    subconcepts: [{ id: 7, parentId: 6, labelHtml: "Storybook coverage" }],
  },
];

const samplePositions = {
  "1": { x: 100, y: 100 },
  "4": { x: 420, y: 100 },
  "6": { x: 260, y: 340 },
};

const samplePrereqEdgeData = [
  { id: 20, sourceId: 4, targetId: 1, color: null },
  { id: 21, sourceId: 1, targetId: 6, color: null },
];

export const Default: Story = {
  args: {
    majorConcepts: sampleMajorConcepts,
    positions: samplePositions,
    conceptContent: {},
    prereqEdgeData: samplePrereqEdgeData,
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
