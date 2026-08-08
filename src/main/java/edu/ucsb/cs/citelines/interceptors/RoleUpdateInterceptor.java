package edu.ucsb.cs.citelines.interceptors;

import edu.ucsb.cs.citelines.repository.AdminRepository;
import edu.ucsb.cs.citelines.repository.ResearcherRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Reloads a user's security context on each request so that role changes (admin/researcher added or
 * removed in the database) take effect without requiring re-login.
 */
@Component
public class RoleUpdateInterceptor implements HandlerInterceptor {

  private final AdminRepository adminRepository;
  private final ResearcherRepository researcherRepository;

  public RoleUpdateInterceptor(
      AdminRepository adminRepository, ResearcherRepository researcherRepository) {
    this.adminRepository = adminRepository;
    this.researcherRepository = researcherRepository;
  }

  @Override
  public boolean preHandle(
      HttpServletRequest request, HttpServletResponse response, Object handler) {
    SecurityContext securityContext = SecurityContextHolder.getContext();
    Authentication authentication = securityContext.getAuthentication();

    if (authentication instanceof OAuth2AuthenticationToken oauthToken
        && oauthToken.getPrincipal() instanceof OidcUser oidcUser) {
      String email = oidcUser.getEmail();
      Set<GrantedAuthority> newAuthorities = new HashSet<>();
      Collection<? extends GrantedAuthority> current = authentication.getAuthorities();

      current.stream()
          .filter(
              a ->
                  !a.getAuthority().equals("ROLE_ADMIN")
                      && !a.getAuthority().equals("ROLE_RESEARCHER"))
          .forEach(newAuthorities::add);

      if (adminRepository.existsByEmail(email)) {
        newAuthorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
      } else if (researcherRepository.existsByEmail(email)) {
        newAuthorities.add(new SimpleGrantedAuthority("ROLE_RESEARCHER"));
      }

      Authentication newAuth =
          new OAuth2AuthenticationToken(
              oidcUser, newAuthorities, oauthToken.getAuthorizedClientRegistrationId());
      SecurityContextHolder.getContext().setAuthentication(newAuth);
    }

    return true;
  }
}
