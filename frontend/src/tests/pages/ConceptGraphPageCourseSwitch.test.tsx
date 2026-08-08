import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router";
import ConceptGraphPage from "main/pages/ConceptGraphPage";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import mockConsole from "tests/testutils/mockConsole";
import type {
  MajorConceptDTO,
  EdgeDTO,
  UserStateResponse,
} from "main/types/conceptGraph";

import axios from "axios";
import axiosMockAdapter from "axios-mock-adapter";

// Course-switch regression tests: navigating /course/1 -> /course/2 through the
// real Courses menu must fully replace the graph (concepts, subconcepts, edges)
// and the per-course user state (stars, mastered, detail cards, position
// overrides). Unlike ConceptGraphPage.test.tsx, these tests deliberately render
// the REAL ScaffoldConceptGraph, because the stale-state bug lives partly in
// its mount-time snapshot of the graph data.

const axiosMock = new axiosMockAdapter(axios);

// @xyflow/react measures its container via ResizeObserver and
// getBoundingClientRect, neither of which jsdom implements with real
// dimensions. Stub both so the graph can mount and compute a viewport.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const courseOne: { graph: MajorConceptDTO[]; edges: EdgeDTO[] } = {
  graph: [
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
      labelHtml: "Iteration",
      color: "#93ebff",
      subconcepts: [{ id: 5, parentId: 4, labelHtml: "For loops" }],
    },
  ],
  edges: [{ id: 20, sourceId: 4, targetId: 1, color: null }],
};

const courseTwo: { graph: MajorConceptDTO[]; edges: EdgeDTO[] } = {
  graph: [
    {
      id: 10,
      labelHtml: "Pointers",
      color: "#fe9a71",
      subconcepts: [{ id: 11, parentId: 10, labelHtml: "Address-of" }],
    },
    {
      id: 12,
      labelHtml: "Memory",
      color: "#93ebff",
      subconcepts: [{ id: 13, parentId: 12, labelHtml: "Heap" }],
    },
  ],
  edges: [{ id: 21, sourceId: 12, targetId: 10, color: null }],
};

const courseOnePositions = { "1": { x: 100, y: 100 }, "4": { x: 400, y: 100 } };
const courseTwoPositions = {
  "10": { x: 100, y: 100 },
  "12": { x: 400, y: 100 },
};

// Course 1 has saved user state (one starred concept); course 2 has none.
const courseOneUserState: UserStateResponse = {
  starred_ids: ["4"],
  detail_cards: [],
  mastered_subconcepts: ["For loops"],
  top_level_positions: {},
};
const courseTwoUserState: UserStateResponse = {
  starred_ids: [],
  detail_cards: [],
  mastered_subconcepts: [],
  top_level_positions: {},
};

const courseAccess = (id: number, courseName: string) => ({
  id,
  courseName,
  term: "S26",
  school: { displayName: "UCSB", key: "ucsb" },
  instructorEmail: "prof@ucsb.edu",
  studentAccess: true,
  staffAccess: false,
  instructorAccess: false,
  adminAccess: false,
});

const loggedInWithId = {
  loggedIn: true as const,
  root: { user: { email: "cgaucho@ucsb.edu", id: 42 } },
};

function renderAtCourseOne() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["current user"], loggedInWithId);
  qc.setQueryData(["systemInfo"], systemInfoFixtures.showingNeither);
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/course/1"]}>
        <Routes>
          <Route path="/course/:courseId" element={<ConceptGraphPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function switchToCourse(courseName: string) {
  fireEvent.click(screen.getByText("Courses"));
  fireEvent.click(await screen.findByText(new RegExp(courseName)));
}

describe("ConceptGraphPage course switching", () => {
  let restoreConsole: () => void;

  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    Element.prototype.getBoundingClientRect = () =>
      ({
        width: 1000,
        height: 1000,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 1000,
        x: 0,
        y: 0,
        toJSON() {},
      }) as DOMRect;
    restoreConsole = mockConsole();

    axiosMock.reset();
    axiosMock.resetHistory();
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, systemInfoFixtures.showingNeither);
    axiosMock
      .onGet("/api/courses/list")
      .reply(200, [
        courseAccess(1, "Course One"),
        courseAccess(2, "Course Two"),
      ]);
    axiosMock.onGet("/api/assessments").reply(200, []);
    axiosMock
      .onGet(/\/api\/courses\/\d+/)
      .reply(200, { id: 1, courseName: "CMPSC 8" });

    axiosMock
      .onGet("/api/concepts/graph", { params: { courseId: 1 } })
      .reply(200, courseOne.graph);
    axiosMock
      .onGet("/api/concepts/graph", { params: { courseId: 2 } })
      .reply(200, courseTwo.graph);
    axiosMock
      .onGet("/api/concepts/content", { params: { courseId: 1 } })
      .reply(200, {});
    axiosMock
      .onGet("/api/concepts/content", { params: { courseId: 2 } })
      .reply(200, {});
    axiosMock
      .onGet("/api/concepts/positions", { params: { courseId: 1 } })
      .reply(200, courseOnePositions);
    axiosMock
      .onGet("/api/concepts/positions", { params: { courseId: 2 } })
      .reply(200, courseTwoPositions);
    axiosMock
      .onGet("/api/concepts/edges", { params: { courseId: 1 } })
      .reply(200, courseOne.edges);
    axiosMock
      .onGet("/api/concepts/edges", { params: { courseId: 2 } })
      .reply(200, courseTwo.edges);
    axiosMock
      .onGet("/api/user-state", { params: { userid: 42, courseId: 1 } })
      .reply(200, courseOneUserState);
    axiosMock
      .onGet("/api/user-state", { params: { userid: 42, courseId: 2 } })
      .reply(200, courseTwoUserState);
    axiosMock.onPost("/api/user-state").reply(204);
    axiosMock.onPost("/api/user-activity").reply(204);
  });

  afterEach(() => {
    restoreConsole();
    vi.unstubAllGlobals();
  });

  test("switching to another course fully replaces the graph and the per-course user state", async () => {
    renderAtCourseOne();

    // Course 1 renders its own concepts and saved state (1 of 2 starred).
    expect(await screen.findByText("Recursion")).toBeInTheDocument();
    expect(screen.getByText("Iteration")).toBeInTheDocument();
    expect(await screen.findByText("1 / 2")).toBeInTheDocument();

    await switchToCourse("Course Two");

    // Course 2's concepts appear...
    expect(await screen.findByText("Pointers")).toBeInTheDocument();
    expect(await screen.findByText("Memory")).toBeInTheDocument();

    // ...and nothing from course 1 remains: not its concepts,
    expect(screen.queryByText("Recursion")).not.toBeInTheDocument();
    expect(screen.queryByText("Iteration")).not.toBeInTheDocument();
    expect(screen.queryByText("Base case")).not.toBeInTheDocument();
    // ...and not its user state: course 2 has no stars (0 of its 2 concepts).
    expect(await screen.findByText("0 / 2")).toBeInTheDocument();
    expect(screen.queryByText("1 / 2")).not.toBeInTheDocument();
  });

  test("switching back to an already-visited course restores that course's graph", async () => {
    renderAtCourseOne();
    expect(await screen.findByText("Recursion")).toBeInTheDocument();

    await switchToCourse("Course Two");
    expect(await screen.findByText("Pointers")).toBeInTheDocument();

    await switchToCourse("Course One");

    // Course 1's graph and saved state come back; course 2's are gone.
    expect(await screen.findByText("Recursion")).toBeInTheDocument();
    expect(screen.getByText("Iteration")).toBeInTheDocument();
    expect(await screen.findByText("1 / 2")).toBeInTheDocument();
    expect(screen.queryByText("Pointers")).not.toBeInTheDocument();
    expect(screen.queryByText("Memory")).not.toBeInTheDocument();
  });

  test("stars added during a visit survive switching away and back", async () => {
    renderAtCourseOne();
    expect(await screen.findByText("Recursion")).toBeInTheDocument();
    expect(await screen.findByText("1 / 2")).toBeInTheDocument();

    // Star "Recursion" (concept id 1): now 2 of course 1's 2 concepts.
    fireEvent.click(screen.getByTestId("star-button-1"));
    expect(await screen.findByText("2 / 2")).toBeInTheDocument();

    await switchToCourse("Course Two");
    expect(await screen.findByText("0 / 2")).toBeInTheDocument();

    await switchToCourse("Course One");

    // The count must reflect the star added during the previous visit, not
    // the snapshot fetched when the course was first opened.
    expect(await screen.findByText("Recursion")).toBeInTheDocument();
    expect(await screen.findByText("2 / 2")).toBeInTheDocument();
  });
});
