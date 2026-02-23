const fs = require('fs');
const content = fs.readFileSync('.serverless/zip_extracted/src/lambda.js', 'utf8');

const idxUxi = content.indexOf('var Uxi=require("@prisma/client");');
const idxRole = content.indexOf('Uxi.Role.ADMIN');

console.log('Uxi index:', idxUxi);
console.log('Role index:', idxRole);
