const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const assetsSrc = path.join(__dirname, 'src/assets');
const assetsDest = path.join(__dirname, 'dist/public/assets');

if (fs.existsSync(assetsSrc)) {
  fs.mkdirSync(assetsDest, { recursive: true });
  fs.cpSync(assetsSrc, assetsDest, { recursive: true });
}

esbuild.build({
  entryPoints: [path.join(__dirname, 'src/app-angular/main.ts')],
  bundle: true,
  outfile: path.join(__dirname, 'dist/public/bundle.js'),
  minify: false,
  sourcemap: true,
  target: ['es2022'],
  format: 'iife',
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
  console.log('✅ Angular 19 frontend bundle & assets created at dist/public/');
}).catch((err) => {
  console.error('❌ Bundle build failed:', err);
  process.exit(1);
});
