
function toggleButton(name, show) {
	if (show) document.getElementById(name).style.display = "";
	else document.getElementById(name).style.display = "none";
	return;
}

function toggleSticker(active) {
	if (active) {
		document.getElementById("serialLbl").innerHTML = `${(getSerial() >>> 16).toString().padStart(4, '0')}&nbsp;${(getSerial() & 0xffff).toString().padStart(5, '0')}`;
		document.getElementById("serialLbl").style.fontWeight = "bold";
		document.getElementById("serialLbl").style.color = "#9834e0";
		stickerActive = true;
	} else {
		// if the sticker is toggled off, clear SER and KEY
		resetSerialAndKey();
		document.getElementById("serialLbl").innerHTML = "XXXX&nbsp;XXXXX";
		document.getElementById("serialLbl").style.fontWeight = "";
		document.getElementById("serialLbl").style.color = "";
		stickerActive = false;
	}

	return;
}

function setStatus(text) {
	document.getElementById("status").innerHTML = text;
	return;
}

function getStatus() {
	return document.getElementById("status").innerHTML;
}

function actionAwaitTransmit() {
	setStatus("Remote connected!");
	toggleButton("bleConnect", false);
	// we don't toggle the state of the transmit button here; wait until serial number is populated
	return;
}

function actionAwaitConnect() {
	setStatus("Please connect to Bluetooth remote.");
	toggleButton("bleConnect", true);
	toggleButton("tx318", false);
	toggleSticker(false);
	return;
}

function actionAwaitPrevConnection() {
	setStatus("Found saved devices - attempting to connect");
	toggleButton("bleConnect", false);
	toggleButton("tx318", false);
	return;
}

function actionConnecting() {
	setStatus("Connecting...");
	toggleButton("bleConnect", false);
	toggleButton("tx318", false);
	return;
}

function errBLENotAvail() {
	setStatus("Web-BLE is not available! Switch to a different browser.");
	toggleButton("bleConnect", false);
	toggleButton("tx318", false);
	return;
}

document.addEventListener("DOMContentLoaded", function () {
	// attach handlers to buttons
	document.getElementById("bleConnect").addEventListener("click", function () {
		userRequestDevice().then(function (device) {
			connectToDevice(device, actionConnecting, function () {
				toggleSticker(true);
				toggleButton("tx318", true);
				return;
			}, actionAwaitConnect);
			return;
		}).then(actionAwaitTransmit);
		return;
	});
	document.getElementById("tx318").addEventListener("click", transmitCode);
	document.getElementById("clearSaved").addEventListener("click", function () {
		// "forget" all saved devices
		navigator.bluetooth.getDevices().then(function (deviceList) {
			let mbDeviceList;

			mbDeviceList = filterDevicesListMB(deviceList);
			for (const mbDevice of mbDeviceList) mbDevice.forget();
		});
		return;
	});
	// initialize button and label state
	toggleSticker(false);
	toggleButton("bleConnect", false);
	toggleButton("tx318", false);
	if (isWebBLEAvail()) {
		if (isGetDevicesAvail()) {
			// we will first try to see if any DKVR devices have been remembered, so that the user does not have to manually connect every time
			navigator.bluetooth.getDevices().then(function (deviceList) {
				let mbDeviceList;

				mbDeviceList = filterDevicesListMB(deviceList);
				if (mbDeviceList.length > 0) {
					const abortController = new AbortController();

					actionAwaitPrevConnection();
					for (const mbDevice of mbDeviceList) {
						watchAdvertisements(mbDevice, function (device) {
							connectToDevice(device, actionConnecting, function () {
								toggleSticker(true);
								toggleButton("tx318", true);
								return;
							}, actionAwaitConnect).then(actionAwaitTransmit);
						}, abortController);
					}

					// if it takes too long to receive an advertisement, allow manual connection
					setTimeout(function() {
						if (!(getStatus() === "Connecting..." || getStatus() === "Remote connected!")) toggleButton("bleConnect", true);
						return;
					}, 5000);
				} else actionAwaitConnect();		//if we cannot connect to previous DKVR devices, ask the user to connect
				return;
			});
		} else actionAwaitConnect();				//if getDevices() is not available, fallback to manual connection
	} else errBLENotAvail();
	return;
});
