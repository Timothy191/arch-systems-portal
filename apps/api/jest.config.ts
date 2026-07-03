import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            tsx: false,
            decorators: true,
          },
          transform: {
            decoratorMetadata: true,
          },
        },
      },
    ],
  },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "../coverage",
  coverageReporters: ["text", "lcov", "html"],
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@repo/supabase/(.*)$": "<rootDir>/../../packages/supabase/src/$1",
    "^@repo/supabase$": "<rootDir>/../../packages/supabase/src/index.ts",
    "^@repo/redis$": "<rootDir>/../../packages/redis/src/index.ts",
    "^@repo/redis/(.*)$": "<rootDir>/../../packages/redis/src/$1",
    "^@repo/utils$": "<rootDir>/../../packages/utils/src/index.ts",
    "^@repo/utils/(.*)$": "<rootDir>/../../packages/utils/src/$1",
  },
};

export default config;
