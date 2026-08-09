package edu.ucsb.cs.citelines.controller;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.errors.EntityNotFoundException;
import edu.ucsb.cs.citelines.services.BibTexConverterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.util.List;
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

  /**
   * Parses pasted BibTeX text (which may contain more than one entry) and saves the resulting
   * entries.
   *
   * @param projectId the project the entries belong to
   * @param rawBibTex the pasted BibTeX text
   * @return the saved entries
   */
  @Operation(summary = "Parse and save one or more BibTeX entries pasted for a project")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @PostMapping("/post")
  public List<BibTexEntry> postBibTexEntries(
      @Parameter(name = "projectId") @RequestParam Long projectId, @RequestBody String rawBibTex) {
    List<BibTexEntry> entries =
        bibTexConverterService.parseToEntries(rawBibTex, projectId.intValue());
    return bibTexEntryRepository.saveAll(entries);
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
