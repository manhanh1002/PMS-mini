const fs = require('fs');
const babel = require('@babel/parser');

const code = fs.readFileSync('src/components/BookingModal.js', 'utf8');
try {
  babel.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log("Parse Successful!");
} catch (e) {
  console.log("Parse Error:", e.message, "at line", e.loc.line, "column", e.loc.column);
}
