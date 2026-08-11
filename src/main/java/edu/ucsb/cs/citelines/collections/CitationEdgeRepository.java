package edu.ucsb.cs.citelines.collections;

import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/** Mongo repository ("collection") for {@link CitationEdge} documents. */
@Repository
public interface CitationEdgeRepository extends MongoRepository<CitationEdge, String> {
  List<CitationEdge> findByProjectIdAndCitingCiteKey(int projectId, String citingCiteKey);

  List<CitationEdge> findByProjectIdAndCitedCiteKey(int projectId, String citedCiteKey);
}
