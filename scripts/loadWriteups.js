async function readFile(name) {
    return await (await fetch(name)).text();
}

async function loadWriteups(dirPath) {
    var content = await readFile(dirPath);
    var fileList = content.split(/\r?\n/);
    const contentDiv = document.getElementById("writeupstream");
    for (c of fileList) {
        if (c.length == 0) continue;
        if ((c[0] == ';') || (c[0] == '/')) continue;      //comment characters
        var newDiv = document.createElement("div");
        newDiv.className = "writeup";
        newDiv.id = c.split('.').slice(0, -1).join('.');
//        newDiv.innerHTML = await readFile("./writeups/" + c);
		newDiv.innerHTML = await readFile("https://raw.githubusercontent.com/ksjiang/ksjiang.github.io/master/writeups/" + c);
        contentDiv.appendChild(newDiv);
    }

    return;
}