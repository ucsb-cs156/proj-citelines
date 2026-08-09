package edu.ucsb.cs.citelines.repository;

import edu.ucsb.cs.citelines.entity.ProjectCollaborator;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectCollaboratorRepository extends JpaRepository<ProjectCollaborator, Long> {

  /**
   * This method returns a list of ProjectCollaborator entities associated with a given project ID.
   *
   * @param projectId ID of the project
   * @return Iterable of ProjectCollaborator (empty if not found)
   */
  Iterable<ProjectCollaborator> findByProjectId(Long projectId);

  /**
   * This method returns the ProjectCollaborator entries for a given email, across all projects.
   *
   * @param email email address of the collaborator
   * @return List of ProjectCollaborator (empty if not found)
   */
  List<ProjectCollaborator> findAllByEmail(String email);
}
