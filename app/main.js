const net = require("net");

const crlf = "\r\n"

const operator = {
    string: '+',
    error: '-',
    integer: ':',
    bulkString: '$',
    array: '*'
}

function parseData(data) {
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
                [innerElement, innerElementType, innerElementLenght] = parseData(data)
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

const server = net.createServer((connection) => {
  connection.on("data", data => {
    let element; let elementType; let elementLength;
    [element, elementType, elementLength] = parseData(data.toString())
    if (elementType == "array") {
        if (element[0].toLowerCase() == "ping") {
            resp = "+" + "PONG" + crlf
            connection.write(resp)
        }
        else if (element[0].toLowerCase() == "echo") {
            resp = "$" + element[1].length.toString() + crlf + element[1] + crlf
            connection.write(resp)
        }
    }
  })
});

server.listen(6379, "127.0.0.1");