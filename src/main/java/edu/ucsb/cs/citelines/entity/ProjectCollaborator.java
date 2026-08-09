package edu.ucsb.cs.citelines.entity;

import jakarta.persistence.*;
import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
public class ProjectCollaborator {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String firstName;
  private String lastName;
  private String email;

  @ManyToOne
  @JoinColumn(name = "project_id")
  @ToString.Exclude
  private Project project;
}
