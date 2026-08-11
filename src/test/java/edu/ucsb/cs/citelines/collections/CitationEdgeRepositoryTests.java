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
  void saves_and_finds_edges_by_citing_and_cited_cite_key() {
    citationEdgeRepository.deleteAll();

    CitationEdge edge =
        CitationEdge.builder()
            .id(CitationEdge.makeId(42, "smith2020", "jones2019"))
            .projectId(42)
            .citingCiteKey("smith2020")
            .citedCiteKey("jones2019")
            .build();
    citationEdgeRepository.save(edge);

    List<CitationEdge> byCiting =
        citationEdgeRepository.findByProjectIdAndCitingCiteKey(42, "smith2020");
    assertEquals(1, byCiting.size());
    assertEquals("jones2019", byCiting.get(0).getCitedCiteKey());
    assertEquals("42:smith2020:jones2019", byCiting.get(0).getId());

    List<CitationEdge> byCited =
        citationEdgeRepository.findByProjectIdAndCitedCiteKey(42, "jones2019");
    assertEquals(1, byCited.size());
    assertEquals("smith2020", byCited.get(0).getCitingCiteKey());

    assertTrue(citationEdgeRepository.findByProjectIdAndCitingCiteKey(99, "smith2020").isEmpty());
  }

  @Test
  void saving_the_same_edge_twice_does_not_duplicate_it() {
    citationEdgeRepository.deleteAll();

    CitationEdge edge =
        CitationEdge.builder()
            .id(CitationEdge.makeId(42, "smith2020", "jones2019"))
            .projectId(42)
            .citingCiteKey("smith2020")
            .citedCiteKey("jones2019")
            .build();
    citationEdgeRepository.save(edge);
    citationEdgeRepository.save(edge);

    assertEquals(1, citationEdgeRepository.findByProjectIdAndCitingCiteKey(42, "smith2020").size());
  }
}
