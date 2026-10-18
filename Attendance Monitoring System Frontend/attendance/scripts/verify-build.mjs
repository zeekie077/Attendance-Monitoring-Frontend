import { build } from "vite";
import tailwindcss from "@tailwindcss/vite";
import ts from "typescript";

// Equivalent production bundle with an in-process TS/JSX transform for restricted
// environments that cannot start esbuild's native child process.
await build({
  configFile: false,
  esbuild: false,
  resolve: { preserveSymlinks: true },
  keepProcessEnv: true,
  plugins: [
    {
      name: "in-process-typescript",
      enforce: "pre",
      transform(source, id) {
        if (!/\.(?:[cm]?[jt]s|[jt]sx)$/.test(id)) return null;
        source = source.replaceAll(
          "process.env.NODE_ENV",
          JSON.stringify("production"),
        );
        source = source.replaceAll("process.env", "({})");
        source = source
          .replaceAll("import.meta.hot", "undefined")
          .replaceAll(
            "import.meta.env",
            '({MODE:"production",DEV:false,PROD:true,SSR:false,BASE_URL:"/"})',
          );
        if (id.includes("node_modules")) return { code: source, map: null };
        return {
          code: ts.transpileModule(source, {
            fileName: id,
            compilerOptions: {
              jsx: ts.JsxEmit.ReactJSX,
              target: ts.ScriptTarget.ES2022,
              module: ts.ModuleKind.ESNext,
            },
          }).outputText,
          map: null,
        };
      },
    },
    tailwindcss(),
  ],
  build: { minify: false, target: "esnext" },
});
