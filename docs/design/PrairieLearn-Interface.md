# PrairieLearn Interface

## Functional needs

Here is a list of the ways Scaffold needs to be able to interface with PrairieLearn, separated from the mechanism we will use to 
acheive the interface.

| Need | Pull (from PL) // or Push (to PL) | Expalanation |
|-|-|-|
| For a given course instance, get all assessments | Pull | We want to be able to give the instructor the ability to select which assessments appear in the Assessment dropdown so that students can get help with selected PrairieLearn assessments on the concept graph. |
| For a given course assesment, get all of the questions on that assessment | Pull | We want to give the instructor able to link questions to specific concepts or subconcepts on the concept graph, and students to be able to select a questions from an assessment and link it to a concept |
| For a given course, we want to be able to get all questions | Pull | We want to be able to give the instructor the ability to link a concept or subconcept to one or more PL questions that students can use to test their understanding of the concept |
| For a given question, we want to be able to create a "Scaffold Assessment", a special assessment that exists solely for the purpose of allowing students to practice with a concept they found on the concept graph | Push | We want students to be able to access the questions that connect with a particular concept so that they can practice | 


## Mechanisms

There are two mechanisms that are available currently for interacting with PL

1. Github API through classic PATs.  
2. PrairieLearn API through PrairieLearn PAT.

In both cases, these carry the user rights and permissions (on Github repos and/or PrairieLearn) of the user that sets up the PAT, so these are set up per Admin/Instructor user.

## Capabilities/Limitations of each API

Reading from the Github API can:

* Given the name of a course repo, list all course instances by name.  And for each, it can get this information from the `infoCourseInstance.json` file:
  ```
  {
    "uuid": "eb2647dc-9e3d-46cf-b365-b952dbe617e4",
    "longName": "Spring 2026",
    "allowAccess": [
      {
        "role": "Student",
        "startDate": "2026-03-29T08:00:00",
        "endDate": "2026-06-30T23:59:59"
      }
    ]
  }
  ```
  Crucially, it cannot however, give us the course instance id. 
  
* Given the name of a course repo, list all questions for a course by their alphanumeric questionId.  For each question, we can get this information from `info.json`, as well as any other fields that
  appear in `info.json`; see [PL documentation for info.json](https://docs.prairielearn.com/question/overview/#metadata-infojson)
  ```
  {
    "uuid": "b970695b-4f08-471f-b3d2-d7d12933f395",
    "title": "Hypothesis Testing (mean, randomized)",
    "topic": "Default",
    "type": "v3"
  }
  ```
  
* Given a course repo, and the name of a course instance, list all assessments by their alphanumeric name.  For each
  assessment, what we can get is the information in the `infoAsssessment.json`, documented [here](https://docs.prairielearn.com/assessment/configuration/) which
  includes a list of the alphanumeric questionId for each question included.

  But we cannot get the numeric assesment id, or the student facing URL for the assessment. 

Using the Github API with write access, we can create a new assessment for a question or set of questions.  The intention here is to set up 
a particular assessment type in `infoCourse.json` at the root of the repo, which looks like this:

```
{
  ...
  "assessmentSets": [
    ...
    { "abbreviation": "S", "name": "Scaffold", "heading": "Scaffold", "color": "turquoise1" }
  ],
  ...
}
```

Then, we add assessments by pushing commits to the repo to create a file `infoAssessment.json` with the name:

```
courseInstances/{courseInstanceName}/assessments/{newAssessmentName}/infoAssessment.json
```

and the format described [here (questions)](https://docs.prairielearn.com/assessment/configuration/#assessment-configuration) and [here (access control)](https://docs.prairielearn.com/assessment/accessControl/#assessment-access-control)

  
The PrairieLearn API (documented [here](https://docs.prairielearn.com/api/#course-instances) can:

* Take a numeric course instance id, and return a list of all assessments that 
  includes both the name and the numeric assessment id (from which we can constructor the student link, which is always
  ```
  https://us.prairielearn.com/pl/course_instance/{numeric_course_instance_id}/assessment/{numeric_assessment_id}
  ```
  This is the main reason we need the interface with PrairieLearn; without it, we cannot automatically get the url for questions or asssessments.
  
* Take a numeric assessment id and get the following information about the assessment in an API response:
  ```
  {
    "assessment_id": "2690012",
    "assessment_name": "exam-02",
    "assessment_label": "E2",
    "type": "Exam",
    "assessment_number": "2",
    "assessment_order_by": 6,
    "title": "Final (in Testing Center)",
    "assessment_set_id": "9134429",
    "assessment_set_abbreviation": "E",
    "assessment_set_name": "Exam",
    "assessment_set_number": 8,
    "assessment_set_heading": "Exams",
    "assessment_set_color": "pink2"
  }
  ```


## User Stories

### Admin/Instructor Stories that involve PL-Scaffold interfacing.

| As a(n) ... | I can... | So that... |
|-|-|-|
| Admin/Instructor | Set up PAT for Github | So that I can access PL information through the Github API |
| Admin/Instructor | Set up PAT for PL | So that I can access PL information through the PL API |
| Admin/Instructor | Associate a Scaffold course with a repo name (org/repo, e.g. `PrairieLearn/pl-ucsb-cmpsc8`  | So that I can access PL information through the Github API |
| Admin/Instructor | Associate a Scaffold course with a PL Course Instance numerical id | So that I can access PL information through the PL API |
| Admin/Instructor | See verification that my Github API access for my course is configured correctly | So that I know my PAT and org/repo name is set up correctly |
| Admin/Instructor | See verification that my PL API access for my course is configured correctly | So that I know my PAT and course instance id is set up correctly |
| Admin/Instructor | Pull course information from Github and PL | So that the local state for my course is up to date |
| Admin/Instructor | Given a list of all available PL assessment, designate which ones should be shown in Scaffold | So that I control which PL assessments are released in Scaffold and when, so that the list of questions for exams doesn't leak before the exam |
| Admin/Instructor | Select an assessment and a question on that assessment, and then select the concepts on the Concept Graph that should be shown | So that I can help my students when they are working on homework and practice questions to use the Concept Graph to learn the skills/knowledge they need to develop their understanding and complete the assessments |
| Admin/Instructor | Select a concept or subconcept, and then select one or more PrairieLearn questions to go with that concept | So that students will be able to access PL questions for practice as they traverse the concept graph |
| Admin/Instructor | Start a job that will update the Scaffold Assessments, i.e. first get a current list of all assessments, and then for each concept or subconcepts, check the list of PL questions assigned, and if necessary, update the scaffold assessment for that concept or subconcept to include all of the selected questions, and remove any questions that no longer appears | So that students will be able to access PL questions for practice as they traverse the concept graph |

### Student User Stories that rely on things set up during the PL-Scaffold interface 

There are no student functions that involve direct communciation with PL, other than using links to assessments that have already been set up by Admin/Instructor actions.  Accordingly, student functions do not use either the Github PAT or the PL PAT.

 As a(n) ... | I can... | So that... |
|-|-|-|
| Student | Select from among the PL assessments that have been chosen by my instructor, then select any question, and see if the instructor has set up any concepts that go with that question | So that I can better understand what concepts each questions relies on, learn and practice the needed skills/knowledge, and do better on my assessments |
| Student | Traverse the concept graph, and for any concept or subconcept, access a custom "Scaffold Assessment" in PL to check my mastery of that concept | So that as I traverse the concept graph, I can check my understanding |

## Possible future features

The features below are not on the roadmap for the current epic, but are potentially feasible given the API capabilities:

### Concept and Assessment Coverage

These that are analogous to "code coverage" in software testing but for course concepts:

* Concept Coverage: Give the instructor an overall sense (e.g. percentage) of how many of the concepts/subconcepts are covered by PL questions, as well as identifying specfically where the gaps are.  
* Assessment Coverage: Give the instructor an overall sense (e.g. percentage) of how many of the questions on assessments are tied to concepts, as well as identifying specifically where the gaps are.
* Tracking both kinds of coverage over time.

### Student Mastery Reports

The PL API can access actual assessment_instances (meaning students taking the assessment).  

This means it may be possible to:
* Show a student which Scaffold assessments they have completed, and how well they did.  This could support mastery-based-learning by showing students very clearly which concepts they have demonstrated mastery of, and which they haven't, and tracking their progress.
* Show a student, for a past assessment (e.g. an exam in the testing center), to include the asssessment after the fact, and flag the questions the student got wrong, allowing them to highlight the concepts they need to review. 




