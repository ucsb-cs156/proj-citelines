package edu.ucsb.cs.citelines.collections;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/** Mongo repository ("collection") for {@link BibTexEntry} documents. */
@Repository
public interface BibTexEntryRepository extends MongoRepository<BibTexEntry, String> {
  List<BibTexEntry> findByProjectId(int projectId);
}
