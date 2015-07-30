# Simple nodejs, socket.io benchmark.
(forked from https://github.com/michetti/socket.io-benchmark)


### Installation:
1. clone this repository
1. on created dir, `npm i`
1. set ulimit `ulimit -u <desired ulimit>`, `ulimit -n <desired ulimit>`
	* set ulimit to increase max number of opened sockets.


### Run:
1. Start server: `node app.js <client count per room> <port>`
	* transports is websocket
	* Port parameter is optional. If not specified, it will connect to port **3000**.
	* You can `DEBUG=* node app.js 30`
	* Log Option, see [official docs](http://socket.io/docs/migrating-from-0-9/#log-differences)

1. Start clients: `node benchmark.js <users> <rampup in seconds> <host> <port>`
	* Host and port parameters are optional. If not specified, it will connect to **localhost** on port **3000**.
	* Different Config Example: `node benchmark.js 120 60 192.168.1.50 4040`
	* Ex: 'node benchmark.js 120 60' -> one new user every 0.5 seconds, until 120 users are connected.

1. Start benchmark: `ab -n 100 -c 100 http://localhost:3000/`
	* Node server emits to a random room in response to ab request
	* Response ends when emitting is over


### Option:
* It is better to repeat step 2 multiple times than run it one time with a lot of users, since node is monothread.


### Response time:
* Run `node responsetime.js <host> <port>`
	* To see current response time. It will connect another user, that will send messages to the server, using the echo behaviour. The cicle time is logged in miliseconds.
* Host and port parameters are optional. If not specified, it will connect to **localhost** on port **3000**.

### Output:
app.js will log the following line each second:
`U: 100, MR/S: 2500, MS/S: 2500, MR/S/U: 25, MS/S/U: 25`

```
U       -> Number of connected users
MR/S    -> Messages received per second
MS/S    -> Messages sended per second
MR/S/U  -> Messages received per second per user
MS/S/U  -> Messages sended per second per user
```

* To verify global resources utilization (by server and multiple clients processes), use 'top', 'htop' (recomended) or something like it.


### Debug/Profilling:
Both app.js and benchmark.js have support for v8-profiler/node inspector.

To debug/profile app.js:

1. `node --debug app.js`
1. `node inspector &`
1. open the printed url (must be a webkit compatible browser, like chrome)


### TODO/Brainstorm:
* Make benchmark.js fork new processes to run clients, instead of running the script multiple times.
* Use redis store and create several server processes.


Tested only with node v0.12.0.
