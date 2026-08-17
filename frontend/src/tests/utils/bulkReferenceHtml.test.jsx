import { extractBibliographySection } from "main/utils/bulkReferenceHtml";

describe("extractBibliographySection", () => {
  test("extracts just the bibliography section out of a full page", () => {
    const rawHtml = `
      <html>
        <head><title>Some ACM DL Page</title></head>
        <body>
          <nav>irrelevant navigation markup</nav>
          <section id="bibliography">
            <div class="biblioentry">entry one</div>
          </section>
          <footer>irrelevant footer markup</footer>
        </body>
      </html>
    `;

    const result = extractBibliographySection(rawHtml);

    expect(result).toContain("entry one");
    expect(result).not.toContain("irrelevant navigation markup");
    expect(result).not.toContain("irrelevant footer markup");
    expect(result.startsWith('<section id="bibliography">')).toBe(true);
  });

  test("extracts only the biblioentry divs from inside bibliography-collapsible-text, dropping everything else in the section, wrapped for the backend's section#bibliography selector", () => {
    const rawHtml = `
      <html>
        <body>
          <nav>irrelevant navigation markup</nav>
          <section id="bibliography">
            <div class="show-all-references-toggle">Show All References</div>
            <div class="bibliolist" id="bibliography-collapsible-text">
              <div class="loading-spinner">Loading...</div>
              <div class="biblioentry">entry one</div>
              <div class="biblioentry">entry two</div>
            </div>
          </section>
          <footer>irrelevant footer markup</footer>
        </body>
      </html>
    `;

    const result = extractBibliographySection(rawHtml);

    expect(result).toContain("entry one");
    expect(result).toContain("entry two");
    expect(result).toContain('id="bibliography"');
    expect(result).toContain(
      '<div class="biblioentry">entry one</div><div class="biblioentry">entry two</div>',
    );
    expect(result).not.toContain("bibliography-collapsible-text");
    expect(result).not.toContain("Loading...");
    expect(result).not.toContain("Show All References");
    expect(result).not.toContain("irrelevant navigation markup");
    expect(result).not.toContain("irrelevant footer markup");
    expect(result.startsWith('<section id="bibliography">')).toBe(true);
  });

  test("falls back to the whole collapsible-text div when it has no biblioentry children yet (e.g. still loading)", () => {
    const rawHtml = `
      <section id="bibliography">
        <div id="bibliography-collapsible-text">
          <div class="loading-spinner">Loading...</div>
        </div>
      </section>
    `;

    const result = extractBibliographySection(rawHtml);

    expect(result).toContain("Loading...");
    expect(result).toContain('id="bibliography"');
  });

  test("falls back to the original HTML when no bibliography section is present", () => {
    const rawHtml = "<div>no bibliography here</div>";

    expect(extractBibliographySection(rawHtml)).toBe(rawHtml);
  });

  test("falls back to the original (empty) HTML when given an empty string", () => {
    expect(extractBibliographySection("")).toBe("");
  });
});
