const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `
  const currentKeys = getGeminiKeys();
  const keysToTry = customKey ? [customKey] : currentKeys;

  if (keysToTry.length === 0) {
`;

const replaceStr = `
  const currentKeys = getGeminiKeys();
  
  // Basic validation: ensure the custom key is a non-empty string.
  // We do not check for specific prefixes like AIzaSy here, 
  // to support all Google AI Studio key formats (like AQ.).
  const validCustomKey = typeof customKey === 'string' && customKey.trim().length > 0 ? customKey.trim() : undefined;
  const keysToTry = validCustomKey ? [validCustomKey] : currentKeys;

  if (keysToTry.length === 0) {
`;

if (content.includes(targetStr.trim())) {
  content = content.replace(targetStr.trim(), replaceStr.trim());
  fs.writeFileSync('server.ts', content);
  console.log('updated customKey validation');
} else {
  console.log('Target string not found for customKey');
}
