package edu.ucsb.cs.citelines.controller;

import edu.ucsb.cs.citelines.entity.Researcher;
import edu.ucsb.cs.citelines.repository.ResearcherRepository;
import edu.ucsb.cs.citelines.utilities.CanonicalFormConverter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Researchers")
@RequestMapping("/api/admin/researchers")
@RestController
@Slf4j
public class ResearchersController extends ApiController {

  @Autowired ResearcherRepository researcherRepository;

  @Operation(summary = "Create a new Researcher")
  @PreAuthorize("hasRole('ROLE_ADMIN')")
  @PostMapping("/post")
  public Researcher postResearcher(@RequestParam String email) {
    String convertedEmail = CanonicalFormConverter.convertToValidEmail(email).strip();
    Researcher researcher = Researcher.builder().email(convertedEmail).build();
    researcherRepository.save(researcher);
    return researcher;
  }

  @Operation(summary = "List all Researchers")
  @PreAuthorize("hasRole('ROLE_ADMIN')")
  @GetMapping("/get")
  public Iterable<Researcher> allResearchers() {
    return researcherRepository.findAll();
  }

  @Operation(summary = "Delete a Researcher by email")
  @PreAuthorize("hasRole('ROLE_ADMIN')")
  @DeleteMapping("/delete")
  public ResponseEntity<String> deleteResearcher(@RequestParam String email) {
    Researcher researcher = researcherRepository.findById(email).orElse(null);
    if (researcher == null) {
      return ResponseEntity.status(404)
          .body(String.format("Researcher with email %s not found.", email));
    }
    researcherRepository.delete(researcher);
    return ResponseEntity.status(200)
        .body(String.format("Researcher with email %s deleted.", email));
  }
}
