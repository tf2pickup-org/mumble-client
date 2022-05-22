import { type InitialOptionsTsJest, pathsToModuleNameMapper } from 'ts-jest';
import { defaults } from 'jest-config';
import { compilerOptions } from './tsconfig.json';

const config: InitialOptionsTsJest = {
  ...defaults,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.(t|j)s', '!src/**/*.spec.(t|j)s'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/e2e/**/*.e2e-spec.ts'],
  setupFiles: ['trace-unhandled/register'],
};
export default config;
