package edu.ucsb.cs.citelines.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

public class BibTexEntryCoalescingServiceTests {

  private final BibTexEntryCoalescingService service = new BibTexEntryCoalescingService();

  @Test
  void throws_on_empty_list() {
    assertThrows(IllegalArgumentException.class, () -> service.coalesce(List.of()));
  }

  @Test
  void returns_the_single_entry_unchanged_when_there_is_only_one() {
    BibTexEntry entry =
        BibTexEntry.builder()
            .id("id1")
            .projectId(1)
            .citeKey("smith2020")
            .keyValuePairs(Map.of("title", "A Great Paper"))
            .build();

    assertSame(entry, service.coalesce(List.of(entry)));
  }

  @Test
  void keeps_the_first_entrys_id_projectId_citeKey_and_entryType() {
    BibTexEntry first =
        BibTexEntry.builder()
            .id("id1")
            .projectId(1)
            .entryType("article")
            .citeKey("smith2020")
            .keyValuePairs(Map.of())
            .build();
    BibTexEntry second =
        BibTexEntry.builder()
            .id("id2")
            .projectId(1)
            .entryType("inproceedings")
            .citeKey("smith2020")
            .keyValuePairs(Map.of())
            .build();

    BibTexEntry merged = service.coalesce(List.of(first, second));

    assertEquals("id1", merged.getId());
    assertEquals("article", merged.getEntryType());
    assertEquals("smith2020", merged.getCiteKey());
  }

  @Test
  void keeps_identical_field_values_without_conflict() {
    BibTexEntry first =
        BibTexEntry.builder().id("id1").keyValuePairs(Map.of("title", "A Great Paper")).build();
    BibTexEntry second =
        BibTexEntry.builder().id("id2").keyValuePairs(Map.of("title", "A Great Paper")).build();

    BibTexEntry merged = service.coalesce(List.of(first, second));

    assertEquals("A Great Paper", merged.getKeyValuePairs().get("title"));
  }

  @Test
  void fills_in_a_field_missing_from_one_entry() {
    BibTexEntry first = BibTexEntry.builder().id("id1").keyValuePairs(Map.of()).build();
    BibTexEntry second =
        BibTexEntry.builder().id("id2").keyValuePairs(Map.of("title", "A Great Paper")).build();

    BibTexEntry merged = service.coalesce(List.of(first, second));

    assertEquals("A Great Paper", merged.getKeyValuePairs().get("title"));
  }

  @Test
  void relevance_prefers_the_higher_ranked_value_regardless_of_order() {
    assertEquals("high", mergedRelevance("low", "high"));
    assertEquals("high", mergedRelevance("high", "low"));
    assertEquals("medium", mergedRelevance("medium", "none"));
    assertEquals("low", mergedRelevance("low", "unreviewed"));
    assertEquals("none", mergedRelevance("unreviewed", "none"));
  }

  @Test
  void relevance_prefers_a_recognized_value_over_an_unrecognized_one() {
    assertEquals("high", mergedRelevance("high", "made-up-value"));
    assertEquals("high", mergedRelevance("made-up-value", "high"));
  }

  private String mergedRelevance(String a, String b) {
    BibTexEntry first =
        BibTexEntry.builder().id("id1").keyValuePairs(Map.of("CITELINES_relevance", a)).build();
    BibTexEntry second =
        BibTexEntry.builder().id("id2").keyValuePairs(Map.of("CITELINES_relevance", b)).build();
    return service.coalesce(List.of(first, second)).getKeyValuePairs().get("CITELINES_relevance");
  }

  @Test
  void comments_are_concatenated_with_a_blank_line_between_them() {
    BibTexEntry first =
        BibTexEntry.builder()
            .id("id1")
            .keyValuePairs(Map.of("CITELINES_comments", "First note"))
            .build();
    BibTexEntry second =
        BibTexEntry.builder()
            .id("id2")
            .keyValuePairs(Map.of("CITELINES_comments", "Second note"))
            .build();

    BibTexEntry merged = service.coalesce(List.of(first, second));

    assertEquals("First note\n\nSecond note", merged.getKeyValuePairs().get("CITELINES_comments"));
  }

  @Test
  void draft_comments_are_concatenated_with_a_blank_line_between_them() {
    BibTexEntry first =
        BibTexEntry.builder()
            .id("id1")
            .keyValuePairs(Map.of("CITELINES_comments_draft", "First draft"))
            .build();
    BibTexEntry second =
        BibTexEntry.builder()
            .id("id2")
            .keyValuePairs(Map.of("CITELINES_comments_draft", "Second draft"))
            .build();

    BibTexEntry merged = service.coalesce(List.of(first, second));

    assertEquals(
        "First draft\n\nSecond draft", merged.getKeyValuePairs().get("CITELINES_comments_draft"));
  }

  @Test
  void position_and_other_unrecognized_fields_arbitrarily_keep_the_first_value_seen() {
    BibTexEntry first =
        BibTexEntry.builder().id("id1").keyValuePairs(Map.of("CITELINES_position", "3")).build();
    BibTexEntry second =
        BibTexEntry.builder().id("id2").keyValuePairs(Map.of("CITELINES_position", "7")).build();

    BibTexEntry merged = service.coalesce(List.of(first, second));

    assertEquals("3", merged.getKeyValuePairs().get("CITELINES_position"));
  }

  @Test
  void coalesces_more_than_two_duplicates_at_once() {
    BibTexEntry first =
        BibTexEntry.builder()
            .id("id1")
            .keyValuePairs(Map.of("CITELINES_relevance", "none"))
            .build();
    BibTexEntry second =
        BibTexEntry.builder()
            .id("id2")
            .keyValuePairs(Map.of("CITELINES_relevance", "medium"))
            .build();
    BibTexEntry third =
        BibTexEntry.builder().id("id3").keyValuePairs(Map.of("CITELINES_relevance", "low")).build();

    BibTexEntry merged = service.coalesce(List.of(first, second, third));

    assertEquals("medium", merged.getKeyValuePairs().get("CITELINES_relevance"));
  }
}
