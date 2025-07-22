
function actionAwaitTransmit() {
	document.getElementById("status").innerHTML = "Transmitter connected!";
	document.getElementById("bleConnect").style.display = "none";
	document.getElementById("tx318").style.display = "";
	return;
}

function actionAwaitConnect() {
	document.getElementById("status").innerHTML = "Please connect to remote.";
	document.getElementById("bleConnect").style.display = "";
	document.getElementById("tx318").style.display = "none";
	document.getElementById("serialLbl").innerHTML = "XXXX&nbsp;XXXXX";
	return;
}

function actionConnecting() {
	document.getElementById("status").innerHTML = "Connecting...";
	document.getElementById("bleConnect").style.display = "";
	document.getElementById("tx318").style.display = "none";
	return;
}

function errBLENotAvail() {
	document.getElementById("status").innerHTML = "Web-BLE is not available!";
	document.getElementById("bleConnect").style.display = "none";
	document.getElementById("tx318").style.display = "none";
	return;
}

function updateSticker() {
	document.getElementById("serialLbl").innerHTML = `${(SER >>> 16).toString().padStart(4, '0')}&nbsp;${(SER & 0xffff).toString().padStart(5, '0')}`;
	return;
}

document.addEventListener("DOMContentLoaded", function () {
	document.getElementById("bleConnect").addEventListener("click", function () {
		connectToDevice(actionConnecting, requestSerialAndKey, updateSticker, actionAwaitConnect).then(actionAwaitTransmit);
		return;
	});
	document.getElementById("bleConnect").style.display = "none";
	document.getElementById("tx318").addEventListener("click", transmitCode);
	document.getElementById("tx318").style.display = "none";
	document.getElementById("serialLbl").innerHTML = "XXXX&nbsp;XXXXX";
	if (isWebBLEAvail()) actionAwaitConnect(); else errBLENotAvail();
	return;
});
