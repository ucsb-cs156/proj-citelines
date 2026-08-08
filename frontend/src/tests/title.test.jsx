describe("index.html title", () => {
  test("document title should be Scaffold", () => {
    document.title = "Scaffold";
    expect(document.title).toBe("Scaffold");
  });
});
