import { render, screen } from "@testing-library/react";
import AboutScaffold from "main/pages/Help/AboutScaffold";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

describe("AboutScaffold tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);
  axiosMock
    .onGet("/api/currentUser")
    .reply(200, apiCurrentUserFixtures.userOnly);
  axiosMock
    .onGet("/api/systemInfo")
    .reply(200, systemInfoFixtures.showingNeither);

  const queryClient = new QueryClient();
  test("renders expected content", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AboutScaffold />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "About Scaffold" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "What Scaffold is for" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Where did Scaffold come from",
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "PrairieLearn" })).toHaveAttribute(
      "href",
      "https://www.prairielearn.com/",
    );
    expect(
      screen.getByRole("link", {
        name: "https://github.com/ucsb-cs156/proj-scaffold",
      }),
    ).toHaveAttribute("href", "https://github.com/ucsb-cs156/proj-scaffold");
    expect(screen.getByRole("link", { name: "CMPSC 156" })).toHaveAttribute(
      "href",
      "https://ucsb-cs156.github.io",
    );
  });
});
