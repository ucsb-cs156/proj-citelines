package edu.ucsb.cs.citelines.testconfig;

import edu.ucsb.cs.citelines.config.SecurityConfig;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;

@TestConfiguration
@Import(SecurityConfig.class)
public class IntegrationConfig {}
