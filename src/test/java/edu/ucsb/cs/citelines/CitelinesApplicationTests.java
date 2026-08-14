package edu.ucsb.cs.citelines;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.lang.reflect.Method;
import java.net.HttpURLConnection;
import java.net.URL;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.client.ClientHttpRequestFactory;
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

  @Test
  void noRedirectRestTemplateDisablesFollowRedirectsAndDelegatesToSuper() throws Exception {
    ClientHttpRequestFactory factory =
        new CitelinesApplication().noRedirectRestTemplate().getRequestFactory();
    HttpURLConnection connection =
        (HttpURLConnection) new URL("http://localhost/test").openConnection();
    connection.setInstanceFollowRedirects(true);

    Class<?> factoryClass = factory.getClass();
    Method prepareConnection =
        factoryClass.getDeclaredMethod("prepareConnection", HttpURLConnection.class, String.class);
    prepareConnection.setAccessible(true);
    prepareConnection.invoke(factory, connection, "POST");

    assertFalse(connection.getInstanceFollowRedirects());
    assertEquals("POST", connection.getRequestMethod());
  }
}
