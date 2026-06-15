import { describe, expect, it } from "vitest";

import {
	MIN_PASSWORD_LENGTH,
	MIN_USERNAME_LENGTH,
	validateConfirmPassword,
	validateNewPassword,
	validatePassword,
	validateUsername,
} from "./auth-validation";

describe("validateUsername", () => {
	it("requires a non-empty value", () => {
		expect(validateUsername("")).toBe("Username is required.");
	});

	it("requires a non-whitespace value", () => {
		expect(validateUsername("   ")).toBe("Username is required.");
	});

	it("enforces the minimum length", () => {
		expect(validateUsername("ab")).toBe(
			`Username must be at least ${MIN_USERNAME_LENGTH} characters.`,
		);
	});

	it("accepts a sufficiently long value", () => {
		expect(validateUsername("alice")).toBeUndefined();
	});
});

describe("validatePassword", () => {
	it("requires a non-empty value", () => {
		expect(validatePassword("")).toBe("Password is required.");
	});

	it("enforces the minimum length", () => {
		expect(validatePassword("short")).toBe(
			`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
		);
	});

	it("accepts a sufficiently long value", () => {
		expect(validatePassword("validpass1")).toBeUndefined();
	});
});

describe("validateNewPassword", () => {
	it("requires a non-empty value", () => {
		expect(validateNewPassword("")).toBe("New password is required.");
	});

	it("enforces the minimum length", () => {
		expect(validateNewPassword("short")).toBe(
			`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
		);
	});

	it("rejects the same value as the current password", () => {
		expect(validateNewPassword("SamePass1", "SamePass1")).toBe(
			"New password must be different from current password.",
		);
	});

	it("accepts a sufficiently long, different value", () => {
		expect(validateNewPassword("NewPass123", "OldPass123")).toBeUndefined();
	});
});

describe("validateConfirmPassword", () => {
	it("requires a non-empty value", () => {
		expect(validateConfirmPassword("", "NewPass123")).toBe(
			"Please confirm your new password.",
		);
	});

	it("rejects a mismatch", () => {
		expect(validateConfirmPassword("OtherPass1", "NewPass123")).toBe(
			"Passwords do not match.",
		);
	});

	it("accepts a matching value", () => {
		expect(validateConfirmPassword("NewPass123", "NewPass123")).toBeUndefined();
	});
});
