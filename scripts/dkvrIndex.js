
function actionAwaitTransmit() {
	document.getElementById("status").innerHTML = "Remote connected!";
	document.getElementById("bleConnect").style.display = "none";
	document.getElementById("tx318").style.display = "";
	return;
}

function actionAwaitConnect() {
	document.getElementById("status").innerHTML = "Please connect to Bluetooth remote.";
	document.getElementById("bleConnect").style.display = "";
	document.getElementById("tx318").style.display = "none";
	document.getElementById("serialLbl").innerHTML = "XXXX&nbsp;XXXXX";
	document.getElementById("serialLbl").style.fontWeight = "";
	document.getElementById("serialLbl").style.color = "";
	return;
}

function actionConnecting() {
	document.getElementById("status").innerHTML = "Connecting...";
	document.getElementById("bleConnect").style.display = "";
	document.getElementById("tx318").style.display = "none";
	return;
}

function errBLENotAvail() {
	document.getElementById("status").innerHTML = "Web-BLE is not available! Switch to a different browser.";
	document.getElementById("bleConnect").style.display = "none";
	document.getElementById("tx318").style.display = "none";
	return;
}

function updateSticker() {
	document.getElementById("serialLbl").innerHTML = `${(SER >>> 16).toString().padStart(4, '0')}&nbsp;${(SER & 0xffff).toString().padStart(5, '0')}`;
	document.getElementById("serialLbl").style.fontWeight = "bold";
	document.getElementById("serialLbl").style.color = "#9834e0";
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
	document.getElementById("serialLbl").style.fontWeight = "";
	document.getElementById("serialLbl").style.color = "";
	if (isWebBLEAvail()) actionAwaitConnect(); else errBLENotAvail();
	return;
});
