package edu.ucsb.cs.citelines.startup;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.boot.ApplicationArguments;

class ScaffoldApplicationRunnerTests {

  private ScaffoldApplicationRunner scaffoldApplicationRunner;

  @Mock private ApplicationArguments mockArgs;

  @BeforeEach
  void setUp() {
    MockitoAnnotations.openMocks(this);
    scaffoldApplicationRunner = new ScaffoldApplicationRunner();
  }

  @Test
  void run_does_not_throw() {
    assertDoesNotThrow(() -> scaffoldApplicationRunner.run(mockArgs));
  }
}
