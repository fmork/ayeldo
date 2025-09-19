import type { Jwt, JwtHeader, JwtPayload } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import type { ILogWriter } from '../logging/ILogWriter';
import type { TokenKeyCache } from './TokenKeyCache';
interface JwtAuthorizationProps {
  tokenKeyCache: TokenKeyCache;
  getKnownIssuers: () => string[];
  logWriter: ILogWriter;
}

/**
 * This class is responsible for decoding and verifying JWT tokens. It validates
 * token signatures, but only towards known issuers. If the token comes from
 * an unknown issuer, the validation will fail.
 */
export class JwtAuthorization {
  constructor(private readonly props: JwtAuthorizationProps) {}

  public decodeToken = (token: string): jwt.JwtPayload => {
    return jwt.decode(token) as JwtPayload;
  };

  /**
   * Gets the verified token. This method will fetch the public key and
   * decode and verify the token. If the token is invalid, it will throw an
   * error.
   */
  public getVerifiedToken = async (token: string): Promise<jwt.JwtPayload> => {
    try {
      const publicKey = await this.getPublicKey(token);
      const verified = jwt.verify(token, publicKey) as JwtPayload;
      return verified;
    } catch (error) {
      const _error = error as Error;
      this.props.logWriter.error(`Error in getVerifiedToken: ${_error.message}`, _error);
      throw error;
    }
  };

  /**
   * Get the public key for the token. This method will fetch the key from the
   * cache if it exists, otherwise it will fetch it from the issuer.
   */
  private getPublicKey = async (token: string): Promise<string> => {
    const decoded = jwt.decode(token, { complete: true }) as Jwt | null;
    if (!decoded) {
      throw new Error('Invalid token: unable to decode');
    }
    const payload: JwtPayload = decoded.payload as JwtPayload;
    const header: JwtHeader = decoded.header as JwtHeader;

    // Verify that the token has a key id
    this.VerifyTokenHasKeyId(header);
    // Verify that the token has an issuer
    this.VerifyTokenHasIssuer(payload);
    // Verify that the issuer is known
    this.verifyTokenIssuerIsKnown(payload);

    const iss = payload.iss as string;
    const kid = header.kid as string;
    const publicKey = await this.props.tokenKeyCache.getKey(iss, kid);
    return publicKey;
  };

  private verifyTokenIssuerIsKnown(payload: jwt.JwtPayload): void {
    if (!this.props.getKnownIssuers().some((x) => x === payload.iss)) {
      const errorText = 'Jwt payload has no known issuer';
      this.props.logWriter.warn(`${errorText}. payload: ${JSON.stringify(payload)}`);
      throw new Error(errorText);
    }
  }

  private VerifyTokenHasIssuer(payload: jwt.JwtPayload): void {
    if (!payload.iss) {
      const errorText = 'Jwt payload has no issuer';
      this.props.logWriter.warn(`${errorText}. payload: ${JSON.stringify(payload)}`);
      throw new Error(errorText);
    }
  }

  private VerifyTokenHasKeyId(header: jwt.JwtHeader): void {
    if (!header.kid) {
      const errorText = 'Jwt header has no key id';
      this.props.logWriter.warn(`${errorText}. header: ${JSON.stringify(header)}`);
      throw new Error(errorText);
    }
  }
}
