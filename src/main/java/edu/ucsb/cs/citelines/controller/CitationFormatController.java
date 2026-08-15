package edu.ucsb.cs.citelines.controller;

import edu.ucsb.cs.citelines.services.CitationFormattingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exposes the citation formats/styles supported by {@link CitationFormattingService} (see {@code
 * CitationFormattingService#COMMON_ALIASES}).
 */
@Tag(name = "CitationFormat")
@RequestMapping("/api/citation")
@RestController
public class CitationFormatController extends ApiController {

  @Operation(summary = "Get the available citation formats")
  @PreAuthorize("hasRole('ROLE_USER')")
  @GetMapping("/formats")
  public Map<String, String> formats() {
    return CitationFormattingService.COMMON_ALIASES;
  }
}
