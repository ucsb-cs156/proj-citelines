package edu.ucsb.cs.citelines.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import edu.ucsb.cs.citelines.ControllerTestCase;
import edu.ucsb.cs.citelines.model.SystemInfo;
import edu.ucsb.cs.citelines.services.SystemInfoService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

@WebMvcTest(controllers = SystemInfoController.class)
public class SystemInfoControllerTests extends ControllerTestCase {

  @MockitoBean edu.ucsb.cs.citelines.repository.UserRepository userRepository;

  @MockitoBean SystemInfoService mockSystemInfoService;

  @Test
  public void systemInfo__admin_logged_in() throws Exception {

    // arrange

    edu.ucsb.cs.citelines.model.SystemInfo systemInfo =
        SystemInfo.builder()
            .showSwaggerUILink(true)
            .springH2ConsoleEnabled(true)
            .oauthLogin("/oauth2/authorization/google")
            .build();
    when(mockSystemInfoService.getSystemInfo()).thenReturn(systemInfo);
    String expectedJson = mapper.writeValueAsString(systemInfo);

    // act
    MvcResult response =
        mockMvc.perform(get("/api/systemInfo")).andExpect(status().isOk()).andReturn();

    // assert
    String responseString = response.getResponse().getContentAsString();
    assertEquals(expectedJson, responseString);
  }
}
