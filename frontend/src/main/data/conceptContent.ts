export interface ConceptContent {
  description?: string;
  example?: string;
  practiceUrl?: string;
}

export const conceptContent: Record<string, ConceptContent> = {
  // ── DATA TYPES ──────────────────────────────────────────────────────────────

  "data-types": {
    description:
      "Data is any piece of information that your program stores or works with. In Python, the basic data types are integers, floats, strings, and booleans. Data types help Python store and use information correctly.",
    example: '7\n8.12\n"I love learning Python"\nFalse',
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/697821834/",
  },
  "data-types:Numeric (integers, floats)": {
    description:
      "Numeric data types are used to store numbers in Python. Integers are whole numbers. Floats, or floating point numbers, are numbers with a decimal point. Both can be positive or negative.",
    example: "29\n-6.88888",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "data-types:Strings": {
    description:
      "A string is how Python stores text. A string can be a single character, an entire paragraph, or even an empty space. Strings are created by wrapping text in matching single or double quotation marks. Strings cannot be changed after they are created, but you can create new strings by performing operations on existing strings.",
    example:
      "# Empty string\n''\n'This is a string.'\n\"This is also a string.\"",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "data-types:Booleans": {
    description:
      "A boolean data type can only be one of two values: True or False. The value must be capitalized with no quotation marks around it.",
    example: "True\nFalse",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── VARIABLES ────────────────────────────────────────────────────────────────

  variables: {
    description:
      "A variable is a named container that stores a piece of data so your program can use it later. A variable is like a labeled box, where the label is the variable's name, and whatever is inside the box is its value. Variables let you reference, update, and reuse information throughout your program.",
    example:
      'int_variable = 5\nstring_variable = "CS 8"\nboolean_variable = True',
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/697992232/",
  },
  "variables:Variable names": {
    description:
      "A variable name is the label you give a variable so you can refer to it in your code. Names are case-sensitive and can only contain letters, numbers, or underscores. They can't start with a number or contain spaces, and they can't be Python keywords like 'if', 'else', 'for', etc. Good names clearly describe what the variable holds.",
    example:
      '# Vague variable name\nx = "Alejandro"\n\n# Specific variable name\nstudent_name = "Kyle"',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "variables:Variable assignment": {
    description:
      "Variable assignment creates a variable and gives it a value using the = sign. You can reassign a variable later to overwrite its old value. A variable's data type changes based on what value is assigned to it.",
    example:
      '# Create variable1 to store a string\nvariable1 = "ABC"\n\n# Reassign variable1 to store an integer\nvariable1 = 10\n\n# Update variable1 based on its current value\nvariable1 = variable1 + 3',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "variables:+= and -=": {
    description:
      '+= and -= are shortcuts for updating a variable based on its current value. "+=" adds the value on the right to the variable on the left and stores the result back in that variable. "-=" subtracts the value on the right from the variable on the left and stores the result back in that variable.',
    example:
      "x = 10\n\n# Same as x = x + 3\nx += 3\n\n# Same as x = x - 5\nx -= 5",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── ARITHMETIC OPERATIONS ────────────────────────────────────────────────────

  "arithmetic-ops": {
    description:
      "Arithmetic operations are the basic math actions you can perform on numbers in Python. Just like a calculator, Python can add, subtract, multiply, divide, and raise numbers to a power using simple symbols.",
    example: "8 + 3\n10 / 2",
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/697992231/",
  },
  "arithmetic-ops:Simple arithmetic": {
    description:
      "The four basic arithmetic operators in Python are: + (add), - (subtract), * (multiply), and ** (raise to a power).",
    example: "5 + 3\n5 - 3\n5 * 3\n5 ** 3",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "arithmetic-ops:Division": {
    description:
      "Python has two kinds of division. Regular division (/) always returns a decimal result, even if both operands are integers and the result is a whole number. Floor division (//) rounds the result down to the nearest whole number.",
    example: "# Evaluates to 1.25\n5 / 4\n\n# Evaluates to 1\n5 // 4",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "arithmetic-ops:Modulo": {
    description:
      "The modulo operator (%) returns the remainder left over after dividing two numbers. It is useful for checking things like whether a number is even or odd. You can use modulo with floats, but the result will not always be precise due to rounding errors.",
    example:
      "# Evaluates to 1\n10 % 3\n\n# Evaluates to 0\n10 % 2\n\n# Evaluates to 0.5\n1.5 % 1",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "arithmetic-ops:Order of operations": {
    description:
      "Python follows the standard PEMDAS order when evaluating expressions: parentheses, exponents, multiplication, division, addition, then subtraction.",
    example: "# Evaluates to 14\n2 + 3 * 4\n\n# Evaluates to 20\n(2 + 3) * 4",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── STRING OPERATIONS ────────────────────────────────────────────────────────

  "string-ops": {
    description:
      "String operations are actions you can perform on text in Python. Python gives you tools to combine, slice, and format strings any time your program needs to work with or display text.",
    example: 'greeting = "Hello" + " World!"\nword1 = greeting[0:5]',
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/697992235/",
  },
  "string-ops:String concatenation": {
    description:
      "Concatenation joins two or more strings together into one using the + symbol. The strings are combined exactly as they are, so you must include any spaces yourself.",
    example:
      'word1 = "Hello"\nword2 = "World"\ngreeting = word1 + " " + word2\n\n# Two ways to append to a string\ngreeting = greeting + "!"\ngreeting += "!"',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "string-ops:String formatting (f-strings)": {
    description:
      "An f-string lets you embed a variable or expression directly inside a string. Place an f before the opening quote, then put variable names or expressions inside curly braces wherever you want their values to appear.",
    example:
      '# Stores "The sum of 5 and 3 is 8"\nresult = f"The sum of 5 and 3 is {5 + 3}"',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "string-ops:String slicing": {
    description:
      "String slicing lets a program extract a smaller portion of a string by specifying a start and stop index: string_variable[start:stop]. The start index is included in the result, but the stop index is not. Leaving out the start or stop index tells Python to slice from the beginning or all the way to the end. String slicing also accepts an optional third value called the step: string_variable[start:stop:step]. The step controls how many positions Python jumps forward each time it picks a value. The default step is 1, meaning Python picks every character. A step of 2 picks every other character, a step of 3 picks every third character, and so on. A negative step counts backwards through the string.",
    example:
      'name = "Brennan"\n\n# Extracts Bren\nname[0:4]\n\n# Every other character: Benn\nnumbers[::2]\n\n# Reverses the string\nname[::-1]',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "string-ops:Comments": {
    description:
      "A comment is a note in code that Python ignores when running the program. Comments help readers understand what the code is doing and why. They are created by starting a line with a # symbol.",
    example: "# This is a comment: Python will not run this line",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── BOOLEAN EXPRESSIONS ──────────────────────────────────────────────────────

  "boolean-expr": {
    description:
      "A boolean expression is an expression that evaluates to either True or False. Python uses these to make decisions — for example, checking whether two values are equal or a condition is met.",
    example: "x == y\n5 != 3\n(a and b) or (x and y)",
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/697992230/",
  },
  "boolean-expr:Comparison: ==, <, <=, !=": {
    description:
      'Comparison operators compare two values and return True or False. == checks if two values are equal, != checks if they are not equal, and <, >, <=, >= compare which value is larger or smaller. <= means "less than or equal to" and >= means "greater than or equal to".',
    example:
      "# Evaluate to True\n5 == 5\n5 != 3\n5 > 3\n\n# Evaluate to False\n5 < 3\n5 != 5\n5 <= 4",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "boolean-expr:Logical: and, or, not": {
    description:
      'Logical operators combine or reverse boolean expressions. "and" returns True only if both sides are True, "or" returns True if at least one side is True, and "not" flips a boolean value from True to False or vice versa.',
    example:
      "# Evaluate to True\nTrue and True\nnot False\nTrue or False\n\n# Evaluate to False\nTrue and False\nnot True\nFalse or False",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "boolean-expr:Membership: in, not in": {
    description:
      'Membership operators check whether a value exists inside a sequence, like if a character is in a string. "in" returns True if the value is found; "not in" returns True if it is not found.',
    example:
      "# Evaluate to True\n'P' in 'Python'\n'z' not in 'Python'\n\n# Evaluate to False\n'x' in 'Python'\n'n' not in 'Python'",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── CONDITIONAL STATEMENTS ───────────────────────────────────────────────────

  conditionals: {
    description:
      'A conditional statement lets your program make decisions by running certain code only when a specific condition is met. In Python, conditionals are built using if, elif, and else combined with boolean expressions. The boolean expression is the "condition" in a conditional statement. ',
    example:
      'test_grade = 85\n\nif test_grade >= 70:\n    class_grade = "Pass"\nelse:\n    class_grade = "Fail"',
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000002/",
  },
  "conditionals:if": {
    description:
      "An if statement checks a condition. If that condition is True, it runs the indented block of code beneath it. If the condition is False, Python skips that block entirely.",
    example:
      'test_grade = 85\n\nif test_grade >= 80 and test_grade < 90:\n    letter_grade = "B"',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "conditionals:else": {
    description:
      "An else statement goes after an if statement and runs its block when the if condition is False. It acts as a fallback: \"if the condition wasn't met, do this instead.\" You always need an if statement before an else statement, but you don't need an else statement after an if statement.",
    example:
      'test_grade = 85\n\nif test_grade >= 70:\n    class_grade = "Pass"\nelse:\n    class_grade = "Fail"',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "conditionals:elif": {
    description:
      'An elif ("else if") statement lets you check multiple conditions in order. Python evaluates each from top to bottom and runs the first block whose condition is True, skipping all the rest. You always need an if statement before an elif statement. You don\'t need an else statement after an elif statement.',
    example:
      'if test_grade >= 90:\n    class_grade = "A"\nelif test_grade >= 80:\n    class_grade = "B"\nelif test_grade >= 70:\n    class_grade = "C"\nelse:\n    class_grade = "Did not pass"',
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── FUNCTIONS ────────────────────────────────────────────────────────────────

  functions: {
    description:
      "A function is a reusable block of code that performs a specific task. Instead of writing the same code over and over, you can define it once and call it whenever you need it. Functions help keep your code organized, readable, and easier to manage.",
    example:
      'def greeting(name):\n    hello = "Hello, " + name\n    return(hello)',
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000004/",
  },
  "functions:Defining functions": {
    description:
      "Defining a function means creating it and giving it a name. Use the def keyword followed by the function name, parentheses, and a colon. The indented code beneath that line is the block that will run whenever the function is called.",
    example: "def sum_function():\n    sum = 3 + 5",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "functions:Calling functions": {
    description:
      "Calling a function means actually running it. You call a function by writing its name followed by parentheses. The code inside a function  (the block indented under the function definition line) will only run if the function is called, and it can be called as many times as you want.",
    example:
      "# Function definition\ndef sum_function():\n    sum = 3 + 5\n\n# Function call\nsum_function()",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "functions:Function parameters": {
    description:
      'A parameter is a variable listed inside a function\'s parentheses when the function is defined. It acts as a placeholder for a value that will be passed in when the function is called. This lets you write one function that can work with different inputs. To create a function with multiple parameters, separate the variables with commas inside the parentheses. A function does not have to have parameters — if there is no variable inside the parentheses in the function, the function has no parameters. When calling a function that has parameters, "pass in" the values by listing them inside the function call parentheses. The values that you pass in to a function call are called inputs. ',
    example:
      "# Parameters are a and b\ndef sum_function(a, b):\n    sum = a + b\n\n# Call with inputs x and y\nx = 5\ny = 3\nsum_function(x, y)",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "functions:Return statements": {
    description:
      'A return statement sends a value back out of a function so it can be used elsewhere in your program. A return statement is also used to exit a function: any code after the return statement will not run. A return statement starts with the "return" keyword followed by the value being returned (the "return value"). If a function does not have a return statement, it returns None by default. If you assign a variable to a function call (like this: variable_name = sum_function() ), the return value will be stored in the variable. ',
    example:
      "def sum_function(a, b):\n    sum = a + b\n    return(sum)\n\n# total stores the return value: 8\ntotal = sum_function(5, 3)",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── BUILT-IN FUNCTIONS ───────────────────────────────────────────────────────

  "built-in-fns": {
    description:
      "Built-in functions are ready-made functions that come with Python — you don't need to define them yourself. They handle common tasks like measuring length, finding min/max values, or converting data types. There are over 60 built-in functions in Python, but the most commonly used ones are print(), input(), len(), min(), max(), int(), str(), float(), and range().",
    example: '# Returns 3\nlen("CS8")\n\n# Returns 2\nmin(8, 2, 13, 4)',
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000012/",
  },
  "built-in-fns:len()": {
    description:
      "len() returns the number of items in a sequence — such as the number of characters in a string or the number of values in a list. When calling the len() function, pass in the sequence as input. ",
    example:
      "# Returns 5\nlen(\"Hello\")\n\nletter_list = ['a', 'b', 'c']\n\n# Returns 3\nlen(letter_list)",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "built-in-fns:min() and max()": {
    description:
      "min() returns the smallest value in a group of numbers; max() returns the largest. You can pass in multiple values separated by commas, or a single list of numbers.",
    example:
      "# Returns 4\nmin(8, 6, 13, 4)\n\nnum_list = [6, 2, 9, 12]\n\n# Returns 12\nmax(num_list)",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "built-in-fns:range()": {
    description:
      "range() returns a list of integers. range() takes up to three input values: range(start, stop, step). At least one input value is required. If you pass in one number as input, it will be the stop value: the default starting value is 0 and the default step is 1. If you pass in two numbers as input, they will be the start and stop values. If you pass in three inputs, the step controls how much the sequence increments by each time. The stop value is never included in the result — the list that range() returns always stops just before it. The step can also be negative, which lets you count backwards.",
    example:
      "# Returns [0, 1, 2, 3]\nrange(4)\n\n# Returns [3, 4, 5, 6]\nrange(3, 7)\n\n# Returns [2, 4, 6]\nrange(0, 8, 2)\n\n# Returns [8, 7, 6, 5]\nrange(8, 4, -1)",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "built-in-fns:Type casting": {
    description:
      "Type casting means converting a value from one data type to another. Python has built-in functions for this: int() converts a value to an integer, float() converts to a float, bool() converts to a boolean, and str() converts to a string. All of these functions only work if it is possible to convert the original value to the new data type: anything can be converted to a string, but trying to convert a string with letters in it to an integer or float will cause an error. Converting an integer to a float adds .0 to the end of the integer value, and converting a float to an integer removes anything after the decimal point. ",
    example:
      '# Converts to integer 5\na = 5.2\nint(a)\n\n# Converts to float 6.0\nb = 6\nfloat(b)\n\n# Converts to string "7"\nc = 7\nstr(c)\n\n# Converts to integer 5\nd = "5"\nint(d)',
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── INPUT & OUTPUT ───────────────────────────────────────────────────────────

  "input-output": {
    description:
      "Input and output are how a program communicates with the user. Output is information the program displays; input is information it receives from the user. Python provides print() for output and input() for input.",
    example:
      'print("This sentence will be printed out.")\nname = input("What is your name?")',
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000014/",
  },
  "input-output:print()": {
    description:
      "print() displays information to the screen. You can pass in strings, variables, or expressions. Multiple values separated by commas will be printed with a space between them. By default, print() adds a new line after each call.",
    example:
      '# Prints "4"\nprint(2 + 2)\n\n# Prints "My name is Kate"\nname = "Kate"\nprint("My name is ", name)',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "input-output:input()": {
    description:
      "input() pauses the program and waits for the user to type something and press Enter. Whatever the user types is returned as a string. You can pass a prompt message into input() to display instructions or a question to the user.",
    example:
      'name = input("What is your name? ")\nprint("Hello, " + name + "!")\n\n# Type casting to store user input as an integer\nage = int(input("How old are you? "))\nprint(age + 1)',
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── DICTIONARIES ─────────────────────────────────────────────────────────────

  dictionaries: {
    description:
      'A dictionary is a data type that stores information as pairs of keys and values. Instead of accessing data by position, you look up a value using its unique key — similar to looking up a definition using a word in a real dictionary. The keys in a dictionary are unique, meaning there is only one of each key, but multiple keys can be "mapped" to the same value.',
    example: 'student_ages = {"Alejandro": 19, "Kyle": 20, "Nikita": 20}',
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000003/",
  },
  "dictionaries:Creating a dictionary": {
    description:
      "A dictionary is created using curly braces {} with each key-value pair separated by a colon. Multiple pairs are separated by commas. Keys are typically strings or numbers, and values can be any data type.",
    example:
      'student = {"name": "Abby", "age": 20, "major": "Political Science"}',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "dictionaries:Accessing a value": {
    description:
      "A value in a dictionary is accessed using its key inside square brackets []. If the key doesn't exist, Python will return an error. If the key is a string, it must be in quotes.",
    example:
      'student = {"name": "Abby", "age": 20, "major": "Political Science"}\n\n# Stores the integer 20\nAbby_age = student["age"]',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "dictionaries:Adding/updating a key": {
    description:
      'A new key-value pair is added using the format: dictionary_name["new_key"] = value. If the key already exists in the dictionary, its value will be overwritten.',
    example:
      'student = {"name": "Abby", "age": 20}\n\n# Adds key "major" with value "Political Science"\nstudent["major"] = "Political Science"',
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── LISTS ────────────────────────────────────────────────────────────────────

  lists: {
    description:
      "A list is a data type that stores multiple values in a specific order. A list can hold any combination of data types, and its values can be changed at any time.",
    example: "numbers = [1, 2, 3, 4, 5]",
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/697992236/",
  },
  "lists:Creating a list": {
    description:
      "A list is created using square brackets [] with each value separated by a comma. A list can hold any data type, including a mix of different types. A list can also be empty.",
    example: 'mixed = [1, "hello", True]\nempty = []',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "lists:Accessing a value": {
    description:
      "A value in a list is accessed using the value's numbered position, or index, inside square brackets. List indexes start at 0, so the first item is at index 0, the second at index 1, and so on. A negative index counts from the end of the list.",
    example:
      'names = ["Alice", "Bob", "Charlie"]\n\n# Stores "Alice"\nfirst_name = names[0]\n\n# Stores "Bob"\nsecond_name = names[1]\n\n# Stores "Charlie"\nlast_name = names[-1]',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "lists:List slicing": {
    description:
      "List slicing lets a program extract a smaller portion of a list by specifying a start and stop index: list[start:stop]. The start index is included in the result, but the stop index is not. Leaving out the start or stop index tells Python to slice from the beginning or all the way to the end. List slicing also accepts an optional third value called the step: list[start:stop:step]. The step controls how many positions Python jumps forward each time it picks a value. The default step is 1, meaning Python picks every item. A step of 2 picks every other item, a step of 3 picks every third item, and so on. A negative step counts backwards through the list. A string can also be sliced with the same rules. ",
    example:
      "numbers = [10, 20, 30, 40, 50, 60, 70]\n\n# Extracts [30, 40, 50]\nnumbers[2:5]\n\n# Every other value: [10, 30, 50, 70]\nnumbers[::2]\n\n# Reverses the list\nnumbers[::-1]",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── NESTED LISTS ─────────────────────────────────────────────────────────────

  "nested-lists": {
    description:
      "A nested list is a list that contains other lists as its values. Nested lists are useful for representing structured data with rows and columns, like a grid or table. Each inner list can be accessed and worked with just like a regular list.",
    example: "grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]",
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000013/",
  },
  "nested-lists:Creating a nested list": {
    description:
      "A nested list is created the same way as a regular list, except some or all of its values are themselves lists. Each inner list is separated by a comma, just like any other value.",
    example:
      "# A list containing three lists\ngrid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "nested-lists:Accessing values": {
    description:
      "A value in a nested list is accessed using two indexes in a row. The first index selects the inner list, and the second selects the value within that inner list.",
    example:
      "grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]\n\n# Access the first inner list: [1, 2, 3]\ngrid[0]\n\n# Access the second item in the first inner list: 2\ngrid[0][1]\n\n# Access the last item in the last inner list: 9\ngrid[2][2]",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── LOOPS ────────────────────────────────────────────────────────────────────

  loops: {
    description:
      "A loop runs the same block of code multiple times without writing it out repeatedly. A program uses loops to repeat an action, work through a sequence of values, or keep doing something until a condition is met. Python has two kinds of loops: for loops and while loops.",
    example:
      "x = 0\nwhile x < 3:\n    x += 1\n\nnum_list = [10, 5, 20, 3, 15]\ntotal = 0\n\nfor num in num_list:\n    total += num",
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000010/",
  },
  "loops:For loops": {
    description:
      "A for loop repeats a block of code once for each item in a sequence (like a list or a range of numbers). The first line of a for loop has this format: for loop_variable in sequence, with a colon at the end of the line. All the code inside of the for loop is indented. The loop variable takes on each value in the sequence one at a time, and the indented block runs once for each value in the sequence. One run of the indented block inside of a for loop is called a loop iteration. ",
    example:
      'vowels = "aeiou"\nvowel_count = 0\n\nfor letter in "Computer":\n    if letter in vowels:\n        vowel_count += 1',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "loops:While loops": {
    description:
      "A while loop repeats a block of code as long as a condition remains True. Once the condition becomes False, the loop stops. Use a while loop when you don't know in advance how many times you need to repeat something.",
    example: "x = 0\nwhile x < 3:\n    x += 1",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "loops:Break": {
    description:
      "The break keyword immediately stops a loop and exits it, even if there are still items left in the sequence or the condition is still True. It is useful when a program needs to stop looping as soon as a specific condition is met.",
    example:
      "numbers = [3, 7, 1, 9, 4, 6]\ntarget = 9\n\nfor num in numbers:\n    if num == target:\n        break",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "loops:Continue": {
    description:
      "continue skips the rest of the current loop iteration and jumps straight to the next one. Unlike break, it doesn't stop the loop entirely — it just moves on to the next item in the sequence.",
    example:
      "num_list = [10, -5, 20, -3, 15]\ntotal = 0\n\n# Sums only positive numbers\nfor num in num_list:\n    if num < 0:\n        continue\n    total += num",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "loops:Iteration": {
    description:
      'Iteration means going through a sequence one item at a time. Every time a loop moves to the next item, that is one iteration. A data type is "iterable" if it can hold multiple individual values that can be stepped through, like a list or a string.',
    example:
      'a_count = 0\n\n# Iterates over the string "alphabet"\nfor letter in "alphabet":\n    if letter == \'a\':\n        a_count += 1',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "loops:Accumulator pattern": {
    description:
      "The accumulator pattern starts a variable at an initial value before a loop, then updates it with each iteration to build up a result — like a running total, a count, or a growing string. The variable must be declared before the loop so it doesn't reset on each iteration.",
    example:
      "num_list = [10, 5, 20, 3, 15]\ntotal = 0\n\nfor num in num_list:\n    total += num",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── NESTED LOOPS ─────────────────────────────────────────────────────────────

  "nested-loops": {
    description:
      "A nested loop is a loop inside the indented block of another loop. For every single iteration of the outer loop, the inner loop runs all the way through completely. A program uses nested loops any time it needs to work through data that has multiple layers, like a grid or a nested list.",
    example:
      "nested_list = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]\ntotal = 0\n\nfor row in nested_list:\n    for value in row:\n        total += value",
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000018/",
  },
  "nested-loops:Creating a nested loop": {
    description:
      "A nested loop is created by indenting a second loop inside the block of an outer loop. The inner loop finishes all its iterations before the outer loop moves to its next one.",
    example:
      "x = 0\n\nwhile x < 3:\n    x += 1\n    y = 3\n    while y > 0:\n        y -= 1",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "nested-loops:Iterating over a nested list": {
    description:
      "A program uses a nested loop to iterate over a nested list by using the outer loop to go through each inner list, and the inner loop to go through each value within that inner list.",
    example:
      "nested_list = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]\ntotal = 0\n\nfor row in nested_list:\n    for value in row:\n        total += value",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── FILES ────────────────────────────────────────────────────────────────────

  files: {
    description:
      "A program can interact with files stored on a computer to save or retrieve information. Unlike variables, file data is stored permanently. Python has built-in tools for opening, reading, and writing files. Working with a file requires knowing its filepath string.",
    example: '# Filepath string example\n"downloads/CS8_data/data.txt"',
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000016/",
  },
  "files:Opening & closing files": {
    description:
      'Before reading or writing a file, a program must open it using open(), passing in the filename and a mode: "r" for reading or "w" for writing. When done, the file should be closed with .close(). Using the "with" keyword is preferred because it closes the file automatically.',
    example:
      '# Opening and closing manually\nfile = open("data.txt", "r")\nfile.close()\n\n# Opening with "with" — closes automatically\nwith open("data.txt", "r") as file:',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "files:Reading a file": {
    description:
      ".read() returns the entire file as one string. .readlines() returns a list where each item is one line from the file as a separate string.",
    example:
      '# contents stores all of data.txt as one string\nwith open("data.txt", "r") as file:\n    contents = file.read()\n\n# lines_list stores each line as a separate string\nwith open("data.txt", "r") as file:\n    lines_list = file.readlines()',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "files:Writing to a file": {
    description:
      'A program writes to a file using "w" mode and the .write() method. If the file doesn\'t exist, Python creates it automatically. Opening an existing file in "w" mode will erase its previous contents.',
    example:
      'with open("output.txt", "w") as file:\n    file.write("Hello, World!")\n\n# output.txt now contains: Hello, World!',
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── TUPLES ───────────────────────────────────────────────────────────────────

  tuples: {
    description:
      "A tuple is a data type that stores multiple values in a specific order, similar to a list. The key difference is that a tuple's values cannot be changed after it is created. A program uses tuples to store data that should stay fixed.",
    example:
      'student1 = ("Alejandro", 20, "Data Science")\nstudent2 = ("Christos", 18, "Computer Science")',
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/697992234/",
  },
  "tuples:Creating a tuple": {
    description:
      "A tuple is created using parentheses () with each value separated by a comma. It can hold any mix of data types. To create a tuple with only one value, a trailing comma is required after that value.",
    example:
      'coordinates = (10, 20)\nmixed_tuple = (1, "hello", True)\n\n# A tuple with one value\nsingle = (42,)\n\n# An empty tuple\nempty = ()',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "tuples:Accessing a value": {
    description:
      "A value in a tuple is accessed using its index inside square brackets, just like a list. Tuple indexes start at 0, and negative indexes count from the end.",
    example:
      "coordinates = (10, 20, 30)\n\n# Access the first value: 10\ncoordinates[0]\n\n# Access the last value: 30\ncoordinates[-1]\n\n# Access a range of values: (20, 30)\ncoordinates[1:]",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── SETS ─────────────────────────────────────────────────────────────────────

  sets: {
    description:
      'A set is a data type that stores multiple unique values with no guaranteed order. A program uses sets when duplicates are not allowed and order is not important. Because sets are unordered, values cannot be accessed by index. You can use the "in" operator to check if a value is in a set.',
    example: 'fruits = {"apple", "banana", "cherry"}\nnumbers = {1, 2, 3}',
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/697992233/",
  },
  "sets:Creating a set": {
    description:
      "A set is created using curly braces {} with each value separated by a comma. Duplicate values are automatically removed. To create an empty set, use set() — using {} alone creates an empty dictionary instead.",
    example:
      "# Duplicates are removed: numbers stores {1, 2, 3}\nnumbers = {1, 2, 2, 3, 3, 3}\n\n# An empty set\nempty = set()",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "sets:Adding an element": {
    description:
      "To add an element to a set, use set_variable.add(new_element). If the element already exists in the set, nothing changes — sets only store unique items.",
    example:
      'fruits = {"apple", "banana"}\n\n# Adds "cherry" to the set\nfruits.add("cherry")\n\n# Adding a duplicate has no effect\nfruits.add("apple")',
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── BUILT-IN METHODS ─────────────────────────────────────────────────────────

  methods: {
    description:
      "A method is a function that is associated with a specific object. Most Python data types come with their own set of built-in methods to perform specific actions. Some methods return a new value; others modify the original object directly.",
    example:
      "# .add() is a built-in set method\nnum_set = {1, 2, 3}\nnum_set.add(4)",
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000007/",
  },
  "methods:Calling a method": {
    description:
      "A method is called by attaching it to a value or variable using a dot, followed by the method name and parentheses. Some methods take inputs inside the parentheses; some do not.",
    example: "numbers = [3, 1, 4, 1, 5]\n\n# Returns 2\nnumbers.count(1)",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "methods:List methods": {
    description:
      "Four useful built-in list methods are .append(), .pop(), .sort(), and .reverse(). .append(item) adds an item to the end, .pop(index) removes and returns an item at a given index, .sort() sorts least to greatest, and .reverse() reverses the order.",
    example:
      "num_list = [4, 5, 6, 8, 2]\n\n# num_list becomes [4, 5, 6, 8, 2, 7]\nnum_list.append(7)\n\n# num_list becomes [5, 6, 8, 2, 7]\nnum_list.pop(0)\n\n# num_list becomes [7, 2, 8, 5, 6]\nnum_list.reverse()\n\n# num_list becomes [2, 5, 6, 7, 8]\nnum_list.sort()",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── MUTABILITY ───────────────────────────────────────────────────────────────

  mutability: {
    description:
      "Mutability describes whether the value of an object can be changed after it is created. Mutable objects can be modified in place. Immutable objects are fixed — any operation that seems to modify one actually creates a brand new object instead.",
    example:
      '# The list is changed directly to [99, 2, 3]\nnumbers = [1, 2, 3]\nnumbers[0] = 99\n\n# Strings cannot be changed in place\nname = "Alice"\n# This would cause an error: name[0] = "a"',
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000006/",
  },
  "mutability:Mutable objects": {
    description:
      "Lists and dictionaries are mutable — a program can modify their contents directly without creating a new object. This means two variables pointing to the same list or dictionary will both reflect any changes made to it.",
    example:
      "a = [1, 2, 3]\n\n# b points to the same list as a\nb = a\n\n# Modifying b in place also changes a\nb[0] = 99\n\n# a: [99, 2, 3]\n# b: [99, 2, 3]",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "mutability:Immutable objects": {
    description:
      "Tuples and strings are immutable — their contents cannot be changed after creation. If a program needs a modified version, it must create a brand new object. Trying to change an item in place will cause an error.",
    example:
      '# Trying to change a character directly would cause an error\nname = "Alice"\n# name[0] = "a"  → Error\n\n# A new string must be created instead\nname = "a" + name[1:]',
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── STRING METHODS ───────────────────────────────────────────────────────────

  "string-methods": {
    description:
      "String methods are built-in methods that perform common operations on strings, called using dot notation on a string value or variable. Because strings are immutable, string methods never modify the original string — they always return a new one.",
    example:
      'name = "Nikita"\nuppercase_name = name.upper()\nword_list = "hello world".split()',
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000017/",
  },
  "string-methods:upper() and lower()": {
    description:
      ".upper() returns a new string with all characters converted to uppercase. .lower() returns a new string with all characters converted to lowercase.",
    example:
      'name = "Nikita"\n\n# result: "NIKITA"\nuppercase_name = name.upper()\n\n# result: "nikita"\nlowercase_name = name.lower()',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "string-methods:replace()": {
    description:
      ".replace() returns a new string with every occurrence of a specified value swapped out for a new value. Pass in the value to find and the replacement value as inputs.",
    example:
      'sentence = "I like cats and cats like me."\n\n# result: "I like dogs and dogs like me."\nnew_sentence = sentence.replace("cats", "dogs")',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "string-methods:split()": {
    description:
      ".split() breaks a string into a list of smaller strings, dividing at a specified separator. By default it splits on whitespace. The separator itself is not included in the result.",
    example:
      'sentence = "hello world"\n\n# result: ["hello", "world"]\nword_list = sentence.split()\n\ndate = "2024-05-08"\n\n# result: ["2024", "05", "08"]\ndate_list = date.split("-")',
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── IMPORTS & MODULES ────────────────────────────────────────────────────────

  modules: {
    description:
      "A module is a file containing pre-written Python code that a program can use. Instead of writing everything from scratch, a program can import a module to gain access to functions and tools that are already built.",
    example:
      "import random\n\n# Returns a random integer between 1 and 10\nrandom_int = random.randint(1, 10)",
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000015/",
  },
  "modules:Importing modules": {
    description:
      "A module is imported using the import keyword followed by the module name. Once imported, its functions are accessed using dot notation. You can also import a specific function from a module using the from keyword — that function can then be used without dot notation.",
    example:
      "# Import the entire module\nimport math\n\n# Import a specific function from a module\nfrom random import randint",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "modules:random": {
    description:
      "The random module provides tools for generating random values. It is commonly used in games, simulations, and programs that need unpredictable behavior. randint() returns a random integer between two values, and choice() picks a random item from a list.",
    example:
      'import random\n\n# Returns a random integer between 1 and 10\nrandom_int = random.randint(1, 10)\n\nfruits = ["apple", "banana", "cherry"]\n\n# A random item from the fruits list\nrandom_fruit = random.choice(fruits)',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "modules:math": {
    description:
      "The math module provides mathematical functions and constants beyond basic arithmetic. Commonly used functions include sqrt() for square roots, floor() for rounding down, and ceil() for rounding up.",
    example:
      "import math\n\n# Returns the square root: 4.0\nmath.sqrt(16)\n\n# Rounds down to the nearest integer: 3\nmath.floor(3.9)\n\n# Rounds up to the nearest integer: 4\nmath.ceil(3.1)",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── TESTING ──────────────────────────────────────────────────────────────────

  testing: {
    description:
      "Testing is the process of checking that a program's code works correctly. Instead of manually verifying results by eye, a program can include automated tests that verify the output of functions for a given input. Writing tests helps catch mistakes early and makes bugs easier to find.",
    example:
      "def multiply(a, b):\n    return a * b\n\ndef test_multiply():\n    assert multiply(2, 3) == 6",
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000009/",
  },
  "testing:assert statements": {
    description:
      "An assert statement checks whether a condition is True. If it is, nothing happens and the program continues. If it is False, Python raises an AssertionError, signaling that something is not working as expected. Assert statements are the building block of writing tests.",
    example:
      "# This passes: no error\nassert 2 + 2 == 4\n\n# This fails and raises an AssertionError\nassert 2 + 2 == 5",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "testing:Writing test functions": {
    description:
      "A test function is a function dedicated to testing one specific function in a program. Test function names typically start with test_. The test function calls the function being tested and uses assert statements to verify that the output is correct.",
    example:
      "def add(a, b):\n    return a + b\n\ndef test_add():\n    assert add(2, 3) == 5\n    assert add(0, 0) == 0\n    assert add(-1, 1) == 0",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "testing:Edge cases": {
    description:
      "An edge case is an unusual or extreme input that might cause a function to behave unexpectedly. Good tests always include edge cases in addition to normal inputs. Common edge cases include empty values, zero, negative numbers, and the smallest or largest possible inputs.",
    example:
      "def divide(a, b):\n    return a / b\n\ndef test_divide():\n    # Normal case\n    assert divide(10, 2) == 5.0\n\n    # Edge case: dividing by a negative number\n    assert divide(10, -2) == -5.0\n\n    # Edge case: dividing zero by a number\n    assert divide(0, 5) == 0.0",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── ERRORS & DEBUGGING ───────────────────────────────────────────────────────

  "errors-debugging": {
    description:
      "An error occurs when Python encounters something in the code that it cannot execute. Debugging is the process of finding and fixing those errors. Understanding the different types of errors and how to read Python's error messages makes it easier to figure out what went wrong and where.",
    example:
      "# The code below causes an error\nsum = x + \n\nSyntaxError: invalid syntax",
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000005/",
  },
  "errors-debugging:Syntax errors": {
    description:
      "A syntax error occurs when the code breaks the rules of the Python language and Python cannot understand it. Python catches these before the program even runs. Common causes include missing colons, mismatched parentheses, or misspelled keywords. An IndentationError is a specific type of syntax error that happens when the indentation in a program is not consistent.",
    example:
      "# Missing colon after if statement\nif x > 5\n    x = 10\n\n# Missing closing parenthesis\nresult = (2 + 3",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "errors-debugging:Runtime errors": {
    description:
      "A runtime error occurs while the program is running — the syntax is correct, but something goes wrong during execution. Common examples include accessing an index in a sequence that doesn't exist or using the wrong data type for an operation. Common runtime error types include IndexError (index is out of bounds), TypeError (incorrect data type), ValueError (correct data type but inappropriate value), and NameError (variable is not defined).",
    example:
      '# Accessing an index that doesn\'t exist: IndexError\nnumbers = [1, 2, 3]\nnumbers[5]\n\n# Concatenating the wrong data type: TypeError\nresult = "hello" + 5\n\n# Trying to convert a non-numeric string to an integer: ValueError\nnum = int("abc")\n\n# Using a variable that hasn\'t been defined: NameError\nprint(x)',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "errors-debugging:try / except": {
    description:
      "A try/except block lets a program handle a runtime error gracefully instead of crashing. Python attempts to run the code in the try block, and if an error occurs, it jumps to the except block and runs that instead.",
    example:
      'try:\n    result = "hello" + 5\nexcept TypeError:\n    result = "hello"',
    practiceUrl: "https://us.prairielearn.com/",
  },
  "errors-debugging:Reading tracebacks": {
    description:
      "A traceback is the error message Python displays when a runtime error occurs. It shows exactly where the error happened and what type it was. The most important parts are the last line (the error type and description) and the line just above it (the exact code that caused the problem).",
    example:
      '# This code causes a traceback\nnumbers = [1, 2, 3]\nnumbers[5]\n\n# Traceback (most recent call last):\n#   File "main.py", line 2, in <module>\n#     numbers[5]\n# IndexError: list index out of range',
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── DATA REPRESENTATION ──────────────────────────────────────────────────────

  "data-rep": {
    description:
      'Data representation is the way computers store and display information using different numbering systems. These numbering systems are called bases. Since computers work in binary internally, other systems like hexadecimal and decimal exist to represent the same values in more compact or human-readable forms. The same value can be represented in different bases - even though the symbols look different, the value stays the same across each base. A Python "literal" is a value written directly in the code, which can be in decimal, binary, or hexadecimal depending on the prefix.',
    example: "# Decimal\n10\n\n# Binary\n0b1010\n\n# Hex\n0xA",
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/697992229/",
  },
  "data-rep:Binary": {
    description:
      "Binary is the most fundamental language a computer speaks, using only two digits: 0 and 1. Every piece of data on a computer is stored as a series of 1s and 0s. Each position in a binary number represents a power of 2, so binary is a base-2 numbering system. In Python, a binary number is written using the prefix 0b.",
    example:
      "# The number 10 in binary:\n0b1010\n\n# The number 50 in binary:\n0b110010",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "data-rep:Hex": {
    description:
      "Hexadecimal is a base-16 numbering system that uses 16 symbols — digits 0-9 and letters A through F — to represent values more compactly than binary. Each hex digit represents 4 binary digits. In Python, a hex number is written using the prefix 0x.",
    example: "# The number 10 in hex:\n0xA\n\n# The number 50 in hex:\n0x32",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "data-rep:Decimal": {
    description:
      "Decimal is the base-10 numbering system that humans use in everyday life. It uses the digits 0-9, and each position represents a power of 10. In Python, numbers written without a prefix are treated as decimal by default.",
    example: "# A regular decimal number with no prefix\n42",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "data-rep:Converting between bases": {
    description:
      "To convert any number from base b to decimal, multiply each digit by b raised to the power of its position, then add everything together. Positions are counted from right to left, starting at 0.\n\nTo convert a decimal number to base b, repeatedly divide by b, keeping track of the remainders. The remainders, read bottom to top, give you the result.\n\nSteps:\n1. Divide the number by b, note the remainder\n2. Divide the quotient by b, note the remainder\n3. Repeat until the quotient is 0\n4. The remainders, read in reverse order, give the result in base b.",
    example:
      "# Convert binary value 1011 to decimal\n(1 * 2**3) + (0 * 2**2) + (1 * 2**1) + (1 * 2**0) = 8 + 0 + 2 + 1 = 11\n\n# Convert hex value 2F to decimal (A=10, B=11,…, F=15)\n(2 * 16**1) + (15 * 16**0) = 32 + 15 = 47\n\n# Convert decimal value 11 to binary\n# 11 ÷ 2 = 5 with remainder 1 \n# 5 ÷ 2 = 2 with remainder 1 \n# 2 ÷ 2 = 1 with remainder 0 \n# 1 ÷ 2 = 0 remainder 1\n# Result: 1011",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── RECURSION ────────────────────────────────────────────────────────────────

  recursion: {
    description:
      "Recursion is a technique where a function calls itself to solve a problem. Instead of using a loop, a recursive function breaks a problem down into a smaller version of the same problem, solving it step by step until it reaches a simple stopping point. For example, getting the nth value in the Fibonacci sequence (where each number is the sum of the two numbers before it: 0, 1, 1, 2, 3, 5, 8…) is naturally recursive because to find fib(n), you need fib(n-1) and fib(n-2) - the same problem, just smaller. The simple stopping point is the beginning of the sequence, which is always 0 and 1. ",
    example:
      "def fibonacci_recursive(n):\n    # Base case\n    if n <= 1:\n        return n\n\n    # Recursive step\n    return fibonacci_recursive(n - 1) + fibonacci_recursive(n - 2)",
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000011/",
  },
  "recursion:Base case": {
    description:
      "The base case is the condition that stops a recursive function from calling itself. Every recursive function must have one — without it, the function would call itself forever. The base case handles the simplest version of the problem and returns a result directly.",
    example:
      "def countdown(n):\n    # Base case: stop when n reaches 0\n    if n == 0:\n        return 0\n    return countdown(n - 1)",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "recursion:State change": {
    description:
      "State change means each recursive call moves the problem closer to the base case by changing the input in some way. Without state change, the function would never reach the base case and would call itself forever. Typically this means passing in a smaller or simpler value each time.",
    example:
      "def countdown(n):\n    if n == 0:\n        return 0\n    # State change: n gets smaller with each call\n    return countdown(n - 1)",
    practiceUrl: "https://us.prairielearn.com/",
  },
  "recursion:Recursive step": {
    description:
      "The recursive step is the line where the function calls itself with a changed input. Each recursive step handles one piece of the problem and passes the rest to the next call, until the base case is eventually reached.",
    example:
      "def factorial(n):\n    # Base case: factorial of 0 is 1\n    if n == 0:\n        return 1\n    # Recursive step: multiply n by factorial of n - 1\n    return n * factorial(n - 1)",
    practiceUrl: "https://us.prairielearn.com/",
  },

  // ── MAIN FUNCTION ────────────────────────────────────────────────────────────

  "main-fn": {
    description:
      'The if __name__ == "__main__" block is the standard way to designate the entry point of a program — the place where execution begins. It also controls which parts of the code only run when the file is executed directly, not when it is imported by another file.',
    example:
      'if __name__ == "__main__":\n\n    # Function calls go here\n    function1()\n    function2()',
    practiceUrl:
      "https://us.prairielearn.com/pl/course_instance/213067/instance_question/698000008/",
  },
  "main-fn:Program structure": {
    description:
      'A well-structured Python program follows a consistent layout: imports at the top, then function definitions, then the if __name__ == "__main__" block at the very bottom. This ensures everything is defined before it is used and makes the program easy to read.',
    example:
      'def function1():\n    # Code\n\ndef function2():\n    # Code\n\nif __name__ == "__main__":\n\n    function1()\n    function2()',
    practiceUrl: "https://us.prairielearn.com/",
  },
  'main-fn:Using if __name__ == "__main__"': {
    description:
      'Every Python file has a built-in variable called __name__. When you run a file directly, Python sets __name__ to the string "__main__", so any code inside the if __name__ == "__main__" block runs automatically. Code outside this block — like function definitions — is still accessible to other files that import it, but will not run automatically.',
    example:
      'def function1():\n    # Code\n\nif __name__ == "__main__":\n\n    # function1() runs when this file is executed directly\n    function1()',
    practiceUrl: "https://us.prairielearn.com/",
  },
};
