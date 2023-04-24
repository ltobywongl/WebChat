const express = require('express');
const app = express();
var mysql = require('mysql');
var fs = require('fs');
var https = require('https');
var cors = require('cors');
require('dotenv').config()
app.use(cors());

//sql
var connection = mysql.createPool({
    connectionLimit: 10,
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
});

//socket.io
const server = https.createServer({
    key: fs.readFileSync('./private.key'),
    cert: fs.readFileSync('./certificate.crt'),
    ca: fs.readFileSync('./ca_bundle.crt'),
}, app);
var socket = require('socket.io');
var io = socket(server, {
    cors: {
        origin: ["https://chat.tobywong.ga"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

const cusers = [];
const User = (socketid, id, username, image, room) => { return { socketid: socketid, id: id, username: username, image: image, room: room } }

function userJoin(socketid, id, username, image, room) {
    const puser = User(socketid, id, username, image, room);
    cusers.push(puser);
    return puser;
}

function getUserBySocketID(id) {
    return cusers.find((puser) => puser.socketid === id);
}

function userDiscon(id) {
    const index = cusers.findIndex((puser) => puser.socketid === id);
    if (index !== -1) {
        return cusers.splice(index, 1)[0];
    }
}

function checkAccess(id, roomid) {
    return new Promise((resolve, reject) => {
        connection.query(`SELECT COUNT(1) FROM participant WHERE userid = (${id}) AND roomid = (${roomid});`, function (err, rows) {
            if (err) {
                console.log(err)
                reject(err)
            } else {
                if (JSON.parse(JSON.stringify(rows[0]))['COUNT(1)'] + '' === '1') {
                    console.log("checkAccess: true")
                    resolve(true);
                }
                resolve(false);
            }
        });
    })
}

io.on('connection', (socket) => {
    console.log("new connection! socket.id =", socket.id);
    socket.on('enterroom', async (id, username, image, room) => {
        const accessToRoom = await checkAccess(id, room);
        if (room === 1 || accessToRoom) {
            const olduser = getUserBySocketID(socket.id);
            if (olduser) {
                socket.leave(olduser.room);
                userDiscon(socket.id);
            }
            const puser = userJoin(socket.id, id, username, image, room);
            socket.join(puser.room);
            console.log("User joined room -", socket.id, id, username, room);
            var today = new Date();
            let HoursZ = today.getHours() >= 10 ? '' : '0';
            let MinutesZ = today.getMinutes() >= 10 ? '' : '0';
            let SecondsZ = today.getSeconds() >= 10 ? '' : '0';
            var time = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate() + " " + HoursZ + today.getHours() + ":" + MinutesZ + today.getMinutes() + ":" + SecondsZ + today.getSeconds();
            setTimeout(() => {
                io.in(puser.room).emit('message', "Server", "https://i.ibb.co/C90rDj5/chick-min.png", `Welcome ${puser.username} to the room!`, time);
            }, "1000");
        } else {
            console.log("User", id, "has no access to the room id", room);
            socket.emit('message', "Server", "https://i.ibb.co/C90rDj5/chick-min.png", `You have no access to the room!`, time);
        }
    });
    socket.on('chat', async (id, text) => {
        const puser = getUserBySocketID(socket.id);
        if (puser) {
            var today = new Date();
            let HoursZ = today.getHours() >= 10 ? '' : '0';
            let MinutesZ = today.getMinutes() >= 10 ? '' : '0';
            let SecondsZ = today.getSeconds() >= 10 ? '' : '0';
            var time = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate() + " " + HoursZ + today.getHours() + ":" + MinutesZ + today.getMinutes() + ":" + SecondsZ + today.getSeconds();
            if (puser) socket.broadcast.to(puser.room).emit('message', puser.username, puser.image, text, time);
            connection.query(`INSERT INTO message (id, roomid, userid, username, image, message, time) VALUES (NULL, '${puser.room}', '${id}', '${puser.username}', '${puser.image}', '${text}', CURRENT_TIMESTAMP);`, function (err) {
                if (err) {
                    console.log(err)
                };
            });
        }
    });
    socket.on('disconnect', () => {
        const puser = getUserBySocketID(socket.id);
        console.log(puser, "disconnected");
        if (puser) {
            var today = new Date();
            var time = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate() + " " + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
            io.in(puser.room).emit('message', 'Server', puser.image, `${puser.username} has left the room`, time);
            userDiscon(socket.id);
        }
    });
});

server.listen(2053, () => {
    console.log("socket.io server is running on port 2053")
});
