package edu.ucsb.cs.citelines.collections;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/** Mongo repository ("collection") for {@link UnresolvedCitation} documents. */
@Repository
public interface UnresolvedCitationRepository extends MongoRepository<UnresolvedCitation, String> {
  List<UnresolvedCitation> findByProjectId(int projectId);

  List<UnresolvedCitation> findByProjectIdAndSourceCiteKey(int projectId, String sourceCiteKey);
}
