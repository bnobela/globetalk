export default {
  transform: {
    "^.+\\.js$": "babel-jest"
  },
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/**/*.test.js"
  ],
  coverageDirectory: "coverage",
  testMatch: ["**/*.test.js"],   // matches any test in the roots
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^https://www.gstatic.com/firebasejs/9.22.0/(.*)$": "<rootDir>/tests/mocks/$1"
  },
  moduleDirectories: ["node_modules", "src"],
  roots: ["<rootDir>/tests/frontend/unit"],   // only this folder
  transformIgnorePatterns: [
    "node_modules/(?!(firebase)/)"
  ],
  setupFiles: ["./tests/text-encoder-setup.js"],
  setupFilesAfterEnv: ["@testing-library/jest-dom"]
};
