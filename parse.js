/*
00 - adds the byte 00
d100 - adds the decimal number 100 as bytes
xAF - adds the byte 0xAF as a byte. 'x' is assumed and not required
; a comment, everything on the line is ignored
* n repeat the last group-of-bytes (GOB) that many times
'c' - add the byte representing 'c'
"ABC" - adds the bytes representing "ABC"
Also have a way to include other files
*/

let WHITESPACE_REG = /\s/;
let HEX_REG = /[0-9abcdef]/i;
let BINARY_REG = /[01]/;
let DEC_REG = /[0-9]/;
let OCTAL_REG = /[0-7]/;


// This hex code is from http://www.danvk.org/hex2dec.html
// We could replace this with like (BigInt(dec).toString(16)) but this is better
/**
 * A function for converting hex <-> dec w/o loss of precision.
 *
 * The problem is that parseInt("0x12345...") isn't precise enough to convert
 * 64-bit integers correctly.
 *
 * Internally, this uses arrays to encode decimal digits starting with the least
 * significant:
 * 8 = [8]
 * 16 = [6, 1]
 * 1024 = [4, 2, 0, 1]
 */

// Adds two arrays for the given base (10 or 16), returning the result.
// This turns out to be the only "primitive" operation we need.
function add(x, y, base) {
	var z = [];
	var n = Math.max(x.length, y.length);
	var carry = 0;
	var i = 0;
	while (i < n || carry) {
		var xi = i < x.length ? x[i] : 0;
		var yi = i < y.length ? y[i] : 0;
		var zi = carry + xi + yi;
		z.push(zi % base);
		carry = Math.floor(zi / base);
		i++;
	}
	return z;
}
  
// Returns a*x, where x is an array of decimal digits and a is an ordinary
// JavaScript number. base is the number base of the array x.
function multiplyByNumber(num, x, base) {
	if (num < 0) return null;
	if (num == 0) return [];
  
	var result = [];
	var power = x;
	while (true) {
		if (num & 1) {
			result = add(result, power, base);
		}
		num = num >> 1;
		if (num === 0) break;
		power = add(power, power, base);
	}
  
	return result;
}
  
function parseToDigitsArray(str, base) {
	var digits = str.split('');
	var ary = [];
	for (var i = digits.length - 1; i >= 0; i--) {
		var n = parseInt(digits[i], base);
		if (isNaN(n)) return null;
		ary.push(n);
	}
	return ary;
}
  
function convertBase(str, fromBase, toBase) {
	var digits = parseToDigitsArray(str, fromBase);
	if (digits === null) return null;
  
	var outArray = [];
	var power = [1];
	for (var i = 0; i < digits.length; i++) {
	  // invariant: at this point, fromBase^i = power
	  if (digits[i]) {
		outArray = add(outArray, multiplyByNumber(digits[i], power, toBase), toBase);
	  }
	  power = multiplyByNumber(fromBase, power, toBase);
	}
  
	var out = '';
	for (var i = outArray.length - 1; i >= 0; i--) {
	  out += outArray[i].toString(toBase);
	}
	return out;
}
  
function decToHex(decStr) {
	var hex = convertBase(decStr, 10, 16);
	return hex ? hex : null;
}
  
function hexToDec(hexStr) {
	hexStr = hexStr.toLowerCase();
	return convertBase(hexStr, 16, 10);
}

function decToOct (decStr) {
	var oct = convertBase(decStr, 10, 8);
	return oct ? oct : null;
}

function octToDec (octStr) {
	octStr = octStr.toLowerCase();
	return convertBase(octStr, 8, 10);
}

function binToDec (binStr) {
	binStr = binStr.toLowerCase();
	return convertBase(binStr, 2, 10);
}





function unexpectedCharacter (chr, pos, line, extraText='', preText='') {
	if (preText.length !== 0) {
		preText += ' ';
	}
	return new Error(`Unexpected character '${chr}' ${preText}at position ${pos} into file on line ${line}. ${extraText}`);
}

function parseHex (text, pos, lineCounter) {
	let result = '';

	while (pos < text.length) {
		if (!HEX_REG.test(text[pos])) {
			if (WHITESPACE_REG.test(text[pos]) || text[pos] === ';' || text[pos] === '!') {
				break;
			} else {
				throw unexpectedCharacter(text[pos], pos, lineCounter);
			}
		}
		result += text[pos];
		pos++;
	}

	return {
		value: result,
		pos: pos,
		lineCounter: lineCounter,
	};
}

function parseType (text, i, lineCounter) {
	let ret = null;
	if (text[i + 1] === 'b') { // binary
		let _i = i;
		let result = '';

		i += 2; // skip past !b

		while (i < text.length && !WHITESPACE_REG.test(text[i])) {
			if (text[i] === ';' || text[i] === '!') {
				break;
			}

			if (text[i] === '1' || text[i] === '0') {
				result += text[i];
				i++;
			} else {
				throw unexpectedCharacter(text[i], i, lineCounter, '', 'while parsing binary');
			}
		}

		ret = {
			type: 'bytegroup',
			byteType: 'binary',
			pos: _i,
			line: lineCounter,
			value: result
		};
	} else if (text[i + 1] === 'd') { // decimal
		let _i = i;
		let result = '';

		i += 2; // skip past !b

		while (i < text.length && !WHITESPACE_REG.test(text[i])) {
			if (text[i] === ';' || text[i] === '!') {
				break;
			}
			
			if (DEC_REG.test(text[i])) {
				result += text[i];
				i++;
			} else {
				throw unexpectedCharacter(text[i], i, lineCounter, '', 'while parsing decimal');
			}
		}

		ret = {
			type: 'bytegroup',
			byteType: 'decimal',
			pos: _i,
			line: lineCounter,
			value: result
		};
	} else if (text[i + 1] === 'x') { // hexadecimal
		let val = {
			type: 'bytegroup',
			byteType: 'hex',
			pos: i,
			line: lineCounter,
			value: null,
		};

		i += 2; // skip past !x

		let temp = parseHex(text, i, lineCounter);
		i = temp.pos;
		lineCounter = temp.lineCounter;
		val.value = temp.value;

		ret = val;
	} else if (text[i + 1] === 'o') { // octal
		let _i = i;
		let result = '';

		i += 2; // skip past !b

		while (i < text.length && !WHITESPACE_REG.test(text[i])) {
			if (text[i] === ';' || text[i] === '!') {
				break;
			}

			if (OCTAL_REG.test(text[i])) {
				result += text[i];
				i++;
			} else {
				throw unexpectedCharacter(text[i], i, lineCounter, '', 'while parsing octal');
			}
		}

		ret = {
			type: 'bytegroup',
			byteType: 'octal',
			pos: _i,
			line: lineCounter,
			value: result
		};
	} else if (text[i + 1] === '"') { // single character
		let _i = i;
		i += 2; // skip past !"

		let result = '';
		while (i < text.length) {
			if (text[i] === '"') {
				i++;
				break;
			}

			result += text[i];
			i++;
		}

		ret = {
			type: 'bytegroup',
			byteType: 'string',
			pos: _i,
			line: lineCounter,
			value: result
		};
	} else if (text[i + 1] === 's') { // Special strings
		if (text[i + 2] === '0') { // "Taco" -> "T\00A\00C\00O" DOES NOT END WITH A NULL
			ret = {
				type: 'bytegroup',
				byteType: 'hex',
				pos: i,
				line: lineCounter,
				value: ''
			};

			i += 3; // skip past !s0

			if (text[i] !== '"') {
				throw new Error("Expected string but did not find string!");
			}

			i++; // skip past "

			let res = [];
			while (i < text.length) {
				if (text[i] === '"') {
					i++;
					break;
				}
	
				res.push(text[i].charCodeAt(0).toString(16));
				i++;
			}

			for (let i = 0; i < res.length; i++) {
				ret.value += res[i];
				if (i < (res.length-1)) {
					ret.value += '00';
				}
			}
		} else {
			throw new Error("Unknown special string type");
		}
	} else if (text[i + 1] === ':') {
		ret = {
			type: 'function',
			pos: i,
			line: lineCounter,
			name: '',
		};

		i += 2; // skip past !:
		while (i < text.length) {
			if (text[i] === ":") {
				i++;
				break;
			} else {
				ret.name += text[i];
				i++;
			}
		}
	} else if (text[i + 1] === 'u') {
		ret = {
			type: 'bytegroup',
			byteType: 'uint',
			pos: i,
			line: lineCounter,
			value: '',
			size: ''
		};

		i += 2; // skip past !u

		// TODO: change these errs to use unexpectedCharacter

		while (text[i] !== ':') {
			if (!DEC_REG.test(text[i])) {
				throw new Error(`Unexpected non-number at pos ${i} on line ${lineCounter}.`);
			}

			ret.size += text[i];
			i++;
		}

		i++; // skip past :

		if (ret.size === '') {
			throw new Error(`No Size found for uint value at pos ${i} on line ${lineCounter}.`);
		}

		// if you need more size for a number bits than what Number can supply, i'll be suitably impressed
		ret.size = Number(ret.size);

		if (ret.size % 8 !== 0) {
			throw new Error(`Currently uint size has to be a multiple of 8. At line ${i} ${lineCounter}`);
		}

		while (i < text.length && !WHITESPACE_REG.test(text[i])) {
			if (text[i] === ';' || text[i] === '!') {
				break;
			}
			
			if (DEC_REG.test(text[i])) {
				ret.value += text[i];
				i++;
			} else {
				throw unexpectedCharacter(text[i], i, lineCounter, '', 'while parsing uint');
			}
		}

		if (ret.value === '') {
			throw new Error(`No value supplied for uint at pos ${i} on line ${lineCounter}`);
		}

		let val = BigInt(ret.value);

		if (val >= (2n**BigInt(ret.size))) {
			throw new Error(`UInt with number '${ret.value}' is greater than the bitsize (${ret.size}) allows on line ${lineCounter} pos: ${i}`);
		} else if (val < 0n) {
			throw new Error(`UInt with number '${ret.value}' is less than zero on line ${lineCounter} at pos ${i}`);
		}
	} else {
		throw unexpectedCharacter(text[i], i, lineCounter, "Expected 'b' (binary), 'd' (decimal), 'x' (hexadecimal), or 'o' (octal).");
	}

	return {
		pos: i,
		value: ret,
		lineCounter: lineCounter
	};
}

function consumeWhitespace (text, i, lineCounter) {
	while (i < text.length && WHITESPACE_REG.test(text[i])) {
		if (text[i] === '\n') {
			lineCounter++;
		}
		i++;
	}

	return {
		pos: i,
		lineCounter,
	};
}

function parseData (text, i, lineCounter, data)  {
	if (WHITESPACE_REG.test(text[i])) {
		if (text[i] === '\n') {
			lineCounter++;
		}

		i++;
	} else if (HEX_REG.test(text[i])) {
		let val = {
			type: 'bytegroup',
			byteType: 'hex',
			pos: i,
			line: lineCounter,
			value: null
		};

		let temp = parseHex(text, i, lineCounter);
		i = temp.pos;
		lineCounter = temp.lineCounter;
		val.value = temp.value;

		data.push(val);
	} else if (text[i] === ';') {
		while (i < text.length && text[i] !== '\n') {
			i++; // consume comments
		}
	} else if (text[i] === '!') {
		let temp = parseType(text, i, lineCounter);
		i = temp.pos;
		lineCounter = temp.lineCounter;
		data.push(temp.value);
	} else if (text[i] === '*') {
		let _i = i;
		let _line = lineCounter;

		i++;

		let temp1 = consumeWhitespace(text, i, lineCounter);
		i = temp1.pos;
		lineCounter = temp1.lineCounter;

		// TODO: Currently requires you to specify the type. It would be nice if it could default to hex
		let temp = parseType(text, i, lineCounter);
		i = temp.pos;
		lineCounter = temp.lineCounter;
		data.push({
			type: 'times',
			pos: _i,
			line: _line,
			value: temp.value
		})
	} else if (text[i] === '{') {
		let res = {
			type: 'bracket',
			pos: i,
			line: lineCounter,
			value: [],
		};
		i++;
		while (text[i] !== '}') {
			if (i >= text.length) {
				throw new Error("Unclosed bracket.");
			}

			let temp = parseData(text, i, lineCounter, res.value);
			i = temp.i;
			lineCounter = temp.lineCounter;
		}
		i++;
		data.push(res);
	} else {
		throw unexpectedCharacter(text[i], i, lineCounter);
	}

	return {
		i,
		lineCounter,
	}
}

function parse (text) {
	let data = [];
	let lineCounter = 0;


	for (let i = 0; i < text.length;) {
		let temp = parseData(text, i, lineCounter, data);

		i = temp.i;
		lineCounter = temp.lineCounter;
	}

	return data;
}

function convertData (i, data, ret) {
	if (data[i].type === 'bytegroup') {
		if (data[i].byteType === 'hex') {
			ret.push({
				type: 'bytegroup',
				line: data[i].line,
				pos: data[i].pos,
				value: data[i].value
			});
		} else if (data[i].byteType === 'decimal') {
			ret.push({
				type: 'bytegroup',
				line: data[i].line,
				pos: data[i].pos,
				value: decToHex(data[i].value)
			});
		} else if (data[i].byteType === 'octal') {
			ret.push({
				type: 'bytegroup',
				line: data[i].line,
				pos: data[i].pos,
				value: decToHex(octToDec(data[i].value))
			});
		} else if (data[i].byteType === 'binary') {
			ret.push({
				type: 'bytegroup',
				line: data[i].line,
				pos: data[i].pos,
				value: decToHex(binToDec(data[i].value))
			})
		} else if (data[i].byteType === 'string') {
			ret.push({
				type: 'bytegroup',
				line: data[i].line,
				pos: data[i].pos,
				value: data[i].value.split('').map(x => x.charCodeAt(0).toString(16)).join('')
			});
		} else if (data[i].byteType === 'uint') {
			let byteText = decToHex(data[i].value);

			if (byteText.length % 2 !== 0) { // uneven, so we add a 0
				byteText = '0' + byteText;
			}
			
			if (byteText.length < (data[i].size / 8 * 2)) {
				byteText = '0'.repeat((data[i].size / 8 * 2) - byteText.length) + byteText;
			}

			ret.push({
				type: 'bytegroup',
				line: data[i].line,
				pos: data[i].pos,
				value: byteText
			});
		} else {
			throw new Error("Unimplemented byte type: " + data[i].byteType);
		}
	} else if (data[i].type === 'times') {
		// we don't do anything with this.
		ret.push(data[i]);
	} else if (data[i].type === 'bracket') {
		let newData = [];
		for (let j = 0; j < data[i].value.length; j++) {
			let temp = convertData(j, data[i].value, newData);
			j = temp.i;
		}
		data[i].value = newData;
		ret.push(data[i]);
	} else if (data[i].type === 'function') {
		ret.push(data[i]);
	} else {
		throw new Error("Unimplemented type: " + data[i].type);
	}

	return {
		i,
	};
}

function convert (data) {
	let ret = [];
	// Convert all of it into byte form.
	for (let i = 0; i < data.length; i++) {
		let temp = convertData(i, data, ret);
		i = temp.i;
	}
	return ret;
}

function _recursiveReverse (byte) {
	if (byte.type === "bracket") {
		byte.value.reverse();
		for (let i = 0; i < byte.value.length; i++) {
			byte.value[i] = _recursiveReverse(byte.value[i]);
		}
		return byte;
	} else {
		return byte;
	}
}

let defaultFunctions = {
	REVERSE: function (byte) {
		return _recursiveReverse(byte);
	}
};

function expand (data, funcs={}) {
	Object.assign(funcs, defaultFunctions);

	// expand all the times
	data = expandTimes(data);

	data = expandFunctions(data, funcs);

	data = expandBrackets(data);

	return data;
}

function expandBrackets (data) {
	let ret = [];

	for (let i = 0; i < data.length; i++) {
		if (data[i].type === 'bracket') {
			ret.push(...expandBrackets(data[i].value));
		} else {
			ret.push(data[i]);
		}
	}

	return ret;
}

function expandFunctions (data, funcs={}) {
	let ret = [];

	for (let i = 0; i < data.length; i++) {
		if (data[i].type === 'function') {
			if (!funcs.hasOwnProperty(data[i].name)) {
				throw new Error("Invalid function name!");
			}

			if (data[i + 1] === undefined) {
				throw new Error("No data after function call. (Use {} if you don't want to pass anything)");
			}

			let result = funcs[data[i].name](data[i + 1]);
			
			if (Array.isArray(result)) {
				ret.push(...result);
			} else {
				ret.push(result);
			}

			i++; // skip past next, as we used it for param
		} else if (data[i].type === 'bracket') {
			data[i].value = expandFunctions(data[i].value, funcs);
			ret.push(data[i]);
		} else {
			ret.push(data[i]);
		}
	}

	return ret;
}

function expandTimes (data) {
	let ret = [];

	for (let i = 0; i < data.length; i++) {
		if (data[i].type === 'bytegroup') {
			ret.push(data[i]);
		} else if (data[i].type === 'times') {
			if (ret.length === 0) {
				throw new Error("Times without a previous bytegroup.");
			}

			let prev = ret[ret.length - 1];

			let times = null;

			// TODO: it would be nice to either let these be arbitrary size (like bigint) or tell user if it's too large
			if (data[i].value.byteType === 'hex') {
				times = parseInt(data[i].value.value, 16);
			} else if (data[i].value.byteType === 'decimal') {
				times = parseInt(data[i].value.value, 10);
			} else if (data[i].value.byteType === 'octal') {
				times = parseInt(data[i].value.value, 8);
			} else if (data[i].value.byteType === 'binary') {
				times = parseInt(data[i].value.value, 2);
			} else {
				throw new Error("Times got non-allowed value type. Supports hex/decimal/octal.");
			}

			if (times === null) {
				throw new Error("Times did not receive a number properly. Possibly internal parser error.");
			}

			times -= 1; // 00 * !d5 you would expect 5, so we sub 1 because there's already one in the list

			for (let j = 0; j < times; j++) {
				ret.push(simpleClone(prev));
			}
		} else if (data[i].type === 'bracket') {
			data[i].value = expandTimes(data[i].value);
			ret.push(data[i]);
		} else if (data[i].type === 'function') {
			ret.push(data[i]);
		} else {
			throw new Error("Unimplemented type: " + data[i].type);
		}
	}

	return ret;
}

// Really simple cloning method
function simpleClone (obj) {
	return JSON.parse(JSON.stringify(obj));
}

function toHexArray (data) {
	let ret = [];
	let temp = '';

	for (let i = 0; i < data.length; i++) {
		let gob = data[i];

		if (gob.value.length % 2 === 1) {
			gob.value = '0' + gob.value;
		}

		for (let j = 0; j < gob.value.length; j++) {
			temp += gob.value[j];
			if ((j + 1) % 2 === 0) {
				ret.push(temp);
				temp = '';
			}
		}
	}

	return ret;
}

function toBuffer (data) {
	return Buffer.from(data.map(x => parseInt(x, 16)));
}

function doAllSteps (text) {
	let parseResult = parse(text);

	let convertResult = convert(parseResult);

	let expandResult = expand(convertResult);

	let hexArrResult = toHexArray(expandResult);

	let bufResult = toBuffer(hexArrResult);
	
	return bufResult;
}


module.exports = {
	parse,
	convert,
	expand,
	toHexArray,
	toBuffer,
	doAllSteps,
};