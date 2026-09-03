import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // .tsx admitted only for the two narrowly-scoped component tests
    // (Milestone 8 — Dashboard/Sites edit-request routing). Every other
    // test in the suite is a plain .ts unit test and stays on the default
    // 'node' environment; the two .tsx files opt into jsdom individually
    // via a `// @vitest-environment jsdom` pragma at the top of each file.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
