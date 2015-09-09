var io = require('socket.io-client');

function connect(host, port) {
  var socket = io.connect('http://' + host + ':' + port, {
    'force new connection': true,
  });

  socket.on('connect', function() {
  });

  socket.on('connect_error', function(reason) {
    console.error(reason);
  });

  socket.on('connect_timeout', function(reason) {
    console.error('[TIMEOUT]::', reason);
  });
}

var argvIndex = 2;

var users = parseInt(process.argv[argvIndex++]);
var rampUpTime = parseInt(process.argv[argvIndex++]) * 1000; // in seconds
var newUserTimeout = rampUpTime / users;
var host = process.argv[argvIndex++] ? process.argv[argvIndex - 1]  : 'localhost';
var port = process.argv[argvIndex++] ? process.argv[argvIndex - 1]  : '3000';

for(var i=0; i<users; i++) {
  setTimeout(function() { connect(host, port); }, i * newUserTimeout);
}
