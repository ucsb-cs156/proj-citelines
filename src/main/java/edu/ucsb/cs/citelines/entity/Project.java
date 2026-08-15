package edu.ucsb.cs.citelines.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
public class Project {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String name;

  private String description;

  private LocalDateTime dateCreated;

  private String owner;

  /**
   * The chosen citation format/style for this project's references, one of the keys of {@link
   * edu.ucsb.cs.citelines.services.CitationFormattingService#COMMON_ALIASES}. Defaults to {@code
   * "ACM"}.
   */
  @Builder.Default private String citationFormat = "ACM";
}
