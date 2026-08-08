package edu.ucsb.cs.citelines.services.wiremock;

import com.github.tomakehurst.wiremock.WireMockServer;

public abstract class WiremockService {
  public abstract WireMockServer getWiremockServer();

  public abstract void init();
}
