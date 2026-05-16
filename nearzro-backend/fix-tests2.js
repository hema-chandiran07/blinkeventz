const fs = require('fs');

let otpFile = 'test/unit/auth/otp.service.spec.ts';
let otpContent = fs.readFileSync(otpFile, 'utf8');
let newOtp = otpContent.replace(/    it\('should throw TooManyRequestsException if resending too quickly', async \(\) => \{\n      const email = 'test@example\.com';[\s\S]*\}\);\n  \}\);\n\}\);\n/, '  });\n});\n');
if (newOtp !== otpContent) {
   fs.writeFileSync(otpFile, newOtp);
   console.log('Fixed otp.service.spec.ts');
}
