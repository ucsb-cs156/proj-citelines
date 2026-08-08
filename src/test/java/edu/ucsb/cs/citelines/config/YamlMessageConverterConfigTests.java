package edu.ucsb.cs.citelines.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import edu.ucsb.cs.citelines.model.SystemInfo;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;

public class YamlMessageConverterConfigTests {
  @Test
  public void testYamlMessageConverterConfig() {
    // This test is just to ensure that the YamlMessageConverterConfig class can be loaded without
    // errors.
    YamlMessageConverterConfig config = new YamlMessageConverterConfig();
    assertNotNull(config);
    assertTrue(config instanceof YamlMessageConverterConfig);
  }

  @Test
  public void testYamlHttpMessageConverter() {
    YamlMessageConverterConfig.YamlHttpMessageConverter converter =
        new YamlMessageConverterConfig.YamlHttpMessageConverter();
    assertNotNull(converter);
    assertTrue(converter instanceof YamlMessageConverterConfig.YamlHttpMessageConverter);
    assertFalse(
        converter.canWrite(YamlMessageConverterConfig.YamlHttpMessageConverter.class, null));
  }

  @Test
  public void extendMessageConverters_appends_the_yaml_converter() {
    YamlMessageConverterConfig config = new YamlMessageConverterConfig();
    List<HttpMessageConverter<?>> converters = new ArrayList<>();

    config.extendMessageConverters(converters);

    assertEquals(1, converters.size());
    assertInstanceOf(YamlMessageConverterConfig.YamlHttpMessageConverter.class, converters.get(0));
  }

  @Test
  public void converter_reads_all_three_yaml_media_types_but_not_json() {
    YamlMessageConverterConfig.YamlHttpMessageConverter converter =
        new YamlMessageConverterConfig.YamlHttpMessageConverter();
    assertTrue(converter.canRead(SystemInfo.class, MediaType.parseMediaType("application/yaml")));
    assertTrue(converter.canRead(SystemInfo.class, MediaType.parseMediaType("application/x-yaml")));
    assertTrue(converter.canRead(SystemInfo.class, MediaType.parseMediaType("text/yaml")));
    assertFalse(converter.canRead(SystemInfo.class, MediaType.APPLICATION_JSON));
  }

  @Test
  public void converter_never_writes_so_responses_stay_json() {
    YamlMessageConverterConfig.YamlHttpMessageConverter converter =
        new YamlMessageConverterConfig.YamlHttpMessageConverter();
    // canWrite must be false even for the converter's own media types: if it ever
    // returned true, a client sending Accept: */* could start receiving YAML responses.
    assertFalse(converter.canWrite(SystemInfo.class, MediaType.parseMediaType("application/yaml")));
    assertFalse(converter.canWrite(SystemInfo.class, MediaType.APPLICATION_JSON));
  }
}
