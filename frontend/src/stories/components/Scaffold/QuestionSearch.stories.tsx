import type { Meta, StoryObj } from "@storybook/react";
import QuestionSearch from "main/components/Scaffold/QuestionSearch";
import type { Question } from "main/types/conceptGraph";

const sampleQuestions: Question[] = [
  {
    id: "1",
    assessment_id: "a1",
    pl_question_uuid: "u1",
    title: "Loops 101",
  },
  {
    id: "2",
    assessment_id: "a1",
    pl_question_uuid: "u2",
    title: "Recursion basics",
  },
  {
    id: "3",
    assessment_id: "a1",
    pl_question_uuid: "u3",
    title: "Scaffold graph fundamentals",
  },
];

const meta: Meta<typeof QuestionSearch> = {
  title: "components/Scaffold/QuestionSearch",
  component: QuestionSearch,
  tags: ["autodocs"],
  args: {
    questions: sampleQuestions,
    selectedQuestionId: "",
    onSelect: () => {},
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof QuestionSearch>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
