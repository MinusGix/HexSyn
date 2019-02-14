let filename = process.argv[2];
let outFilename = process.argv[3];

if (!filename) {
	console.log("Please supply a filename.");
	return;
}

if (!outFilename) {
	console.log("Please supply an output filename");
	return;
}

const fs = require('fs');
const hex = require('./parse.js');
console.log('[INFO] Filename: "%s"', filename);

let fileText = fs.readFileSync(filename, 'utf8');

fs.writeFileSync(outFilename, hex.doAllSteps(fileText));
console.log("Done.");