const fs = require('fs');

const content = fs.readFileSync('server.ts', 'utf8');

const targetStr = `
              const res = await fetch(url, { headers });
              if (!res.ok) {
                const text = await res.text();
                throw new Error(\`Pollinations API failed with status \${res.status}: \${text}\`);
              }
              
              const arrayBuffer = await res.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              return \`data:image/jpeg;base64,\${buffer.toString('base64')}\`;
`;

const replacementStr = `
              const res = await fetch(url, { headers });
              if (!res.ok) {
                const text = await res.text();
                throw new Error(\`Pollinations API failed with status \${res.status}: \${text}\`);
              }
              
              const contentType = res.headers.get('content-type') || '';
              if (contentType.includes('text/html') || contentType.includes('application/json')) {
                const text = await res.text();
                throw new Error(\`Pollinations API returned invalid content type (\${contentType}): \${text.slice(0, 100)}\`);
              }
              
              const arrayBuffer = await res.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              if (buffer.length === 0) {
                throw new Error('Pollinations API returned an empty image buffer.');
              }
              
              const mimeType = contentType || 'image/jpeg';
              return \`data:\${mimeType};base64,\${buffer.toString('base64')}\`;
`;

if (content.includes(targetStr.trim())) {
    fs.writeFileSync('server.ts', content.replace(targetStr.trim(), replacementStr.trim()));
    console.log('Fixed pollinations logic.');
} else {
    console.log('Could not find target string.');
}
