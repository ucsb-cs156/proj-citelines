import BasicLayout from "main/layouts/BasicLayout/BasicLayout";

export default function AboutScaffold() {
  return (
    <BasicLayout>
      <h1>About Scaffold</h1>

      <p>
        Scaffold is a web-based learning tool designed to help students
        visualize the prerequisite relationships between course concepts through
        an interactive knowledge graph.
      </p>

      <h2>What Scaffold is for</h2>

      <p>
        Scaffold was designed around a single overarching goal: to reduce
        extraneous cognitive load for students working through homework and
        practice problems, particularly introductory programming courses.
      </p>

      <p>
        Extraneous cognitive load refers to mental effort that does not
        contribute directly to learning the target material. In this context,
        this is the effort of searching through course material like lecture
        slides, textbook content, and prior assignments to identify which
        concepts are needed to solve a given problem.
      </p>

      <p>
        Introductory programming courses present students with a large number of
        interdependent concepts in a short period of time, making it difficult
        for students to identify gaps in their understanding or recognize how
        foundational concepts build toward more complex ones.
      </p>

      <p>
        Scaffold integrates with{" "}
        <a href="https://www.prairielearn.com/">PrairieLearn</a>, an online
        assessment platform, to display the specific concepts and subconcepts
        relevant to each practice problem, allowing students to explore concept
        descriptions, code examples, and prerequisite dependencies in context.
      </p>

      <p>
        By surfacing this information directly within a structured, interactive
        interface, Scaffold allows students to direct their attention toward
        understanding concepts rather than locating them. The design priorities
        were:
      </p>

      <ol>
        <li>
          Provide a shortcut for navigating course content when stuck on a
          problem
        </li>
        <li>
          Make prerequisite relationships between concepts explicit and
          navigable, and
        </li>
        <li>
          Display course material clearly and concisely, without extraneous
          information.
        </li>
      </ol>

      <h2>Where did Scaffold come from</h2>

      <p>
        The initial prototype of Scaffold, with a design and implementation of
        the Concept Graph, was designed and implemented by Kate Larrick as part
        of her MS project in the{" "}
        <a href="https://cs.ucsb.edu">Department of Computer Science</a> at the
        University of California, Santa Barbara. She was advised by{" "}
        <a href="https://pconrad.github.io">Phill Conrad</a>,{" "}
        <a href="https://sites.cs.ucsb.edu/~dimirza/">Diba Mirza</a> and{" "}
        <a href="https://sites.cs.ucsb.edu/~sra/">Misha Sra</a> in the
        completion of this project.
      </p>

      <p>
        Phill Conrad expanded the prototype with features to add support for
        multiple courses, and allow creating and editing of concept graphs. It
        is open source, and the source code is available here:{" "}
        <a href="https://github.com/ucsb-cs156/proj-scaffold">
          https://github.com/ucsb-cs156/proj-scaffold
        </a>
      </p>

      <p>
        The ongoing maintenance of the project will be shared between Prof.
        Conrad and the students of{" "}
        <a href="https://ucsb-cs156.github.io">CMPSC 156</a>, a course in
        applied software engineering focused on legacy code projects.
      </p>
    </BasicLayout>
  );
}
