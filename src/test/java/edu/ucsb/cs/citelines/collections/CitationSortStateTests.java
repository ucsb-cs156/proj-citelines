package edu.ucsb.cs.citelines.collections;

import static org.junit.jupiter.api.Assertions.assertEquals;

import edu.ucsb.cs.citelines.collections.CitationFilterState.Scope;
import org.junit.jupiter.api.Test;

public class CitationSortStateTests {

  @Test
  void makeId_for_project_scope_omits_entryId() {
    String id = CitationSortState.makeId(1, Scope.PROJECT, null, 42L);
    assertEquals("1:PROJECT::42", id);
  }

  @Test
  void makeId_for_references_scope_includes_entryId() {
    String id = CitationSortState.makeId(1, Scope.REFERENCES, "id-smith2020", 42L);
    assertEquals("1:REFERENCES:id-smith2020:42", id);
  }

  @Test
  void makeId_for_citations_scope_includes_entryId() {
    String id = CitationSortState.makeId(1, Scope.CITATIONS, "id-smith2020", 42L);
    assertEquals("1:CITATIONS:id-smith2020:42", id);
  }

  @Test
  void makeId_differs_across_projects_for_the_same_scope_and_entry() {
    String id1 = CitationSortState.makeId(1, Scope.REFERENCES, "id-smith2020", 42L);
    String id2 = CitationSortState.makeId(2, Scope.REFERENCES, "id-smith2020", 42L);
    assertEquals(false, id1.equals(id2));
  }

  @Test
  void makeId_differs_across_users_for_the_same_project_scope_and_entry() {
    String id1 = CitationSortState.makeId(1, Scope.REFERENCES, "id-smith2020", 42L);
    String id2 = CitationSortState.makeId(1, Scope.REFERENCES, "id-smith2020", 43L);
    assertEquals(false, id1.equals(id2));
  }
}
