export interface FrontendConfigurationProps {
  readonly apiBaseUrl: string;
  readonly webOrigin?: string;
  readonly csrfHeaderName?: string;
  readonly deploymentTime?: Date;
  // Add more config options as needed, e.g.:
  // readonly cdnBaseUrl?: string;
  // readonly webHost?: string;
}

export class FrontendConfiguration {
  private readonly props: FrontendConfigurationProps;

  constructor(props: FrontendConfigurationProps) {
    this.props = props;
  }

  get apiBaseUrl(): string {
    return this.props.apiBaseUrl;
  }

  get webOrigin(): string {
    return this.props.webOrigin ?? 'http://localhost';
  }

  get csrfHeaderName(): string {
    return this.props.csrfHeaderName ?? 'X-CSRF-Token';
  }

  get deploymentTime(): Date | undefined {
    return this.props.deploymentTime;
  }

  // Add more getters as needed
}
