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

  // SimpleClientHttpRequestFactory's own prepareConnection already sets
  // instanceFollowRedirects to false for non-GET methods, so a POST request is used here to
  // confirm noRedirectRestTemplate's override still delegates to super (which sets the HTTP
  // method) rather than to prove that redirects end up disabled.
  @Test
  void noRedirectRestTemplateDelegatesToSuperPrepareConnection() throws Exception {
    ClientHttpRequestFactory factory =
        new CitelinesApplication().noRedirectRestTemplate().getRequestFactory();
    HttpURLConnection connection =
        (HttpURLConnection) new URL("http://localhost/test").openConnection();

    invokePrepareConnection(factory, connection, "POST");

    assertEquals("POST", connection.getRequestMethod());
  }

  // For a GET request, super's own prepareConnection would leave instanceFollowRedirects
  // true, so only noRedirectRestTemplate's explicit override forces it false here.
  @Test
  void noRedirectRestTemplateForcesFollowRedirectsFalseEvenForGet() throws Exception {
    ClientHttpRequestFactory factory =
        new CitelinesApplication().noRedirectRestTemplate().getRequestFactory();
    HttpURLConnection connection =
        (HttpURLConnection) new URL("http://localhost/test").openConnection();
    connection.setInstanceFollowRedirects(true);

    invokePrepareConnection(factory, connection, "GET");

    assertFalse(connection.getInstanceFollowRedirects());
  }

  private static void invokePrepareConnection(
      ClientHttpRequestFactory factory, HttpURLConnection connection, String httpMethod)
      throws Exception {
    Method prepareConnection =
        factory
            .getClass()
            .getDeclaredMethod("prepareConnection", HttpURLConnection.class, String.class);
    prepareConnection.setAccessible(true);
    prepareConnection.invoke(factory, connection, httpMethod);
  }
}
