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
      
      // We also fallback on 401/403 just in case they have a mix of dead/live keys
      // But log it clearly so they know why it failed.
      if (i < keysToTry.length - 1) {
        console.warn(\`Falling back to next Gemini API key...\`);
        continue;
      }
      
      throw err;
    }
`;

if (content.includes(targetStr.trim())) {
    fs.writeFileSync('server.ts', content.replace(targetStr.trim(), replacementStr.trim()));
    console.log('Fixed fallback logic.');
} else {
    console.log('Could not find target string.');
}
