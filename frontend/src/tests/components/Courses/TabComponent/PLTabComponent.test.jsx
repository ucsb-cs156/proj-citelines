import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import { vi } from "vitest";

import PLTabComponent from "main/components/Courses/TabComponent/PLTabComponent";

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  const originalModule = await importOriginal();
  const toast = (x) => mockToast(x);
  toast.error = (x) => mockToast(x);
  return {
    ...originalModule,
    toast,
  };
});

const axiosMock = new AxiosMockAdapter(axios);

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PLTabComponent courseId={7} testIdPrefix="test" />
    </QueryClientProvider>,
  );
}

async function submitRepoName(repoName) {
  fireEvent.change(screen.getByTestId("test-plTab-repoName"), {
    target: { value: repoName },
  });
  fireEvent.click(screen.getByTestId("test-plTab-repo-submit"));
  await waitFor(() => expect(axiosMock.history.put.length).toBe(1));
}

async function submitInstanceId(instanceId) {
  fireEvent.change(screen.getByTestId("test-plTab-instanceId"), {
    target: { value: instanceId },
  });
  fireEvent.click(screen.getByTestId("test-plTab-instance-submit"));
  await waitFor(() => expect(axiosMock.history.put.length).toBe(1));
}

describe("PLTabComponent tests", () => {
  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockClear();
    axiosMock.onGet("/api/courses/7").reply(200, {
      id: 7,
      courseName: "CS156",
      plRepoId: null,
      plInstanceId: null,
      plRepoName: null,
      plInstanceShortName: null,
      plInstanceNumericId: null,
    });
  });

  test("renders the instructions and both forms with correct testids", () => {
    renderTab();
    expect(screen.getByText("PrairieLearn")).toBeInTheDocument();
    expect(
      screen.getByText("To configure your course for PrairieLearn:"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Create a Github PAT and enter it on the profile page."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Create a PrairieLearn PAT and enter it on the profile page.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("test-plTab")).toBeInTheDocument();
    expect(screen.getByTestId("test-plTab-repoName")).toBeInTheDocument();
    expect(screen.getByTestId("test-plTab-repo-submit")).toBeInTheDocument();
    expect(screen.getByTestId("test-plTab-instanceId")).toBeInTheDocument();
    expect(
      screen.getByTestId("test-plTab-instance-submit"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("test-plTab-repo-error"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("test-plTab-instance-error"),
    ).not.toBeInTheDocument();
  });

  // ────────────────────────── repo form ──────────────────────────

  test("submits the repo name to updateGithubRepo and shows a success toast", async () => {
    axiosMock.onPut("/api/courses/updateGithubRepo").reply(200, {
      id: 7,
      plRepoId: 9,
    });

    renderTab();
    await submitRepoName("ucsb-cs156/pl-demo");

    expect(axiosMock.history.put[0].params).toEqual({
      courseId: 7,
      repoName: "ucsb-cs156/pl-demo",
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "GitHub repo associated with course",
      ),
    );
    expect(
      screen.queryByTestId("test-plTab-repo-error"),
    ).not.toBeInTheDocument();
  });

  test.each([
    ["must set up Github PAT first"],
    ["No access to repo via Github PAT token"],
    ["Read/write access to repo via Github PAT is required"],
  ])(
    "shows the expected repo 403 error '%s' on the page, not in a toast",
    async (message) => {
      axiosMock.onPut("/api/courses/updateGithubRepo").reply(403, {
        type: "ForbiddenException",
        message,
      });

      renderTab();
      await submitRepoName("ucsb-cs156/pl-demo");

      expect(
        await screen.findByTestId("test-plTab-repo-error"),
      ).toHaveTextContent(message);
      expect(mockToast).not.toHaveBeenCalled();
    },
  );

  test("uses a toast for an unexpected repo error status", async () => {
    axiosMock.onPut("/api/courses/updateGithubRepo").reply(404, {
      type: "EntityNotFoundException",
      message: "Course with id 7 not found",
    });

    renderTab();
    await submitRepoName("ucsb-cs156/pl-demo");

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Course with id 7 not found"),
    );
    expect(
      screen.queryByTestId("test-plTab-repo-error"),
    ).not.toBeInTheDocument();
  });

  test("uses a toast for a repo 403 with an unexpected message", async () => {
    axiosMock.onPut("/api/courses/updateGithubRepo").reply(403, {
      message: "Access Denied",
    });

    renderTab();
    await submitRepoName("ucsb-cs156/pl-demo");

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Access Denied"),
    );
    expect(
      screen.queryByTestId("test-plTab-repo-error"),
    ).not.toBeInTheDocument();
  });

  test("uses a generic toast when the repo failure has no message at all", async () => {
    axiosMock.onPut("/api/courses/updateGithubRepo").networkError();

    renderTab();
    await submitRepoName("ucsb-cs156/pl-demo");

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Error associating GitHub repo"),
    );
  });

  test("clears a previous repo error after a later successful submit", async () => {
    axiosMock.onPut("/api/courses/updateGithubRepo").replyOnce(403, {
      message: "must set up Github PAT first",
    });

    renderTab();
    await submitRepoName("ucsb-cs156/pl-demo");
    expect(
      await screen.findByTestId("test-plTab-repo-error"),
    ).toBeInTheDocument();

    axiosMock.onPut("/api/courses/updateGithubRepo").reply(200, { id: 7 });
    fireEvent.click(screen.getByTestId("test-plTab-repo-submit"));

    await waitFor(() =>
      expect(
        screen.queryByTestId("test-plTab-repo-error"),
      ).not.toBeInTheDocument(),
    );
  });

  test("requires a repo name before submitting", async () => {
    renderTab();

    fireEvent.click(screen.getByTestId("test-plTab-repo-submit"));

    await waitFor(() =>
      expect(screen.getByText("A repo name is required.")).toBeInTheDocument(),
    );
    expect(axiosMock.history.put.length).toBe(0);
  });

  // ────────────────────────── course instance form ──────────────────────────

  test("submits the instance id to updatePLInstance and shows a success toast", async () => {
    axiosMock.onPut("/api/courses/updatePLInstance").reply(200, {
      id: 7,
      plInstanceId: 77,
    });

    renderTab();
    await submitInstanceId("213133");

    expect(axiosMock.history.put[0].params).toEqual({
      courseId: 7,
      instanceId: "213133",
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "PrairieLearn course instance associated with course",
      ),
    );
    expect(
      screen.queryByTestId("test-plTab-instance-error"),
    ).not.toBeInTheDocument();
  });

  test.each([
    ["must set up Github PAT first"],
    ["must set up PrairieLearn PAT first"],
    ["must associate course with PlRepo first"],
    ["course instance id not found"],
  ])(
    "shows the expected instance 403 error '%s' on the page, not in a toast",
    async (message) => {
      axiosMock.onPut("/api/courses/updatePLInstance").reply(403, {
        type: "ForbiddenException",
        message,
      });

      renderTab();
      await submitInstanceId("213133");

      expect(
        await screen.findByTestId("test-plTab-instance-error"),
      ).toHaveTextContent(message);
      expect(mockToast).not.toHaveBeenCalled();
    },
  );

  test("uses a toast for an unexpected instance error status", async () => {
    axiosMock.onPut("/api/courses/updatePLInstance").reply(404, {
      type: "EntityNotFoundException",
      message: "Course with id 7 not found",
    });

    renderTab();
    await submitInstanceId("213133");

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Course with id 7 not found"),
    );
    expect(
      screen.queryByTestId("test-plTab-instance-error"),
    ).not.toBeInTheDocument();
  });

  test("uses a generic toast when the instance failure has no message at all", async () => {
    axiosMock.onPut("/api/courses/updatePLInstance").networkError();

    renderTab();
    await submitInstanceId("213133");

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "Error associating PrairieLearn course instance",
      ),
    );
  });

  test("clears a previous instance error after a later successful submit", async () => {
    axiosMock.onPut("/api/courses/updatePLInstance").replyOnce(403, {
      message: "course instance id not found",
    });

    renderTab();
    await submitInstanceId("213133");
    expect(
      await screen.findByTestId("test-plTab-instance-error"),
    ).toBeInTheDocument();

    axiosMock.onPut("/api/courses/updatePLInstance").reply(200, { id: 7 });
    fireEvent.click(screen.getByTestId("test-plTab-instance-submit"));

    await waitFor(() =>
      expect(
        screen.queryByTestId("test-plTab-instance-error"),
      ).not.toBeInTheDocument(),
    );
  });

  test("requires a course instance id before submitting", async () => {
    renderTab();

    fireEvent.click(screen.getByTestId("test-plTab-instance-submit"));

    await waitFor(() =>
      expect(
        screen.getByText("A course instance id is required."),
      ).toBeInTheDocument(),
    );
    expect(axiosMock.history.put.length).toBe(0);
  });

  // ────────────────────────── current-association checks ──────────────────────────

  test("shows no green checks when nothing is associated yet", async () => {
    renderTab();
    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(
      screen.queryByTestId("test-plTab-repo-check"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("test-plTab-instance-check"),
    ).not.toBeInTheDocument();
  });

  test("shows green checks with names when the course has associations", async () => {
    axiosMock.onGet("/api/courses/7").reply(200, {
      id: 7,
      plRepoId: 9,
      plRepoName: "ucsb-cs156/pl-demo",
      plInstanceId: 55,
      plInstanceShortName: "S26",
      plInstanceNumericId: 213133,
    });

    renderTab();

    expect(
      await screen.findByTestId("test-plTab-repo-check"),
    ).toHaveTextContent("✓ ucsb-cs156/pl-demo");
    expect(screen.getByTestId("test-plTab-instance-check")).toHaveTextContent(
      "✓ S26 (PrairieLearn id 213133)",
    );
  });

  test("falls back to ids in the checks when the names are unavailable", async () => {
    axiosMock.onGet("/api/courses/7").reply(200, {
      id: 7,
      plRepoId: 9,
      plRepoName: null,
      plInstanceId: 55,
      plInstanceShortName: null,
      plInstanceNumericId: null,
    });

    renderTab();

    expect(
      await screen.findByTestId("test-plTab-repo-check"),
    ).toHaveTextContent("✓ repo id 9");
    expect(screen.getByTestId("test-plTab-instance-check")).toHaveTextContent(
      "✓ instance id 55",
    );
  });

  test("the repo check appears after a successful repo submit", async () => {
    axiosMock.onGet("/api/courses/7").replyOnce(200, {
      id: 7,
      plRepoId: null,
      plInstanceId: null,
    });
    axiosMock.onGet("/api/courses/7").reply(200, {
      id: 7,
      plRepoId: 9,
      plRepoName: "ucsb-cs156/pl-demo",
      plInstanceId: null,
    });
    axiosMock.onPut("/api/courses/updateGithubRepo").reply(200, {
      id: 7,
      plRepoId: 9,
      plRepoName: "ucsb-cs156/pl-demo",
    });

    renderTab();
    await waitFor(() => expect(axiosMock.history.get.length).toBe(1));
    expect(
      screen.queryByTestId("test-plTab-repo-check"),
    ).not.toBeInTheDocument();

    await submitRepoName("ucsb-cs156/pl-demo");

    expect(
      await screen.findByTestId("test-plTab-repo-check"),
    ).toHaveTextContent("✓ ucsb-cs156/pl-demo");
  });

  test("the course instance id field is a text input with numeric input mode (no spinner)", () => {
    renderTab();
    const input = screen.getByTestId("test-plTab-instanceId");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "numeric");
  });

  // ────────────────────────── sync course job ──────────────────────────

  test("launches the sync job and shows the job number in a toast on success", async () => {
    axiosMock
      .onPost("/api/jobs/launch/syncCourseWithPlRepo")
      .reply(200, { id: 42 });

    renderTab();
    fireEvent.click(screen.getByTestId("test-plTab-sync-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].params).toEqual({ courseId: 7 });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "Sync job launched, job number 42",
      ),
    );
  });

  test("shows the backend error message in a toast when the sync job fails to launch", async () => {
    axiosMock.onPost("/api/jobs/launch/syncCourseWithPlRepo").reply(403, {
      type: "ForbiddenException",
      message: "must associate course with PlRepo first",
    });

    renderTab();
    fireEvent.click(screen.getByTestId("test-plTab-sync-submit"));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "must associate course with PlRepo first",
      ),
    );
  });

  test("shows a generic toast when the sync job fails with no message", async () => {
    axiosMock.onPost("/api/jobs/launch/syncCourseWithPlRepo").networkError();

    renderTab();
    fireEvent.click(screen.getByTestId("test-plTab-sync-submit"));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith("Unable to launch sync job"),
    );
  });
});
