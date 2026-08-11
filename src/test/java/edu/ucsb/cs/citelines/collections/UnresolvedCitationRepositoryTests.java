package edu.ucsb.cs.citelines.collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.test.context.TestPropertySource;

/**
 * Verifies that the {@link UnresolvedCitation} document and {@link UnresolvedCitationRepository}
 * work correctly against an embedded, in-memory MongoDB instance.
 */
@DataMongoTest
@TestPropertySource(properties = "de.flapdoodle.mongodb.embedded.version=7.0.12")
class UnresolvedCitationRepositoryTests {

  @Autowired private UnresolvedCitationRepository unresolvedCitationRepository;

  @Test
  void saves_and_finds_unresolved_citations_by_project_id() {
    unresolvedCitationRepository.deleteAll();

    UnresolvedCitation forProject42 =
        UnresolvedCitation.builder()
            .projectId(42)
            .sourceCiteKey("smith2020")
            .direction("reference")
            .openAlexWorkId("https://openalex.org/W123")
            .reason("not_found_in_openalex")
            .discoveredAt(Instant.now())
            .build();
    UnresolvedCitation forProject99 =
        UnresolvedCitation.builder()
            .projectId(99)
            .sourceCiteKey("jones2019")
            .direction("citation")
            .reason("missing_title")
            .discoveredAt(Instant.now())
            .build();

    unresolvedCitationRepository.save(forProject42);
    unresolvedCitationRepository.save(forProject99);

    List<UnresolvedCitation> results = unresolvedCitationRepository.findByProjectId(42);
    assertEquals(1, results.size());
    assertEquals("smith2020", results.get(0).getSourceCiteKey());
    assertEquals("not_found_in_openalex", results.get(0).getReason());

    assertTrue(unresolvedCitationRepository.findByProjectId(12345).isEmpty());
  }
}
