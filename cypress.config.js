import { defineConfig } from "cypress";
import codeCoverageTask from "@cypress/code-coverage/task";

export default defineConfig({
  e2e: {
    specPattern: "tests/frontend/cypress/e2e/**/*.cy.js",
    supportFile: "tests/frontend/cypress/support/e2e.js",
    baseUrl: 'http://127.0.0.1:5500',
    setupNodeEvents(on, config) {
      codeCoverageTask(on, config);
      return config;
    },
  },
});
