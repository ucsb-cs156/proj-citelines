package edu.ucsb.cs.citelines.repository;

import edu.ucsb.cs.citelines.entity.Researcher;
import java.util.Optional;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ResearcherRepository extends CrudRepository<Researcher, String> {
  Optional<Researcher> findByEmail(String email);

  boolean existsByEmail(String email);
}
