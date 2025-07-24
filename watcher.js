const { exec } = require('child_process');
const chokidar = require('chokidar');
const browserSync = require('browser-sync').create();

// Initial compile
exec('npx sass src/style.scss public/style.css', (err) => {
  if (err) console.error(err);
});

// Watch SCSS
chokidar.watch('src/style.scss').on('change', () => {
  console.log('🔄 SCSS changed. Recompiling...');
  exec('npx sass src/style.scss public/style.css', (err) => {
    if (err) return console.error(err);
    console.log('✅ SCSS compiled.');
    browserSync.reload('public/style.css');
  });
});

// Serve
browserSync.init({
  server: {
    baseDir: './',
  },
  files: ['index.html', 'public/*.js', 'public/*.css'],
  open: true,
});
