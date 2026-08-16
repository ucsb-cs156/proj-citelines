package edu.ucsb.cs.citelines.collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.test.context.TestPropertySource;

/**
 * Verifies that the {@link CitationEdge} document and {@link CitationEdgeRepository} work correctly
 * against an embedded, in-memory MongoDB instance.
 */
@DataMongoTest
@TestPropertySource(properties = "de.flapdoodle.mongodb.embedded.version=7.0.12")
class CitationEdgeRepositoryTests {

  @Autowired private CitationEdgeRepository citationEdgeRepository;

  @Test
  void saves_and_finds_edges_by_citing_and_cited_entry_id() {
    citationEdgeRepository.deleteAll();

    CitationEdge edge =
        CitationEdge.builder()
            .id(CitationEdge.makeId(42, "id-smith2020", "id-jones2019"))
            .projectId(42)
            .citingEntryId("id-smith2020")
            .citedEntryId("id-jones2019")
            .build();
    citationEdgeRepository.save(edge);

    List<CitationEdge> byCiting =
        citationEdgeRepository.findByProjectIdAndCitingEntryId(42, "id-smith2020");
    assertEquals(1, byCiting.size());
    assertEquals("id-jones2019", byCiting.get(0).getCitedEntryId());
    assertEquals("42:id-smith2020:id-jones2019", byCiting.get(0).getId());

    List<CitationEdge> byCited =
        citationEdgeRepository.findByProjectIdAndCitedEntryId(42, "id-jones2019");
    assertEquals(1, byCited.size());
    assertEquals("id-smith2020", byCited.get(0).getCitingEntryId());

    assertTrue(
        citationEdgeRepository.findByProjectIdAndCitingEntryId(99, "id-smith2020").isEmpty());
  }

  @Test
  void saving_the_same_edge_twice_does_not_duplicate_it() {
    citationEdgeRepository.deleteAll();

    CitationEdge edge =
        CitationEdge.builder()
            .id(CitationEdge.makeId(42, "id-smith2020", "id-jones2019"))
            .projectId(42)
            .citingEntryId("id-smith2020")
            .citedEntryId("id-jones2019")
            .build();
    citationEdgeRepository.save(edge);
    citationEdgeRepository.save(edge);

    assertEquals(
        1, citationEdgeRepository.findByProjectIdAndCitingEntryId(42, "id-smith2020").size());
  }
}
