const fs = require('fs');
function run(num){
	let data = JSON.parse(fs.readFileSync(`recordings/#${num}.json`, 'utf8'))
	let prevTime = 0;
	let currTime;
	for(let move of data){
		currTime = move.time;
		move.time = currTime - prevTime;
		prevTime = currTime;
	}
	fs.writeFileSync(`recordings/#${num}.json`, JSON.stringify(data));
}
for(let i = 0; i < 24; i++){
	run(i);
}
run('20.5');