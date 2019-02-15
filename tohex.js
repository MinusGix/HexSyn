let fs = require('fs');
let argv = require('minimist')(process.argv.slice(2));
let stream = require('stream');

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
} else {
	throw new Error("Requires output file.");
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
} // There is not --include-ascii because i'm unsure of how to make minimist ignore things after it

let includeOffsetComments = false;

if (argv.f !== undefined) {
	includeOffsetComments = true;
}

let offsetType = 'hex';

if (argv.offsetType !== undefined) {
	offsetType = argv.offsetType;
}

if (offsetType !== 'hex' && offsetType !== 'dec') {
	console.error("Expect offsetType of 'hex' or 'dec'");
	return;
}


function toHex (filename, outFile) {
	let fd = fs.openSync(filename, 'r');
	let outFd = fs.openSync(outFile, 'w');

	let outStream = fs.createWriteStream(null, {
		fd: outFd,
		start: 0,
	})

	let inStream = fs.createReadStream(null, {
		fd: fd,
		start: 0,
	});
	
	let overflowArray = [];
	let offset = 0;

	inStream.on("data", (chunk) => {
		// Get how many bytes there are in this buffer, see if it's enough to fit in the column and groupbytes and add the overflowArray as if it's actually in it
		// any extra, add to an array
		
		let bytes = [...overflowArray, ...chunk.values()];
		overflowArray = [];

		if (bytes.length % (bytesTogether * columns)) {
			overflowArray = bytes.slice(bytes.length-(bytes.length % (bytesTogether * columns)), bytes.length);
			bytes.splice(bytes.length-(bytes.length % (bytesTogether * columns)), (bytes.length % (bytesTogether * columns)));
		}

		for (let i = 0; i < bytes.length; i += (bytesTogether * columns)) {
			let curBytes = bytes
				.slice(i, i + (bytesTogether * columns));
			
			let str = '';

			let curByte = 0;

			for (let j = 0; j < curBytes.length; j++) {
				if (curByte < bytesTogether) {
					str += toHexByte(curBytes[j]);
					curByte++;
				} else {
					str += ' ' + toHexByte(curBytes[j]);
					curByte = 1;
				}
			}

			if (includeAsciiComments || includeOffsetComments) {
				str += ' ;';
			}

			if (includeAsciiComments) {
				str += ' ' + constructAscii(curBytes);
			}

			if (includeOffsetComments) {
				if (offsetType === 'hex') {
					str += ' ' + offset.toString(16);
				} else if (offsetType === 'dec') {
					str += ' ' + offset.toString();
				} else {
					str += 'err';
				}
			}


			outStream.write(str + '\n');
			offset += (bytesTogether * columns);
		}
	});

	inStream.on("close", () => {
		// TODO: write the last overFlowarray bytes
		console.log("instream closed");
	});
	
}

function toHexByte (num) {
	return (num < 16 ? '0' : '') + num.toString(16);
}

function constructAscii (curBytes) {
	let ascii = '';

	for (let j = 0; j < curBytes.length; j++) {
		if (curBytes[j] >= 32 && curBytes[j] <= 126) { // is it in the displayable ascii range
			ascii += String.fromCharCode(curBytes[j]);
		} else {
			// TODO: make this character changeable
			ascii += '.';
		}
	}

	return ascii;
}

toHex2(filename, outputTo);