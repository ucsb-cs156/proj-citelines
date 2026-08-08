# Concept Graph YAML Format

This document describes the YAML format used to export and import the entire
concept-graph content of a course: the `concepts`, `concept_edges`, and
`practice_problems` tables.

- **Download** (`GET /api/concepts/yaml/download?courseId=...`) produces a file
  in this format from the current database content.
- **Upload** (`POST /api/concepts/yaml/upload`) **replaces all concept-graph
  content for the course** with the file's content. The upload is
  all-or-nothing: the file is fully validated first, and if there are any
  errors, the course is left untouched and the errors are reported.

Both operations are available to instructors and course staff on the
**Concepts** tab of the instructor course page, and via Swagger.

## Example

```yaml
# Concept graph for course 42 (CMPSC 8)
# See docs/yaml-format.md for the format.
format: 1
concepts:
  - id: 1
    label: Variables
    color: "#c99ffe"
    level: 1
    x: -175
    y: 0
    description: |
      A *variable* is a named location that stores a value.
    example: |
      ```python
      x = 5
      ```
    practiceProblems:
      - https://example.org/practice/variables-1
      - https://example.org/practice/variables-2
    subconcepts:
      - label: Assignment
        description: |
          The `=` operator stores a value in a variable.
      - label: Naming rules
        example: |
          ```python
          my_total = 0   # ok
          2nd_place = 0  # not a legal name
          ```
  - id: 2
    label: Loops
    color: "#feaef2"
    level: 2
    x: 175
    y: -300
edges:
  - from: 1
    to: 2
```

This file describes two top-level concepts. *Variables* has two subconcepts
and two practice problems, and is a prerequisite of *Loops*.

## Top-level structure

| Key        | Required | Meaning                                                        |
| ---------- | -------- | -------------------------------------------------------------- |
| `format`   | yes      | Format version. Must be `1`.                                   |
| `concepts` | yes      | List of top-level concepts (may be empty to clear the course). |
| `edges`    | no       | List of prerequisite edges between top-level concepts.        |

Lines starting with `#` are comments and are ignored on upload. Unknown keys
anywhere in the file are reported as errors (they are usually typos).

## Concept ids (external ids)

Database row ids are **not** stable across an export/import round trip: on
upload, every concept gets a brand-new database id. The `id` field in the file
is therefore an *external* id whose only job is to let `edges` refer to
concepts within the file.

- On **download**, top-level concepts are numbered consecutively `1, 2, 3, …`.
- On **upload**, ids may be any integers as long as each top-level concept has
  one and they are unique within the file. When you add a new concept by hand,
  just pick any number not already used.

Subconcepts have no ids. They belong to the concept they are nested under, and
their order in the `subconcepts` list is their display order. (Prerequisite
edges only ever connect top-level concepts, so subconcepts never need to be
referred to.)

## Top-level concept fields

| Key                | Required | Default          | Meaning                                                     |
| ------------------ | -------- | ---------------- | ------------------------------------------------------------ |
| `id`               | yes      | —                | External id (see above). Unique integer within the file.    |
| `label`            | yes      | —                | Markdown label; must render to at most 32 characters.       |
| `description`      | no       | none             | Markdown description shown on the concept's detail card.    |
| `example`          | no       | none             | Markdown example (code blocks encouraged).                  |
| `color`            | no       | level-1 color    | Hex node color, e.g. `"#c99ffe"`. Quote it: `#` starts a YAML comment. |
| `level`            | no       | `1`              | Longest-path level (1-based).                               |
| `x`, `y`           | no       | `0`              | Graph position. (Downloads write the key as `"y"` because bare `y` is a YAML 1.1 boolean; unquoted `y:` is also accepted on upload.) |
| `practiceProblems` | no       | none             | List of practice problem URLs (unique per concept).         |
| `subconcepts`      | no       | none             | List of subconcepts, in display order.                      |

`color`, `level`, `x`, and `y` are preserved on a round trip so an upload
reproduces the graph exactly as it was. If you are hand-editing the file and
don't want to compute them, leave them out and run **Realign Concepts** (in
the footer, with editing enabled) after uploading: it recomputes levels,
colors, and layout from the edges.

`label`, `description`, and `example` are Markdown. They are sanitized on
upload the same way as when entered through the API, so disallowed HTML is
stripped. YAML block scalars (`|`) are the easiest way to write multi-line
Markdown.

## Subconcept fields

| Key                | Required | Meaning                                          |
| ------------------ | -------- | ------------------------------------------------ |
| `label`            | yes      | Markdown label; ≤ 32 rendered characters; unique among the parent's subconcepts. |
| `description`      | no       | Markdown description.                            |
| `example`          | no       | Markdown example.                                |
| `practiceProblems` | no       | List of practice problem URLs.                   |

Subconcepts cannot be nested further (one level deep only), have no position
or color of their own, and cannot appear in `edges`.

## Edge fields

| Key    | Required | Meaning                                             |
| ------ | -------- | --------------------------------------------------- |
| `from` | yes      | External id of the prerequisite concept.            |
| `to`   | yes      | External id of the concept that depends on `from`.  |

Edges must connect two distinct top-level concepts in the file, must not be
duplicated, and must not create a cycle. Edge colors are not part of the
format: the red cycle-edge marking is derived state, recomputed by
**Realign Concepts**.

## What upload replaces (and user state)

A successful upload, in one transaction:

1. Deletes every concept, subconcept, prerequisite edge, and practice problem
   for the course.
2. Deletes every user's saved per-course scaffold state (`user_state`):
   starred concepts, open detail cards, mastered subconcepts, and private
   drag positions. This state refers to concepts by id, and every id changes
   on upload, so it would be meaningless afterward — **every student starts
   from scratch**.
3. Creates the concepts, subconcepts, edges, and practice problems from the
   file.

The user activity log (`user_activity`) is retained as a historical record.

## Error reporting

Upload responds with a JSON report:

```json
{
  "success": true,
  "errors": [],
  "conceptsCreated": 2,
  "subconceptsCreated": 2,
  "edgesCreated": 1,
  "practiceProblemsCreated": 2,
  "userStatesCleared": 17
}
```

If the file is invalid, `success` is `false`, `errors` lists every problem
found (e.g. `edge from 1 to 9: no concept with id 9`), the `…Created` counts
are `0`, and the course content is unchanged.
