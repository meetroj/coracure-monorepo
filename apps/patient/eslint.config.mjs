import nx from "@nx/eslint-plugin";
import baseConfig from "../../eslint.config.mjs";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default [
    ...nx.configs["flat/react"],
    ...baseConfig,
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.js",
            "**/*.jsx"
        ],
        // Override or add rules here
        rules: {}
    },
    {
        ignores: [
            "public",
            ".cache",
            "node_modules"
        ]
    }
];
