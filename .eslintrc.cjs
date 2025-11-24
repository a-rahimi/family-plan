/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["next/core-web-vitals", "prettier"],
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "out/",
    "build/",
    "next-env.d.ts",
    "coverage/",
  ],
  rules: {},
};

