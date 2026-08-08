describe("index.html title", () => {
  test("document title should be Citelines", () => {
    document.title = "Citelines";
    expect(document.title).toBe("Citelines");
  });
});
