package edu.ucsb.cs.citelines.repository;

import edu.ucsb.cs.citelines.entity.Project;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, Long> {

  List<Project> findByOwner(String owner);
}
