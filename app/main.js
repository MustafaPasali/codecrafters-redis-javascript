var args = process.argv.slice(2);
let port;
if (args.includes("--port")) {
    port = args[args.indexOf("--port") + 1]
    if (port) {
        port = parseInt(port)
    }
}
if (!port) {
    port = 6379
}
const net = require("net");
const { it } = require("node:test");

const crlf = "\r\n"

const operator = {
    string: '+',
    error: '-',
    integer: ':',
    bulkString: '$',
    array: '*'
}

const memory = {};

function load(data) {
    data = data.toString()
    let dataType = data.charAt(0)
    let element;
    let elementLength = "";
    let elementType;
    if (dataType == operator.string) {
        elementType = "string"
        element = data.substring(1, data.indexOf(crlf))
    }
    else if (dataType == operator.error) {
        elementType = "error"
        element = data.substring(1, data.indexOf(crlf))
    }
    else if (dataType == operator.integer) {
        elementType = "integer"
        element = parseInt(element = data.substring(1, data.indexOf(crlf)))
    }
    else if (dataType == operator.bulkString) {
        elementType = "bulkString"
        elementLength = data.substring(1, data.indexOf(crlf))
        let start = 1 + elementLength.length + crlf.length
        element = data.substring(start, data.indexOf(crlf, start))
    }
    else if (dataType == operator.array) {
        elementType = "array"
        element = []
        elementLength = data.substring(1, data.indexOf(crlf))
        let innerElement; let innerElementType; let innerElementLenght;
        let start = 1 + elementLength.length + crlf.length;
        while (true) {
            data = data.substring(start)
            if (data) {
                [innerElement, innerElementType, innerElementLenght] = load(data)
                element.push(innerElement)
                if (innerElementLenght) {
                    start = 1 + innerElementLenght.length + crlf.length + innerElement.length + crlf.length
                }
                else {
                    start = 1 + innerElement.length + crlf.length
                }
            }
            else {
                break
            }
        }
    }
    return [element, elementType, elementLength]
}

function dump(element, elemenType) {
    let data;
    if (elemenType == "string") {
        data = operator.string + element + crlf
    }
    else if (elemenType == "error") {
        data = operator.error + element + crlf
    }
    else if (elemenType == "integer") {
        data = operator.integer + element + crlf
    }
    else if (elemenType == "bulkString") {
        if (element) {
            data = operator.bulkString + element.length.toString() + crlf + element + crlf
        }
        else {
            data = operator.bulkString + '-1' + crlf
        }
    }
    else if (elemenType == "array") {
        data = operator.array + element.length.toString() + crlf
        for (let i = 0; i < element.length; i++) {
            let item = element[i];
            let innerData;
            if (typeof item == "string") {
                innerData = dump(item, "string")
            }
            else if (typeof item == "number") {
                innerData = dump(item, "integer")
            }
            else if (typeof item == "object") {
                innerData = dump(item, "array")
            }
            data = data + innerData
        }
    }
    return data
}

function parse(data) {
    let element; let elementType; let elementLength;
    [element, elementType, elementLength] = load(data)
    if (elementType == "array") {
        let resp;
        if (element[0].toLowerCase() == "ping") {
            resp = dump("PONG", "string")
        }
        else if (element[0].toLowerCase() == "echo") {
            resp = dump(element[1], "bulkString")
            
        }
        else if (element[0].toLowerCase() == "set") {
            memory[element[1]] = {};
            memory[element[1]]["value"] = element[2]
            if (element[3]) {
                if (element[3].toLowerCase() == "px") {
                    memory[element[1]]["expire"] = Date.now() + parseInt(element[4])
                }
            }
            resp = dump("OK", "string")
        }
        else if (element[0].toLowerCase() == "get") {
            let elementData = memory[element[1]];
            let value = null;
            if (elementData) {
                value = elementData["value"];
                let expire = elementData["expire"];
                if (expire) {
                    let now = Date.now()
                    if (expire < now) {
                        value = null
                    }
                }
            }
            resp = dump(value, "bulkString")
        }
        else if (element[0].toLowerCase() == "info") {
            resp = dump("role:master", "bulkString")
        }
        return resp
    }
}

const server = net.createServer((connection) => {
  connection.on("data", data => connection.write(parse(data)))
});

server.listen(port, "127.0.0.1");
