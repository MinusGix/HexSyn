let fs = require('fs');
let argv = require('minimist')(process.argv.slice(2));

// TODO: add a -h/--help

if (argv._[0] === undefined) {
	console.error("Requires input filename");
	return;
}

let filename = argv._[0];

let outputTo = null;

if (argv.o !== undefined) {
	outputTo = argv.o;
} else if (argv.output !== undefined) {
	outputTo = argv.output;
}

let columns = 5;

if (argv.c !== undefined) {
	columns = Number(argv.c);
} else if (argv.columns !== undefined) {
	columns = Number(argv.columns);
}

if (typeof(columns) !== 'number' || isNaN(columns)) {
	console.error("Columns is not a number.");
	return;
} else if (columns <= 0) {
	console.error("Columns cant be less than or equal too 0");
	return;
}

//  1 = AA BB CC DD 2 = AABB CCDD 3 = AABBCC DD 4 = AABBCCDD etc
let bytesTogether = 1;
if (argv.g !== undefined) {
	bytesTogether = Number(argv.g);
} else if (argv.bytegroup !== undefined) {
	bytesTogether = Number(argv.bytegroup);
}

if (typeof(bytesTogether) !== 'number' || isNaN(bytesTogether)) {
	console.error('bytegroup is not a number');
	return;
} else if (columns <= 0) {
	console.error("Bytegroup count can not be less than or equal to 0");
	return;
}

let includeAsciiComments = false;

if (argv.a !== undefined) {
	includeAsciiComments = true;
}

/**
 *
 *
 * @param {Buffer} buf
 * @returns
 */
function toHex (buf) {
	let result = [];

	let curByteCount = 0;
	let curByteGroupCount = 0;
	
	buf.forEach((val, i) => {
		let byte = (val < 16 ? '0' : '') + val.toString(16);

		if (
			result[result.length - 1] === undefined || 
			(result[result.length - 1].length === columns && result[result.length - 1][result[result.length-1].length - 1].length === bytesTogether)
		) {
			result.push([]);
		}

		let resLength = result.length - 1;
		if (result[resLength][result[resLength].length - 1] === undefined || result[resLength][result[resLength].length - 1].length === bytesTogether) {
			result[resLength].push([]);
		}

		result[result.length - 1][result[result.length - 1].length - 1].push(byte);
	});

	let strResult = '';

	for (let i = 0; i < result.length; i++) {
		for (let j = 0; j < result[i].length; j++) {
			strResult += result[i][j].join('') + ' ';
		}

		if (includeAsciiComments) {
			strResult += '; ';
			for (let j = 0; j < result[i].length; j++) {
				for (let k = 0; k < result[i][j].length; k++) {
					// this could be made into an object which we lookup the hex into, might be faster
					let val = parseInt(result[i][j][k], 16);
					if (val >= 32 && val <= 126) {
						strResult += String.fromCharCode(val);
					} else {
						strResult += '.';
					}
				}
			}
		}

		strResult += '\n'
	}

	return strResult;
}

let result = toHex(fs.readFileSync(filename));

if (outputTo === null) { //output to console
	console.log(result);
} else {
	fs.writeFileSync(outputTo, result);
}