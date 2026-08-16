package edu.ucsb.cs.citelines.web;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

import edu.ucsb.cs.citelines.WebTestCase;
import edu.ucsb.cs.citelines.testconfig.IntegrationConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.parallel.ResourceLock;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringExtension;

/**
 * Verifies the BibTexEntryShowPage end to end: navigating to it from the Citations tab, its raw
 * (non-editable) BibTeX display, the Get References/Get Citations buttons and their tooltips, that
 * launching a job shows up on the project's Jobs tab, and the page's four independently collapsible
 * cards (BibTex Entry, Comments, References, Citations — see issue #38).
 *
 * <p>The pasted entry deliberately has no DOI, so the launched job fails immediately with a clear,
 * local error (no live network call to OpenAlex) — keeping this test fast and hermetic, matching
 * the project's "no live network calls in automated tests" convention (see
 * docs/design/OpenAlex-MVP-to-full-tiered-fallback-engine.md). The OpenAlex integration itself is
 * covered by OpenAlexServiceTests/CitationGraphServiceTests and was additionally smoke-tested
 * against the live API by hand while building this feature.
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
public class BibTexEntryShowPageWebIT extends WebTestCase {

  @Test
  public void researcher_can_view_an_entry_and_launch_a_get_references_job() throws Exception {
    setupResearcherUser();
    assertThat(page.getByText("Your Projects")).isVisible();

    page.getByText("Create Project").click();
    page.locator("#name").fill("Citation Graphs");
    page.locator("#description").fill("A project about citation graphs");
    page.getByTestId("ProjectModal-submit").click();

    page.getByTestId("OwnerProjectTable-cell-row-0-col-name-link").click();
    page.getByText("Citations").click();
    page.getByTestId("ResearcherProjectShowPage-Citations-post-button").click();
    page.getByTestId("BibTexEntryModal-bibtex")
        .fill(
            "@article{smith2020,\n"
                + "  author = {Jane Smith},\n"
                + "  title = {A Study With No DOI}\n"
                + "}\n");
    page.getByTestId("BibTexEntryModal-submit").click();

    page.getByTestId(
            "ResearcherProjectShowPage-Citations-CitationTable-cell-row-0-col-citeKey-link")
        .click();

    assertThat(page.getByTestId("BibTexEntryShowPage-title")).containsText("smith2020");
    assertThat(page.getByTestId("BibTexEntryShowPage-bibtex")).containsText("A Study With No DOI");
    assertThat(page.getByTestId("BibTexEntryShowPage-references-heading"))
        .containsText("References (0)");
    assertThat(page.getByTestId("BibTexEntryShowPage-citations-heading"))
        .containsText("Citations (0)");

    // The Formatted Reference card, added above the BibTex Entry card, shows a rendered citation
    // in the project's chosen citation format (defaulting to ACM for a newly created project).
    assertThat(page.getByTestId("BibTexEntryShowPage-formatted-citation-label"))
        .containsText("Formatted Citation (ACM)");
    assertThat(page.getByTestId("BibTexEntryShowPage-formatted-citation")).containsText("Smith");

    // The BibTex Entry card starts open, and the other three (independently collapsible, not a
    // single-open-at-a-time accordion) cards start closed.
    assertThat(page.getByTestId("BibTexEntryShowPage-BibtexCard-body")).isVisible();
    assertThat(page.getByTestId("BibTexEntryShowPage-CommentsCard-body")).isHidden();
    assertThat(page.getByTestId("BibTexEntryShowPage-ReferencesCard-body")).isHidden();
    assertThat(page.getByTestId("BibTexEntryShowPage-CitationsCard-body")).isHidden();

    // Opening the Comments card reveals a working BibtexEntryComments instance, and leaves the
    // (still open) BibTex Entry card untouched.
    page.getByTestId("BibTexEntryShowPage-CommentsCard-header").click();
    assertThat(page.getByTestId("BibTexEntryShowPage-CommentsCard-body")).isVisible();
    assertThat(page.getByTestId("BibTexEntryShowPage-BibTexEntryComments-base")).isVisible();
    assertThat(page.getByTestId("BibTexEntryShowPage-BibtexCard-body")).isVisible();

    page.getByTestId("BibTexEntryShowPage-go-to-project-button").click();
    assertThat(page.getByTestId("ResearcherProjectShowPage-title")).isVisible();
    page.goBack();
    assertThat(page.getByTestId("BibTexEntryShowPage-title")).containsText("smith2020");

    page.getByTestId("BibTexEntryShowPage-get-references-button").hover();
    assertThat(page.getByText("Get all papers that this paper cites")).isVisible();
    page.getByTestId("BibTexEntryShowPage-get-citations-button").hover();
    assertThat(page.getByText("Get all papers that cite this paper")).isVisible();

    page.getByTestId("BibTexEntryShowPage-get-references-button").click();

    // Give the job (a synchronous, network-free failure — no DOI on the entry) time to run to
    // completion on lib-jobs' single-threaded executor, then reload rather than clicking the
    // Jobs tab's Refresh button: react-toastify's stacked toasts from the actions above can
    // overlap it just long enough to make a real click flaky.
    page.waitForTimeout(2000);
    page.goBack();
    assertThat(page.getByTestId("ResearcherProjectShowPage-title")).isVisible();
    page.reload();
    page.getByText("Jobs").click();

    assertThat(page.getByTestId("JobsTable-cell-row-0-col-jobName"))
        .containsText("GetReferencesJob");
    assertThat(page.getByTestId("JobsTable-cell-row-0-col-status")).containsText("error");
    assertThat(page.getByTestId("JobsTable-cell-row-0-col-log-div")).containsText("has no DOI");
  }
}
