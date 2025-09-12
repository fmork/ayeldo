export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {}
export class ValidationError extends DomainError {}
export class InvalidStateTransitionError extends DomainError {
  public readonly from: string;
  public readonly action: string;
  constructor(from: string, action: string) {
    super(`Invalid transition from '${from}' using action '${action}'`);
    this.from = from;
    this.action = action;
  }
}
export class PricingError extends DomainError {}
