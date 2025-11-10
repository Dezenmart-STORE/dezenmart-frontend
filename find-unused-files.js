const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all TS/TSX files
const getAllFiles = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        getAllFiles(filePath, fileList);
      }
    } else if (file.match(/\.(ts|tsx)$/)) {
      fileList.push(filePath);
    }
  });
  return fileList;
};

const files = getAllFiles('src');
const unused = [];

files.forEach(file => {
  const basename = path.basename(file, path.extname(file));
  const relPath = file.replace(/\/g, '/');
  
  // Skip entry points and config files
  if (file.includes('main.tsx') || file.includes('vite-env.d.ts') || file.includes('global.d.ts')) {
    return;
  }
  
  // Search for imports of this file
  try {
    const searchPatterns = [
      basename,
      relPath.replace('src/', '@/'),
      relPath.replace('src/', '../'),
      relPath.replace('src/', './'),
    ];
    
    let found = false;
    for (const pattern of searchPatterns) {
      try {
        const result = execSync(`grep -r "${pattern}" src --include="*.ts" --include="*.tsx" | head -5`, {encoding: 'utf8'});
        if (result && result.trim()) {
          const lines = result.split('\n').filter(l => l.trim() && !l.includes(file));
          if (lines.length > 0) {
            found = true;
            break;
          }
        }
      } catch (e) {}
    }
    
    if (!found) {
      unused.push(file);
    }
  } catch (e) {}
});

console.log('POTENTIALLY UNUSED FILES:\n');
unused.forEach(f => console.log(f));
console.log(`\nTotal: ${unused.length} files`);
