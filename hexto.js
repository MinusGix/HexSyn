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

let parseResult;
try {
	parseResult = hex.parse(fileText);
	console.log("Parsed file");
} catch (err) {
	console.error('Err in parsing file!', err);
	return;
}

let convertResult;
try {
	convertResult = hex.convert(parseResult);
	console.log("Converted data into hex values");
} catch (err) {
	console.error('Err in converting file!', err);
	return;
}

let expandResult;
try {
	expandResult = hex.expand(convertResult);
	console.log("Expanded data out");
} catch (err) {
	console.error('Err in expanding file!', err);
	return;
}

let hexArrResult;
try {
	hexArrResult = hex.toHexArray(expandResult);
	console.log("Converted data to hex array");
} catch (err) {
	console.error('Err in turning data into hex file!', err);
	return;
}

let bufResult;
try {
	bufResult = hex.toBuffer(hexArrResult);
	console.log("Converted hex to buffer.");
} catch (err) {
	console.error('Err in parsing file!', err);
	return;
}

fs.writeFileSync(outFilename, bufResult);
console.log("Done.");