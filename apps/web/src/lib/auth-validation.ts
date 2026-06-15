/**
 * Shared validation constants and helpers for auth-related forms.
 *
 * Used by the login form, the change-password form, and the admin user
 * dialog so that every surface applies the same rules and messages.
 */

/** Minimum number of characters a password must contain. */
export const MIN_PASSWORD_LENGTH = 8;

/** Minimum number of characters a username must contain. */
export const MIN_USERNAME_LENGTH = 3;

/**
 * Validate a username.
 *
 * Returns `undefined` when the value is valid, or an error message otherwise.
 */
export function validateUsername(value: string): string | undefined {
	if (!value.trim()) {
		return "Username is required.";
	}

	if (value.trim().length < MIN_USERNAME_LENGTH) {
		return `Username must be at least ${MIN_USERNAME_LENGTH} characters.`;
	}

	return undefined;
}

/**
 * Validate a password that is being entered "as-is" — i.e. a login password
 * or a "current password" field.
 *
 * Returns `undefined` when the value is valid, or an error message otherwise.
 */
export function validatePassword(value: string): string | undefined {
	if (!value) {
		return "Password is required.";
	}

	if (value.length < MIN_PASSWORD_LENGTH) {
		return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
	}

	return undefined;
}

/**
 * Validate a password that the user is choosing for the first time (or
 * replacing an old one with).
 *
 * `currentPassword` is passed so that the new password can be checked against
 * the current password to ensure they differ.
 *
 * Returns `undefined` when the value is valid, or an error message otherwise.
 */
export function validateNewPassword(
	value: string,
	currentPassword?: string,
): string | undefined {
	if (!value) {
		return "New password is required.";
	}

	if (value.length < MIN_PASSWORD_LENGTH) {
		return `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
	}

	if (currentPassword && value === currentPassword) {
		return "New password must be different from current password.";
	}

	return undefined;
}

/**
 * Validate that the confirm-password field matches the new password.
 *
 * Returns `undefined` when the value is valid, or an error message otherwise.
 */
export function validateConfirmPassword(
	value: string,
	newPassword: string,
): string | undefined {
	if (!value) {
		return "Please confirm your new password.";
	}

	if (newPassword !== value) {
		return "Passwords do not match.";
	}

	return undefined;
}
