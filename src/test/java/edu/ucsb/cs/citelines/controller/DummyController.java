package edu.ucsb.cs.citelines.controller;

import edu.ucsb.cs.citelines.errors.EntityNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Used to test ApiController exception handlers and RoleUpdateInterceptor. */
@RequestMapping("/dummycontroller")
@RestController
public class DummyController extends ApiController {

  @GetMapping("")
  public String getById(@RequestParam Long id) {
    if (id == 1) return "String1";
    throw new EntityNotFoundException(String.class, id);
  }

  @GetMapping("/interceptorTest")
  public ResponseEntity<String> interceptorTest() {
    return ResponseEntity.ok("OK");
  }
}
