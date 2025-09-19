import { TenantAccessService } from '@ayeldo/core';
import TenantMembershipRepoDdb from '@ayeldo/infra-aws/src/repos/tenantMembershipRepoDdb';
import TenantRepoDdb from '@ayeldo/infra-aws/src/tenantRepoDdb';
import UserRepoDdb from '@ayeldo/infra-aws/src/userRepoDdb';
import { makeUuid } from '@ayeldo/utils';
import OnboardingService from '../services/onboardingService';
import { TenantService } from '../services/tenantService';
import { jsonUtil, logWriter } from './config';
import { ddb, eventPublisher } from './infrastructure';

// DynamoDB table name (prefer siteConfig)
import { siteConfig } from './config';
const tableName = siteConfig.infra.tableName ?? process.env['TABLE_NAME'] ?? 'AppTable';

// Tenant repository and service (used by admin controller)
const tenantRepo = new TenantRepoDdb({ tableName, client: ddb });
const tenantMembershipRepo = new TenantMembershipRepoDdb({ tableName, client: ddb });

export const tenantService = new TenantService({
  tenantRepo,
  publisher: eventPublisher,
  jsonUtil,
  logWriter: logWriter,
});

export const tenantAccessService = new TenantAccessService({
  membershipRepo: tenantMembershipRepo,
  eventPublisher,
  uuidGenerator: makeUuid,
});

// User repository
export const userRepo = new UserRepoDdb({ tableName, client: ddb });

// Onboarding service
export const onboardingService = new OnboardingService({
  tenantService,
  userRepo,
  eventPublisher,
  tenantAccess: tenantAccessService,
  logger: logWriter,
});
