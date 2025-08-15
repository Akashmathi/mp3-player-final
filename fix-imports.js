const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
};

function fixImports(filePath) {
  // Only process TypeScript/JavaScript files
  if (!['.ts', '.tsx', '.js', '.jsx'].includes(path.extname(filePath))) {
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    // Find imports with version numbers and replace them
    let newContent = content.replace(/from\s+["']([^"']+)@\d+\.\d+\.\d+["']/g, 'from "$1"');
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Fixed imports in: ${filePath}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
}

// Start from the current directory
walkDir('.', fixImports);