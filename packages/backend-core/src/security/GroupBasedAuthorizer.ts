import { ILogWriter } from '../logging/ILogWriter';
import { AuthorizationRequirement } from './AuthorizationTypes';
import { ClaimBasedAuthorizer } from './ClaimBasedAuthorizer';
import { JwtAuthorization } from './JwtAuthorization';

interface GroupBasedAuthorizerProps {
  jwtAuthorization: JwtAuthorization;
  logWriter: ILogWriter;
  /**
   * JWT claim properties that contain user groups, in order of preference.
   * The first claim found with a valid array value will be used.
   *
   * Examples:
   * - For AWS Cognito: ['cognito:groups', 'groups']
   * - For Azure AD: ['groups']
   * - For Auth0: ['https://example.com/groups', 'groups']
   * - For custom JWT: ['roles', 'permissions']
   */
  groupClaimNames: string[];
}

/**
 * @deprecated Use ClaimBasedAuthorizer instead. This class is maintained for backward compatibility.
 *
 * Generic group-based authorizer that validates JWT tokens and checks for required groups
 * in configurable JWT claims. This authorizer is provider-agnostic and can work with
 * various JWT token formats by specifying the appropriate claim names.
 */
export class GroupBasedAuthorizer {
  private readonly claimAuthorizer: ClaimBasedAuthorizer;

  constructor(props: GroupBasedAuthorizerProps) {
    // Delegate to the new ClaimBasedAuthorizer
    this.claimAuthorizer = new ClaimBasedAuthorizer({
      jwtAuthorization: props.jwtAuthorization,
      logWriter: props.logWriter,
      claimNames: props.groupClaimNames,
    });
  }

  /**
   * Creates an authorization middleware that validates the token and checks for required groups
   * @deprecated Use ClaimBasedAuthorizer.createAuthorizer instead
   */
  public createAuthorizer = (requirement?: AuthorizationRequirement) => {
    // Convert group-based requirement to claim-based requirement
    let claimRequirement: AuthorizationRequirement | undefined;

    if (requirement) {
      claimRequirement = {
        requiredValues: requirement.requiredGroups || requirement.requiredValues,
      };
    }

    return this.claimAuthorizer.createAuthorizer(claimRequirement);
  };
}
