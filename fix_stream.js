const fs = require('fs');

const content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `
      if (stream) {
        const streamResponse = await executeWithGeminiFallback(req.body.cloudApiKey, async (client) => {
          return await client.models.generateContentStream({
            model: mappedModel,
            contents,
            config,
          });
        });

        for await (const chunk of streamResponse) {
          const text = chunk.text || '';
          res.write(\`data: \${JSON.stringify({ text })}\\n\\n\`);
        }
        return res.end();
      } else {
`;

const replacementStr = `
      if (stream) {
        await executeWithGeminiFallback(req.body.cloudApiKey, async (client) => {
          const streamResponse = await client.models.generateContentStream({
            model: mappedModel,
            contents,
            config,
          });
          
          let isFirst = true;
          for await (const chunk of streamResponse) {
             if (isFirst) {
                 isFirst = false;
                 // First chunk successful, meaning authentication passed.
             }
             const text = chunk.text || '';
             res.write(\`data: \${JSON.stringify({ text })}\\n\\n\`);
          }
        });
        return res.end();
      } else {
`;

if (content.includes(targetStr.trim())) {
    fs.writeFileSync('server.ts', content.replace(targetStr.trim(), replacementStr.trim()));
    console.log('Fixed stream fallback.');
} else {
    console.log('Could not find target string.');
}
