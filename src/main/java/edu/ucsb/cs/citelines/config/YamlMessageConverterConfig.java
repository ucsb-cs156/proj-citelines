package edu.ucsb.cs.citelines.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.AbstractJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers a YAML HttpMessageConverter so that endpoints can accept {@code application/yaml}
 * request bodies (e.g. {@code POST /api/concept}). YAML block scalars make multi-line Markdown
 * fields far easier to enter through Swagger than JSON's escaped one-line strings.
 *
 * <p>The converter is <b>read-only</b> ({@code canWrite} is false): it only deserializes request
 * bodies. Responses continue to be serialized as JSON by the default converters, even for clients
 * that send {@code Accept: *&#47;*}.
 */
@Configuration
public class YamlMessageConverterConfig implements WebMvcConfigurer {

  @Override
  public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
    converters.add(new YamlHttpMessageConverter());
  }

  static class YamlHttpMessageConverter extends AbstractJackson2HttpMessageConverter {
    YamlHttpMessageConverter() {
      // Unknown properties are ignored, matching Spring Boot's default JSON behavior.
      super(
          YAMLMapper.builder().disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).build(),
          MediaType.parseMediaType("application/yaml"),
          MediaType.parseMediaType("application/x-yaml"),
          MediaType.parseMediaType("text/yaml"));
    }

    @Override
    public boolean canWrite(Class<?> clazz, MediaType mediaType) {
      return false;
    }
  }
}
