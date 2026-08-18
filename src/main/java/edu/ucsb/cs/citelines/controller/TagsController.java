package edu.ucsb.cs.citelines.controller;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs.citelines.entity.Project;
import edu.ucsb.cs.citelines.entity.Tag;
import edu.ucsb.cs.citelines.errors.EntityNotFoundException;
import edu.ucsb.cs.citelines.repository.ProjectRepository;
import edu.ucsb.cs.citelines.repository.TagRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@io.swagger.v3.oas.annotations.tags.Tag(name = "Tags")
@RequestMapping("/api/tags")
@RestController
@Slf4j
public class TagsController extends ApiController {

  @Autowired private TagRepository tagRepository;

  @Autowired private ProjectRepository projectRepository;

  @Autowired private BibTexEntryRepository bibTexEntryRepository;

  /**
   * This method adds a new tag to a project.
   *
   * @return the created Tag
   */
  @Operation(summary = "Add a tag to a project")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @PostMapping("/post")
  public Tag postTag(
      @Parameter(name = "tag") @RequestParam String tag,
      @Parameter(name = "explanation") @RequestParam String explanation,
      @Parameter(name = "color") @RequestParam(required = false) String color,
      @Parameter(name = "projectId") @RequestParam Long projectId)
      throws EntityNotFoundException {

    Project project =
        projectRepository
            .findById(projectId)
            .orElseThrow(() -> new EntityNotFoundException(Project.class, projectId));

    ensureTagIsUnique(projectId, tag, null);

    Tag newTag =
        Tag.builder().tag(tag).explanation(explanation).color(color).project(project).build();

    return tagRepository.save(newTag);
  }

  /**
   * This method returns a list of tags for a given project.
   *
   * @return a list of tags for a project.
   */
  @Operation(summary = "List all tags for a project")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @GetMapping("/project")
  public Iterable<Tag> tagsForProject(@Parameter(name = "projectId") @RequestParam Long projectId)
      throws EntityNotFoundException {
    projectRepository
        .findById(projectId)
        .orElseThrow(() -> new EntityNotFoundException(Project.class, projectId));
    return tagRepository.findByProjectId(projectId);
  }

  /**
   * This method updates the tag and explanation of an existing tag.
   *
   * @return the updated Tag
   */
  @Operation(summary = "Update an existing tag")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @PutMapping("")
  public Tag updateTag(
      @Parameter(name = "id") @RequestParam Long id,
      @Parameter(name = "projectId") @RequestParam Long projectId,
      @Parameter(name = "tag") @RequestParam String tag,
      @Parameter(name = "explanation") @RequestParam String explanation,
      @Parameter(name = "color") @RequestParam(required = false) String color)
      throws EntityNotFoundException {
    Tag existingTag =
        tagRepository.findById(id).orElseThrow(() -> new EntityNotFoundException(Tag.class, id));

    ensureTagIsUnique(projectId, tag, id);

    existingTag.setTag(tag);
    existingTag.setExplanation(explanation);
    existingTag.setColor(color);

    return tagRepository.save(existingTag);
  }

  @Operation(summary = "Delete a tag")
  @PreAuthorize("@ProjectSecurity.hasManagePermissions(#root, #projectId)")
  @DeleteMapping("/delete")
  @Transactional
  public ResponseEntity<String> deleteTag(
      @Parameter(name = "id") @RequestParam Long id,
      @Parameter(name = "projectId") @RequestParam Long projectId)
      throws EntityNotFoundException {
    Tag tag =
        tagRepository.findById(id).orElseThrow(() -> new EntityNotFoundException(Tag.class, id));

    // Clean up the Mongo side first, then delete the Postgres row — not the other way around.
    // @Transactional above only covers the Postgres delete (no MongoTransactionManager is
    // configured, so it has no effect on the Mongo write below); if the Mongo cleanup failed
    // *after* the tag was already deleted, BibTexEntry.tagIds could be left referencing a tag id
    // that no longer exists. Doing the cleanup first means a failure there simply leaves the tag
    // not-yet-deleted (safe to retry) instead of orphaning references (see issue #91).
    removeTagFromAllEntries(id, projectId);
    tagRepository.delete(tag);

    return ResponseEntity.ok("Successfully deleted tag.");
  }

  // MongoDB can't cascade-delete across the Postgres/Mongo boundary, so a deleted tag's id has to
  // be explicitly stripped from every BibTexEntry.tagIds in the project that referenced it — the
  // same kind of explicit cross-entity cleanup BibTexEntryCoalescingService performs elsewhere
  // (see issue #71).
  private void removeTagFromAllEntries(Long tagId, Long projectId) {
    List<BibTexEntry> toUpdate = new ArrayList<>();
    for (BibTexEntry entry : bibTexEntryRepository.findByProjectId(projectId.intValue())) {
      if (entry.getTagIds() != null && entry.getTagIds().contains(tagId)) {
        List<Long> tagIds = new ArrayList<>(entry.getTagIds());
        tagIds.remove(tagId);
        entry.setTagIds(tagIds);
        toUpdate.add(entry);
      }
    }
    if (!toUpdate.isEmpty()) {
      bibTexEntryRepository.saveAll(toUpdate);
    }
  }

  private void ensureTagIsUnique(Long projectId, String tag, Long idToIgnore) {
    Optional<Tag> existing = tagRepository.findByProjectIdAndTag(projectId, tag);
    if (existing.isPresent() && !existing.get().getId().equals(idToIgnore)) {
      throw new IllegalArgumentException(
          "A tag named \"%s\" already exists for this project.".formatted(tag));
    }
  }
}
