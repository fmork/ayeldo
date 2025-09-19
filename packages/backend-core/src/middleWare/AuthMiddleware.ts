import { ILogWriter } from '../logging/ILogWriter';
import { JwtAuthorization } from '../security/JwtAuthorization';
import { UserJwtPayload } from '../types';
import { HttpMiddleware, HttpRequest, HttpResponse } from '../controllers/http';

interface AuthMiddlewareProps {
  jwtAuthorization: JwtAuthorization;
  logWriter: ILogWriter;
}
export class AuthMiddleware {
  constructor(private readonly props: AuthMiddlewareProps) {}
  public authorizeRequest: HttpMiddleware = async (req: HttpRequest, res: HttpResponse, next: () => void): Promise<void> => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'Authorization token is missing' });
    } else {
      try {
        const verified = await this.props.jwtAuthorization.getVerifiedToken(token);

        // Optionally attach user info to request object
        (req as any).user = verified as UserJwtPayload;
        next();
      } catch (error) {
        const _error = error as Error;
        this.props.logWriter.error(`Error in ${this.constructor.name}.${this.authorizeRequest.name}()`, _error);
        res.status(401).json({ message: 'Invalid or expired token' });
      }
    }
  };
}
