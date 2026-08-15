package edu.ucsb.cs.citelines.controller;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.collections.CitationEdge;
import edu.ucsb.cs.citelines.collections.CitationEdgeRepository;
import edu.ucsb.cs.citelines.errors.EntityNotFoundException;
import edu.ucsb.cs.citelines.services.BibTexConverterService;
import edu.ucsb.cs.citelines.services.BibTexEntryCoalescingService;
import edu.ucsb.cs.citelines.services.DoiToBibTexService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * CRUD endpoints for BibTeX citation entries, stored in MongoDB and scoped to a Project. All
 * operations are available to a project's owner and its collaborators alike (matching how they
 * jointly manage other project content) — only managing the collaborator list itself is owner-only
 * (see ProjectCollaboratorsController).
 */
@Tag(name = "BibTexEntries")
@RequestMapping("/api/bibtexentries")
@RestController
@Slf4j
public class BibTexEntriesController extends ApiController {

  @Autowired private BibTexEntryRepository bibTexEntryRepository;

  @Autowired private BibTexConverterService bibTexConverterService;

  @Autowired private CitationEdgeRepository citationEdgeRepository;

  @Autowired private BibTexEntryCoalescingService bibTexEntryCoalescingService;

  @Autowired private DoiToBibTexService doiToBibTexService;

  /**
   * Parses pasted BibTeX text (which may contain more than one entry) and saves the resulting
   * entries. An entry whose citeKey already exists for this project updates that entry rather than
   * creating a duplicate (see {@link #reuseExistingIdIfPresent}).
   *
   * <p>If {@code relatedCiteKey} and {@code relationship} are both provided, a {@link CitationEdge}
   * is also recorded between {@code relatedCiteKey} and each newly saved entry, so that a citation
   * the external APIs failed to find can be entered manually from the BibTexEntryShowPage (see
   * issue #24). When {@code relationship} is {@code "reference"} the related entry is treated as
   * citing the new entries; when it is {@code "citation"} the new entries are treated as citing the
   * related entry.
   *
   * @param projectId the project the entries belong to
   * @param relatedCiteKey the citeKey of the entry to link the new entries to, if any
   * @param relationship {@code "reference"} or {@code "citation"}, if linking to a related entry
   * @param rawBibTex the pasted BibTeX text
   * @return the saved entries
   */
  @Operation(summary = "Parse and save one or more BibTeX entries pasted for a project")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @PostMapping("/post")
  public List<BibTexEntry> postBibTexEntries(
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @Parameter(name = "relatedCiteKey") @RequestParam(required = false) String relatedCiteKey,
      @Parameter(name = "relationship") @RequestParam(required = false) String relationship,
      @RequestBody String rawBibTex) {
    if (relatedCiteKey != null
        && relationship != null
        && !"reference".equals(relationship)
        && !"citation".equals(relationship)) {
      throw new IllegalArgumentException(
          "relationship must be 'reference' or 'citation', but was: " + relationship);
    }

    List<BibTexEntry> entries =
        bibTexConverterService.parseToEntries(rawBibTex, projectId.intValue());
    entries.forEach(entry -> reuseExistingIdIfPresent(projectId.intValue(), entry));
    List<BibTexEntry> saved = bibTexEntryRepository.saveAll(entries);

    if (relatedCiteKey != null && relationship != null) {
      for (BibTexEntry entry : saved) {
        citationEdgeRepository.save(
            makeCitationEdge(projectId.intValue(), relatedCiteKey, relationship, entry));
      }
    }

    return saved;
  }

  /**
   * Resolves a DOI to a BibTeX entry (via {@link DoiToBibTexService}) and saves it, exactly as
   * {@link #postBibTexEntries} would for the equivalent pasted BibTeX text — see issue #63.
   *
   * @param projectId the project the entry belongs to
   * @param relatedCiteKey the citeKey of the entry to link the new entry to, if any
   * @param relationship {@code "reference"} or {@code "citation"}, if linking to a related entry
   * @param relevance the CITELINES_relevance value to attach to the new entry, if any
   * @param rawDoi the DOI to resolve
   * @return the saved entry, as a single-element list (matching {@link #postBibTexEntries}'s
   *     shape)
   */
  @Operation(summary = "Resolve a DOI to a BibTeX entry and save it")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @PostMapping("/postByDoi")
  public List<BibTexEntry> postBibTexEntryByDoi(
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @Parameter(name = "relatedCiteKey") @RequestParam(required = false) String relatedCiteKey,
      @Parameter(name = "relationship") @RequestParam(required = false) String relationship,
      @Parameter(name = "relevance") @RequestParam(required = false) String relevance,
      @RequestBody String rawDoi) {
    String rawBibTex = doiToBibTexService.resolveToBibTex(rawDoi, projectId.intValue(), relevance);
    return postBibTexEntries(projectId, relatedCiteKey, relationship, rawBibTex);
  }

  // A pasted entry may share a citeKey with one already stored for this project (e.g. a paper
  // already recorded via the "Get References"/"Get Citations" jobs, or re-pasted by mistake).
  // Reusing the existing id makes save() overwrite that entry instead of inserting a duplicate,
  // which would otherwise break the assumption (relied on throughout, e.g. by
  // CitationEdgesController) that a project has at most one entry per citeKey.
  //
  // If more than one entry is already stored for that citeKey (e.g. duplicates created before
  // this de-duplication existed), they are coalesced into a single entry first (via
  // BibTexEntryCoalescingService) so that assumption holds going forward.
  private void reuseExistingIdIfPresent(int projectId, BibTexEntry entry) {
    List<BibTexEntry> existing =
        bibTexEntryRepository.findAllByProjectIdAndCiteKey(projectId, entry.getCiteKey());
    if (existing.isEmpty()) {
      return;
    }
    BibTexEntry coalesced = bibTexEntryCoalescingService.coalesce(existing);
    if (existing.size() > 1) {
      List<BibTexEntry> duplicates = existing.stream().filter(e -> e != coalesced).toList();
      bibTexEntryRepository.deleteAll(duplicates);
    }
    entry.setId(coalesced.getId());
  }

  private static CitationEdge makeCitationEdge(
      int projectId, String relatedCiteKey, String relationship, BibTexEntry entry) {
    boolean isReference = "reference".equals(relationship);
    String citingCiteKey = isReference ? relatedCiteKey : entry.getCiteKey();
    String citedCiteKey = isReference ? entry.getCiteKey() : relatedCiteKey;
    return CitationEdge.builder()
        .id(CitationEdge.makeId(projectId, citingCiteKey, citedCiteKey))
        .projectId(projectId)
        .citingCiteKey(citingCiteKey)
        .citedCiteKey(citedCiteKey)
        .build();
  }

  /**
   * Lists the BibTeX entries associated with a project.
   *
   * @param projectId the project to list entries for
   * @return the entries for that project
   */
  @Operation(summary = "List all BibTeX entries for a project")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @GetMapping("/project")
  public List<BibTexEntry> bibTexEntriesForProject(
      @Parameter(name = "projectId") @RequestParam Long projectId) {
    return bibTexEntryRepository.findByProjectId(projectId.intValue());
  }

  /**
   * Looks up a single BibTeX entry by its (Mongo) id, e.g. for the BibTexEntryShowPage.
   *
   * <p>Looked up by id rather than citeKey since a citeKey may itself contain a {@code /} (e.g. a
   * DOI-derived key like {@code 10.1145/3770762.3772609}), which breaks when used as a path segment
   * in the frontend's route — see issue #24.
   *
   * @param projectId the project the entry belongs to
   * @param id the id of the entry
   * @return the entry
   */
  @Operation(summary = "Get a single BibTeX entry by id")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @GetMapping("/entry")
  public BibTexEntry bibTexEntryById(
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @Parameter(name = "id") @RequestParam String id) {
    return bibTexEntryRepository
        .findById(id)
        .orElseThrow(() -> new EntityNotFoundException(BibTexEntry.class, id));
  }

  /**
   * Converts a stored entry back into raw BibTeX text, e.g. to pre-fill an edit form.
   *
   * @param id the id of the entry to export
   * @param projectId the project the entry belongs to
   * @return the entry, formatted as BibTeX text
   */
  @Operation(summary = "Export a BibTeX entry back to BibTeX text, for editing")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @GetMapping("/export")
  public ResponseEntity<String> exportBibTexEntry(
      @Parameter(name = "id") @RequestParam String id,
      @Parameter(name = "projectId") @RequestParam Long projectId)
      throws IOException {
    BibTexEntry entry =
        bibTexEntryRepository
            .findById(id)
            .orElseThrow(() -> new EntityNotFoundException(BibTexEntry.class, id));
    String bibtex = bibTexConverterService.convertEntryToBibTexString(entry);
    return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(bibtex);
  }

  /**
   * Re-parses edited BibTeX text (which must contain exactly one entry) and replaces the stored
   * entry with the same id.
   *
   * @param id the id of the entry to update
   * @param projectId the project the entry belongs to
   * @param rawBibTex the edited BibTeX text
   * @return the updated entry
   */
  @Operation(summary = "Update a BibTeX entry from edited BibTeX text")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @PutMapping("")
  public BibTexEntry updateBibTexEntry(
      @Parameter(name = "id") @RequestParam String id,
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @RequestBody String rawBibTex) {
    BibTexEntry existing =
        bibTexEntryRepository
            .findById(id)
            .orElseThrow(() -> new EntityNotFoundException(BibTexEntry.class, id));

    List<BibTexEntry> parsed =
        bibTexConverterService.parseToEntries(rawBibTex, projectId.intValue());
    if (parsed.size() != 1) {
      throw new IllegalArgumentException(
          "Please provide exactly one BibTeX entry when editing (found %d)."
              .formatted(parsed.size()));
    }

    BibTexEntry updated = parsed.get(0);
    existing.setEntryType(updated.getEntryType());
    existing.setCiteKey(updated.getCiteKey());
    existing.setKeyValuePairs(updated.getKeyValuePairs());

    return bibTexEntryRepository.save(existing);
  }

  /**
   * Upserts the draft comments (CITELINES_comments_draft) for a BibTeX entry, leaving the published
   * comments (CITELINES_comments) untouched. Used by the BibTexEntryComments component's autosave
   * heartbeat and by the initial transition into edit mode (which seeds the draft from the current
   * published comments, if any).
   *
   * @param id the id of the entry to update
   * @param projectId the project the entry belongs to
   * @param draft the new draft comments text, as Markdown
   * @return the updated entry
   */
  @Operation(summary = "Upsert an entry's draft comments")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @PutMapping("/comments/draft")
  public BibTexEntry upsertCommentsDraft(
      @Parameter(name = "id") @RequestParam String id,
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @RequestBody String draft) {
    BibTexEntry entry = findEntryOrThrow(id);
    Map<String, String> keyValuePairs = mutableKeyValuePairs(entry);
    keyValuePairs.put("CITELINES_comments_draft", draft);
    entry.setKeyValuePairs(keyValuePairs);
    return bibTexEntryRepository.save(entry);
  }

  /**
   * Promotes an entry's draft comments to be its published comments: copies
   * CITELINES_comments_draft into CITELINES_comments, then removes the draft field.
   *
   * @param id the id of the entry to update
   * @param projectId the project the entry belongs to
   * @return the updated entry
   */
  @Operation(summary = "Save an entry's draft comments as its published comments")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @PostMapping("/comments/save")
  public BibTexEntry saveCommentsDraft(
      @Parameter(name = "id") @RequestParam String id,
      @Parameter(name = "projectId") @RequestParam Long projectId) {
    BibTexEntry entry = findEntryOrThrow(id);
    Map<String, String> keyValuePairs = mutableKeyValuePairs(entry);
    String draft = keyValuePairs.remove("CITELINES_comments_draft");
    if (draft == null) {
      throw new IllegalArgumentException("Entry %s has no draft comments to save.".formatted(id));
    }
    keyValuePairs.put("CITELINES_comments", draft);
    entry.setKeyValuePairs(keyValuePairs);
    return bibTexEntryRepository.save(entry);
  }

  /**
   * Discards an entry's draft comments, so its previously published comments (if any) take
   * precedence again. Used by the BibTexEntryComments component's "Restore this Version" button.
   *
   * @param id the id of the entry to update
   * @param projectId the project the entry belongs to
   * @return the updated entry
   */
  @Operation(summary = "Discard an entry's draft comments")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @DeleteMapping("/comments/draft")
  public BibTexEntry discardCommentsDraft(
      @Parameter(name = "id") @RequestParam String id,
      @Parameter(name = "projectId") @RequestParam Long projectId) {
    BibTexEntry entry = findEntryOrThrow(id);
    Map<String, String> keyValuePairs = mutableKeyValuePairs(entry);
    String removed = keyValuePairs.remove("CITELINES_comments_draft");
    if (removed == null) {
      throw new IllegalArgumentException(
          "Entry %s has no draft comments to discard.".formatted(id));
    }
    entry.setKeyValuePairs(keyValuePairs);
    return bibTexEntryRepository.save(entry);
  }

  private BibTexEntry findEntryOrThrow(String id) {
    return bibTexEntryRepository
        .findById(id)
        .orElseThrow(() -> new EntityNotFoundException(BibTexEntry.class, id));
  }

  // A mutable copy of the entry's keyValuePairs, so callers can put/remove keys without
  // depending on whatever Map implementation MongoDB's deserializer happened to produce.
  private static Map<String, String> mutableKeyValuePairs(BibTexEntry entry) {
    return entry.getKeyValuePairs() == null
        ? new HashMap<>()
        : new HashMap<>(entry.getKeyValuePairs());
  }

  /**
   * Deletes a BibTeX entry.
   *
   * @param id the id of the entry to delete
   * @param projectId the project the entry belongs to
   * @return a confirmation message
   */
  @Operation(summary = "Delete a BibTeX entry")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @DeleteMapping("/delete")
  public Object deleteBibTexEntry(
      @Parameter(name = "id") @RequestParam String id,
      @Parameter(name = "projectId") @RequestParam Long projectId) {
    BibTexEntry entry =
        bibTexEntryRepository
            .findById(id)
            .orElseThrow(() -> new EntityNotFoundException(BibTexEntry.class, id));

    bibTexEntryRepository.delete(entry);

    return genericMessage("BibTexEntry with id %s deleted".formatted(entry.getId()));
  }
}
