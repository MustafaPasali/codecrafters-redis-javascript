const net = require("net");

const server = net.createServer((connection) => {
  connection.on("data", data => {
    if (data == "*1\r\n$4\r\nping\r\n") {
        connection.write("+PONG\r\n")
    }
  })
});

server.listen(6379, "127.0.0.1");