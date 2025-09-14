export interface SiteConfigurationProps {
  readonly apiBaseUrl: string;
  // Add more config options as needed, e.g.:
  // readonly cdnBaseUrl?: string;
  // readonly webHost?: string;
}

export class SiteConfiguration {
  private readonly props: SiteConfigurationProps;

  constructor(props: SiteConfigurationProps) {
    this.props = props;
  }

  get apiBaseUrl(): string {
    return this.props.apiBaseUrl;
  }

  // Add more getters as needed
}
