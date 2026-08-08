const schoolFixtures = {
  ucsb: {
    alternateNames: [
      "UC Santa Barbara",
      "University of California, Santa Barbara",
      "SB",
    ],
    canvasImplementation: "https://ucsb.instructure.com/",
    displayName: "UCSB",
    key: "UCSB",
  },
  other: {
    alternateNames: ["Other"],
    canvasImplementation: "",
    displayName: "Other",
    key: "OTHER",
  },
};

const schoolList = [schoolFixtures.ucsb, schoolFixtures.other];

export { schoolFixtures, schoolList };
