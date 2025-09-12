/** Base class for domain-specific errors. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown when a requested entity cannot be found. */
export class NotFoundError extends DomainError {}
/** Thrown when input fails domain validation rules. */
export class ValidationError extends DomainError {}
/** Error for illegal state transitions in aggregates. */
export class InvalidStateTransitionError extends DomainError {
  public readonly from: string;
  public readonly action: string;
  constructor(from: string, action: string) {
    super(`Invalid transition from '${from}' using action '${action}'`);
    this.from = from;
    this.action = action;
  }
}
/** Thrown when pricing cannot be resolved or applied. */
export class PricingError extends DomainError {}
