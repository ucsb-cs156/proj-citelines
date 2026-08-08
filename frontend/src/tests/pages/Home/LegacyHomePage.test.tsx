import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import LegacyHomePage from "main/pages/Home/LegacyHomePage";
import { currentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import mockConsole from "tests/testutils/mockConsole";
import type {
  Assessment,
  Question,
  QuestionConcept,
  LegacyUserStateResponse,
} from "main/api/legacyClient";
import * as client from "main/api/legacyClient";

import axios from "axios";
import axiosMockAdapter from "axios-mock-adapter";

const axiosMock = new axiosMockAdapter(axios);

vi.mock("main/api/legacyClient", () => ({
  fetchAssessments: vi.fn(),
  fetchQuestions: vi.fn(),
  fetchQuestionConcepts: vi.fn(),
  fetchLegacyUserState: vi.fn(),
  saveLegacyUserState: vi.fn(),
  logLegacyUserActivity: vi.fn(),
}));

vi.mock("main/components/LegacyHomePage/LegacyConceptGraph", () => ({
  default: (props: {
    highlightedIds: Set<string>;
    starredIds: Set<string>;
    restoredDetailCards?: unknown[];
    masteredSubconcepts: Set<string>;
    onConceptClick: (id: string) => void;
    onStarClick: (id: string) => void;
    onReset: () => void;
    onDetailAdded?: (card: {
      cardType: string;
      itemLabel: string;
      conceptId: string;
      conceptColor: string;
      posX: number;
      posY: number;
    }) => void;
    onDetailDeleted?: (cardType: string, itemLabel: string) => void;
    onDetailMoved?: (
      cardType: string,
      itemLabel: string,
      posX: number,
      posY: number,
    ) => void;
    onSubconceptMastered: (sub: string) => void;
    onPaneClick?: () => void;
  }) => (
    <div data-testid="concept-graph-stub">
      <div data-testid="highlighted-count">{props.highlightedIds.size}</div>
      <div data-testid="restored-count">
        {props.restoredDetailCards?.length ?? 0}
      </div>
      <div data-testid="mastered-count">{props.masteredSubconcepts.size}</div>
      <button onClick={() => props.onConceptClick("recursion")}>
        trigger-concept-click
      </button>
      <button onClick={() => props.onStarClick("recursion")}>
        trigger-star-click
      </button>
      <button onClick={() => props.onStarClick("loops")}>
        trigger-unstar-click
      </button>
      <button onClick={props.onReset}>trigger-reset</button>
      <button
        onClick={() =>
          props.onDetailAdded?.({
            cardType: "Description",
            itemLabel: "Recursion",
            conceptId: "recursion",
            conceptColor: "#fe9a71",
            posX: 1,
            posY: 2,
          })
        }
      >
        trigger-detail-added
      </button>
      <button onClick={() => props.onDetailDeleted?.("Description", "Loops")}>
        trigger-detail-deleted
      </button>
      <button
        onClick={() => props.onDetailMoved?.("Description", "Loops", 5, 6)}
      >
        trigger-detail-moved
      </button>
      <button onClick={() => props.onSubconceptMastered("Base case")}>
        trigger-subconcept-mastered
      </button>
      <button onClick={() => props.onSubconceptMastered("For loops")}>
        trigger-unmaster-subconcept
      </button>
      <button onClick={() => props.onPaneClick?.()}>trigger-pane-click</button>
    </div>
  ),
}));

const mockedClient = vi.mocked(client);

const assessments: Assessment[] = [
  { id: "a1", pl_assessment_id: "pl-a1", name: "HW1" },
];

const questions: Question[] = [
  { id: "q1", assessment_id: "a1", pl_question_uuid: "u1", title: "Q1" },
];

const questionConcepts: QuestionConcept[] = [
  {
    id: "qc1",
    question_id: "q1",
    concept_id: "recursion",
    subconcept_label: "Base case",
  },
];

const userState: LegacyUserStateResponse = {
  starred_ids: ["loops"],
  detail_cards: [
    {
      cardType: "Description",
      itemLabel: "Loops",
      conceptId: "loops",
      conceptColor: "#fe9a71",
      posX: 10,
      posY: 20,
    },
  ] as unknown as LegacyUserStateResponse["detail_cards"],
  mastered_subconcepts: ["For loops"],
};

const loggedInWithId = {
  loggedIn: true as const,
  root: { user: { email: "cgaucho@ucsb.edu", id: 42 } },
};

function renderHomePage(currentUser: unknown) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["current user"], currentUser);
  qc.setQueryData(["systemInfo"], systemInfoFixtures.showingNeither);
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LegacyHomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LegacyHomePage", () => {
  let restoreConsole: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    // BasicLayout's AppNavbar always fetches /api/systemInfo, which has no
    // real backend in this test environment; silence its logged error.
    restoreConsole = mockConsole();
    mockedClient.fetchAssessments.mockResolvedValue(assessments);
    mockedClient.fetchQuestions.mockResolvedValue(questions);
    mockedClient.fetchQuestionConcepts.mockResolvedValue(questionConcepts);
    mockedClient.fetchLegacyUserState.mockResolvedValue(userState);
    mockedClient.saveLegacyUserState.mockResolvedValue(undefined);
    mockedClient.logLegacyUserActivity.mockResolvedValue(undefined);

    axiosMock.reset();
    axiosMock.resetHistory();
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
  });

  afterEach(() => {
    restoreConsole();
  });

  test("loads assessments on mount when logged in", async () => {
    renderHomePage(currentUserFixtures.userOnly);

    fireEvent.click(await screen.findByText("Select assessment…"));
    expect(await screen.findByText("HW1")).toBeInTheDocument();
    expect(mockedClient.fetchAssessments).toHaveBeenCalled();
  });

  test("does not load user state when the current user has no numeric id", async () => {
    renderHomePage(currentUserFixtures.userOnly);

    await screen.findByTestId("concept-graph-stub");
    expect(mockedClient.fetchLegacyUserState).not.toHaveBeenCalled();
    expect(mockedClient.logLegacyUserActivity).not.toHaveBeenCalled();
  });

  test("logs in and restores saved user state when the user has a numeric id", async () => {
    renderHomePage(loggedInWithId);

    await waitFor(() =>
      expect(mockedClient.fetchLegacyUserState).toHaveBeenCalledWith(42),
    );
    expect(mockedClient.logLegacyUserActivity).toHaveBeenCalledWith({
      userid: 42,
      event_type: "login",
      payload: { consented: true },
    });

    expect(await screen.findByText("1 / 26")).toBeInTheDocument();
    expect(await screen.findByTestId("restored-count")).toHaveTextContent("1");
    expect(await screen.findByTestId("mastered-count")).toHaveTextContent("1");
  });

  test("selecting an assessment loads its questions", async () => {
    renderHomePage(currentUserFixtures.userOnly);
    fireEvent.click(await screen.findByText("Select assessment…"));
    fireEvent.mouseDown(await screen.findByText("HW1"));

    expect(mockedClient.fetchQuestions).toHaveBeenCalledWith("a1");
    fireEvent.focus(await screen.findByPlaceholderText("Search questions…"));
    expect(await screen.findByText("Q1")).toBeInTheDocument();
  });

  test("selecting a question highlights its concepts", async () => {
    renderHomePage(currentUserFixtures.userOnly);
    fireEvent.click(await screen.findByText("Select assessment…"));
    fireEvent.mouseDown(await screen.findByText("HW1"));
    fireEvent.focus(await screen.findByPlaceholderText("Search questions…"));
    fireEvent.mouseDown(await screen.findByText("Q1"));

    expect(mockedClient.fetchQuestionConcepts).toHaveBeenCalledWith("q1");
    await waitFor(() =>
      expect(screen.getByTestId("highlighted-count")).not.toHaveTextContent(
        "0",
      ),
    );
  });

  test("clicking a concept from the graph shows its toolbar button", async () => {
    renderHomePage(currentUserFixtures.userOnly);
    await screen.findByTestId("concept-graph-stub");

    fireEvent.click(screen.getByText("trigger-concept-click"));

    expect(
      await screen.findByRole("button", { name: "Recursion" }),
    ).toBeInTheDocument();
  });

  test("clicking the concept toolbar button reveals description, example, and practice link", async () => {
    renderHomePage(currentUserFixtures.userOnly);
    await screen.findByTestId("concept-graph-stub");
    fireEvent.click(screen.getByText("trigger-concept-click"));
    fireEvent.click(await screen.findByRole("button", { name: "Recursion" }));

    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Example")).toBeInTheDocument();
    const practiceLink = screen.getByRole("link", {
      name: /Practice with a/,
    });
    expect(practiceLink).toHaveAttribute(
      "href",
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000011/",
    );
  });

  test("clicking a subconcept button does not show the practice link", async () => {
    renderHomePage(currentUserFixtures.userOnly);
    await screen.findByTestId("concept-graph-stub");
    fireEvent.click(screen.getByText("trigger-concept-click"));
    fireEvent.click(await screen.findByRole("button", { name: "Base case" }));

    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Practice with a/ }),
    ).not.toBeInTheDocument();
  });

  test("closing the concept toolbar clears the selection", async () => {
    renderHomePage(currentUserFixtures.userOnly);
    await screen.findByTestId("concept-graph-stub");
    fireEvent.click(screen.getByText("trigger-concept-click"));
    fireEvent.click(await screen.findByRole("button", { name: "Recursion" }));

    const conceptButton = screen.getByRole("button", { name: "Recursion" });
    const toolbarRow = conceptButton.parentElement!;
    const closeButton = toolbarRow.lastElementChild as HTMLElement;
    fireEvent.click(closeButton);

    expect(
      screen.queryByRole("button", { name: "Recursion" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("highlighted-count")).toHaveTextContent("0");
  });

  test("dragging the Description card sets the drag payload", async () => {
    renderHomePage(currentUserFixtures.userOnly);
    await screen.findByTestId("concept-graph-stub");
    fireEvent.click(screen.getByText("trigger-concept-click"));
    fireEvent.click(await screen.findByRole("button", { name: "Recursion" }));

    const setData = vi.fn();
    fireEvent.dragStart(screen.getByText("Description").parentElement!, {
      dataTransfer: { setData, effectAllowed: "" },
    });

    expect(setData).toHaveBeenCalledWith(
      "application/scaffold-card",
      expect.stringContaining('"conceptId":"recursion"'),
    );
  });

  test("triggering onStarClick from the graph updates the starred count and persists it", async () => {
    renderHomePage(loggedInWithId);
    await screen.findByText("1 / 26");

    fireEvent.click(screen.getByText("trigger-star-click"));

    expect(await screen.findByText("2 / 26")).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedClient.saveLegacyUserState).toHaveBeenCalledWith(
        expect.objectContaining({
          userid: 42,
          starred_ids: expect.arrayContaining(["loops", "recursion"]),
        }),
      ),
    );
  });

  test("triggering onStarClick on an already-starred concept unstars it", async () => {
    renderHomePage(loggedInWithId);
    await screen.findByText("1 / 26");

    fireEvent.click(screen.getByText("trigger-unstar-click"));

    expect(await screen.findByText("0 / 26")).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedClient.saveLegacyUserState).toHaveBeenCalledWith(
        expect.objectContaining({ userid: 42, starred_ids: [] }),
      ),
    );
  });

  test("triggering onReset from the graph clears state and persists it", async () => {
    renderHomePage(loggedInWithId);
    await screen.findByText("1 / 26");

    fireEvent.click(screen.getByText("trigger-reset"));

    expect(await screen.findByText("0 / 26")).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedClient.saveLegacyUserState).toHaveBeenCalledWith({
        userid: 42,
        starred_ids: [],
        detail_cards: [],
        mastered_subconcepts: [],
      }),
    );
  });

  test("triggering onDetailAdded logs activity and persists the new card", async () => {
    renderHomePage(loggedInWithId);
    await screen.findByTestId("concept-graph-stub");

    fireEvent.click(screen.getByText("trigger-detail-added"));

    await waitFor(() =>
      expect(mockedClient.logLegacyUserActivity).toHaveBeenCalledWith({
        userid: 42,
        event_type: "detail_added_to_graph",
        payload: {
          cardType: "Description",
          itemLabel: "Recursion",
          conceptId: "recursion",
        },
      }),
    );
    await waitFor(() =>
      expect(mockedClient.saveLegacyUserState).toHaveBeenCalledWith(
        expect.objectContaining({
          detail_cards: expect.arrayContaining([
            expect.objectContaining({ itemLabel: "Recursion" }),
          ]),
        }),
      ),
    );
  });

  test("triggering onDetailDeleted removes the persisted card", async () => {
    renderHomePage(loggedInWithId);
    await screen.findByText("1 / 26");

    fireEvent.click(screen.getByText("trigger-detail-deleted"));

    await waitFor(() =>
      expect(mockedClient.saveLegacyUserState).toHaveBeenCalledWith(
        expect.objectContaining({ detail_cards: [] }),
      ),
    );
  });

  test("triggering onDetailMoved updates the persisted card position", async () => {
    renderHomePage(loggedInWithId);
    await screen.findByText("1 / 26");

    fireEvent.click(screen.getByText("trigger-detail-moved"));

    await waitFor(() =>
      expect(mockedClient.saveLegacyUserState).toHaveBeenCalledWith(
        expect.objectContaining({
          detail_cards: [expect.objectContaining({ posX: 5, posY: 6 })],
        }),
      ),
    );
  });

  test("triggering onSubconceptMastered toggles it and persists the change", async () => {
    renderHomePage(loggedInWithId);
    await screen.findByTestId("mastered-count");
    expect(screen.getByTestId("mastered-count")).toHaveTextContent("1");

    fireEvent.click(screen.getByText("trigger-subconcept-mastered"));

    expect(await screen.findByTestId("mastered-count")).toHaveTextContent("2");
    await waitFor(() =>
      expect(mockedClient.saveLegacyUserState).toHaveBeenCalledWith(
        expect.objectContaining({
          mastered_subconcepts: expect.arrayContaining([
            "For loops",
            "Base case",
          ]),
        }),
      ),
    );
  });

  test("triggering onSubconceptMastered on an already-mastered subconcept unmasters it", async () => {
    renderHomePage(loggedInWithId);
    await screen.findByTestId("mastered-count");
    expect(screen.getByTestId("mastered-count")).toHaveTextContent("1");

    fireEvent.click(screen.getByText("trigger-unmaster-subconcept"));

    expect(await screen.findByTestId("mastered-count")).toHaveTextContent("0");
    await waitFor(() =>
      expect(mockedClient.saveLegacyUserState).toHaveBeenCalledWith(
        expect.objectContaining({ mastered_subconcepts: [] }),
      ),
    );
  });

  test("triggering onPaneClick clears the current concept selection", async () => {
    renderHomePage(currentUserFixtures.userOnly);
    await screen.findByTestId("concept-graph-stub");
    fireEvent.click(screen.getByText("trigger-concept-click"));
    await screen.findByRole("button", { name: "Recursion" });

    fireEvent.click(screen.getByText("trigger-pane-click"));

    expect(
      screen.queryByRole("button", { name: "Recursion" }),
    ).not.toBeInTheDocument();
  });

  test("onPaneClick does not clear highlights while a question is selected", async () => {
    renderHomePage(currentUserFixtures.userOnly);
    fireEvent.click(await screen.findByText("Select assessment…"));
    fireEvent.mouseDown(await screen.findByText("HW1"));
    fireEvent.focus(await screen.findByPlaceholderText("Search questions…"));
    fireEvent.mouseDown(await screen.findByText("Q1"));
    await waitFor(() =>
      expect(screen.getByTestId("highlighted-count")).not.toHaveTextContent(
        "0",
      ),
    );

    fireEvent.click(screen.getByText("trigger-pane-click"));

    expect(screen.getByTestId("highlighted-count")).not.toHaveTextContent("0");
  });

  test("closing the concept toolbar while a question is selected keeps the question's highlights", async () => {
    renderHomePage(currentUserFixtures.userOnly);
    fireEvent.click(await screen.findByText("Select assessment…"));
    fireEvent.mouseDown(await screen.findByText("HW1"));
    fireEvent.focus(await screen.findByPlaceholderText("Search questions…"));
    fireEvent.mouseDown(await screen.findByText("Q1"));
    await waitFor(() =>
      expect(screen.getByTestId("highlighted-count")).not.toHaveTextContent(
        "0",
      ),
    );
    fireEvent.click(screen.getByText("trigger-concept-click"));
    const conceptButton = await screen.findByRole("button", {
      name: "Recursion",
    });

    const closeButton = conceptButton.parentElement!
      .lastElementChild as HTMLElement;
    fireEvent.click(closeButton);

    expect(
      screen.queryByRole("button", { name: "Recursion" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("highlighted-count")).not.toHaveTextContent("0");
  });

  test("clicking a concept while a question is selected does not overwrite the question's highlights", async () => {
    renderHomePage(currentUserFixtures.userOnly);
    fireEvent.click(await screen.findByText("Select assessment…"));
    fireEvent.mouseDown(await screen.findByText("HW1"));
    fireEvent.focus(await screen.findByPlaceholderText("Search questions…"));
    fireEvent.mouseDown(await screen.findByText("Q1"));
    await waitFor(() =>
      expect(screen.getByTestId("highlighted-count")).not.toHaveTextContent(
        "0",
      ),
    );
    const countBefore = screen.getByTestId("highlighted-count").textContent;

    fireEvent.click(screen.getByText("trigger-concept-click"));

    expect(screen.getByTestId("highlighted-count").textContent).toBe(
      countBefore,
    );
  });

  test("does not persist state changes when the logged-in user has no numeric id", async () => {
    renderHomePage(currentUserFixtures.userOnly);
    await screen.findByTestId("concept-graph-stub");

    fireEvent.click(screen.getByText("trigger-star-click"));

    expect(await screen.findByText("1 / 26")).toBeInTheDocument();
    expect(mockedClient.saveLegacyUserState).not.toHaveBeenCalled();
  });

  test("handles a missing saved user state (e.g. a new user) without crashing", async () => {
    mockedClient.fetchLegacyUserState.mockResolvedValue(null);
    renderHomePage(loggedInWithId);

    await waitFor(() =>
      expect(mockedClient.fetchLegacyUserState).toHaveBeenCalledWith(42),
    );
    expect(await screen.findByText("0 / 26")).toBeInTheDocument();
    expect(screen.getByTestId("restored-count")).toHaveTextContent("0");
  });

  test("moving one detail card does not change the position of other saved cards", async () => {
    mockedClient.fetchLegacyUserState.mockResolvedValue({
      starred_ids: [],
      detail_cards: [
        {
          cardType: "Description",
          itemLabel: "Loops",
          conceptId: "loops",
          conceptColor: "#fe9a71",
          posX: 10,
          posY: 20,
        },
        {
          cardType: "Example",
          itemLabel: "Recursion",
          conceptId: "recursion",
          conceptColor: "#fe9a71",
          posX: 30,
          posY: 40,
        },
      ] as unknown as LegacyUserStateResponse["detail_cards"],
      mastered_subconcepts: [],
    });
    renderHomePage(loggedInWithId);
    await screen.findByTestId("concept-graph-stub");

    fireEvent.click(screen.getByText("trigger-detail-moved"));

    await waitFor(() =>
      expect(mockedClient.saveLegacyUserState).toHaveBeenCalledWith(
        expect.objectContaining({
          detail_cards: [
            expect.objectContaining({ itemLabel: "Loops", posX: 5, posY: 6 }),
            expect.objectContaining({
              itemLabel: "Recursion",
              posX: 30,
              posY: 40,
            }),
          ],
        }),
      ),
    );
  });
});
