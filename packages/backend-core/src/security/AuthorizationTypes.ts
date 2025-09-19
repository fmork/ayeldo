export interface AuthorizationRequirement {
  /** Values that must be present in the JWT token's configured claims */
  requiredValues?: string[];
  /** @deprecated Use requiredValues instead. Kept for backward compatibility. */
  requiredGroups?: string[];
}

export interface RouteAuthorizationConfig {
  [path: string]: AuthorizationRequirement;
}
