import type { ApiCurrentUser, CurrentUser } from "main/utils/currentUser";

export const apiCurrentUserFixtures = {
  userOnly: {
    user: { email: "cgaucho@ucsb.edu", givenName: "Gaucho" },
    roles: [{ authority: "ROLE_USER" }],
  },
  adminUser: {
    user: { email: "admin@ucsb.edu", givenName: "Admin" },
    roles: [
      { authority: "ROLE_USER" },
      { authority: "ROLE_ADMIN" },
      { authority: "ROLE_RESEARCHER" },
    ],
  },
  researcherUser: {
    user: { email: "diba@ucsb.edu", givenName: "Diba" },
    roles: [{ authority: "ROLE_USER" }, { authority: "ROLE_RESEARCHER" }],
  },
} satisfies Record<string, ApiCurrentUser>;

export const currentUserFixtures = {
  notLoggedIn: { loggedIn: false as const, root: null },
  userOnly: {
    loggedIn: true as const,
    root: {
      ...apiCurrentUserFixtures.userOnly,
      rolesList: ["ROLE_USER"],
    },
  },
  adminUser: {
    loggedIn: true as const,
    root: {
      ...apiCurrentUserFixtures.adminUser,
      rolesList: ["ROLE_USER", "ROLE_ADMIN", "ROLE_RESEARCHER"],
    },
  },
  researcherUser: {
    loggedIn: true as const,
    root: {
      ...apiCurrentUserFixtures.researcherUser,
      rolesList: ["ROLE_USER", "ROLE_RESEARCHER"],
    },
  },
} satisfies Record<string, CurrentUser>;
