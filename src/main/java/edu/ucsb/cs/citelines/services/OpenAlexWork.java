package edu.ucsb.cs.citelines.services;

import java.util.List;

/**
 * A minimal projection of an OpenAlex "Work" object (https://api.openalex.org/works/...), carrying
 * only the fields {@link BibTexSynthesisService} needs to synthesize a BibTeX entry. {@code id} and
 * the entries of {@code referencedWorkIds} are the bare OpenAlex id (e.g. {@code "W3035965352"}),
 * with the {@code https://openalex.org/} prefix already stripped.
 */
public record OpenAlexWork(
    String id,
    String doi,
    String title,
    Integer year,
    String type,
    List<String> authorNames,
    String venue,
    List<String> referencedWorkIds) {}
