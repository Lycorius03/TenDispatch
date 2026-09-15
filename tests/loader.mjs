import { registerHooks } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
registerHooks({
 resolve(specifier, context, next) {
   if (specifier.startsWith('.') && context.parentURL) {
     const url = new URL(specifier, context.parentURL)
     for (const extension of ['.ts','.tsx']) if (existsSync(fileURLToPath(url)+extension)) return {url:url.href+extension,shortCircuit:true}
   }
   return next(specifier, context)
 },
 load(url, context, next) {
   if (/\.tsx?$/.test(url)) return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText}
   if (/\.png$/.test(url)) return {format:'module',shortCircuit:true,source:`export default ${JSON.stringify(url)}`}
   return next(url, context)
 }
})
