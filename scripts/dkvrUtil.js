
/*
Synchronization counter utilities
*/

let counterURLBase = "https://dkrsworker.kerljenge.workers.dev/?pwd=thwg2020";

function updateURLWithSerial(ser) {
	counterURLBase = `${counterURLBase}&ser=${ser.toString(16).padStart(7, '0')}`;
	return;
}


/*
Bluetooth low energy utilities (micro:bit)
*/

const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTICS_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHARACTERISTICS_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
let rxCharacteristic, txCharacteristic;
let encoder = new TextEncoder();
let SER, K_H, K_L;

// Resets the state of the encryption
function resetSerialAndKey() {
	SER = undefined;
	K_H = undefined;
	K_L = undefined;
	return;
}

function getSerial() {
	return SER;
}

function isWebBLEAvail() {
	return !!navigator.bluetooth;
}

function isGetDevicesAvail() {
	return !!navigator.bluetooth.getDevices;
}

function filterDevicesListMB(devList) {
	return devList.filter(function (device) {
		return device.name.startsWith("BBC micro:bit");
	});
}

async function watchAdvertisements(dev, connectHandler, abortController) {
	dev.addEventListener("advertisementreceived", function () {
		abortController.abort();
		connectHandler(dev);
		return;
	});
	dev.watchAdvertisements({signal: abortController.signal});
	return;
}

function onTxCharacteristicValueChanged(event, DOMCallback) {
	let i, receivedData;

	receivedData = [];
	for (i = 0; i < event.target.value.byteLength; i++) {
		receivedData[i] = event.target.value.getUint8(i);
	}

	const receivedString = String.fromCharCode.apply(null, receivedData);
	if (receivedString.substring(0, 3) === "ser") {
		SER = parseInt(receivedString.substring(3, 10), 16);
		updateURLWithSerial(SER);
		DOMCallback();
	} else if (receivedString.substring(0, 3) === "key") {
		K_H = parseInt(receivedString.substring(3, 11), 16);
		K_L = parseInt(receivedString.substring(11, 19), 16);
	}

	return;
}

async function userRequestDevice() {
	let dev;

	dev = await navigator.bluetooth.requestDevice({
		filters: [{namePrefix: "BBC micro:bit"}], 
		optionalServices: [UART_SERVICE_UUID]
	});
	return dev;
}

async function connectToDevice(dev, preConnectHandler, DOMCallback, disconnectHandler) {
	preConnectHandler();
	dev.addEventListener("gattserverdisconnected", disconnectHandler);
	const server = await dev.gatt.connect();
	const service = await server.getPrimaryService(UART_SERVICE_UUID);
	rxCharacteristic = await service.getCharacteristic(UART_RX_CHARACTERISTICS_UUID);
	txCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTICS_UUID);
	txCharacteristic.startNotifications();
	txCharacteristic.addEventListener("characteristicvaluechanged", function (evt) {
		onTxCharacteristicValueChanged(evt, DOMCallback);
		return;
	});
	// add a small delay so that the device can warm up
	await new Promise(function(r) {
		setTimeout(r, 200);
	});
	await rxCharacteristic.writeValue(encoder.encode("wakeup\n"));
	requestSerialAndKey();
	return;
}

async function requestSerialAndKey() {
	await rxCharacteristic.writeValue(encoder.encode("getSerial\n"));
	await rxCharacteristic.writeValue(encoder.encode("getKey\n"));
	return;
}

function transmitCode() {
	fetch(`${counterURLBase}`).then(function (res) {
		if (!res.ok) throw new Error("Bad response from counter endpoint.");
		return res.text();
	}).then(async function (responseText) {
		let ctrVal, ciph, comm, i;

		ctrVal = parseInt(responseText);
		ciph = klqEncryptDKCtr(ctrVal, K_H, K_L);
		comm = computeBitStream(SER, ciph).map(function (x) {
			return x.toString(16).padStart(2, '0')
		}).join("");
		for (i = 0; i < 4; i++) await rxCharacteristic.writeValue(encoder.encode(`${i}>${comm.substring(16 * i, 16 * (i + 1))}\n`));
		await rxCharacteristic.writeValue(encoder.encode(`4>${comm.substring(64, 68)}\n`));
		return;
	}).catch(function (err) {
		console.error(`Couldn't write: ${err}`);
		return;
	});
	return;
}

// compute HCS301-compatible keystream
function computeBitStream(serial, hopping) {
	let i, j, curByte, bitStream, byteStream, cappedSerial;

	bitStream = [];
	serial &= 0x0fffffff;
	cappedSerial = uint32(0x20000000 | serial);
	// preamble
	for (i = 0; i < 23; i++) bitStream.push(getBit(i + 1, 0));
	// header
	for (i = 0; i < 10; i++) bitStream.push(0);
	// hopping portion
	for (i = 0; i < 32; i++) {
		bitStream.push(1);
		bitStream.push(getBit(hopping, i) ^ 1);
		bitStream.push(0);
	}

	// fixed portion
	for (i = 0; i < 32; i++) {
		bitStream.push(1);
		bitStream.push(getBit(cappedSerial, i) ^ 1);
		bitStream.push(0);
	}

	// set VLOW
	bitStream.push(...[1, 0, 0]);
	// set RPT
	bitStream.push(...[1, 0, 0]);
	// guard time
	for (i = 0; i < 39; i++) bitStream.push(0);
	// two extra elements to get a whole number of bytes
	bitStream.push(...[0, 0]);

	byteStream = [];
	for (i = 0; i < 34; i++) {
		curByte = 0;
		for (j = 0; j < 8; j++) {
			curByte += bitStream[8 * i + j] << (7 - j);
		}

		byteStream.push(curByte);
	}

	return byteStream;
}


/*
Keeloq encryption utilities
*/

// Convert an integer to unsigned integer
function uint32(x) {
	return x >>> 0;
}

// Keeloq encryption constants
const ROUNDS = 528;
const NLF = 0x3a5c742e;

// Gets a bit at a particular position
function getBit(x, pos) {
	return (x >>> pos) & 1;
}

// Compute the Keeloq FSR non-linear function
function klqNLF(a, b, c, d, e) {
	return getBit(
		NLF, 
		(a << 4) | (b << 3) | (c << 2) | (d << 1) | e
		);
}

// Perform Keeloq encryption on a 32-bit block
function klqEncryptBlk(plaintext, key_h, key_l) {
	let step, keybit, newbit, rd, ciphertext;

	ciphertext = plaintext;
	for (rd = 0; rd < ROUNDS; rd++) {
		step = rd % 64;
		if (step < 32) keybit = getBit(key_l, step);
		else keybit = getBit(key_h, step - 32);
		newbit = klqNLF(
		getBit(ciphertext, 31), 
		getBit(ciphertext, 26), 
		getBit(ciphertext, 20), 
		getBit(ciphertext, 9), 
		getBit(ciphertext, 1)
		) ^ keybit ^ getBit(ciphertext, 16) ^ getBit(ciphertext, 0);
		ciphertext = uint32(uint32(newbit << 31) | (ciphertext >>> 1));
	}

	return ciphertext;
}

function klqEncryptDKCtr(ctr, key_h, key_l) {
	let plaintext, ciphertext;

	ctr = ctr & 0xffff;
	plaintext = uint32(uint32(0x2230 << 16) | ctr);
	ciphertext = klqEncryptBlk(plaintext, key_h, key_l);
	return ciphertext;
}
