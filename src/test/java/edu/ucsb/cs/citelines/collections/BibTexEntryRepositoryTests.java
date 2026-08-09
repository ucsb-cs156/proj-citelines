package edu.ucsb.cs.citelines.collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.test.context.TestPropertySource;

/**
 * Verifies that the {@link BibTexEntry} document and {@link BibTexEntryRepository} work correctly
 * against an embedded, in-memory MongoDB instance (the same kind used on localhost and in
 * integration/end-to-end tests).
 */
@DataMongoTest
@TestPropertySource(properties = "de.flapdoodle.mongodb.embedded.version=7.0.12")
class BibTexEntryRepositoryTests {

  @Autowired private BibTexEntryRepository bibTexEntryRepository;

  @Test
  void saves_and_finds_entries_by_project_id() {
    bibTexEntryRepository.deleteAll();

    BibTexEntry entryForProject42 =
        BibTexEntry.builder()
            .projectId(42)
            .entryType("article")
            .citeKey("smith2020")
            .keyValuePairs(Map.of("title", "A Great Paper", "year", "2020"))
            .build();
    BibTexEntry entryForProject99 =
        BibTexEntry.builder()
            .projectId(99)
            .entryType("book")
            .citeKey("jones2019")
            .keyValuePairs(Map.of("title", "A Different Book"))
            .build();

    bibTexEntryRepository.save(entryForProject42);
    bibTexEntryRepository.save(entryForProject99);

    List<BibTexEntry> resultsForProject42 = bibTexEntryRepository.findByProjectId(42);

    assertEquals(1, resultsForProject42.size());
    BibTexEntry saved = resultsForProject42.get(0);
    assertEquals(42, saved.getProjectId());
    assertEquals("article", saved.getEntryType());
    assertEquals("smith2020", saved.getCiteKey());
    assertEquals("A Great Paper", saved.getKeyValuePairs().get("title"));
    assertTrue(saved.getId() != null && !saved.getId().isEmpty());

    assertTrue(bibTexEntryRepository.findByProjectId(12345).isEmpty());
  }
}
