const { exec } = require('child_process');
const chokidar = require('chokidar');
const browserSync = require('browser-sync').create();

// Compile SCSS once initially
exec('npx sass src/style.scss public/style.css', (err, stdout, stderr) => {
  if (err) console.error(stderr);
});

// Watch SCSS changes and recompile
chokidar.watch('src/style.scss').on('change', () => {
  console.log('🔄 SCSS changed. Recompiling...');
  exec('npx sass src/style.scss public/style.css', (err, stdout, stderr) => {
    if (err) return console.error(stderr);
    console.log('✅ SCSS compiled.');
    browserSync.reload("style.css");
  });
});

// Start local server
browserSync.init({
  server: {
    baseDir: "./",
    routes: {
      "/style.css": "./public/style.css",
      "/script.js": "./public/script.js"
    }
  },
  files: ["index.html", "public/script.js"],
  open: true
});
