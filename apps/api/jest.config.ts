import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts", "tsx"],
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
  collectCoverageFrom: [
    "**/*.(t|j)s",
    "!**/*.spec.ts",
    "!**/*.test.ts",
    "!**/*.d.ts",
  ],
  coverageDirectory: "../coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      lines: 30,
      branches: 20,
      functions: 25,
      statements: 30,
    },
  },
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@repo/supabase/(.*)$": "<rootDir>/../../../packages/supabase/src/$1",
    "^@repo/supabase$": "<rootDir>/../../../packages/supabase/src/index.ts",
    "^@repo/redis$": "<rootDir>/../../../packages/redis/src/index.ts",
    "^@repo/redis/(.*)$": "<rootDir>/../../../packages/redis/src/$1",
    "^@repo/utils$": "<rootDir>/../../../packages/utils/src/index.ts",
    "^@repo/utils/(.*)$": "<rootDir>/../../../packages/utils/src/$1",
    // Strip .js extension for relative imports within workspace packages
    "^(.+)\\.js$": "$1",
  },
};

export default config;
