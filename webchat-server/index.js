const express = require('express');
const app = express();
var mysql = require('mysql');
var fs = require('fs');
var https = require('https');
var cors = require('cors');
require('dotenv').config()
app.use(cors());

//sql
var connection = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
});

connection.connect(function (err) {
    if (err) {
        console.log(err);
    } else console.log("Connection success (sql).");
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
        origin: ["https://chat.tobywong.ga", "http://localhost", "https://localhost"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

const cusers = [];
const User = (id, username, image, room) => { return { id: id, username: username, image: image, room: room } }

function userJoin(id, username, image, room) {
    const puser = User(id, username, image, room);
    cusers.push(puser);
    return puser;
}

function getUser(id) {
    return cusers.find((puser) => puser.id === id);
}

function userDiscon(id) {
    const index = cusers.findIndex((puser) => puser.id === id);
    if (index !== -1) {
        return cusers.splice(index, 1)[0];
    }
}

io.on('connection', (socket) => {
    console.log("new connection! socket.id =", socket.id);
    socket.on('joinroom', (id, username, image, room) => {
        const puser = userJoin(id, username, image, room);
        socket.join(puser.room);
        console.log("new user!", id, username, image, room);
        var today = new Date();
        var time = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate() + " " + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        io.in(puser.room).emit('message', "Server", puser.image, `Welcome ${puser.username}`, time);
    });
    socket.on('chat', (id, text) => {
        const puser = getUser(id);
        var today = new Date();
        var time = today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate() + " " + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        if (puser) socket.broadcast.to(puser.room).emit('message', puser.username, puser.image, text, time);
    });
    socket.on('disconnect', () => {
        const puser = getUser(socket.id);
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
