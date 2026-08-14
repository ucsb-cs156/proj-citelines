package edu.ucsb.cs.citelines;

import java.io.IOException;
import java.net.HttpURLConnection;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

// Embedded Mongo auto-configuration is only wired up explicitly via MongoDevConfig
// (for localhost/testing/integration profiles); exclude it here so it doesn't
// try to start on every profile, including production.
@SpringBootApplication(
    excludeName = {"de.flapdoodle.embed.mongo.spring.autoconfigure.EmbeddedMongoAutoConfiguration"})
public class CitelinesApplication {

  public static void main(String[] args) {
    SpringApplication.run(CitelinesApplication.class, args);
  }

  @Bean
  @Primary
  public RestTemplate restTemplate() {
    return new RestTemplate();
  }

  /**
   * A second {@link RestTemplate}, used only by {@code CheckLinksService}'s DOI content negotiation
   * lookups: unlike the default {@link #restTemplate()}, it never follows redirects, so a DOI that
   * {@code doi.org} would otherwise 302 onward to a (possibly WAF-protected) publisher page is left
   * unfollowed instead of risking a bot-triggered 403 from that publisher.
   */
  @Bean
  public RestTemplate noRedirectRestTemplate() {
    SimpleClientHttpRequestFactory requestFactory =
        new SimpleClientHttpRequestFactory() {
          @Override
          protected void prepareConnection(HttpURLConnection connection, String httpMethod)
              throws IOException {
            super.prepareConnection(connection, httpMethod);
            connection.setInstanceFollowRedirects(false);
          }
        };
    return new RestTemplate(requestFactory);
  }
}
