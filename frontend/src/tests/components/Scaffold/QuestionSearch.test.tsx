import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuestionSearch from "main/components/Scaffold/QuestionSearch";
import type { Question } from "main/types/conceptGraph";

const questions: Question[] = [
  { id: "1", assessment_id: "a1", pl_question_uuid: "u1", title: "Loops 101" },
  {
    id: "2",
    assessment_id: "a1",
    pl_question_uuid: "u2",
    title: "Recursion basics",
  },
];

describe("QuestionSearch", () => {
  test("shows the disabled placeholder and disables the input when disabled", () => {
    render(
      <QuestionSearch
        questions={questions}
        selectedQuestionId=""
        onSelect={vi.fn()}
        disabled={true}
      />,
    );
    const input = screen.getByPlaceholderText(
      "Select assessment to pick question",
    );
    expect(input).toBeDisabled();
  });

  test("shows the search placeholder when enabled", () => {
    render(
      <QuestionSearch
        questions={questions}
        selectedQuestionId=""
        onSelect={vi.fn()}
        disabled={false}
      />,
    );
    expect(screen.getByPlaceholderText("Search questions…")).toBeEnabled();
  });

  test("typing filters the dropdown to matching questions", () => {
    render(
      <QuestionSearch
        questions={questions}
        selectedQuestionId=""
        onSelect={vi.fn()}
        disabled={false}
      />,
    );
    const input = screen.getByPlaceholderText("Search questions…");
    fireEvent.change(input, { target: { value: "loop" } });

    expect(screen.getByText("Loops 101")).toBeInTheDocument();
    expect(screen.queryByText("Recursion basics")).not.toBeInTheDocument();
  });

  test("shows a no-matches message when nothing matches", () => {
    render(
      <QuestionSearch
        questions={questions}
        selectedQuestionId=""
        onSelect={vi.fn()}
        disabled={false}
      />,
    );
    const input = screen.getByPlaceholderText("Search questions…");
    fireEvent.change(input, { target: { value: "xyz" } });

    expect(screen.getByText('No questions match "xyz"')).toBeInTheDocument();
  });

  test("clicking a filtered option selects it and fills the input", () => {
    const onSelect = vi.fn();
    render(
      <QuestionSearch
        questions={questions}
        selectedQuestionId=""
        onSelect={onSelect}
        disabled={false}
      />,
    );
    const input = screen.getByPlaceholderText(
      "Search questions…",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "recur" } });
    fireEvent.mouseDown(screen.getByText("Recursion basics"));

    expect(onSelect).toHaveBeenCalledWith("2");
    expect(input.value).toBe("Recursion basics");
  });

  test("pressing Enter selects the first filtered question", () => {
    const onSelect = vi.fn();
    render(
      <QuestionSearch
        questions={questions}
        selectedQuestionId=""
        onSelect={onSelect}
        disabled={false}
      />,
    );
    const input = screen.getByPlaceholderText("Search questions…");
    fireEvent.change(input, { target: { value: "o" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith("1");
  });

  test("clearing the input via the clear button calls onSelect with an empty string", () => {
    const onSelect = vi.fn();
    render(
      <QuestionSearch
        questions={questions}
        selectedQuestionId="2"
        onSelect={onSelect}
        disabled={false}
      />,
    );
    const input = screen.getByPlaceholderText(
      "Search questions…",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Recursion basics" } });

    fireEvent.mouseDown(screen.getByText("✕"));

    expect(onSelect).toHaveBeenCalledWith("");
    expect(input.value).toBe("");
  });

  test("clearing the text field directly also calls onSelect with an empty string", () => {
    const onSelect = vi.fn();
    render(
      <QuestionSearch
        questions={questions}
        selectedQuestionId="1"
        onSelect={onSelect}
        disabled={false}
      />,
    );
    const input = screen.getByPlaceholderText("Search questions…");
    fireEvent.change(input, { target: { value: "Loops 101" } });
    fireEvent.change(input, { target: { value: "" } });

    expect(onSelect).toHaveBeenLastCalledWith("");
  });

  test("resets the input when the selected question is cleared externally", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <QuestionSearch
        questions={questions}
        selectedQuestionId="1"
        onSelect={onSelect}
        disabled={false}
      />,
    );
    const input = screen.getByPlaceholderText(
      "Search questions…",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Loops 101" } });
    expect(input.value).toBe("Loops 101");

    rerender(
      <QuestionSearch
        questions={questions}
        selectedQuestionId=""
        onSelect={onSelect}
        disabled={false}
      />,
    );

    expect(input.value).toBe("");
  });

  test("pressing Escape closes the dropdown", () => {
    render(
      <QuestionSearch
        questions={questions}
        selectedQuestionId=""
        onSelect={vi.fn()}
        disabled={false}
      />,
    );
    const input = screen.getByPlaceholderText("Search questions…");
    fireEvent.change(input, { target: { value: "o" } });
    expect(screen.getByText("Loops 101")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByText("Loops 101")).not.toBeInTheDocument();
  });

  test("focusing the input opens the dropdown", () => {
    render(
      <QuestionSearch
        questions={questions}
        selectedQuestionId=""
        onSelect={vi.fn()}
        disabled={false}
      />,
    );
    const input = screen.getByPlaceholderText("Search questions…");
    expect(screen.queryByText("Loops 101")).not.toBeInTheDocument();

    fireEvent.focus(input);

    expect(screen.getByText("Loops 101")).toBeInTheDocument();
    expect(screen.getByText("Recursion basics")).toBeInTheDocument();
  });

  test("focusing the input while disabled does not open the dropdown", () => {
    render(
      <QuestionSearch
        questions={questions}
        selectedQuestionId=""
        onSelect={vi.fn()}
        disabled={true}
      />,
    );
    const input = screen.getByPlaceholderText(
      "Select assessment to pick question",
    );

    fireEvent.focus(input);

    expect(screen.queryByText("Loops 101")).not.toBeInTheDocument();
  });

  test("clicking outside the component closes the dropdown", () => {
    render(
      <div>
        <div data-testid="outside">outside</div>
        <QuestionSearch
          questions={questions}
          selectedQuestionId=""
          onSelect={vi.fn()}
          disabled={false}
        />
      </div>,
    );
    const input = screen.getByPlaceholderText("Search questions…");
    fireEvent.focus(input);
    expect(screen.getByText("Loops 101")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(screen.queryByText("Loops 101")).not.toBeInTheDocument();
  });

  test("applies the is-selected class only to the currently selected option", () => {
    render(
      <QuestionSearch
        questions={questions}
        selectedQuestionId="1"
        onSelect={vi.fn()}
        disabled={false}
      />,
    );
    const input = screen.getByPlaceholderText("Search questions…");
    fireEvent.focus(input);

    expect(screen.getByText("Loops 101")).toHaveClass("is-selected");
    expect(screen.getByText("Recursion basics")).not.toHaveClass("is-selected");
  });

  test("resets the input when the questions list is cleared", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <QuestionSearch
        questions={questions}
        selectedQuestionId="1"
        onSelect={onSelect}
        disabled={false}
      />,
    );
    const input = screen.getByPlaceholderText(
      "Search questions…",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Loops 101" } });
    expect(input.value).toBe("Loops 101");

    const newQuestions: Question[] = [
      {
        id: "3",
        assessment_id: "a2",
        pl_question_uuid: "u3",
        title: "Dictionaries",
      },
    ];
    // Simulate the two-step transition that ConceptGraphPage / LegacyHomePage
    // performs: clear questions first (triggering the reset), then populate
    // with the new list.
    rerender(
      <QuestionSearch
        questions={[]}
        selectedQuestionId="1"
        onSelect={onSelect}
        disabled={false}
      />,
    );
    rerender(
      <QuestionSearch
        questions={newQuestions}
        selectedQuestionId="1"
        onSelect={onSelect}
        disabled={false}
      />,
    );

    expect(input.value).toBe("");
  });
});
