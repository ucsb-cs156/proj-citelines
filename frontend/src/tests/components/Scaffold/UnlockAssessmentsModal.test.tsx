import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UnlockAssessmentsModal from "main/components/Scaffold/UnlockAssessmentsModal";
import type { AssessmentManagementDTO } from "main/types/conceptGraph";
import mockConsole from "tests/testutils/mockConsole";

import axios from "axios";
import axiosMockAdapter from "axios-mock-adapter";

const axiosMock = new axiosMockAdapter(axios);

const assessments: AssessmentManagementDTO[] = [
  { id: "1", name: "HW1", locked: true },
  { id: "2", name: "HW2", locked: false },
];

function renderModal(
  props: Partial<Parameters<typeof UnlockAssessmentsModal>[0]> = {},
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <UnlockAssessmentsModal
        show={true}
        onHide={() => {}}
        courseId={1}
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe("UnlockAssessmentsModal", () => {
  let restoreConsole: () => void;

  beforeEach(() => {
    restoreConsole = mockConsole();
    axiosMock.reset();
    axiosMock.resetHistory();
    axiosMock
      .onGet("/api/assessments/all", { params: { courseId: 1 } })
      .reply(200, assessments);
    axiosMock.onPut("/api/assessments/lock").reply(200, assessments[0]);
  });

  afterEach(() => {
    restoreConsole();
  });

  test("does not fetch while closed", () => {
    renderModal({ show: false });
    expect(
      axiosMock.history.get.filter((r) => r.url === "/api/assessments/all"),
    ).toHaveLength(0);
  });

  test("shows an empty message when the course has no assessments", async () => {
    axiosMock.reset();
    axiosMock.onGet("/api/assessments/all").reply(200, []);

    renderModal();

    expect(
      await screen.findByTestId("UnlockAssessmentsModal-empty"),
    ).toBeInTheDocument();
  });

  test("lists every assessment with a switch reflecting its locked state", async () => {
    renderModal();

    expect(
      await screen.findByTestId("UnlockAssessmentsModal-label-1"),
    ).toHaveTextContent("HW1");
    expect(
      screen.getByTestId("UnlockAssessmentsModal-label-2"),
    ).toHaveTextContent("HW2");

    // HW1 is locked -> switch (visible) unchecked; HW2 is unlocked -> checked.
    expect(
      screen.getByTestId("UnlockAssessmentsModal-switch-1"),
    ).not.toBeChecked();
    expect(screen.getByTestId("UnlockAssessmentsModal-switch-2")).toBeChecked();
  });

  test("toggling a switch unlocks a locked assessment", async () => {
    renderModal();
    const switchInput = await screen.findByTestId(
      "UnlockAssessmentsModal-switch-1",
    );

    fireEvent.click(switchInput);

    await waitFor(() => expect(axiosMock.history.put).toHaveLength(1));
    expect(axiosMock.history.put[0].url).toBe("/api/assessments/lock");
    expect(axiosMock.history.put[0].params).toEqual({
      courseId: 1,
      assessmentId: "1",
      locked: false,
    });
  });

  test("toggling a switch locks an unlocked assessment", async () => {
    renderModal();
    const switchInput = await screen.findByTestId(
      "UnlockAssessmentsModal-switch-2",
    );

    fireEvent.click(switchInput);

    await waitFor(() => expect(axiosMock.history.put).toHaveLength(1));
    expect(axiosMock.history.put[0].params).toEqual({
      courseId: 1,
      assessmentId: "2",
      locked: true,
    });
  });

  test("shows a toast when the lock mutation fails", async () => {
    axiosMock.onPut("/api/assessments/lock").reply(500);
    renderModal();
    const switchInput = await screen.findByTestId(
      "UnlockAssessmentsModal-switch-1",
    );

    fireEvent.click(switchInput);

    await waitFor(() => expect(axiosMock.history.put).toHaveLength(1));
  });

  test("calls onHide when the modal is closed", async () => {
    const onHide = vi.fn();
    renderModal({ onHide });

    await screen.findByTestId("UnlockAssessmentsModal-label-1");
    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(onHide).toHaveBeenCalled();
  });
});
