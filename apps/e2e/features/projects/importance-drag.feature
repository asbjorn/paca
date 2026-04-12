@projects @integrations @views @importance @drag
Feature: Drag-to-update importance
  When a view is sorted by "Importance" (descending), users can reorder tasks
  by dragging them up or down.  Dropping a task recomputes its raw importance
  value so the task ends up between its new neighbours.

  Importance levels and their numeric ranges:
    None     → 0
    Low      → 1 – 19
    Medium   → 20 – 49
    High     → 50 – 99
    Critical → 100+

  When swimlanes are also grouped "by Importance", every swimlane band shows
  only tasks of one bucket.  Dropping a task within a band must keep its
  importance value inside that bucket; dropping across a band intentionally
  moves it to the target bucket.

  ═══════════════════════════════════════════════════════════════════════════
  Background
  ═══════════════════════════════════════════════════════════════════════════

  @authenticated
  Background:
    Given the user already has a stored authenticated session
    And a project named "E2E_IMP_DRAG_PROJECT" exists
    And the project has a "Product Backlog" integration with a "Board" view
    And the user has the "Edit Tasks" project permission in "E2E_IMP_DRAG_PROJECT"
    And the integration view is configured with "Sort by: Importance"
    And the user has navigated to the board view inside "E2E_IMP_DRAG_PROJECT"

  ═══════════════════════════════════════════════════════════════════════════
  Rule: Midpoint reorder — dragging a task between two neighbours
  ═══════════════════════════════════════════════════════════════════════════

  Scenario: Dragging a task between two neighbours assigns the midpoint importance
    Given the "Todo" column contains tasks ordered by importance:
      | Task Name     | Importance value |
      | E2E_TOP_TASK  | 80               |
      | E2E_MID_TASK  | 60               |
      | E2E_BOT_TASK  | 40               |
    When the user drags "E2E_BOT_TASK" and drops it between "E2E_TOP_TASK" and "E2E_MID_TASK"
    Then the importance of "E2E_BOT_TASK" should be updated to approximately 70
    And "E2E_BOT_TASK" should appear between "E2E_TOP_TASK" and "E2E_MID_TASK" in the column

  Scenario: Dragging a task between neighbours with a gap of 1 keeps the upper importance
    Given the "Todo" column contains tasks ordered by importance:
      | Task Name     | Importance value |
      | E2E_TASK_A    | 51               |
      | E2E_TASK_B    | 50               |
    When the user drags "E2E_TASK_B" and drops it above "E2E_TASK_A"
    Then the importance of "E2E_TASK_B" should remain 51 (tied with its upper neighbour)
    And the task order should not change in an unexpected way

  Scenario: Dragging a task between two neighbours with equal importance keeps that value
    Given the "Todo" column contains tasks ordered by importance:
      | Task Name     | Importance value |
      | E2E_EQUAL_A   | 75               |
      | E2E_EQUAL_B   | 75               |
      | E2E_EQUAL_C   | 75               |
    When the user drags "E2E_EQUAL_C" and drops it between "E2E_EQUAL_A" and "E2E_EQUAL_B"
    Then the importance of "E2E_EQUAL_C" should remain 75

  ═══════════════════════════════════════════════════════════════════════════
  Rule: First-position drop — task becomes the most important in its group
  ═══════════════════════════════════════════════════════════════════════════

  Scenario: Dragging a task to the top of an importance-sorted column gives it a higher importance than the previous top
    Given the "Todo" column contains tasks ordered by importance:
      | Task Name      | Importance value |
      | E2E_TOP_TASK   | 60               |
      | E2E_BTM_TASK   | 50               |
    When the user drags "E2E_BTM_TASK" to the first position in the "Todo" column
    Then the importance of "E2E_BTM_TASK" should be strictly greater than 60
    And "E2E_BTM_TASK" should appear at the top of the "Todo" column

  Scenario: Dragging to first position in the same importance bucket does not change the bucket
    Given the view has swimlanes grouped by "Importance"
    And the "High" swimlane band in the "Todo" column contains tasks ordered by importance:
      | Task Name      | Importance value |
      | E2E_HIGH_TOP   | 80               |
      | E2E_HIGH_BTM   | 55               |
    When the user drags "E2E_HIGH_BTM" to the first position in the "High" swimlane band
    Then the importance of "E2E_HIGH_BTM" should be in the range 50 – 99
    And "E2E_HIGH_BTM" should appear at the top of the "High" swimlane band
    And "E2E_HIGH_BTM" should NOT appear in the "Critical" swimlane band

  Scenario: Dragging to first position in the Critical band stays Critical
    Given the view has swimlanes grouped by "Importance"
    And the "Critical" swimlane band in the "Todo" column contains:
      | Task Name      | Importance value |
      | E2E_CRIT_TOP   | 150              |
      | E2E_CRIT_BTM   | 100              |
    When the user drags "E2E_CRIT_BTM" to the first position in the "Critical" swimlane band
    Then the importance of "E2E_CRIT_BTM" should be 100 or greater
    And "E2E_CRIT_BTM" should remain visible in the "Critical" swimlane band

  Scenario: Dragging to first position in the Medium band stays Medium
    Given the view has swimlanes grouped by "Importance"
    And the "Medium" swimlane band in the "Todo" column contains:
      | Task Name       | Importance value |
      | E2E_MED_TOP     | 40               |
      | E2E_MED_BTM     | 20               |
    When the user drags "E2E_MED_BTM" to the first position in the "Medium" swimlane band
    Then the importance of "E2E_MED_BTM" should be in the range 20 – 49
    And "E2E_MED_BTM" should remain visible in the "Medium" swimlane band

  Scenario: Dragging to first position in the Low band stays Low
    Given the view has swimlanes grouped by "Importance"
    And the "Low" swimlane band in the "Todo" column contains:
      | Task Name      | Importance value |
      | E2E_LOW_TOP    | 10               |
      | E2E_LOW_BTM    | 1                |
    When the user drags "E2E_LOW_BTM" to the first position in the "Low" swimlane band
    Then the importance of "E2E_LOW_BTM" should be in the range 1 – 19
    And "E2E_LOW_BTM" should remain visible in the "Low" swimlane band

  ═══════════════════════════════════════════════════════════════════════════
  Rule: Last-position drop — task becomes the least important in its group
  ═══════════════════════════════════════════════════════════════════════════

  Scenario: Dragging a task to the bottom of an importance-sorted column gives it a lower importance than the previous bottom
    Given the "Todo" column contains tasks ordered by importance:
      | Task Name      | Importance value |
      | E2E_TOP_T2     | 90               |
      | E2E_BTM_T2     | 70               |
    When the user drags "E2E_TOP_T2" to the last position in the "Todo" column
    Then the importance of "E2E_TOP_T2" should be strictly less than 70
    And "E2E_TOP_T2" should appear at the bottom of the "Todo" column

  Scenario: Dragging to last position in the same importance bucket does not change the bucket
    Given the view has swimlanes grouped by "Importance"
    And the "High" swimlane band in the "Todo" column contains:
      | Task Name      | Importance value |
      | E2E_HIGH_T2    | 90               |
      | E2E_HIGH_BTM2  | 52               |
    When the user drags "E2E_HIGH_T2" to the last position in the "High" swimlane band
    Then the importance of "E2E_HIGH_T2" should be in the range 50 – 99
    And "E2E_HIGH_T2" should remain visible in the "High" swimlane band
    And "E2E_HIGH_T2" should NOT appear in the "Medium" swimlane band

  Scenario: Dragging to last position in the Low band stays Low (does not drop to None)
    Given the view has swimlanes grouped by "Importance"
    And the "Low" swimlane band in the "Todo" column contains:
      | Task Name      | Importance value |
      | E2E_LOW_T2     | 15               |
      | E2E_LOW_BTM2   | 1                |
    When the user drags "E2E_LOW_T2" to the last position in the "Low" swimlane band
    Then the importance of "E2E_LOW_T2" should be 1 or greater
    And "E2E_LOW_T2" should remain visible in the "Low" swimlane band
    And "E2E_LOW_T2" should NOT appear in the "None" swimlane band

  Scenario: Dragging to last position in the Critical band stays Critical
    Given the view has swimlanes grouped by "Importance"
    And the "Critical" swimlane band in the "Todo" column contains:
      | Task Name        | Importance value |
      | E2E_CRIT_T2      | 200              |
      | E2E_CRIT_BTM2    | 101              |
    When the user drags "E2E_CRIT_T2" to the last position in the "Critical" swimlane band
    Then the importance of "E2E_CRIT_T2" should be 100 or greater
    And "E2E_CRIT_T2" should remain visible in the "Critical" swimlane band

  ═══════════════════════════════════════════════════════════════════════════
  Rule: Dropping a task on itself does not change its importance
  ═══════════════════════════════════════════════════════════════════════════

  Scenario: Dragging a task and dropping it on its own position makes no change
    Given the "Todo" column contains tasks ordered by importance:
      | Task Name      | Importance value |
      | E2E_SAME_A     | 80               |
      | E2E_SAME_B     | 60               |
    When the user drags "E2E_SAME_B" and drops it onto "E2E_SAME_B"
    Then the importance of "E2E_SAME_B" should remain 60
    And the column order should not change

  ═══════════════════════════════════════════════════════════════════════════
  Rule: Single task in a group — drag has no effect on importance
  ═══════════════════════════════════════════════════════════════════════════

  Scenario: Dragging the only task in a swimlane band does not change its importance
    Given the view has swimlanes grouped by "Importance"
    And the "Critical" swimlane band in the "Todo" column contains only:
      | Task Name        | Importance value |
      | E2E_SOLO_CRIT    | 110              |
    When the user attempts to drag "E2E_SOLO_CRIT" within the "Critical" swimlane band
    Then the importance of "E2E_SOLO_CRIT" should remain 110

  ═══════════════════════════════════════════════════════════════════════════
  Rule: Dragging across swimlane bands changes the importance bucket
  ═══════════════════════════════════════════════════════════════════════════

  Scenario: Dragging a task from a High band to the Critical band upgrades its importance
    Given the view has swimlanes grouped by "Importance"
    And the "High" swimlane band contains the task "E2E_CROSS_HIGH" with importance 70
    When the user drags "E2E_CROSS_HIGH" and drops it onto the "Critical" swimlane band
    Then the importance of "E2E_CROSS_HIGH" should be 100 or greater
    And "E2E_CROSS_HIGH" should appear in the "Critical" swimlane band
    And "E2E_CROSS_HIGH" should no longer appear in the "High" swimlane band

  Scenario: Dragging a task from a Critical band to the Medium band downgrades its importance
    Given the view has swimlanes grouped by "Importance"
    And the "Critical" swimlane band contains the task "E2E_CROSS_CRIT" with importance 120
    When the user drags "E2E_CROSS_CRIT" and drops it onto the "Medium" swimlane band
    Then the importance of "E2E_CROSS_CRIT" should be in the range 20 – 49
    And "E2E_CROSS_CRIT" should appear in the "Medium" swimlane band
    And "E2E_CROSS_CRIT" should no longer appear in the "Critical" swimlane band

  ═══════════════════════════════════════════════════════════════════════════
  Rule: No swimlane — first/last position in a fully mixed importance list
  ═══════════════════════════════════════════════════════════════════════════

  Scenario: Dragging a Low task to first position in a mixed importance list makes it the most critical
    Given the view has no swimlanes
    And the "Todo" column contains tasks ordered by importance:
      | Task Name     | Importance value |
      | E2E_CRIT_MIX  | 100              |
      | E2E_HIGH_MIX  | 60               |
      | E2E_MED_MIX   | 25               |
      | E2E_LOW_MIX   | 5                |
    When the user drags "E2E_LOW_MIX" to the first position in the "Todo" column
    Then the importance of "E2E_LOW_MIX" should be strictly greater than 100
    And "E2E_LOW_MIX" should appear at the top of the "Todo" column

  Scenario: Dragging a Critical task to last position in a mixed importance list gives it the lowest importance
    Given the view has no swimlanes
    And the "Todo" column contains tasks ordered by importance:
      | Task Name      | Importance value |
      | E2E_CRIT_MX2   | 100              |
      | E2E_HIGH_MX2   | 60               |
      | E2E_LOW_MX2    | 5                |
    When the user drags "E2E_CRIT_MX2" to the last position in the "Todo" column
    Then the importance of "E2E_CRIT_MX2" should be strictly less than 5
    And "E2E_CRIT_MX2" should appear at the bottom of the "Todo" column
