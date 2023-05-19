const fs = require('fs');
let data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let offset = parseInt(process.argv[3]);
for(let el of data){
	el.time += offset;
}
fs.writeFileSync(process.argv[2], JSON.stringify(data));