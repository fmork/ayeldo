import TenantRepoDdb from '@ayeldo/infra-aws/src/tenantRepoDdb';
import UserRepoDdb from '@ayeldo/infra-aws/src/userRepoDdb';
import OnboardingService from '../services/onboardingService';
import { TenantService } from '../services/tenantService';
import { jsonUtil, logWriter } from './config';
import { ddb, eventPublisher } from './infrastructure';

// DynamoDB table name
const tableName = process.env['TABLE_NAME'] || 'AppTable';

// Tenant repository and service (used by admin controller)
const tenantRepo = new TenantRepoDdb({ tableName, client: ddb });

export const tenantService = new TenantService({
  tenantRepo,
  publisher: eventPublisher,
  jsonUtil,
  logger: logWriter,
});

// User repository
export const userRepo = new UserRepoDdb({ tableName, client: ddb });

// Onboarding service
export const onboardingService = new OnboardingService({
  tenantService,
  userRepo,
  eventPublisher,
  logger: logWriter,
});
