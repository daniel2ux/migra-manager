import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextConfigs = require("eslint-config-next/core-web-vitals");
const tseslint = require("typescript-eslint");

const eslintConfig = [
  ...nextConfigs,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_+",
          varsIgnorePattern: "^_+",
          caughtErrorsIgnorePattern: "^_+",
          destructuredArrayIgnorePattern: "^_+",
        },
      ],
      // Next/React Compiler: padrões comuns (sync em effect, memo manual) geram ruído sem ganho claro aqui.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/purity": "off",
    },
  },
];

export default eslintConfig;
