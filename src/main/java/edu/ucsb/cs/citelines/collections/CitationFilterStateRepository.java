package edu.ucsb.cs.citelines.collections;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/** Mongo repository ("collection") for {@link CitationFilterState} documents. */
@Repository
public interface CitationFilterStateRepository
    extends MongoRepository<CitationFilterState, String> {}
