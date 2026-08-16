package edu.ucsb.cs.citelines.services;

import edu.ucsb.cs.citelines.collections.BibTexEntry;
import edu.ucsb.cs.citelines.collections.BibTexEntryRepository;
import edu.ucsb.cs156.jobs.services.JobContext;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * Scans a project's {@link BibTexEntry} records for likely duplicates and marks each one found with
 * the ids of the other entries it's suspected to duplicate ({@code possibleDuplicateIds}/ {@code
 * possibleDuplicateReason}). Report-only: nothing is merged or deleted here — a future, separate
 * manual-review workflow will read these marks (see issue #68's follow-up issue).
 *
 * <p>Entries are grouped by normalized DOI first ({@link #REASON_SAME_DOI}, high confidence);
 * entries with no usable DOI are then grouped by normalized title ({@link #REASON_SIMILAR_TITLE}, a
 * weaker signal). Every run recomputes both fields from scratch for every entry, clearing stale
 * marks for entries no longer part of a group — unlike {@link BibTexEntryUpgradeService}, this job
 * owns this derived data outright rather than filling in gaps in user-entered content, so there is
 * no "might already be reviewed/hand-edited" reason to preserve a stale mark.
 */
@Service
public class DuplicateDetectionService {

  static final String REASON_SAME_DOI = "SAME_DOI";
  static final String REASON_SIMILAR_TITLE = "SIMILAR_TITLE";

  private final BibTexEntryRepository bibTexEntryRepository;
  private final DOIService doiService;

  public DuplicateDetectionService(
      BibTexEntryRepository bibTexEntryRepository, DOIService doiService) {
    this.bibTexEntryRepository = bibTexEntryRepository;
    this.doiService = doiService;
  }

  public void detectDuplicates(int projectId, JobContext ctx) {
    List<BibTexEntry> entries = bibTexEntryRepository.findByProjectId(projectId);
    ctx.log(
        "Scanning %d entries in project %d for possible duplicates."
            .formatted(entries.size(), projectId));

    Map<String, List<BibTexEntry>> byDoi = new LinkedHashMap<>();
    Map<String, List<BibTexEntry>> byTitle = new LinkedHashMap<>();
    for (BibTexEntry entry : entries) {
      String normalizedDoi = normalizedDoiOrNull(entry);
      if (normalizedDoi != null) {
        byDoi.computeIfAbsent(normalizedDoi, k -> new ArrayList<>()).add(entry);
        continue;
      }
      String normalizedTitle = normalizedTitleOrNull(entry);
      if (normalizedTitle != null) {
        byTitle.computeIfAbsent(normalizedTitle, k -> new ArrayList<>()).add(entry);
      }
    }

    Map<String, BibTexEntry> markedById = new LinkedHashMap<>();
    int doiGroups = markGroups(byDoi, REASON_SAME_DOI, markedById);
    int titleGroups = markGroups(byTitle, REASON_SIMILAR_TITLE, markedById);

    List<BibTexEntry> toSave = new ArrayList<>();
    int cleared = 0;
    for (BibTexEntry entry : entries) {
      BibTexEntry marked = markedById.get(entry.getId());
      if (marked != null) {
        toSave.add(marked);
      } else if (entry.getPossibleDuplicateReason() != null) {
        entry.setPossibleDuplicateIds(null);
        entry.setPossibleDuplicateReason(null);
        toSave.add(entry);
        cleared++;
      }
    }
    if (!toSave.isEmpty()) {
      bibTexEntryRepository.saveAll(toSave);
    }

    // markedById only ever holds entries from groups of size >= 2, so its size is always either
    // 0 or >= 2 — never exactly 1 — hence no singular/plural form needed for "entries flagged".
    ctx.log(
        ("Done: %d DOI-based group%s, %d title-based group%s, %d entries flagged, %d entr%s"
                + " cleared of a stale mark.")
            .formatted(
                doiGroups,
                doiGroups == 1 ? "" : "s",
                titleGroups,
                titleGroups == 1 ? "" : "s",
                markedById.size(),
                cleared,
                cleared == 1 ? "y" : "ies"));
  }

  private int markGroups(
      Map<String, List<BibTexEntry>> groups, String reason, Map<String, BibTexEntry> markedById) {
    int groupCount = 0;
    for (List<BibTexEntry> group : groups.values()) {
      if (group.size() < 2) {
        continue;
      }
      groupCount++;
      for (BibTexEntry entry : group) {
        List<String> others = new ArrayList<>();
        for (BibTexEntry other : group) {
          if (!other.getId().equals(entry.getId())) {
            others.add(other.getId());
          }
        }
        entry.setPossibleDuplicateIds(others);
        entry.setPossibleDuplicateReason(reason);
        markedById.put(entry.getId(), entry);
      }
    }
    return groupCount;
  }

  private String normalizedDoiOrNull(BibTexEntry entry) {
    String doi = entry.getKeyValuePairs() != null ? entry.getKeyValuePairs().get("doi") : null;
    if (doi == null || doi.isBlank()) {
      return null;
    }
    try {
      return doiService.normalizeRawDOI(doi);
    } catch (IllegalArgumentException e) {
      return null;
    }
  }

  private String normalizedTitleOrNull(BibTexEntry entry) {
    String title = entry.getKeyValuePairs() != null ? entry.getKeyValuePairs().get("title") : null;
    if (title == null) {
      return null;
    }
    String normalized = title.toLowerCase().replaceAll("[^a-z0-9]+", " ").trim();
    return normalized.isBlank() ? null : normalized;
  }
}
