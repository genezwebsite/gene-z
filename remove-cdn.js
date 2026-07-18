const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.html')) {
        results.push(file);
      }
    }
  });
  return results;
}

const htmlFiles = walk(__dirname);
htmlFiles.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\r?\n?/g, '');
  fs.writeFileSync(f, content);
});

console.log('Removed Tailwind CDN from all HTML files.');
