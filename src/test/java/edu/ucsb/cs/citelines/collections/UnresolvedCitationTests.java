package edu.ucsb.cs.citelines.collections;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

public class UnresolvedCitationTests {

  @Test
  void makeId_uses_the_first_candidate_when_it_is_present() {
    String id =
        UnresolvedCitation.makeId(1, "smith2020", "reference", "missing_title", "10.1/A", "W1");
    assertEquals("1:smith2020:reference:missing_title:10.1/a", id);
  }

  @Test
  void makeId_skips_a_null_candidate_and_uses_the_next_one() {
    String id =
        UnresolvedCitation.makeId(
            1, "smith2020", "reference", "not_found_by_any_resolver", null, "W2");
    assertEquals("1:smith2020:reference:not_found_by_any_resolver:w2", id);
  }

  @Test
  void makeId_skips_a_blank_candidate_and_uses_the_next_one() {
    String id =
        UnresolvedCitation.makeId(1, "smith2020", "reference", "missing_title", "   ", "W3");
    assertEquals("1:smith2020:reference:missing_title:w3", id);
  }

  @Test
  void makeId_falls_back_to_unknown_when_every_candidate_is_null_or_blank() {
    String id = UnresolvedCitation.makeId(1, "smith2020", "reference", "missing_title", null, "  ");
    assertEquals("1:smith2020:reference:missing_title:unknown", id);
  }

  @Test
  void makeId_falls_back_to_unknown_when_no_candidates_are_given_at_all() {
    String id = UnresolvedCitation.makeId(1, "smith2020", "reference", "missing_title");
    assertEquals("1:smith2020:reference:missing_title:unknown", id);
  }
}
