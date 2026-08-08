export interface MajorConcept {
  name: string;
  label: string;
  color: string;
  subconcepts: string[];
}

export const majorConcepts: MajorConcept[] = [
  {
    name: "data-types",
    label: "Basic \n Data Types",
    color: "#c99ffe",
    subconcepts: ["Numeric (integers, floats)", "Strings", "Booleans"],
  },
  {
    name: "data-rep",
    label: "Data \n Representation",
    color: "#feaef2",
    subconcepts: ["Binary", "Hex", "Decimal", "Converting between bases"],
  },
  {
    name: "variables",
    label: "Variables",
    color: "#feaef2",
    subconcepts: ["Variable names", "Variable assignment", "+= and -="],
  },
  {
    name: "arithmetic-ops",
    label: "Arithmetic \n Operations",
    color: "#feaef2",
    subconcepts: [
      "Simple arithmetic",
      "Division",
      "Modulo",
      "Order of operations",
    ],
  },
  {
    name: "string-ops",
    label: "String \n Operations",
    color: "#93ebff",
    subconcepts: [
      "String concatenation",
      "String formatting (f-strings)",
      "String slicing",
      "Comments",
    ],
  },
  {
    name: "boolean-expr",
    label: "Boolean \n Expressions",
    color: "#feaef2",
    subconcepts: [
      "Comparison: ==, <, <=, !=",
      "Logical: and, or, not",
      "Membership: in, not in",
    ],
  },
  {
    name: "conditionals",
    label: "Conditional \n Statements",
    color: "#93ebff",
    subconcepts: ["if", "else", "elif"],
  },
  {
    name: "functions",
    label: "Functions",
    color: "#93ebff",
    subconcepts: [
      "Defining functions",
      "Calling functions",
      "Function parameters",
      "Return statements",
    ],
  },
  {
    name: "built-in-fns",
    label: "Built-in \n Functions",
    color: "#fe9a71",
    subconcepts: ["len()", "min() and max()", "range()", "Type casting"],
  },
  {
    name: "main-fn",
    label: 'if __name__ \n == "__main__":',
    color: "#fe9a71",
    subconcepts: ["Program structure", 'Using if __name__ == "__main__"'],
  },
  {
    name: "dictionaries",
    label: "Dictionaries",
    color: "#93ebff",
    subconcepts: [
      "Creating a dictionary",
      "Accessing a value",
      "Adding/updating a key",
    ],
  },
  {
    name: "input-output",
    label: "Input \n & Output",
    color: "#2bcd9c",
    subconcepts: ["input()", "print()"],
  },
  {
    name: "loops",
    label: "Loops",
    color: "#fe9a71",
    subconcepts: [
      "For loops",
      "While loops",
      "Break",
      "Continue",
      "Iteration",
      "Accumulator pattern",
    ],
  },
  {
    name: "lists",
    label: "Lists",
    color: "#93ebff",
    subconcepts: ["Creating a list", "Accessing a value", "List slicing"],
  },
  {
    name: "nested-lists",
    label: "Nested \n Lists",
    color: "#fe9a71",
    subconcepts: ["Creating a nested list", "Accessing values"],
  },
  {
    name: "nested-loops",
    label: "Nested \n Loops",
    color: "#2bcd9c",
    subconcepts: ["Creating a nested loop", "Iterating over a nested list"],
  },
  {
    name: "tuples",
    label: "Tuples",
    color: "#93ebff",
    subconcepts: ["Creating a tuple", "Accessing a value"],
  },
  {
    name: "sets",
    label: "Sets",
    color: "#93ebff",
    subconcepts: ["Creating a set", "Adding an element"],
  },
  {
    name: "recursion",
    label: "Recursion",
    color: "#fe9a71",
    subconcepts: ["Base case", "State change", "Recursive step"],
  },
  {
    name: "files",
    label: "Files",
    color: "#2bcd9c",
    subconcepts: [
      "Opening & closing files",
      "Reading a file",
      "Writing to a file",
    ],
  },
  {
    name: "methods",
    label: "Built-in \n Methods",
    color: "#fe9a71",
    subconcepts: ["Calling a method", "List methods"],
  },
  {
    name: "string-methods",
    label: "String \n Methods",
    color: "#2bcd9c",
    subconcepts: ["upper() and lower()", "replace()", "split()"],
  },
  {
    name: "modules",
    label: "Imports & Modules",
    color: "#2bcd9c",
    subconcepts: ["Importing modules", "random", "math"],
  },
  {
    name: "mutability",
    label: "Mutability",
    color: "#fe9a71",
    subconcepts: ["Mutable objects", "Immutable objects"],
  },
  {
    name: "testing",
    label: "Testing",
    color: "#fe9a71",
    subconcepts: ["assert statements", "Writing test functions", "Edge cases"],
  },
  {
    name: "errors-debugging",
    label: "Errors & \n Debugging",
    color: "#93ebff",
    subconcepts: [
      "Syntax errors",
      "Runtime errors",
      "try / except",
      "Reading tracebacks",
    ],
  },
];

export const prereqEdgeData = [
  // Up from Level 1
  { source: "data-types", target: "variables" },
  { source: "data-types", target: "arithmetic-ops" },
  { source: "data-types", target: "data-rep" },
  { source: "data-types", target: "boolean-expr" },

  // Up from Level 2
  { source: "variables", target: "lists" },
  { source: "variables", target: "functions" },
  { source: "variables", target: "dictionaries" },
  { source: "variables", target: "sets" },
  { source: "variables", target: "tuples" },
  { source: "variables", target: "string-ops" },
  { source: "boolean-expr", target: "conditionals" },
  { source: "boolean-expr", target: "loops" },
  { source: "variables", target: "errors-debugging" },
  { source: "arithmetic-ops", target: "errors-debugging" },
  { source: "arithmetic-ops", target: "recursion" },
  { source: "arithmetic-ops", target: "loops" },
  { source: "arithmetic-ops", target: "string-ops" },

  // Up from Level 3
  { source: "conditionals", target: "main-fn" },
  { source: "conditionals", target: "recursion" },
  { source: "functions", target: "testing" },
  { source: "functions", target: "main-fn" },
  { source: "functions", target: "built-in-fns" },
  { source: "functions", target: "methods" },
  { source: "functions", target: "recursion" },
  { source: "lists", target: "nested-lists" },
  { source: "lists", target: "mutability" },
  { source: "lists", target: "loops" },
  { source: "dictionaries", target: "mutability" },
  { source: "tuples", target: "mutability" },
  { source: "sets", target: "mutability" },

  // Up from Level 4
  { source: "loops", target: "nested-loops" },
  { source: "built-in-fns", target: "input-output" },
  { source: "built-in-fns", target: "files" },
  { source: "methods", target: "string-methods" },
  { source: "methods", target: "modules" },
  { source: "nested-lists", target: "nested-loops" },
];

/*
Level 1: Basic Data Types
Level 2: Data Representation, Variables, Arithmetic Operations,Boolean Expressions
Level 3: String Operations, Functions, Lists, Dictionaries, Tuples, Sets, Conditional Statements, Errors & Debugging
Level 4: Testing, Recursion, Built-in Functions, Nested Lists, Built-in Methods, Mutability, Nested Loops, Main Function
Level 5: Input & Output, String Methods, Files, Imports & Modules
*/
