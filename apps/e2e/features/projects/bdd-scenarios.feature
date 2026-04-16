@ui @task-detail @bdd-scenarios
Feature: BDD Scenarios on task detail
  A task can carry one or more BDD (Behavior-Driven Development) scenarios
  that describe the expected behaviour in Given / When / Then format.
  Scenarios are managed directly from the task detail modal and are
  persisted per task.  Only members with the "tasks.write" permission can
  create, edit, or delete scenarios; read-only members may view them.

  @authenticated
  Rule: CRUD operations on BDD scenarios

    Background:
      Given the user already has a stored authenticated session
      And a project exists with at least one task

    Scenario: Creating a BDD scenario with a title
      When the user opens the task detail modal
      And clicks "Add scenario" in the BDD Scenarios section
      And enters a scenario title "User can log in"
      And clicks "Create scenario"
      Then the new scenario "User can log in" appears in the BDD Scenarios section

    Scenario: Creating a scenario with Given / When / Then clauses
      When the user opens the task detail modal
      And clicks "Add scenario" in the BDD Scenarios section
      And enters a scenario title "Successful login"
      And expands the Given / When / Then form
      And fills in the Given clause "a registered user"
      And fills in the When clause "the user submits valid credentials"
      And fills in the Then clause "the user is redirected to the dashboard"
      And clicks "Create scenario"
      Then the scenario "Successful login" appears in the list
      And expanding the scenario reveals the Given, When, and Then clauses

    Scenario: Editing a BDD scenario title inline
      Given a BDD scenario "Old Title" exists on the task
      When the user opens the task detail modal
      And clicks on the title "Old Title" inside the scenario card
      And changes the title to "New Title"
      And blurs the title field
      Then the scenario card shows the updated title "New Title"

    Scenario: Deleting a BDD scenario
      Given a BDD scenario "To Be Deleted" exists on the task
      When the user opens the task detail modal
      And hovers over the "To Be Deleted" scenario card
      And clicks the delete icon on that card
      Then the "To Be Deleted" scenario no longer appears in the list

    Scenario: Empty state when no scenarios exist
      When the user opens the task detail modal
      And the task has no BDD scenarios
      Then the BDD Scenarios section shows the "No BDD scenarios yet" message
