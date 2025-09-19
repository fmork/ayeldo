import type { HttpResponse } from '@fmork/backend-core/dist/controllers/http';
import type { NextFunction, Request, Response } from 'express';
import type { ControllerRequest } from '../csrfGuard';

// Mock the logWriter import to prevent ApiInit from running
jest.mock('../../init/ApiInit', () => ({
  logWriter: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { csrfGuard, requireCsrfForController, requireCsrfWrapper } from '../csrfGuard';

// Mock the initialization modules to avoid OIDC configuration requirements
jest.mock('../../init/authServices', () => ({
  authFlowService: {},
  sessions: {},
}));

jest.mock('../../init/config', () => ({
  logWriter: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  siteConfig: {},
  claimBasedAuthorizer: {},
}));

jest.mock('../../init/tenantServices', () => ({
  onboardingService: {},
}));

jest.mock('../../init/infrastructure', () => ({
  httpClient: {},
}));

jest.mock('../../init/authControllers', () => ({
  sessionBasedAuthorizer: {},
}));

describe('csrfGuard', () => {
  test('allows when header and cookie match', () => {
    const req = {
      headers: { 'x-csrf-token': 'tok' },
      cookies: { csrf: 'tok' },
    } as unknown as Request;
    const res = {} as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;
    csrfGuard(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('forbids when missing or mismatched', () => {
    const send = jest.fn();
    const status = jest.fn().mockReturnValue({ json: send });
    const res = { status } as unknown as Response;
    const req1 = { headers: {}, cookies: {} } as unknown as Request;
    const next = jest.fn() as unknown as NextFunction;
    csrfGuard(req1, res, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(send).toHaveBeenCalledWith({ error: 'Forbidden - invalid CSRF token' });
  });
});

describe('requireCsrfWrapper', () => {
  test('calls handler when tokens match', async () => {
    const req = { headers: { 'x-csrf-token': 'a' }, cookies: { csrf: 'a' } } as unknown as Request;
    const send = jest.fn();
    const status = jest.fn().mockReturnValue({ json: send });
    const res = { status } as unknown as Response;
    const handler = jest.fn(async () => {});
    const wrapped = requireCsrfWrapper(handler);
    await wrapped(req, res);
    expect(handler).toHaveBeenCalled();
  });

  test('returns 403 and does not call handler when mismatch', async () => {
    const req = { headers: {}, cookies: {} } as unknown as Request;
    const send = jest.fn();
    const status = jest.fn().mockReturnValue({ json: send });
    const res = { status } as unknown as Response;
    const handler = jest.fn(async () => {});
    const wrapped = requireCsrfWrapper(handler);
    await wrapped(req, res);
    expect(handler).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });
});

describe('requireCsrfForController', () => {
  test('invokes controller handler when tokens match', async () => {
    const req = { headers: { 'x-csrf-token': 'x' }, cookies: { csrf: 'x' } } as ControllerRequest;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as HttpResponse;
    const called = { v: false };
    const handler = async (_r: unknown, _s: unknown) => {
      called.v = true;
    };
    const wrapped = requireCsrfForController(handler);
    await wrapped(req, res);
    expect(called.v).toBe(true);
  });

  test.skip('returns 403 when tokens do not match', async () => {
    const req = { headers: {}, cookies: {} } as ControllerRequest;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as HttpResponse;
    const handler = jest.fn(async () => {});
    const wrapped = requireCsrfForController(handler);
    await wrapped(req, res);
    expect(json).toHaveBeenCalledWith({ error: 'Forbidden - invalid CSRF token' });
  });
});
