import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import UnlockAssessmentsModal from "main/components/Scaffold/UnlockAssessmentsModal";
import type { AssessmentManagementDTO } from "main/types/conceptGraph";

const sampleAssessments: AssessmentManagementDTO[] = [
  { id: "1", name: "HW1", locked: true },
  { id: "2", name: "HW2", locked: false },
  { id: "3", name: "Scaffold Final", locked: true },
];

const meta: Meta<typeof UnlockAssessmentsModal> = {
  title: "components/Scaffold/UnlockAssessmentsModal",
  component: UnlockAssessmentsModal,
  tags: ["autodocs"],
  args: {
    show: true,
    onHide: () => {},
    courseId: 1,
  },
  parameters: {
    msw: [
      http.get("/api/assessments/all", () =>
        HttpResponse.json(sampleAssessments),
      ),
      http.put("/api/assessments/lock", () =>
        HttpResponse.json(sampleAssessments[0]),
      ),
    ],
  },
};

export default meta;
type Story = StoryObj<typeof UnlockAssessmentsModal>;

export const Default: Story = {};

export const NoAssessments: Story = {
  parameters: {
    msw: [http.get("/api/assessments/all", () => HttpResponse.json([]))],
  },
};
