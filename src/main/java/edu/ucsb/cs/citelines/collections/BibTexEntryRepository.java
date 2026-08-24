package edu.ucsb.cs.citelines.collections;

import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/** Mongo repository ("collection") for {@link BibTexEntry} documents. */
@Repository
public interface BibTexEntryRepository extends MongoRepository<BibTexEntry, String> {
  List<BibTexEntry> findByProjectId(int projectId);

  Optional<BibTexEntry> findByProjectIdAndCiteKey(int projectId, String citeKey);

  // Used to confirm a Mongo _id (e.g. from a job-launch request) actually belongs to the caller's
  // project, since a bare findById can't distinguish "not found" from "found, wrong project."
  Optional<BibTexEntry> findByIdAndProjectId(String id, int projectId);

  // Used to recover from (and coalesce away) any duplicate entries for the same citeKey, e.g. ones
  // created before duplicate-prevention was added to BibTexEntriesController#postBibTexEntries.
  List<BibTexEntry> findAllByProjectIdAndCiteKey(int projectId, String citeKey);
}
