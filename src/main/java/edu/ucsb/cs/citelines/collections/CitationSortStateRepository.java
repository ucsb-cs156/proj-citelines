package edu.ucsb.cs.citelines.collections;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/** Mongo repository ("collection") for {@link CitationSortState} documents. */
@Repository
public interface CitationSortStateRepository extends MongoRepository<CitationSortState, String> {}
