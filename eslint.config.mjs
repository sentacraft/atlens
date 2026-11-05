import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      curly: ["error", "all"],
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/menu.tsx", "src/**/__tests__/**"],
    rules: {
      // MenuPopup clears the popup padding that leaves a white strip beside a row's hover.
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXMemberExpression[object.name='Menu'][property.name=/^(Portal|Positioner|Popup|Separator)$/]",
          message: "Use MenuPopup from @/components/ui/menu instead of composing Menu.Portal, Menu.Positioner or Menu.Popup.",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".open-next/**",
    ".wrangler/**",
    "worker-configuration.d.ts",
  ]),
]);

export default eslintConfig;
