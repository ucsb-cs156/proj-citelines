package edu.ucsb.cs.citelines.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import edu.ucsb.cs.citelines.ControllerTestCase;
import edu.ucsb.cs.citelines.services.CitationFormattingService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(controllers = CitationFormatController.class)
public class CitationFormatControllerTests extends ControllerTestCase {

  @Test
  public void logged_out_users_cannot_get_formats() throws Exception {
    mockMvc.perform(get("/api/citation/formats")).andExpect(status().is(403));
  }

  @Test
  @WithMockUser(roles = "USER")
  public void logged_in_users_can_get_formats() throws Exception {
    // act
    MvcResult response =
        mockMvc.perform(get("/api/citation/formats")).andExpect(status().isOk()).andReturn();

    // assert
    String expectedJson = mapper.writeValueAsString(CitationFormattingService.COMMON_ALIASES);
    String responseString = response.getResponse().getContentAsString();
    assertEquals(expectedJson, responseString);
  }
}
