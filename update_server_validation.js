const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `
function getGeminiKeys(): string[] {
  const envPath = fs.existsSync('.env') ? '.env' : '.env.example';
  dotenv.config({ path: envPath, override: true });
  const geminiKeys = Object.keys(process.env)
    .filter(k => k.startsWith('GEMINI_API_KEY') && process.env[k])
    .map(k => process.env[k] as string);
  return [...new Set(geminiKeys)];
}
`;

const replaceStr = `
function getGeminiKeys(): string[] {
  const envPath = fs.existsSync('.env') ? '.env' : '.env.example';
  dotenv.config({ path: envPath, override: true });
  
  // NOTE: Google AI Studio has updated how API keys are issued. 
  // We explicitly DO NOT perform prefix-based validation (like checking for 'AIzaSy...') 
  // because valid Gemini API keys may have different prefixes (such as 'AQ.').
  // We only perform basic non-empty string validation.
  const geminiKeys = Object.keys(process.env)
    .filter(k => k.startsWith('GEMINI_API_KEY') && process.env[k] && process.env[k]?.trim().length > 0)
    .map(k => process.env[k]?.trim() as string);
    
  return [...new Set(geminiKeys)];
}
`;

content = content.replace(targetStr.trim(), replaceStr.trim());
fs.writeFileSync('server.ts', content);
console.log('updated getGeminiKeys');
