/**
 * Test Module Utility
 * NearZro Event Management Platform
 * 
 * Helper functions for creating NestJS testing modules with mocked dependencies.
 */

import { TestingModule, Test } from '@nestjs/testing';
import { DynamicModule, Provider, Type } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { mockPrismaService } from '../mocks/prisma.mock';

/**
 * Options for creating a testing module
 */
export interface CreateTestingModuleOptions {
  providers?: Provider[];
  controllers?: Type<unknown>[];
  imports?: DynamicModule[];
  globalPrefix?: string;
}

/**
 * Creates a NestJS testing module with common mocks pre-configured
 * 
 * @param options - Module configuration options
 * @returns Promise<TestingModule>
 */
export async function createTestingModuleWithMocks(
  options: CreateTestingModuleOptions = {},
): Promise<TestingModule> {
  const { providers = [], controllers = [], imports = [] } = options;

  // Always include mocked PrismaService
  const defaultProviders: Provider[] = [
    {
      provide: PrismaService,
      useValue: mockPrismaService,
    },
  ];

  return Test.createTestingModule({
    imports,
    controllers,
    providers: [...defaultProviders, ...providers],
  }).compile();
}

/**
 * Creates a testing module for a specific service
 * 
 * @param serviceClass - The service class to test
 * @param additionalProviders - Additional providers to include
 * @returns Promise<TestingModule>
 */
export async function createServiceTestingModule<T>(
  serviceClass: Type<T>,
  additionalProviders: Provider[] = [],
): Promise<TestingModule> {
  return createTestingModuleWithMocks({
    providers: [
      serviceClass,
      ...additionalProviders,
    ],
  });
}

/**
 * Creates a testing module with controller
 * 
 * @param controllerClass - The controller class to test
 * @param serviceClass - The service class used by the controller
 * @param additionalProviders - Additional providers
 * @returns Promise<TestingModule>
 */
export async function createControllerTestingModule<
  C extends Type<unknown>,
  S extends Type<unknown>,
>(
  controllerClass: C,
  serviceClass: S,
  additionalProviders: Provider[] = [],
): Promise<TestingModule> {
  return createTestingModuleWithMocks({
    controllers: [controllerClass],
    providers: [
      serviceClass,
      ...additionalProviders,
    ],
  });
}

/**
 * Creates a testing module with multiple services
 * 
 * @param services - Array of service classes
 * @returns Promise<TestingModule>
 */
export async function createMultiServiceTestingModule(
  services: Type<unknown>[],
): Promise<TestingModule> {
  return createTestingModuleWithMocks({
    providers: services,
  });
}

/**
 * Gets a service from the testing module
 * 
 * @param module - The testing module
 * @param serviceClass - The service class to retrieve
 * @returns T - The service instance
 */
export function getService<T>(module: TestingModule, serviceClass: Type<T>): T {
  return module.get<T>(serviceClass);
}

/**
 * Creates and returns a module with mocked PrismaService
 * that can be used to set up mock implementations before compiling
 * 
 * @returns TestingModuleBuilder
 */
export function createTestingModuleBuilder() {
  return Test.createTestingModule({
    providers: [
      {
        provide: PrismaService,
        useValue: mockPrismaService,
      },
    ],
  });
}

/**
 * Helper to mock a service method that returns a promise
 */
export const mockPromise = <T>(data: T): Promise<T> => 
  Promise.resolve(data);

/**
 * Helper to mock a service method that throws an error
 */
export const mockError = <E extends Error>(error: E): Promise<never> => 
  Promise.reject(error);
