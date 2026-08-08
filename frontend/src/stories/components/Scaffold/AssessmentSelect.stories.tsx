import type { Meta, StoryObj } from "@storybook/react";
import AssessmentSelect from "main/components/Scaffold/AssessmentSelect";
import type { Assessment } from "main/types/conceptGraph";

const sampleAssessments: Assessment[] = [
  { id: "1", pl_assessment_id: "pl1", name: "HW1" },
  { id: "2", pl_assessment_id: "pl2", name: "HW2" },
  { id: "3", pl_assessment_id: "pl3", name: "Scaffold Final" },
];

const meta: Meta<typeof AssessmentSelect> = {
  title: "components/Scaffold/AssessmentSelect",
  component: AssessmentSelect,
  tags: ["autodocs"],
  args: {
    assessments: sampleAssessments,
    selectedAssessmentId: "",
    onSelect: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof AssessmentSelect>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    selectedAssessmentId: "2",
  },
};
