package edu.ucsb.cs.citelines;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class CitelinesApplicationTests {

  @Autowired private MockMvc mockMvc;

  @Test
  void healthCheckReturnsOk() throws Exception {
    mockMvc
        .perform(get("/api/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ok"));
  }

  @Test
  void getSystemInfoReturnsOk() throws Exception {
    mockMvc
        .perform(get("/api/systemInfo"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.oauthLogin").exists());
  }
}
