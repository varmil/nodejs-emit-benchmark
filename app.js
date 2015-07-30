var profiler = require('v8-profiler');
var microtime = require('microtime');
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var _ = require('lodash');

/**
 * Handle argument
 */
var argvIndex = 2;
var CLIENT_COUNT_PER_ROOM;
if (! process.argv[argvIndex]) {
  return console.log('Usage: node app.js [client count per room (int)]');
} else {
  CLIENT_COUNT_PER_ROOM = process.argv[argvIndex];
}

// socket.ioのルーム用変数
var ROOM_NAME_PREFIX = 'room_';
var roomIndex = 0;

// ベンチマーク用変数
var users = 0;
var countReceived = 0;
var countSended = 0;

// 特定の部屋に接続しているソケット数を取得
var getRoommateCount = function(room) {
  return _.keys(io.sockets.adapter.rooms[room]).length;
};

// 全ルーム一覧リストを返す
var getAllRooms = function(io) {
  return _.chain(io.sockets.adapter.rooms)
    .keys()
    .filter(function(roomName) {
      return roomName.indexOf(ROOM_NAME_PREFIX) !== -1;
    })
    .value();
};

server.listen(3000);

/**
 * Display benchmark infomation
 */
(function() {
  function roundNumber(num, precision) {
    return parseFloat(Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision));
  }

  setInterval(function() {
    var auxReceived = roundNumber(countReceived / users, 1);
    var msuReceived = (users > 0 ? auxReceived : 0);

    var auxSended = roundNumber(countSended / users, 1);
    var msuSended = (users > 0 ? auxSended : 0);

    var l = [
      'U: ' + users,
      'MR/S: ' + countReceived,
      'MS/S: ' + countSended,
      'MR/S/U: ' + msuReceived,
      'MS/S/U: ' + msuSended,
    ];

    console.log(l.join(',\t'));
    countReceived = 0;
    countSended = 0;

  }, 1000);
})();

/**
 * Express Routing
 */
(function() {
  app.all('*', function(req, res, next) {
    req.startTime = microtime.now();
    next();
  });


  app.get('/', function (req, res, next) {
    countReceived++;

    // emit to a random existing room
    var roomName =  ROOM_NAME_PREFIX + _.random(0, getAllRooms(io).length - 1);
    io.to(roomName).emit('hi roommate');

    countSended += getRoommateCount(roomName);

    next();
  });

  app.all('*', function(req, res, next) {
    res.setHeader('Connection', 'close');
    res.end('accepted');

    var responseTime = microtime.now() - req.startTime;
    if (responseTime > 1000) console.log('[RESPONSE_TIME over 1ms]', responseTime, 'μs');

    next();
  });
})();

/**
 * socket.io
 */
(function() {
  io.sockets.on('connection', function(socket) {

    users = socket.client.conn.server.clientsCount;

    socket.on('disconnect', function() {
      users = socket.client.conn.server.clientsCount;
    });

    // join room
    var roomName = ROOM_NAME_PREFIX + roomIndex;
    socket.join(roomName);

    var roommateCount = getRoommateCount(roomName);
    console.log('[ROOM]', roomName, ' [COUNT]', roommateCount);

    // Increment roomIndex when room is full
    if (roommateCount >= CLIENT_COUNT_PER_ROOM) {
      roomIndex++;
    }
  });
})();
