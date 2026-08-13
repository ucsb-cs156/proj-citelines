package edu.ucsb.cs.citelines.collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.Optional;
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

  @Test
  void finds_an_entry_by_project_id_and_cite_key() {
    bibTexEntryRepository.deleteAll();

    BibTexEntry entry =
        BibTexEntry.builder()
            .projectId(42)
            .entryType("article")
            .citeKey("smith2020")
            .keyValuePairs(Map.of("title", "A Great Paper"))
            .build();
    bibTexEntryRepository.save(entry);

    Optional<BibTexEntry> found = bibTexEntryRepository.findByProjectIdAndCiteKey(42, "smith2020");
    assertTrue(found.isPresent());
    assertEquals("A Great Paper", found.get().getKeyValuePairs().get("title"));

    assertFalse(bibTexEntryRepository.findByProjectIdAndCiteKey(42, "nonexistent").isPresent());
    assertFalse(bibTexEntryRepository.findByProjectIdAndCiteKey(99, "smith2020").isPresent());
  }

  @Test
  void finds_all_entries_by_project_id_and_cite_key() {
    bibTexEntryRepository.deleteAll();

    BibTexEntry entry1 =
        BibTexEntry.builder()
            .projectId(42)
            .entryType("article")
            .citeKey("smith2020")
            .keyValuePairs(Map.of("title", "A Great Paper"))
            .build();
    BibTexEntry entry2 =
        BibTexEntry.builder()
            .projectId(42)
            .entryType("article")
            .citeKey("smith2020")
            .keyValuePairs(Map.of("title", "A Duplicate Paper"))
            .build();
    bibTexEntryRepository.save(entry1);
    bibTexEntryRepository.save(entry2);

    List<BibTexEntry> found = bibTexEntryRepository.findAllByProjectIdAndCiteKey(42, "smith2020");
    assertEquals(2, found.size());

    assertTrue(bibTexEntryRepository.findAllByProjectIdAndCiteKey(42, "nonexistent").isEmpty());
    assertTrue(bibTexEntryRepository.findAllByProjectIdAndCiteKey(99, "smith2020").isEmpty());
  }
}
