const fs = require('fs');

let jwtFile = 'test/unit/auth/jwt-blacklist.spec.ts';
let jwtContent = fs.readFileSync(jwtFile, 'utf8');
let newJwt = jwtContent.substring(0, jwtContent.indexOf('  beforeEach(async () => {\n    cacheMock = createCacheMock();\n\n    const module: TestingModule = await Test.createTestingModule({\n      providers: [\n        AuthService,', jwtContent.length / 2));
if(newJwt.length < jwtContent.length && newJwt.length > 50) {
     fs.writeFileSync(jwtFile, newJwt);
     console.log('Fixed jwt-blacklist.spec.ts');
}

