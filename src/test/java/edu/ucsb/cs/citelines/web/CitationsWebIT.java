package edu.ucsb.cs.citelines.web;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import edu.ucsb.cs.citelines.WebTestCase;
import edu.ucsb.cs.citelines.testconfig.IntegrationConfig;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.parallel.ResourceLock;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringExtension;

/**
 * Verifies the Citations tab end to end: pasting a BibTeX entry, seeing it in the table, editing
 * it, and deleting it.
 *
 * <p>Prerequisites: the frontend must be built ({@code npm run build} inside {@code frontend/}) so
 * that {@code target/classes/public/index.html} exists. Run with:
 *
 * <pre>
 * INTEGRATION=true mvn -ntp -B test-compile failsafe:integration-test failsafe:verify
 * </pre>
 */
@ExtendWith(SpringExtension.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@ActiveProfiles("integration")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
@ResourceLock("port-8080")
@Import(IntegrationConfig.class)
public class CitationsWebIT extends WebTestCase {

  @Test
  public void researcher_can_paste_edit_and_delete_a_citation() throws Exception {
    setupResearcherUser();
    assertThat(page.getByText("Your Projects")).isVisible();

    page.getByText("Create Project").click();
    page.locator("#name").fill("Citation Graphs");
    page.locator("#description").fill("A project about citation graphs");
    page.getByTestId("ProjectModal-submit").click();

    page.getByTestId("OwnerProjectTable-cell-row-0-col-name-link").click();
    assertThat(page.getByText("Citations")).isVisible();
    page.getByText("Citations").click();

    page.getByTestId("ResearcherProjectShowPage-Citations-post-button").click();
    page.getByTestId("BibTexEntryModal-bibtex")
        .fill(
            "@article{smith2020,\n"
                + "  author = {Jane Smith},\n"
                + "  title = {A Study of Citation Graphs},\n"
                + "  doi = {10.1038/s41586-020-2649-2}\n"
                + "}\n");
    page.getByTestId("BibTexEntryModal-submit").click();

    assertThat(
            page.getByTestId(
                "ResearcherProjectShowPage-Citations-CitationTable-cell-row-0-col-citeKey-link"))
        .containsText("smith202...");
    assertThat(
            page.getByTestId(
                "ResearcherProjectShowPage-Citations-CitationTable-cell-row-0-col-doi-link"))
        .hasAttribute("href", "https://doi.org/10.1038/s41586-020-2649-2");

    page.getByTestId("ResearcherProjectShowPage-Citations-CitationTable-cell-row-0-col-edit-button")
        .click();
    assertThat(page.getByTestId("BibTexEntryModal-bibtex")).hasValue(Pattern.compile("smith2020"));
    page.getByTestId("BibTexEntryModal-bibtex")
        .fill(
            "@article{smith2020,\n"
                + "  author = {Jane Smith},\n"
                + "  title = {A Revised Study of Citation Graphs},\n"
                + "  doi = {10.1038/s41586-020-2649-2}\n"
                + "}\n");
    page.getByTestId("BibTexEntryModal-submit").click();

    assertThat(
            page.getByTestId(
                "ResearcherProjectShowPage-Citations-CitationTable-cell-row-0-col-title"))
        .containsText("A Revised Study of C...");

    page.getByTestId(
            "ResearcherProjectShowPage-Citations-CitationTable-cell-row-0-col-delete-button")
        .click();
    page.getByTestId(
            "ResearcherProjectShowPage-Citations-CitationTable-delete-modal-confirm-button")
        .click();

    assertThat(
            page.getByTestId(
                "ResearcherProjectShowPage-Citations-CitationTable-cell-row-0-col-citeKey"))
        .not()
        .isVisible();
  }
}
