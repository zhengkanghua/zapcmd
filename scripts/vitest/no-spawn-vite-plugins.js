import crypto from "node:crypto";
import ts from "typescript";
import { compileScript, compileTemplate, parse } from "vue/compiler-sfc";

function createScopeId(id) {
  const hash = crypto.createHash("sha256").update(id).digest("hex").slice(0, 8);
  return `data-v-${hash}`;
}

function transpileTypeScript(code, id) {
  const result = ts.transpileModule(code, {
    fileName: id,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.Preserve,
      sourceMap: false,
      inlineSourceMap: false,
      inlineSources: false,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove
    }
  });

  return result.outputText;
}

export function createNoSpawnTypeScriptPlugin() {
  return {
    name: "zapcmd:ts-no-spawn",
    enforce: "pre",
    transform(code, id) {
      if (id.includes("/node_modules/") || id.includes("\\node_modules\\")) {
        return null;
      }
      if (id.endsWith(".d.ts")) {
        return null;
      }
      if (!id.endsWith(".ts") && !id.endsWith(".tsx") && !id.endsWith(".mts")) {
        return null;
      }
      return {
        code: transpileTypeScript(code, id),
        map: null
      };
    }
  };
}

export function createNoSpawnVueSfcPlugin() {
  return {
    name: "zapcmd:vue-sfc-no-spawn",
    enforce: "pre",
    transform(code, id, options) {
      if (!id.endsWith(".vue")) {
        return null;
      }

      const scopeId = createScopeId(id);
      const { descriptor, errors } = parse(code, { filename: id });
      if (errors.length > 0) {
        throw errors[0];
      }

      let scriptCode = "const __script = {};\n";
      let bindingMetadata;
      if (descriptor.script || descriptor.scriptSetup) {
        const compiled = compileScript(descriptor, {
          id: scopeId,
          genDefaultAs: "__script",
          sourceMap: false
        });
        scriptCode = `${compiled.content}\n`;
        bindingMetadata = compiled.bindings;
      }

      let templateCode = "";
      let attachRenderCode = "";
      if (descriptor.template) {
        const compiled = compileTemplate({
          id: scopeId,
          filename: id,
          source: descriptor.template.content,
          compilerOptions: {
            mode: "module",
            bindingMetadata
          },
          ssr: options?.ssr === true
        });

        if (compiled.errors.length > 0) {
          throw compiled.errors[0];
        }
        templateCode = `${compiled.code}\n`;
        attachRenderCode = "__script.render = render;\n";
      }

      const combined = `${scriptCode}\n${templateCode}\n${attachRenderCode}\nexport default __script;\n`;

      return {
        code: transpileTypeScript(combined, `${id}.ts`),
        map: null
      };
    }
  };
}
