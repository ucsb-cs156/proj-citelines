import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router";
import ConceptGraphPage from "main/pages/ConceptGraphPage";
import { currentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import mockConsole from "tests/testutils/mockConsole";
import type {
  Assessment,
  Question,
  QuestionConcept,
  MajorConceptDTO,
  ConceptContentDTO,
  EdgeDTO,
  UserStateResponse,
} from "main/types/conceptGraph";

import axios from "axios";
import axiosMockAdapter from "axios-mock-adapter";

const axiosMock = new axiosMockAdapter(axios);

vi.mock("main/components/Scaffold/ScaffoldConceptGraph", () => ({
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
    onMajorMoved?: (name: string, posX: number, posY: number) => void;
    onSubconceptMastered: (sub: string) => void;
    onPaneClick?: () => void;
    majorConcepts: { id: number; subconcepts: { id: number }[] }[];
    onSubconceptsReordered?: (
      parentConceptId: number,
      orderedSubconceptIds: number[],
    ) => void;
    onConceptDoubleClick?: (conceptId: string) => void;
    onSubconceptDoubleClick?: (
      parentConceptId: string,
      subconceptId: string,
    ) => void;
    onAddSubconcept?: (parentConceptId: string) => void;
  }) => (
    <div data-testid="concept-graph-stub">
      <div data-testid="highlighted-count">{props.highlightedIds.size}</div>
      <div data-testid="restored-count">
        {props.restoredDetailCards?.length ?? 0}
      </div>
      <div data-testid="mastered-count">{props.masteredSubconcepts.size}</div>
      <button onClick={() => props.onConceptClick("1")}>
        trigger-concept-click
      </button>
      <button onClick={() => props.onStarClick("1")}>trigger-star-click</button>
      <button onClick={() => props.onStarClick("4")}>
        trigger-unstar-click
      </button>
      <button onClick={props.onReset}>trigger-reset</button>
      <button
        onClick={() =>
          props.onDetailAdded?.({
            cardType: "Description",
            itemLabel: "Recursion",
            conceptId: "1",
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
      <button onClick={() => props.onMajorMoved?.("1", 30, 40)}>
        trigger-major-moved
      </button>
      <button onClick={() => props.onSubconceptMastered("Base case")}>
        trigger-subconcept-mastered
      </button>
      <button onClick={() => props.onSubconceptMastered("For loops")}>
        trigger-unmaster-subconcept
      </button>
      <button onClick={() => props.onPaneClick?.()}>trigger-pane-click</button>
      <button onClick={() => props.onSubconceptsReordered?.(1, [3, 2])}>
        trigger-subconcepts-reordered
      </button>
      <button onClick={() => props.onConceptDoubleClick?.("1")}>
        trigger-concept-double-click
      </button>
      <button onClick={() => props.onSubconceptDoubleClick?.("1", "2")}>
        trigger-subconcept-double-click
      </button>
      <button onClick={() => props.onAddSubconcept?.("1")}>
        trigger-add-subconcept
      </button>
      <div data-testid="node-1-subconcept-order">
        {props.majorConcepts
          .find((c) => c.id === 1)
          ?.subconcepts.map((s) => s.id)
          .join(",")}
      </div>
    </div>
  ),
}));

vi.mock("main/components/Concept/ConceptModal", () => ({
  default: (props: {
    showModal: boolean;
    modalTitle?: string;
    initialContents?: { label?: string };
  }) =>
    props.showModal ? (
      <div data-testid="ConceptModal-base">
        {props.modalTitle}
        {props.initialContents?.label ? `:${props.initialContents.label}` : ""}
      </div>
    ) : null,
}));

vi.mock("main/components/Concept/SubConceptModal", () => ({
  default: (props: {
    showModal: boolean;
    modalTitle?: string;
    initialContents?: { parentId?: number; label?: string };
  }) =>
    props.showModal ? (
      <div data-testid="SubConceptModal-base">
        {props.modalTitle}
        {props.initialContents?.parentId
          ? `:${props.initialContents.parentId}`
          : ""}
        {props.initialContents?.label ? `:${props.initialContents.label}` : ""}
      </div>
    ) : null,
}));

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
    concept_id: "1",
    subconcept_label: "Base case",
  },
];

const majorConcepts: MajorConceptDTO[] = [
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
];

const positions: Record<string, { x: number; y: number }> = {
  "1": { x: 100, y: 100 },
  "4": { x: 300, y: 100 },
};

const conceptContent: Record<string, ConceptContentDTO> = {
  "1": {
    id: 1,
    parentId: null,
    descriptionHtml: "<p>Recursion description</p>",
    exampleHtml: "<p>def f(): ...</p>",
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000011/",
  },
};

const prereqEdgeData: EdgeDTO[] = [
  { id: 20, sourceId: 4, targetId: 1, color: null },
];

const userState: UserStateResponse = {
  starred_ids: ["4"],
  detail_cards: [
    {
      cardType: "Description",
      itemLabel: "Loops",
      conceptId: "4",
      conceptColor: "#fe9a71",
      posX: 10,
      posY: 20,
    },
  ] as unknown as UserStateResponse["detail_cards"],
  mastered_subconcepts: ["For loops"],
  top_level_positions: {},
};

const loggedInWithId = {
  loggedIn: true as const,
  root: { user: { email: "cgaucho@ucsb.edu", id: 42 } },
};

// History helpers: everything the page sends now goes through axios, so
// assertions inspect the mock adapter's request history.
const getsTo = (url: string) =>
  axiosMock.history.get.filter((r) => r.url === url);
const postsTo = (url: string) =>
  axiosMock.history.post.filter((r) => r.url === url);
const postBodiesTo = (url: string) =>
  postsTo(url).map((r) => JSON.parse(r.data as string));

const editableConcepts = [
  {
    id: 1,
    label: "Recursion",
    description: "Recursion description",
    example: "def f(): ...",
  },
  {
    id: 4,
    label: "Loops",
    description: "Loops description",
    example: "for (...)",
  },
];

const editableSubconcepts = [
  {
    id: 2,
    parentId: 1,
    parentLabel: "Recursion",
    label: "Base case",
    description: "Base case description",
    example: "if n === 0",
  },
  {
    id: 3,
    parentId: 1,
    parentLabel: "Recursion",
    label: "State change",
    description: "State change description",
    example: "n - 1",
  },
];

function renderConceptGraphPage(currentUser: unknown, courseId: string = "1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["current user"], currentUser);
  qc.setQueryData(["systemInfo"], systemInfoFixtures.showingNeither);
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/course/${courseId}`]}>
        <Routes>
          <Route path="/course/:courseId" element={<ConceptGraphPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ConceptGraphPage", () => {
  let restoreConsole: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // BasicLayout's AppNavbar always fetches /api/systemInfo, which has no
    // real backend in this test environment; silence its logged error.
    restoreConsole = mockConsole();

    axiosMock.reset();
    axiosMock.resetHistory();
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
    axiosMock.onGet("/api/assessments").reply(200, assessments);
    axiosMock
      .onGet(/\/api\/courses\/\d+/)
      .reply(200, { id: 1, courseName: "CMPSC 8" });
    axiosMock.onGet("/api/assessments/a1/questions").reply(200, questions);
    axiosMock.onGet("/api/questions/q1/concepts").reply(200, questionConcepts);
    axiosMock.onGet("/api/concepts/graph").reply(200, majorConcepts);
    axiosMock.onGet("/api/concepts/content").reply(200, conceptContent);
    axiosMock.onGet("/api/concepts/positions").reply(200, positions);
    axiosMock.onGet("/api/concepts/edges").reply(200, prereqEdgeData);
    axiosMock.onGet("/api/user-state").reply(200, userState);
    axiosMock.onPost("/api/user-state").reply(204);
    axiosMock.onPost("/api/user-activity").reply(204);
    axiosMock.onPut("/api/concepts/subconcepts/reorder").reply(200, []);
    axiosMock.onPost("/api/course/scaffold/reset").reply(200, {});
    axiosMock
      .onGet("/api/concepts/course?courseId=1")
      .reply(200, editableConcepts);
    axiosMock
      .onGet("/api/concepts/course?courseId=7")
      .reply(200, editableConcepts);
    axiosMock
      .onGet("/api/concepts/subconcepts")
      .reply(200, editableSubconcepts);
  });

  afterEach(() => {
    sessionStorage.clear();
    restoreConsole();
  });

  test("shows the login screen when not logged in", () => {
    renderConceptGraphPage(currentUserFixtures.notLoggedIn);

    expect(
      screen.getByRole("button", { name: "Log In with Google" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("concept-graph-stub")).not.toBeInTheDocument();
  });

  test("shows an invalid course id message instead of fetching when the param isn't numeric", async () => {
    renderConceptGraphPage(currentUserFixtures.userOnly, "not-a-number");

    expect(screen.getByText("Invalid course id.")).toBeInTheDocument();
    // Assessments are course-scoped now, so an invalid course id must not fetch them either.
    expect(getsTo("/api/assessments")).toHaveLength(0);
    expect(getsTo("/api/concepts/graph")).toHaveLength(0);
  });

  test("shows a loading spinner until the concept graph data resolves", async () => {
    let resolveGraph!: (value: [number, MajorConceptDTO[]]) => void;
    axiosMock.onGet("/api/concepts/graph").reply(
      () =>
        new Promise((resolve) => {
          resolveGraph = resolve;
        }),
    );

    renderConceptGraphPage(currentUserFixtures.userOnly);

    expect(
      await screen.findByTestId("concept-graph-page-loading"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("concept-graph-stub")).not.toBeInTheDocument();

    resolveGraph([200, majorConcepts]);

    expect(await screen.findByTestId("concept-graph-stub")).toBeInTheDocument();
  });

  test("shows the settings link in the top bar once the course loads", async () => {
    renderConceptGraphPage(currentUserFixtures.userOnly);

    const link = await screen.findByTestId("ScaffoldTopBar-linkToSettings");
    expect(link).toHaveAttribute("href", "/course/1/settings");
    expect(screen.getByTestId("ScaffoldTopBar")).toBeInTheDocument();
    expect(getsTo("/api/courses/1")).toHaveLength(1);
  });

  test("fetches the concept graph data for the course id in the url", async () => {
    renderConceptGraphPage(currentUserFixtures.userOnly, "7");

    await screen.findByTestId("concept-graph-stub");

    expect(getsTo("/api/concepts/graph")[0].params).toEqual({ courseId: 7 });
    expect(getsTo("/api/concepts/content")[0].params).toEqual({ courseId: 7 });
    expect(getsTo("/api/concepts/positions")[0].params).toEqual({
      courseId: 7,
    });
    expect(getsTo("/api/concepts/edges")[0].params).toEqual({ courseId: 7 });
    expect(getsTo("/api/assessments")[0].params).toEqual({ courseId: 7 });
  });

  test("shows an error message when fetching the concept graph data fails", async () => {
    axiosMock.onGet("/api/concepts/graph").reply(500);

    renderConceptGraphPage(currentUserFixtures.userOnly);

    expect(
      await screen.findByText(/Failed to load concept graph data/),
    ).toBeInTheDocument();
  });

  test("loads assessments on mount when logged in", async () => {
    renderConceptGraphPage(currentUserFixtures.userOnly);

    fireEvent.click(await screen.findByText("Select assessment…"));
    expect(await screen.findByText("HW1")).toBeInTheDocument();
    expect(getsTo("/api/assessments")).toHaveLength(1);
  });

  test("does not load user state when the current user has no numeric id", async () => {
    renderConceptGraphPage(currentUserFixtures.userOnly);

    await screen.findByTestId("concept-graph-stub");
    expect(getsTo("/api/user-state")).toHaveLength(0);
    expect(postsTo("/api/user-activity")).toHaveLength(0);
  });

  test("logs in and restores saved user state when the user has a numeric id", async () => {
    renderConceptGraphPage(loggedInWithId);

    await waitFor(() => expect(getsTo("/api/user-state")).toHaveLength(1));
    expect(getsTo("/api/user-state")[0].params).toEqual({
      userid: 42,
      courseId: 1,
    });
    await waitFor(() => expect(postsTo("/api/user-activity")).toHaveLength(1));
    expect(postBodiesTo("/api/user-activity")[0]).toEqual({
      userid: 42,
      courseId: 1,
      event_type: "login",
      payload: { consented: true },
    });

    expect(await screen.findByText("1 / 2")).toBeInTheDocument();
    expect(await screen.findByTestId("restored-count")).toHaveTextContent("1");
    expect(await screen.findByTestId("mastered-count")).toHaveTextContent("1");
  });

  test("selecting an assessment loads its questions", async () => {
    renderConceptGraphPage(currentUserFixtures.userOnly);
    fireEvent.click(await screen.findByText("Select assessment…"));
    fireEvent.mouseDown(await screen.findByText("HW1"));

    fireEvent.focus(await screen.findByPlaceholderText("Search questions…"));
    expect(await screen.findByText("Q1")).toBeInTheDocument();
    expect(getsTo("/api/assessments/a1/questions")).toHaveLength(1);
  });

  test("selecting a question highlights its concepts", async () => {
    renderConceptGraphPage(currentUserFixtures.userOnly);
    fireEvent.click(await screen.findByText("Select assessment…"));
    fireEvent.mouseDown(await screen.findByText("HW1"));
    fireEvent.focus(await screen.findByPlaceholderText("Search questions…"));
    fireEvent.mouseDown(await screen.findByText("Q1"));

    await waitFor(() =>
      expect(getsTo("/api/questions/q1/concepts")).toHaveLength(1),
    );
    await waitFor(() =>
      expect(screen.getByTestId("highlighted-count")).not.toHaveTextContent(
        "0",
      ),
    );
  });

  test("clicking a concept from the graph shows its toolbar button", async () => {
    renderConceptGraphPage(currentUserFixtures.userOnly);
    await screen.findByTestId("concept-graph-stub");

    fireEvent.click(screen.getByText("trigger-concept-click"));

    expect(
      await screen.findByRole("button", { name: "Recursion" }),
    ).toBeInTheDocument();
  });

  test("clicking the concept toolbar button reveals description, example, and practice link", async () => {
    renderConceptGraphPage(currentUserFixtures.userOnly);
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
    renderConceptGraphPage(currentUserFixtures.userOnly);
    await screen.findByTestId("concept-graph-stub");
    fireEvent.click(screen.getByText("trigger-concept-click"));
    fireEvent.click(await screen.findByRole("button", { name: "Base case" }));

    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Practice with a/ }),
    ).not.toBeInTheDocument();
  });

  test("closing the concept toolbar clears the selection", async () => {
    renderConceptGraphPage(currentUserFixtures.userOnly);
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
    renderConceptGraphPage(currentUserFixtures.userOnly);
    await screen.findByTestId("concept-graph-stub");
    fireEvent.click(screen.getByText("trigger-concept-click"));
    fireEvent.click(await screen.findByRole("button", { name: "Recursion" }));

    const setData = vi.fn();
    fireEvent.dragStart(screen.getByText("Description").parentElement!, {
      dataTransfer: { setData, effectAllowed: "" },
    });

    expect(setData).toHaveBeenCalledWith(
      "application/scaffold-card",
      expect.stringContaining('"conceptId":"1"'),
    );
  });

  test("triggering onStarClick from the graph updates the starred count and persists it", async () => {
    renderConceptGraphPage(loggedInWithId);
    await screen.findByText("1 / 2");

    fireEvent.click(screen.getByText("trigger-star-click"));

    expect(await screen.findByText("2 / 2")).toBeInTheDocument();
    await waitFor(() => expect(postsTo("/api/user-state")).toHaveLength(1));
    expect(postBodiesTo("/api/user-state")[0]).toEqual(
      expect.objectContaining({
        userid: 42,
        courseId: 1,
        starred_ids: expect.arrayContaining(["4", "1"]),
      }),
    );
  });

  test("triggering onStarClick on an already-starred concept unstars it", async () => {
    renderConceptGraphPage(loggedInWithId);
    await screen.findByText("1 / 2");

    fireEvent.click(screen.getByText("trigger-unstar-click"));

    expect(await screen.findByText("0 / 2")).toBeInTheDocument();
    await waitFor(() => expect(postsTo("/api/user-state")).toHaveLength(1));
    expect(postBodiesTo("/api/user-state")[0]).toEqual(
      expect.objectContaining({ userid: 42, courseId: 1, starred_ids: [] }),
    );
  });

  test("triggering onReset from the graph clears state and persists it", async () => {
    renderConceptGraphPage(loggedInWithId);
    await screen.findByText("1 / 2");

    fireEvent.click(screen.getByText("trigger-reset"));

    expect(await screen.findByText("0 / 2")).toBeInTheDocument();
    await waitFor(() => expect(postsTo("/api/user-state")).toHaveLength(1));
    expect(postBodiesTo("/api/user-state")[0]).toEqual({
      userid: 42,
      courseId: 1,
      starred_ids: [],
      detail_cards: [],
      mastered_subconcepts: [],
      top_level_positions: {},
    });
  });

  test("triggering onDetailAdded logs activity and persists the new card", async () => {
    renderConceptGraphPage(loggedInWithId);
    await screen.findByTestId("concept-graph-stub");

    fireEvent.click(screen.getByText("trigger-detail-added"));

    await waitFor(() =>
      expect(postBodiesTo("/api/user-activity")).toContainEqual({
        userid: 42,
        courseId: 1,
        event_type: "detail_added_to_graph",
        payload: {
          cardType: "Description",
          itemLabel: "Recursion",
          conceptId: "1",
        },
      }),
    );
    await waitFor(() =>
      expect(postBodiesTo("/api/user-state")).toContainEqual(
        expect.objectContaining({
          detail_cards: expect.arrayContaining([
            expect.objectContaining({ itemLabel: "Recursion" }),
          ]),
        }),
      ),
    );
  });

  test("triggering onDetailDeleted removes the persisted card", async () => {
    renderConceptGraphPage(loggedInWithId);
    await screen.findByText("1 / 2");

    fireEvent.click(screen.getByText("trigger-detail-deleted"));

    await waitFor(() =>
      expect(postBodiesTo("/api/user-state")).toContainEqual(
        expect.objectContaining({ detail_cards: [] }),
      ),
    );
  });

  test("triggering onDetailMoved updates the persisted card position", async () => {
    renderConceptGraphPage(loggedInWithId);
    await screen.findByText("1 / 2");

    fireEvent.click(screen.getByText("trigger-detail-moved"));

    await waitFor(() =>
      expect(postBodiesTo("/api/user-state")).toContainEqual(
        expect.objectContaining({
          detail_cards: [expect.objectContaining({ posX: 5, posY: 6 })],
        }),
      ),
    );
  });

  test("triggering onMajorMoved persists a private top-level position override", async () => {
    renderConceptGraphPage(loggedInWithId);
    await screen.findByTestId("concept-graph-stub");

    fireEvent.click(screen.getByText("trigger-major-moved"));

    await waitFor(() =>
      expect(postBodiesTo("/api/user-state")).toContainEqual(
        expect.objectContaining({
          top_level_positions: { "1": { x: 30, y: 40 } },
        }),
      ),
    );
  });

  test("triggering onSubconceptMastered toggles it and persists the change", async () => {
    renderConceptGraphPage(loggedInWithId);
    await screen.findByTestId("mastered-count");
    await waitFor(() =>
      expect(screen.getByTestId("mastered-count")).toHaveTextContent("1"),
    );

    fireEvent.click(screen.getByText("trigger-subconcept-mastered"));

    expect(await screen.findByTestId("mastered-count")).toHaveTextContent("2");
    await waitFor(() =>
      expect(postBodiesTo("/api/user-state")).toContainEqual(
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
    renderConceptGraphPage(loggedInWithId);
    await screen.findByTestId("mastered-count");
    await waitFor(() =>
      expect(screen.getByTestId("mastered-count")).toHaveTextContent("1"),
    );

    fireEvent.click(screen.getByText("trigger-unmaster-subconcept"));

    expect(await screen.findByTestId("mastered-count")).toHaveTextContent("0");
    await waitFor(() =>
      expect(postBodiesTo("/api/user-state")).toContainEqual(
        expect.objectContaining({ mastered_subconcepts: [] }),
      ),
    );
  });

  test("triggering onPaneClick clears the current concept selection", async () => {
    renderConceptGraphPage(currentUserFixtures.userOnly);
    await screen.findByTestId("concept-graph-stub");
    fireEvent.click(screen.getByText("trigger-concept-click"));
    await screen.findByRole("button", { name: "Recursion" });

    fireEvent.click(screen.getByText("trigger-pane-click"));

    expect(
      screen.queryByRole("button", { name: "Recursion" }),
    ).not.toBeInTheDocument();
  });

  test("does not persist state changes when the logged-in user has no numeric id", async () => {
    renderConceptGraphPage(currentUserFixtures.userOnly);
    await screen.findByTestId("concept-graph-stub");

    fireEvent.click(screen.getByText("trigger-star-click"));

    expect(await screen.findByText("1 / 2")).toBeInTheDocument();
    expect(postsTo("/api/user-state")).toHaveLength(0);
  });

  test("handles a brand-new user (empty default state from the backend) without crashing", async () => {
    // The backend returns 200 with empty defaults (not a 404) when the user
    // has no saved state yet.
    axiosMock.onGet("/api/user-state").reply(200, {
      starred_ids: [],
      detail_cards: [],
      mastered_subconcepts: [],
      top_level_positions: {},
    });
    renderConceptGraphPage(loggedInWithId);

    await waitFor(() => expect(getsTo("/api/user-state")).toHaveLength(1));
    expect(await screen.findByText("0 / 2")).toBeInTheDocument();
    expect(screen.getByTestId("restored-count")).toHaveTextContent("0");
  });

  test("reordering subconcepts persists the complete order and updates the local graph data", async () => {
    renderConceptGraphPage(loggedInWithId);
    await screen.findByTestId("concept-graph-stub");
    await waitFor(() =>
      expect(screen.getByTestId("node-1-subconcept-order")).toHaveTextContent(
        "2,3",
      ),
    );

    fireEvent.click(screen.getByText("trigger-subconcepts-reordered"));

    await waitFor(() =>
      expect(screen.getByTestId("node-1-subconcept-order")).toHaveTextContent(
        "3,2",
      ),
    );
    await waitFor(() => expect(axiosMock.history.put).toHaveLength(1));
    expect(axiosMock.history.put[0].url).toBe(
      "/api/concepts/subconcepts/reorder",
    );
    expect(axiosMock.history.put[0].params).toEqual({ parentConceptId: 1 });
    expect(JSON.parse(axiosMock.history.put[0].data as string)).toEqual([3, 2]);
    // The optimistic update alone suffices; no graph refetch on success.
    expect(getsTo("/api/concepts/graph")).toHaveLength(1);
  });

  test("a rejected reorder refetches the graph so the order snaps back", async () => {
    axiosMock.onPut("/api/concepts/subconcepts/reorder").reply(400);
    renderConceptGraphPage(loggedInWithId);
    await screen.findByTestId("concept-graph-stub");
    await waitFor(() =>
      expect(screen.getByTestId("node-1-subconcept-order")).toHaveTextContent(
        "2,3",
      ),
    );

    fireEvent.click(screen.getByText("trigger-subconcepts-reordered"));

    // The optimistic new order is transient here — the rejected PUT triggers a
    // refetch almost immediately, so don't assert the intermediate frame. What
    // matters: the failure refetches the graph, and the authoritative order
    // wins over the optimistic one.
    await waitFor(() => expect(axiosMock.history.put).toHaveLength(1));
    await waitFor(() => expect(getsTo("/api/concepts/graph")).toHaveLength(2));
    await waitFor(() =>
      expect(screen.getByTestId("node-1-subconcept-order")).toHaveTextContent(
        "2,3",
      ),
    );
  });

  test("state persisted after switching courses belongs to the new course only", async () => {
    axiosMock.onGet("/api/courses/list").reply(200, [
      {
        id: 1,
        courseName: "Course One",
        term: "S26",
        school: { displayName: "UCSB", key: "ucsb" },
        instructorEmail: "prof@ucsb.edu",
        studentAccess: true,
        staffAccess: false,
        instructorAccess: false,
        adminAccess: false,
      },
      {
        id: 2,
        courseName: "Course Two",
        term: "S26",
        school: { displayName: "UCSB", key: "ucsb" },
        instructorEmail: "prof@ucsb.edu",
        studentAccess: true,
        staffAccess: false,
        instructorAccess: false,
        adminAccess: false,
      },
    ]);
    // Course 2 is brand new for this user: no saved state at all.
    axiosMock.onGet("/api/user-state").reply((config) =>
      config.params?.courseId === 2
        ? [
            200,
            {
              starred_ids: [],
              detail_cards: [],
              mastered_subconcepts: [],
              top_level_positions: {},
            },
          ]
        : [200, userState],
    );

    renderConceptGraphPage(loggedInWithId);
    // Course 1's saved state loads: 1 of 2 concepts starred.
    await screen.findByText("1 / 2");

    // Switch to course 2 through the real Courses menu.
    fireEvent.click(screen.getByText("Courses"));
    fireEvent.click(await screen.findByText(/Course Two/));
    await screen.findByTestId("concept-graph-stub");
    await waitFor(() => expect(getsTo("/api/user-state")).toHaveLength(2));

    fireEvent.click(screen.getByText("trigger-star-click"));

    // The save must contain course 2's state only — nothing (stars, mastered
    // subconcepts, detail cards) carried over from course 1.
    await waitFor(() => expect(postsTo("/api/user-state")).toHaveLength(1));
    expect(postBodiesTo("/api/user-state")[0]).toEqual({
      userid: 42,
      courseId: 2,
      starred_ids: ["1"],
      detail_cards: [],
      mastered_subconcepts: [],
      top_level_positions: {},
    });
  });

  test("double-clicking a concept in editing mode opens the edit concept modal", async () => {
    renderConceptGraphPage(currentUserFixtures.adminUser);
    await screen.findByTestId("concept-graph-stub");

    fireEvent.click(screen.getByTestId("enable-editing-toggle"));
    fireEvent.click(screen.getByText("trigger-concept-double-click"));

    expect(await screen.findByTestId("ConceptModal-base")).toHaveTextContent(
      "Edit Concept:Recursion",
    );
  });

  test("double-clicking a subconcept opens the edit subconcept modal", async () => {
    renderConceptGraphPage(currentUserFixtures.adminUser);
    await screen.findByTestId("concept-graph-stub");

    fireEvent.click(screen.getByTestId("enable-editing-toggle"));
    fireEvent.click(screen.getByText("trigger-subconcept-double-click"));

    expect(await screen.findByTestId("SubConceptModal-base")).toHaveTextContent(
      "Edit SubConcept:1:Base case",
    );
  });

  test("adding a subconcept opens the create subconcept modal for the selected parent", async () => {
    renderConceptGraphPage(currentUserFixtures.adminUser);
    await screen.findByTestId("concept-graph-stub");

    fireEvent.click(screen.getByTestId("enable-editing-toggle"));
    fireEvent.click(screen.getByText("trigger-add-subconcept"));

    expect(await screen.findByTestId("SubConceptModal-base")).toHaveTextContent(
      "Create SubConcept:1",
    );
  });

  test("the footer new concept button appears only when editing is enabled and opens the create modal", async () => {
    renderConceptGraphPage(currentUserFixtures.adminUser);
    await screen.findByTestId("concept-graph-stub");

    expect(screen.queryByTestId("new-concept-button")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("enable-editing-toggle"));

    const newConceptButton = await screen.findByTestId("new-concept-button");
    fireEvent.click(newConceptButton);

    expect(await screen.findByTestId("ConceptModal-base")).toHaveTextContent(
      "Create Concept",
    );
  });

  test("the footer realign concepts button appears only when editing is enabled and posts a scaffold reset", async () => {
    renderConceptGraphPage(currentUserFixtures.adminUser);
    await screen.findByTestId("concept-graph-stub");

    expect(
      screen.queryByTestId("realign-concepts-button"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("enable-editing-toggle"));

    const realignButton = await screen.findByTestId("realign-concepts-button");
    fireEvent.click(realignButton);

    await waitFor(() =>
      expect(
        axiosMock.history.post.filter(
          (r) => r.url === "/api/course/scaffold/reset",
        ),
      ).toHaveLength(1),
    );
    expect(
      axiosMock.history.post.find((r) => r.url === "/api/course/scaffold/reset")
        ?.params,
    ).toEqual({ courseId: 1 });
  });
});
