import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/integration-api";
import { computeImportanceForReorder } from "./view-utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeTask = (id: string, importance: number): Task =>
	({
		id,
		importance,
		project_id: "p1",
		title: id,
		sprint_id: null,
		status_id: "s1",
		task_type_id: null,
		parent_task_id: null,
		description: null,
		assignee_id: null,
		reporter_id: null,
		custom_fields: {},
		view_position: null,
		view_group_key: null,
		created_at: "2026-01-01T00:00:00Z",
		updated_at: "2026-01-01T00:00:00Z",
	}) as Task;

// Bucket boundaries: None=0, Low=1-19, Medium=20-49, High=50-99, Critical=100+

// ── computeImportanceForReorder ───────────────────────────────────────────────

describe("computeImportanceForReorder", () => {
	// ── same-index (no-op) ──────────────────────────────────────────────────

	describe("no-op cases", () => {
		it("returns the current importance when fromIndex === toIndex", () => {
			const tasks = [makeTask("a", 80), makeTask("b", 60), makeTask("c", 40)];
			expect(computeImportanceForReorder(tasks, 1, 1)).toBe(60);
		});

		it("returns the task importance when there is only one task", () => {
			const tasks = [makeTask("a", 110)];
			expect(computeImportanceForReorder(tasks, 0, 0)).toBe(110);
		});

		it("returns 0 for an empty task list", () => {
			expect(computeImportanceForReorder([], 0, 0)).toBe(0);
		});
	});

	// ── midpoint between two neighbours ────────────────────────────────────

	describe("midpoint between two neighbours", () => {
		it("returns the integer midpoint between the two surrounding tasks", () => {
			// tasks sorted desc: [80, 60, 40]
			const tasks = [makeTask("a", 80), makeTask("b", 60), makeTask("c", 40)];
			// drag c (index 2) to between a and b (toIndex=1)
			expect(computeImportanceForReorder(tasks, 2, 1)).toBe(70);
		});

		it("rounds midpoint when the gap is odd", () => {
			// [100, 51, 20] → drag c to index 1 → midpoint(100, 51) = round(75.5) = 76
			const tasks = [makeTask("a", 100), makeTask("b", 51), makeTask("c", 20)];
			expect(computeImportanceForReorder(tasks, 2, 1)).toBe(76);
		});

		it("returns the higher importance when both neighbours have equal values", () => {
			const tasks = [makeTask("a", 75), makeTask("b", 75), makeTask("c", 75)];
			// drag c to between a and b
			expect(computeImportanceForReorder(tasks, 2, 1)).toBe(75);
		});

		it("returns the higher value when neighbouring importances differ by exactly 1", () => {
			// gap of 1 cannot be split — ties with upper neighbour is acceptable
			const tasks = [makeTask("a", 51), makeTask("b", 50), makeTask("c", 30)];
			// drag c between a and b → hi=51, lo=50 → round(101/2)=51
			expect(computeImportanceForReorder(tasks, 2, 1)).toBe(51);
		});

		it("returns the higher value when hi < lo (unsorted data)", () => {
			const tasks = [makeTask("a", 30), makeTask("b", 80), makeTask("c", 20)];
			// drag c (index 2) to index 1 → after splice: [30, 20, 80]
			// higher=reordered[0]=30, lower=reordered[2]=80 → hi=30 ≤ lo=80 → return hi=30
			expect(computeImportanceForReorder(tasks, 2, 1)).toBe(30);
		});
	});

	// ── first position (drag to top) ────────────────────────────────────────

	describe("first position — no higher neighbour", () => {
		it("returns a value strictly greater than the current top task", () => {
			const tasks = [makeTask("a", 60), makeTask("b", 50)];
			// drag b (index 1) to index 0
			const result = computeImportanceForReorder(tasks, 1, 0);
			expect(result).toBeGreaterThan(60);
		});

		it("stays in the High bucket (50–99) when the top task is at 80", () => {
			const tasks = [makeTask("a", 80), makeTask("b", 55)];
			const bucketBounds = { min: 50, max: 99 };
			const result = computeImportanceForReorder(tasks, 1, 0, bucketBounds);
			expect(result).toBeGreaterThanOrEqual(50);
			expect(result).toBeLessThanOrEqual(99);
		});

		it("stays Critical (≥100) when the top task is at importance 100 — the core regression", () => {
			// Before the fix: lo=0, hi=120 → result=60 (High) ✗
			const tasks = [makeTask("a", 110), makeTask("b", 100)];
			const bucketBounds = { min: 100, max: Number.MAX_SAFE_INTEGER };
			const result = computeImportanceForReorder(tasks, 1, 0, bucketBounds);
			expect(result).toBeGreaterThanOrEqual(100);
		});

		it("stays High even when top task sits at the Low–Medium boundary — another regression case", () => {
			// High swimlane: tasks [60, 50]; drag bottom to first
			// Old algorithm: lo=0, hi=70 → result=35 (Medium) ✗
			const tasks = [makeTask("a", 60), makeTask("b", 50)];
			const bucketBounds = { min: 50, max: 99 };
			const result = computeImportanceForReorder(tasks, 1, 0, bucketBounds);
			expect(result).toBeGreaterThanOrEqual(50);
			expect(result).toBeLessThanOrEqual(99);
		});

		it("stays Medium (20–49) when the top task is at 40", () => {
			const tasks = [makeTask("a", 40), makeTask("b", 20)];
			const bucketBounds = { min: 20, max: 49 };
			const result = computeImportanceForReorder(tasks, 1, 0, bucketBounds);
			expect(result).toBeGreaterThanOrEqual(20);
			expect(result).toBeLessThanOrEqual(49);
		});

		it("stays Low (1–19) when the top task is at 10", () => {
			const tasks = [makeTask("a", 10), makeTask("b", 1)];
			const bucketBounds = { min: 1, max: 19 };
			const result = computeImportanceForReorder(tasks, 1, 0, bucketBounds);
			expect(result).toBeGreaterThanOrEqual(1);
			expect(result).toBeLessThanOrEqual(19);
		});

		it("clamps to bucketBounds.max when the proportional step would overflow the bucket", () => {
			// High top task at 99; step=ceil(99/2)=50 → 149 → clamped to 99
			const tasks = [makeTask("a", 99), makeTask("b", 70)];
			const bucketBounds = { min: 50, max: 99 };
			const result = computeImportanceForReorder(tasks, 1, 0, bucketBounds);
			expect(result).toBeLessThanOrEqual(99);
		});

		it("without bounds: first position in a mixed list gives importance above the current top", () => {
			// No swimlane clamping — crossing buckets is expected
			const tasks = [makeTask("a", 100), makeTask("b", 60), makeTask("c", 5)];
			const result = computeImportanceForReorder(tasks, 2, 0);
			expect(result).toBeGreaterThan(100);
		});
	});

	// ── last position (drag to bottom) ─────────────────────────────────────

	describe("last position — no lower neighbour", () => {
		it("returns a value strictly less than the current bottom task when no bounds given", () => {
			const tasks = [makeTask("a", 90), makeTask("b", 70)];
			// drag a (index 0) to index 1 (last)
			const result = computeImportanceForReorder(tasks, 0, 1);
			expect(result).toBeLessThan(70);
		});

		it("stays in the High bucket (50–99) when the last task is at 52 — core regression", () => {
			// Without the fix: result equals lo.importance (rounds up) → stays at 52 (still High, but wrong)
			// With the fix: result = max(0, 52-1) = 51 (still High ✓), then clamped if needed
			const tasks = [makeTask("a", 90), makeTask("b", 52)];
			const bucketBounds = { min: 50, max: 99 };
			const result = computeImportanceForReorder(tasks, 0, 1, bucketBounds);
			expect(result).toBeGreaterThanOrEqual(50);
			expect(result).toBeLessThanOrEqual(99);
		});

		it("stays Critical (≥100) when the last task is at importance 101", () => {
			const tasks = [makeTask("a", 200), makeTask("b", 101)];
			const bucketBounds = { min: 100, max: Number.MAX_SAFE_INTEGER };
			const result = computeImportanceForReorder(tasks, 0, 1, bucketBounds);
			expect(result).toBeGreaterThanOrEqual(100);
		});

		it("stays Low (≥1) when the last task is at importance 1 — does not drop to None", () => {
			// Old algorithm: lo=max(0, 0)=0, hi=1 → round(0.5)=1 (this case was OK)
			// New algorithm: max(0, 1-1)=0 → clamped to min=1
			const tasks = [makeTask("a", 15), makeTask("b", 1)];
			const bucketBounds = { min: 1, max: 19 };
			const result = computeImportanceForReorder(tasks, 0, 1, bucketBounds);
			expect(result).toBeGreaterThanOrEqual(1);
		});

		it("clamps to bucketBounds.min when going one below the bucket floor", () => {
			// High last task at 50; 50-1=49 (Medium) → clamped to 50
			const tasks = [makeTask("a", 80), makeTask("b", 50)];
			const bucketBounds = { min: 50, max: 99 };
			const result = computeImportanceForReorder(tasks, 0, 1, bucketBounds);
			expect(result).toBeGreaterThanOrEqual(50);
		});

		it("without bounds: last position below a Low=5 task gives importance < 5", () => {
			const tasks = [makeTask("a", 90), makeTask("b", 60), makeTask("c", 5)];
			const result = computeImportanceForReorder(tasks, 0, 2);
			expect(result).toBeLessThan(5);
		});
	});

	// ── swimlane index-mismatch regression ─────────────────────────────────

	describe("bucket bounds prevent value escaping the swimlane", () => {
		it("High swimlane first position: 3-task band, drag last to first stays High", () => {
			// All tasks are in High bucket (50–99)
			const tasks = [makeTask("a", 90), makeTask("b", 75), makeTask("c", 55)];
			const bucketBounds = { min: 50, max: 99 };
			const result = computeImportanceForReorder(tasks, 2, 0, bucketBounds);
			expect(result).toBeGreaterThanOrEqual(50);
			expect(result).toBeLessThanOrEqual(99);
		});

		it("Critical swimlane last position: 2-task band, drag first to last stays Critical", () => {
			const tasks = [makeTask("a", 200), makeTask("b", 100)];
			const bucketBounds = { min: 100, max: Number.MAX_SAFE_INTEGER };
			const result = computeImportanceForReorder(tasks, 0, 1, bucketBounds);
			expect(result).toBeGreaterThanOrEqual(100);
		});

		it("Medium swimlane first position with tight range (20–49) stays Medium", () => {
			const tasks = [makeTask("a", 48), makeTask("b", 20)];
			const bucketBounds = { min: 20, max: 49 };
			const result = computeImportanceForReorder(tasks, 1, 0, bucketBounds);
			expect(result).toBeGreaterThanOrEqual(20);
			expect(result).toBeLessThanOrEqual(49);
		});

		it("Medium swimlane last position with tight range (20–49) stays Medium", () => {
			const tasks = [makeTask("a", 49), makeTask("b", 20)];
			const bucketBounds = { min: 20, max: 49 };
			const result = computeImportanceForReorder(tasks, 0, 1, bucketBounds);
			expect(result).toBeGreaterThanOrEqual(20);
			expect(result).toBeLessThanOrEqual(49);
		});
	});

	// ── drag from last to first (large jump) ───────────────────────────────

	describe("large in-band reorder", () => {
		it("drag from last to first position in a 4-task High band stays High", () => {
			const tasks = [
				makeTask("a", 90),
				makeTask("b", 75),
				makeTask("c", 65),
				makeTask("d", 51),
			];
			const bucketBounds = { min: 50, max: 99 };
			const result = computeImportanceForReorder(tasks, 3, 0, bucketBounds);
			expect(result).toBeGreaterThanOrEqual(50);
			expect(result).toBeLessThanOrEqual(99);
			expect(result).toBeGreaterThan(90); // should be above the previous top
		});

		it("drag from first to last in a 4-task Medium band stays Medium", () => {
			const tasks = [
				makeTask("a", 48),
				makeTask("b", 40),
				makeTask("c", 30),
				makeTask("d", 21),
			];
			const bucketBounds = { min: 20, max: 49 };
			const result = computeImportanceForReorder(tasks, 0, 3, bucketBounds);
			expect(result).toBeGreaterThanOrEqual(20);
			expect(result).toBeLessThanOrEqual(49);
		});
	});
});
