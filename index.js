var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var queue = require('queue')();

app.get('/',function(req, res){
    res.sendFile(__dirname + '/index.html');
});


http.listen(3000,function(){
    console.log('listening on 3000');
});

var socketList = {};
var playerList ={};

var Player = function(id){
    var self = {
        x:250,
        y:250,
        id:id,
        number:"" + Math.floor(10 * Math.random()),
        right:false,
        left:false,
        down:false,
        up:false,
        maxSpeed:10,
    }
    self.updatePosition = function(){
        if(self.right)
            self.x += self.maxSpeed;
            if(self.left)
            self.x -= self.maxSpeed;
            if(self.down)
            self.y -= self.maxSpeed;
            if(self.up)
            self.y += self.maxSpeed;    
    }
    return self;
}

//getting the usernames of the listners
var userList = {
    "marcus":"pass",
}

var passwordValidation = function(data){
    return userList[data.nickname] === data.pass;
}

var usernameValidation = function(data){
    return userList[data.nickname];
}

var addUser = function(data) {
    userList[data.nickname] = data.pass;
}

//serverside goodness
io.on('connection', function(socket){
    socket.id = Math.random();
    socketList[socket.id] = socket;

    //allowing user to sign in
    socket.on('join',function(data){
        if(passwordValidation(data)){
            Listener.onConnect(socket);
            socket.emit('loginResponse',{success:true});
        } else {
            socket.emit('loginResponse',{success:false});
        }
    });

    //allowing user to sign up
    socket.on('create',function(data){
        if(usernameValidation(data)){
            socket.emit('signUpResponse',{success:false});
        } else {
            addUser(data);
            socket.emit('signUpResponse',{success:true});
        }
    });
 
    var player = Player(socket.id);
    playerList[socket.id] = player;

    //disconnecting a player
    socket.on('disconnect', function(){
        delete socketList[socket.id];
        delete playerList[socket.id];

    });

    socket.on('keyPress', function(data){
        if(data.inputId === 'left')
            player.left = data.state;
        else if(data.inputId === 'right')
            player.right = data.state;
        else if(data.inputId === 'up')
            player.up = data.state;
        else if(data.inputId === 'down')
            player.down = data.state;         
    });

    //sending a users message to the server.
    socket.on('pushMessage', function(data){
        var userId = ("" + socket.id).slice(2,7);
        for(var i in socketList){
            socketList[i].emit('newMessage', userId + ': ' + data);
        }
    });

    socket.on('evalServer', function(data){
        var res = eval(data);
        socket.emit('evalAnswer',res);
    });
});


setInterval(function(){
    var pack = [];
    for(var i in playerList){
        var player = playerList[i];
        player.updatePosition();
        pack.push({
            x:player.x,
            y:player.y,
            number:player.number 
        });
    }
    for(var i in socketList){
        var socket = socketList[i];
        socket.emit('newPositions',pack)
    } 
   
},1000/25);

