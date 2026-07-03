const fs = require('fs');

const content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `
    } catch (err: any) {
      lastError = err;
      console.error(\`Gemini call failed for API key index \${i}:\`, err.message);
      if (i < keysToTry.length - 1) {
        console.warn(\`Falling back to next Gemini API key...\`);
        continue;
      }
      throw err;
    }
`;

const replacementStr = `
    } catch (err: any) {
      lastError = err;
      console.error(\`Gemini call failed for API key index \${i}:\`, err.message);
      
      const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('exhausted') || err.status === 503;
      
      if (isRateLimit && i < keysToTry.length - 1) {
        console.warn(\`Falling back to next Gemini API key due to rate limit...\`);
        continue;
      }
      
      // If it's auth/leaked key error, or we ran out of keys, break and throw
      throw err;
    }
`;

if (content.includes(targetStr.trim())) {
    fs.writeFileSync('server.ts', content.replace(targetStr.trim(), replacementStr.trim()));
    console.log('Fixed fallback logic.');
} else {
    console.log('Could not find target string.');
}
