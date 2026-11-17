import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "react/no-danger": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // El navegador nunca habla con Firestore (AGENTS.md §2.1).
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "firebase/firestore", message: "Firestore solo se usa desde src/repositories con firebase-admin." },
            { name: "firebase/firestore/lite", message: "Firestore solo se usa desde src/repositories con firebase-admin." },
          ],
          patterns: [
            { group: ["firebase-admin", "firebase-admin/*"], message: "firebase-admin solo se importa en src/lib y src/repositories." },
          ],
        },
      ],
    },
  },
  {
    // Únicas capas autorizadas a usar el Admin SDK (AGENTS.md §1.4).
    files: ["src/lib/**", "src/repositories/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "firebase/firestore", message: "Use firebase-admin/firestore en el servidor." },
            { name: "firebase/firestore/lite", message: "Use firebase-admin/firestore en el servidor." },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
