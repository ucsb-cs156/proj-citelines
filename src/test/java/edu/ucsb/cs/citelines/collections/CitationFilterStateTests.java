package edu.ucsb.cs.citelines.collections;

import static org.junit.jupiter.api.Assertions.assertEquals;

import edu.ucsb.cs.citelines.collections.CitationFilterState.Scope;
import org.junit.jupiter.api.Test;

public class CitationFilterStateTests {

  @Test
  void makeId_for_project_scope_omits_entryId() {
    String id = CitationFilterState.makeId(1, Scope.PROJECT, null);
    assertEquals("1:PROJECT:", id);
  }

  @Test
  void makeId_for_references_scope_includes_entryId() {
    String id = CitationFilterState.makeId(1, Scope.REFERENCES, "id-smith2020");
    assertEquals("1:REFERENCES:id-smith2020", id);
  }

  @Test
  void makeId_for_citations_scope_includes_entryId() {
    String id = CitationFilterState.makeId(1, Scope.CITATIONS, "id-smith2020");
    assertEquals("1:CITATIONS:id-smith2020", id);
  }

  @Test
  void makeId_differs_across_projects_for_the_same_scope_and_entry() {
    String id1 = CitationFilterState.makeId(1, Scope.REFERENCES, "id-smith2020");
    String id2 = CitationFilterState.makeId(2, Scope.REFERENCES, "id-smith2020");
    assertEquals(false, id1.equals(id2));
  }
}
