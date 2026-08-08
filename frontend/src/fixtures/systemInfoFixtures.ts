import type { SystemInfo } from "main/utils/systemInfo";

export const systemInfoFixtures = {
  showingNeither: {
    springH2ConsoleEnabled: false,
    showSwaggerUILink: false,
    oauthLogin: "/oauth2/authorization/google",
    sourceRepo: "https://github.com/ucsb-cs156/proj-scaffold",
  },
  showingBoth: {
    springH2ConsoleEnabled: true,
    showSwaggerUILink: true,
    oauthLogin: "/oauth2/authorization/google",
    sourceRepo: "https://github.com/ucsb-cs156/proj-scaffold",
  },
} satisfies Record<string, SystemInfo>;
