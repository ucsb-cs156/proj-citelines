package edu.ucsb.cs.citelines.services;

import edu.ucsb.cs.citelines.entity.User;
import edu.ucsb.cs.citelines.model.CurrentUser;
import java.util.Collection;
import org.springframework.security.core.GrantedAuthority;

public abstract class CurrentUserService {

  public abstract User getUser();

  public abstract CurrentUser getCurrentUser();

  public abstract Collection<? extends GrantedAuthority> getRoles();

  public final boolean isLoggedIn() {
    return getUser() != null;
  }
}
