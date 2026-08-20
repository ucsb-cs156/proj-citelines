import "bootstrap/dist/css/bootstrap.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { initialize, mswLoader } from "msw-storybook-addon";

// Initialize MSW
initialize();

export const loaders = [mswLoader];

const queryClient = new QueryClient();

const preview = {
  parameters: {
    layout: "fullscreen",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [
    // A story for a page that reads route params (useParams()) can't just nest a second
    // MemoryRouter with its own initialEntries — react-router throws on nested Routers. Instead
    // it sets `parameters: { reactRouter: { initialEntries: [...] } }` and this shared decorator
    // threads that through to the one MemoryRouter every story already renders inside.
    (Story, context) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={
            context.parameters.reactRouter?.initialEntries ?? ["/"]
          }
        >
          <Story />
        </MemoryRouter>
      </QueryClientProvider>
    ),
  ],
};

export default preview;
