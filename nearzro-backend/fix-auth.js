const fs = require('fs');

let content = fs.readFileSync('src/auth/auth.controller.ts', 'utf8');
content = content.replace(/@Throttle\(\{ default: \{ limit: , ttl:  \} \}\)/g, '@Throttle({ default: { limit: 5, ttl: 60000 } })');
content = content.replace(/req\.\(user as any\)\.jti/g, '(req.user as any).jti');
fs.writeFileSync('src/auth/auth.controller.ts', content);
console.log('Fixed auth controller');
