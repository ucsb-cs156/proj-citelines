package edu.ucsb.cs.citelines.entity;

import jakarta.persistence.*;
import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@Entity(name = "researchers")
public class Researcher {
  @Id private String email;
}
