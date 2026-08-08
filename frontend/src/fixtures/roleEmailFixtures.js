const roleEmailFixtures = {
  oneItem: {
    email: "researcher1@example.com",
  },
  threeItems: [
    {
      email: "researcher1@example.com",
    },
    {
      email: "admin1@example.com",
    },
    {
      email: "researcher2@example.com",
    },
  ],
  threeItemsWithIsInAdminEmailField: [
    {
      email: "researcher1@example.com",
      isInAdminEmails: true,
    },
    {
      email: "admin1@example.com",
      isInAdminEmails: false,
    },
    {
      email: "researcher2@example.com",
      isInAdminEmails: false,
    },
  ],
};

export { roleEmailFixtures };
