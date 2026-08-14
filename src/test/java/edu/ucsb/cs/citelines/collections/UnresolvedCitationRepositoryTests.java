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
            .id(
                UnresolvedCitation.makeId(
                    42, "smith2020", "reference", "not_found_by_any_resolver", "W123"))
            .projectId(42)
            .sourceCiteKey("smith2020")
            .direction("reference")
            .resolverName("OpenAlex")
            .resolverWorkId("https://openalex.org/W123")
            .reason("not_found_by_any_resolver")
            .discoveredAt(Instant.now())
            .build();
    UnresolvedCitation forProject99 =
        UnresolvedCitation.builder()
            .id(UnresolvedCitation.makeId(99, "jones2019", "citation", "missing_title", "W456"))
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
    assertEquals("not_found_by_any_resolver", results.get(0).getReason());
    assertEquals("OpenAlex", results.get(0).getResolverName());

    assertTrue(unresolvedCitationRepository.findByProjectId(12345).isEmpty());
  }

  @Test
  void saving_the_same_gap_twice_overwrites_rather_than_duplicates_it() {
    unresolvedCitationRepository.deleteAll();

    UnresolvedCitation first =
        UnresolvedCitation.builder()
            .id(UnresolvedCitation.makeId(42, "smith2020", "reference", "missing_title", "W123"))
            .projectId(42)
            .sourceCiteKey("smith2020")
            .direction("reference")
            .resolverWorkId("W123")
            .reason("missing_title")
            .discoveredAt(Instant.now())
            .build();
    UnresolvedCitation repeatRun =
        UnresolvedCitation.builder()
            .id(UnresolvedCitation.makeId(42, "smith2020", "reference", "missing_title", "W123"))
            .projectId(42)
            .sourceCiteKey("smith2020")
            .direction("reference")
            .resolverWorkId("W123")
            .reason("missing_title")
            .discoveredAt(Instant.now())
            .build();

    unresolvedCitationRepository.save(first);
    unresolvedCitationRepository.save(repeatRun);

    assertEquals(1, unresolvedCitationRepository.findByProjectId(42).size());
  }

  @Test
  void finds_unresolved_citations_by_project_id_and_source_cite_key() {
    unresolvedCitationRepository.deleteAll();

    UnresolvedCitation forSmith =
        UnresolvedCitation.builder()
            .id(UnresolvedCitation.makeId(42, "smith2020", "reference", "missing_title", "W1"))
            .projectId(42)
            .sourceCiteKey("smith2020")
            .direction("reference")
            .resolverWorkId("W1")
            .reason("missing_title")
            .discoveredAt(Instant.now())
            .build();
    UnresolvedCitation forJones =
        UnresolvedCitation.builder()
            .id(UnresolvedCitation.makeId(42, "jones2019", "reference", "missing_title", "W2"))
            .projectId(42)
            .sourceCiteKey("jones2019")
            .direction("reference")
            .resolverWorkId("W2")
            .reason("missing_title")
            .discoveredAt(Instant.now())
            .build();
    unresolvedCitationRepository.save(forSmith);
    unresolvedCitationRepository.save(forJones);

    List<UnresolvedCitation> results =
        unresolvedCitationRepository.findByProjectIdAndSourceCiteKey(42, "smith2020");

    assertEquals(1, results.size());
    assertEquals("smith2020", results.get(0).getSourceCiteKey());
  }
}
