package edu.ucsb.cs.citelines;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
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
  public RestTemplate restTemplate() {
    return new RestTemplate();
  }
}
