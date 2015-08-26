var profiler = require('v8-profiler');
var microtime = require('microtime');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io').listen(server, { log: false });
var RedisStore = require('socket.io/lib/stores/redis');
var _ = require('lodash');


var redisConf = { host: '127.0.0.1', port: 6379 };
var store = new RedisStore({
  redisPub: redisConf, redisSub: redisConf, redisClient: redisConf
});
io.configure(function() {
  io.set('store', store);
});

/**
 * Handle argument
 */
var argvIndex = 2;
var CLIENT_COUNT_PER_ROOM, PORT;
if (! process.argv[argvIndex]) {
  return console.log('Usage: node app.js <client count per room (int)> <port (int, optional)>');
} else {
  CLIENT_COUNT_PER_ROOM = process.argv[argvIndex];
  PORT = process.argv[++argvIndex] ? process.argv[argvIndex] : '3000';
}


// CLUSTER
if (cluster.isMaster) {
    for (var i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
    return;
}


// socket.ioのルーム用変数
var ROOM_NAME_PREFIX = 'room_';
var roomIndex = 0;

// emit用のデータ
var EMITTING_DATA = '{"name":"foo","args":[{"bossUpdate":{"timestamp":"1439950797.23683800","param":{"boss1_hp":"15351142","boss1_mode":"1","boss1_mode_gauge":9,"boss1_condition":{"buff":[{"status":"1036_6","class":"turn","remain":0,"name":"トレジャーハント","detail":"アイテムドロップ率が上昇した状態"}],"debuff":[{"status":"1010","is_unusable_harb":false},{"status":"1020","is_unusable_harb":false},{"status":"1106","is_unusable_harb":false},{"status":"1027","is_unusable_harb":false},{"status":"1032","is_unusable_harb":false}]}}},"memberUpdate":{"timestamp":"1439950797.23696100","member":{"viewer_id":"118601761","user_id":"4235018","hp_ratio":100}},"mvpUpdate":{"timestamp":"1439950797.23700000","mvpList":[{"viewer_id":"102406672","user_id":"1819675","point":"4123","rank":1},{"viewer_id":"118601761","user_id":"4235018","point":"2166","rank":2},{"viewer_id":"115035122","user_id":"3469845","point":"1938","rank":3},{"viewer_id":"105680405","user_id":"2155539","point":"1673","rank":4},{"viewer_id":"76354350","user_id":"2655","point":"1432","rank":5},{"viewer_id":"93510101","user_id":"1142195","point":"195","rank":6},{"viewer_id":"105483322","user_id":"2361489","point":"146","rank":7}]}}]}';

// ベンチマーク用変数
var users = 0;
var countReceived = 0;
var countSended = 0;

// 特定の部屋に接続しているソケット数を取得
var getRoommateCount = function(room) {
  return io.sockets.clients(room).length;
};

// 全ルーム一覧リストを返す
var getAllRooms = function(io) {
  return _.chain(io.sockets.manager.rooms)
    .keys()
    .filter(function(roomName) {
      return roomName.indexOf(ROOM_NAME_PREFIX) !== -1;
    })
    .value();
};

server.listen(PORT);

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
    io.sockets.to(roomName).emit(EMITTING_DATA);

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

    users = io.sockets.clients().length;

    socket.on('message', function(message) {
      socket.send(message);
    });

    socket.on('disconnect', function() {
      users = io.sockets.clients().length;
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
