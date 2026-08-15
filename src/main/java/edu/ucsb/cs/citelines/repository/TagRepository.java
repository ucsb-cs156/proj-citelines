package edu.ucsb.cs.citelines.repository;

import edu.ucsb.cs.citelines.entity.Tag;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TagRepository extends JpaRepository<Tag, Long> {

  /**
   * This method returns a list of Tag entities associated with a given project ID.
   *
   * @param projectId ID of the project
   * @return Iterable of Tag (empty if not found)
   */
  Iterable<Tag> findByProjectId(Long projectId);

  /**
   * This method returns the Tag entity (if any) for a given project ID and tag name.
   *
   * @param projectId ID of the project
   * @param tag the tag name
   * @return Optional of Tag (empty if not found)
   */
  Optional<Tag> findByProjectIdAndTag(Long projectId, String tag);
}
