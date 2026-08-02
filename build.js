const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, 'src/app-angular/main.ts')],
  bundle: true,
  outfile: path.join(__dirname, 'dist/public/bundle.js'),
  minify: false,
  sourcemap: true,
  target: ['es2022'],
  format: 'esm',
  loader: { '.ts': 'ts' },
  define: { 'process.env.NODE_ENV': '"production"' },
  tsconfigRaw: JSON.stringify({
    compilerOptions: {
      experimentalDecorators: true,
      useDefineForClassFields: false,
      target: 'es2022',
      moduleResolution: 'node',
      emitDecoratorMetadata: true,
    }
  })
}).then(() => {
  console.log('✅ Angular 19 frontend bundle created at dist/public/bundle.js');
}).catch((err) => {
  console.error('❌ Bundle build failed:', err);
  process.exit(1);
});
