export const PolicyMode = {
  Public: 'public',
  Hidden: 'hidden',
  Restricted: 'restricted',
} as const;

export type PolicyMode = typeof PolicyMode[keyof typeof PolicyMode];

export interface PolicyContext {
  readonly mode: PolicyMode;
  readonly hasLinkToken?: boolean;
  readonly isMember?: boolean;
}

export class PolicyEvaluator {
  evaluate(ctx: PolicyContext): boolean {
    if (ctx.mode === 'public') return true;
    if (ctx.mode === 'hidden') return Boolean(ctx.hasLinkToken);
    if (ctx.mode === 'restricted') return Boolean(ctx.isMember);
    return false;
  }
}

