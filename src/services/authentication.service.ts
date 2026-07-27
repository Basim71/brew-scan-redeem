// Barrel — authentication service.
// Consolidates the sign-in / workspace-selection flow already implemented in
// `src/features/authentication/services/authentication.service.ts` under the
// unified `src/services/*` tree so that pages import from a single location.
export * from "@/features/authentication/services/authentication.service";