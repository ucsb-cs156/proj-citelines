import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import CollaboratorsTabComponent from "main/components/Projects/TabComponent/CollaboratorsTabComponent";
import { projectCollaboratorsFixtures } from "fixtures/projectCollaboratorsFixtures";

const mockToast = vi.fn();
vi.mock("react-toastify", async (importOriginal) => {
  return {
    ...(await importOriginal()),
    toast: (x) => mockToast(x),
  };
});

function renderTab(props) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CollaboratorsTabComponent projectId={1} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CollaboratorsTabComponent tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);

  beforeEach(() => {
    axiosMock.reset();
    axiosMock.resetHistory();
    mockToast.mockReset();
    axiosMock
      .onGet("/api/projectcollaborators/project?projectId=1")
      .reply(200, projectCollaboratorsFixtures.threeCollaborators);
  });

  test("owner sees the Add Collaborator button and can add one", async () => {
    axiosMock
      .onPost("/api/projectcollaborators/post")
      .reply(200, projectCollaboratorsFixtures.oneCollaborator[0]);

    renderTab({ isOwner: true });

    await waitFor(() => {
      expect(
        screen.getByTestId("CollaboratorsTabComponent-post-button"),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByTestId("CollaboratorsTabComponent-post-button"),
    );

    await screen.findByTestId("ProjectCollaboratorForm-firstName");
    fireEvent.change(screen.getByTestId("ProjectCollaboratorForm-firstName"), {
      target: { value: "Chris" },
    });
    fireEvent.change(screen.getByTestId("ProjectCollaboratorForm-lastName"), {
      target: { value: "Gaucho" },
    });
    fireEvent.change(screen.getByTestId("ProjectCollaboratorForm-email"), {
      target: { value: "cgaucho@ucsb.edu" },
    });
    fireEvent.click(screen.getByTestId("ProjectCollaboratorForm-submit"));

    await waitFor(() => expect(axiosMock.history.post.length).toBe(1));
    expect(axiosMock.history.post[0].params).toEqual({
      projectId: 1,
      firstName: "Chris",
      lastName: "Gaucho",
      email: "cgaucho@ucsb.edu",
    });
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        "Collaborator successfully added.",
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByTestId("CollaboratorsTabComponent-post-modal"),
      ).not.toBeInTheDocument(),
    );
  });

  test("non-owner does not see the Add Collaborator button", async () => {
    renderTab({ isOwner: false });

    await waitFor(() => {
      expect(
        screen.getByTestId(
          "CollaboratorsTabComponent-ProjectCollaboratorTable-cell-row-0-col-id",
        ),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("CollaboratorsTabComponent-post-button"),
    ).not.toBeInTheDocument();
  });
});
