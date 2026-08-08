package edu.ucsb.cs.citelines.controller;

import edu.ucsb.cs.citelines.entity.Admin;
import edu.ucsb.cs.citelines.errors.EntityNotFoundException;
import edu.ucsb.cs.citelines.repository.AdminRepository;
import edu.ucsb.cs.citelines.utilities.CanonicalFormConverter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.stream.StreamSupport;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin")
@RequestMapping("/api/admin")
@RestController
@Slf4j
public class AdminsController extends ApiController {

  @Autowired AdminRepository adminRepository;

  @Value("#{'${app.admin.emails}'.split(',')}")
  List<String> adminEmails;

  public static record AdminDTO(String email, boolean isInAdminEmails) {
    public AdminDTO(Admin admin, List<String> adminEmails) {
      this(admin.getEmail(), adminEmails.contains(admin.getEmail()));
    }
  }

  @Operation(summary = "Create a new admin")
  @PreAuthorize("hasRole('ROLE_ADMIN')")
  @PostMapping("/post")
  public Admin postAdmin(@Parameter(name = "email") @RequestParam String email) {
    String convertedEmail = CanonicalFormConverter.convertToValidEmail(email).strip();
    Admin admin = new Admin(convertedEmail);
    return adminRepository.save(admin);
  }

  @Operation(summary = "List all admins")
  @PreAuthorize("hasRole('ROLE_ADMIN')")
  @GetMapping("/all")
  public Iterable<AdminDTO> allAdmins() {
    Iterable<Admin> admins = adminRepository.findAll();
    return StreamSupport.stream(admins.spliterator(), false)
        .map(admin -> new AdminDTO(admin, adminEmails))
        .toList();
  }

  @Operation(summary = "Delete an Admin")
  @PreAuthorize("hasRole('ROLE_ADMIN')")
  @DeleteMapping("/delete")
  public Object deleteAdmin(@Parameter(name = "email") @RequestParam String email) {
    Admin admin =
        adminRepository
            .findByEmail(email)
            .orElseThrow(() -> new EntityNotFoundException(Admin.class, email));
    if (adminEmails.contains(email)) {
      throw new UnsupportedOperationException(
          "Forbidden to delete an admin from ADMIN_EMAILS list");
    }
    adminRepository.delete(admin);
    return genericMessage("Admin with id %s deleted".formatted(email));
  }
}
