const subConceptsFixtures = {
  severalSubConcepts: [
    {
      id: 11,
      label: "Declaring variables",
      description: "Create a variable with a name and type.",
      example: 'String name = "Ada";',
      parentId: 1,
      parentLabel: "Variables",
      parentLevel: 1,
      parentX: 125,
      sortOrder: 1,
    },
    {
      id: 12,
      label: "Updating variables",
      description: "Assign a new value to an existing variable.",
      example: "count = count + 1;",
      parentId: 1,
      parentLabel: "Variables",
      parentLevel: 1,
      parentX: 125,
      sortOrder: 2,
    },
  ],
};

export default subConceptsFixtures;
