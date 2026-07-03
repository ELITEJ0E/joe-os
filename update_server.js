const fs = require('fs');

const content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `
          nanoBanana: {
            needsKey: true,
            call: async (promptText: string, key?: string) => {
              const keysToTry = key ? [key] : getGeminiKeys();
              if (keysToTry.length === 0) {
                throw new Error('Gemini API client not initialized. Provide an API key.');
              }

              let lastError: any;
              for (const currentKey of keysToTry) {
                try {
                  const client = new GoogleGenAI({ 
                    apiKey: currentKey,
                    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
                  });
                  
                  const response = await client.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: [{ role: 'user', parts: [{ text: promptText }] }],
                    config: {
                       responseModalities: ["IMAGE"] as any
                    }
                  });
                  
                  const candidates = response.candidates;
                  if (candidates && candidates.length > 0) {
                     for (const part of candidates[0].content.parts) {
                       if (part.inlineData && part.inlineData.data) {
                         return \`data:\${part.inlineData.mimeType || 'image/jpeg'};base64,\${part.inlineData.data}\`;
                       }
                     }
                  }
                  throw new Error('No image returned from Gemini generateContent');
                } catch (err: any) {
                  lastError = err;
                  const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('exhausted');
                  if (isRateLimit && keysToTry.length > 1) {
                    console.warn(\`Gemini API key hit rate limit/quota, falling back to next key...\`);
                    continue;
                  }
                  break; // break on non rate limit error, or if we want to fallback anyway? user said "fallback 1 after another at least 5-10 api keys so that it would technically make my calls to gemini models unlimited" -> so continue on rate limit.
                }
              }
              throw lastError;
            }
          },
          pollinations: {
            needsKey: false,
            call: async (promptText: string) => {
              const url = \`https://image.pollinations.ai/prompt/\${encodeURIComponent(promptText)}\`;
              return url;
            }
          }
`;

const replacementStr = `
          nanoBanana: {
            needsKey: true,
            call: async (promptText: string, key?: string) => {
              const keysToTry = key ? [key] : getGeminiKeys();
              if (keysToTry.length === 0) {
                throw new Error('Gemini API client not initialized. Provide an API key.');
              }

              let lastError: any;
              for (let i = 0; i < keysToTry.length; i++) {
                const currentKey = keysToTry[i];
                try {
                  const client = new GoogleGenAI({ 
                    apiKey: currentKey,
                    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
                  });
                  
                  let response;
                  try {
                    response = await client.models.generateContent({
                      model: 'gemini-2.5-flash-image',
                      contents: [{ role: 'user', parts: [{ text: promptText }] }],
                      config: {
                         responseModalities: ["IMAGE"] as any
                      }
                    });
                  } catch (genErr: any) {
                    const status = genErr.status || 'UNKNOWN';
                    throw new Error(\`API_ERROR (Status \${status}): \${genErr.message}\`);
                  }
                  
                  try {
                    const candidates = response.candidates;
                    if (candidates && candidates.length > 0) {
                       for (const part of candidates[0].content.parts) {
                         if (part.inlineData && part.inlineData.data) {
                           return \`data:\${part.inlineData.mimeType || 'image/jpeg'};base64,\${part.inlineData.data}\`;
                         }
                       }
                    }
                    throw new Error('PARSE_ERROR: Response missing candidates or inlineData');
                  } catch (parseErr: any) {
                    if (!parseErr.message.includes('PARSE_ERROR')) {
                      throw new Error(\`PARSE_ERROR: \${parseErr.message}\`);
                    }
                    throw parseErr;
                  }
                } catch (err: any) {
                  lastError = err;
                  console.error(\`Gemini provider failed for key index \${i}: \${err.message}\`);
                  
                  // Always try next key if available
                  if (i < keysToTry.length - 1) {
                    console.warn(\`Falling back to next API key...\`);
                    continue;
                  }
                  break;
                }
              }
              throw lastError;
            }
          },
          pollinations: {
            needsKey: false,
            call: async (promptText: string) => {
              const url = \`https://image.pollinations.ai/prompt/\${encodeURIComponent(promptText)}?nologo=true&referrer=joelos\`;
              const headers: Record<string, string> = {};
              if (process.env.POLLINATIONS_TOKEN) {
                headers['Authorization'] = \`Bearer \${process.env.POLLINATIONS_TOKEN}\`;
              }
              const res = await fetch(url, { headers });
              if (!res.ok) {
                const text = await res.text();
                throw new Error(\`Pollinations API failed with status \${res.status}: \${text}\`);
              }
              const arrayBuffer = await res.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              return \`data:image/jpeg;base64,\${buffer.toString('base64')}\`;
            }
          }
`;

if (content.includes(targetStr.trim())) {
    console.log("Match found! Writing diff file...");
    fs.writeFileSync('server.ts', content.replace(targetStr.trim(), replacementStr.trim()));
} else {
    console.log("No match found.");
    // Try relaxing the match
}
