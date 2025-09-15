export interface SiteConfigurationProps {
  readonly webOrigin: string; // e.g., https://www.example.com
  readonly bffOrigin: string; // e.g., https://api.example.com
  readonly apiBasePath?: string; // default '/api' if BFF exposes under a path
  readonly csrfHeaderName?: string; // default 'X-CSRF-Token'
}

export class SiteConfiguration {
  private readonly props: Readonly<Required<SiteConfigurationProps>>;

  public constructor(props: SiteConfigurationProps) {
    const normalized: Required<SiteConfigurationProps> = {
      webOrigin: props.webOrigin.replace(/\/$/, ''),
      bffOrigin: props.bffOrigin.replace(/\/$/, ''),
      apiBasePath: props.apiBasePath ?? '/api',
      csrfHeaderName: props.csrfHeaderName ?? 'X-CSRF-Token',
    } as const;
    this.props = normalized;
  }

  public get webOrigin(): string {
    return this.props.webOrigin;
  }

  public get bffOrigin(): string {
    return this.props.bffOrigin;
  }

  public get apiBasePath(): string {
    return this.props.apiBasePath;
  }

  public get csrfHeaderName(): string {
    return this.props.csrfHeaderName;
  }

  // Full base URL the browser should call (BFF only)
  public get apiBaseUrl(): string {
    return `${this.props.bffOrigin}${this.ensureLeadingSlash(this.props.apiBasePath)}`;
  }

  // Utility for fetch wrappers
  public defaultFetchOptions(csrfToken?: string): {
    readonly credentials: 'include';
    readonly headers: Readonly<Record<string, string>>;
  } {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (csrfToken) {
      headers[this.props.csrfHeaderName] = csrfToken;
    }
    return {
      credentials: 'include',
      headers: headers as Readonly<Record<string, string>>,
    } as const;
  }

  private ensureLeadingSlash(p: string): string {
    return p.startsWith('/') ? p : `/${p}`;
  }
}
