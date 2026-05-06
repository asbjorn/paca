/**
 * @paca-ai/plugin-sdk-react — public API
 *
 * Re-exports every symbol that plugin micro-frontends may import.
 * Only types and functions listed here are considered stable.
 */

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
	TaskSummary,
	Task,
	TaskFilters,
	ProjectSummary,
	ProjectMember,
	ProjectPermissions,
	PluginMeta,
} from "./types";
export { permissionsFromRole } from "./types";

// ── API Client ────────────────────────────────────────────────────────────────
export { PluginApiClient } from "./api-client";
export type { PluginApiClientOptions } from "./api-client";

// ── UI helpers ────────────────────────────────────────────────────────────────
export type { PluginUI, ToastOptions, ConfirmOptions } from "./ui";
export { NoopPluginUI } from "./ui";

// ── Extension point prop interfaces ───────────────────────────────────────────
export type {
	BaseExtensionProps,
	SidebarGeneralSectionProps,
	SidebarProjectSectionProps,
	TaskDetailSectionProps,
	ProjectSettingsTabProps,
	ViewExtensionProps,
	ExtensionPointProps,
} from "./extension-points";

// ── Plugin context ────────────────────────────────────────────────────────────
export { PluginProvider, usePlugin } from "./plugin-context";
export type { PluginContextValue, PluginProviderProps } from "./plugin-context";

// ── React Query helpers ───────────────────────────────────────────────────────
export {
	PluginQueryClientProvider,
	usePluginQuery,
	usePluginQueryClient,
} from "./query";
