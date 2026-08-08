package edu.ucsb.cs.citelines.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import edu.ucsb.cs.citelines.ControllerTestCase;
import edu.ucsb.cs.citelines.entity.Researcher;
import edu.ucsb.cs.citelines.repository.ResearcherRepository;
import edu.ucsb.cs.citelines.repository.UserRepository;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(controllers = edu.ucsb.cs.citelines.controller.ResearchersController.class)
@Import(edu.ucsb.cs.citelines.testconfig.TestConfig.class)
public class ResearchersControllerTests extends ControllerTestCase {

  @MockitoBean ResearcherRepository researcherRepository;
  @MockitoBean UserRepository userRepository;

  // Tests for the POST endpoint

  @Test
  public void logged_out_users_cannot_post() throws Exception {
    mockMvc
        .perform(post("/api/admin/researchers/post?email=test@ucsb.edu"))
        .andExpect(status().is(403));
  }

  @WithMockUser(roles = {"USER"})
  @Test
  public void logged_in_users_cannot_post() throws Exception {
    mockMvc
        .perform(post("/api/admin/researchers/post?email=test@ucsb.edu"))
        .andExpect(status().is(403));
  }

  @WithMockUser(roles = {"ADMIN"})
  @Test
  public void logged_in_admins_can_post() throws Exception {
    Researcher researcher = Researcher.builder().email("ins@ucsb.edu").build();
    when(researcherRepository.findAll()).thenReturn(new ArrayList<>(Arrays.asList(researcher)));

    MvcResult response =
        mockMvc
            .perform(post("/api/admin/researchers/post?email=ins@ucsb.edu").with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    verify(researcherRepository, times(1)).save(eq(researcher));
    String expectedJson = mapper.writeValueAsString(researcher);
    String responseString = response.getResponse().getContentAsString();
    assertEquals(expectedJson, responseString);
  }

  @WithMockUser(roles = {"ADMIN"})
  @Test
  public void logged_in_admins_can_post_and_email_is_sanitized() throws Exception {
    Researcher researcher = Researcher.builder().email("ins@ucsb.edu").build();
    when(researcherRepository.findAll()).thenReturn(new ArrayList<>(Arrays.asList(researcher)));

    MvcResult response =
        mockMvc
            .perform(post("/api/admin/researchers/post?email= ins@ucsb.edu ").with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    verify(researcherRepository, times(1)).save(eq(researcher));
    String expectedJson = mapper.writeValueAsString(researcher);
    String responseString = response.getResponse().getContentAsString();
    assertEquals(expectedJson, responseString);
  }

  // Tests for the GET endpoint

  @Test
  public void logged_out_users_cannot_get() throws Exception {
    mockMvc.perform(get("/api/admin/researchers/get")).andExpect(status().is(403));
  }

  @WithMockUser(roles = {"USER"})
  @Test
  public void logged_in_users_cannot_get() throws Exception {
    mockMvc.perform(get("/api/admin/researchers/get")).andExpect(status().is(403));
  }

  @WithMockUser(roles = {"ADMIN"})
  @Test
  public void logged_in_admins_can_get() throws Exception {
    Researcher researcher = Researcher.builder().email("ins@ucsb.edu").build();
    ArrayList<Researcher> expectedResearchers = new ArrayList<>(Arrays.asList(researcher));
    when(researcherRepository.findAll()).thenReturn(new ArrayList<>(Arrays.asList(researcher)));

    MvcResult response =
        mockMvc.perform(get("/api/admin/researchers/get")).andExpect(status().isOk()).andReturn();

    verify(researcherRepository, times(1)).findAll();
    String expectedJson = mapper.writeValueAsString(expectedResearchers);
    String responseString = response.getResponse().getContentAsString();
    assertEquals(expectedJson, responseString);
  }

  // Tests for the DELETE endpoint

  @Test
  public void logged_out_users_cannot_delete() throws Exception {
    mockMvc
        .perform(delete("/api/admin/researchers/delete").param("email", "test@ucsb.edu"))
        .andExpect(status().is(403));
  }

  @WithMockUser(roles = {"USER"})
  @Test
  public void logged_in_users_cannot_delete() throws Exception {
    mockMvc
        .perform(delete("/api/admin/researchers/delete").param("email", "test@ucsb.edu"))
        .andExpect(status().is(403));
  }

  @WithMockUser(roles = {"ADMIN"})
  @Test
  public void logged_in_admins_can_delete() throws Exception {
    Researcher researcher = Researcher.builder().email("ins@ucsb.edu").build();
    when(researcherRepository.findById(eq("ins@ucsb.edu"))).thenReturn(Optional.of(researcher));

    MvcResult response =
        mockMvc
            .perform(
                delete("/api/admin/researchers/delete").param("email", "ins@ucsb.edu").with(csrf()))
            .andExpect(status().isOk())
            .andReturn();

    verify(researcherRepository, times(1)).findById("ins@ucsb.edu");
    verify(researcherRepository, times(1)).delete(researcher);
    String expectedMessage =
        String.format("Researcher with email %s deleted.", researcher.getEmail());
    String responseString = response.getResponse().getContentAsString();
    assertEquals(expectedMessage, responseString);
  }

  @WithMockUser(roles = {"ADMIN"})
  @Test
  public void admin_try_to_delete_a_researcher_not_found() throws Exception {
    String email = "nonexistent@ucsb.edu";
    when(researcherRepository.findById(eq(email))).thenReturn(Optional.empty());

    MvcResult response =
        mockMvc
            .perform(delete("/api/admin/researchers/delete").param("email", email).with(csrf()))
            .andExpect(status().isNotFound())
            .andReturn();

    verify(researcherRepository, times(1)).findById(email);
    verify(researcherRepository, times(0)).delete(any());
    String expectedMessage = String.format("Researcher with email %s not found.", email);
    String responseString = response.getResponse().getContentAsString();
    assertEquals(expectedMessage, responseString);
  }
}
