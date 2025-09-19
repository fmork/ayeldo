export interface ISystemTime {
  now(): Date;
}

export class SystemTime implements ISystemTime {
  public now(): Date {
    return new Date();
  }
}
