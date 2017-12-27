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

//Super class for the player and bullets -- updating positions
var Entity = function(){
    var self = {
        x:250,
        y:250,
        spdX: 0,
        spdY: 0,
        id: "",
    }
    self.update = function(){
        self.updatePosition();
    }
    self.updatePosition = function(){
        self.x += self.spdX;
        self.y += self.spdY;
    }
    return self;
}

var Player = function(id){
    var self = Entity();{
    self.id = id;    
        self.number = "" + Math.floor(10 * Math.random());
        self.right = false;
        self.left = false;
        self.down = false;
        self.up = false;
        self.maxSpeed = 10;
    }

    var superUpdate = self.update;
    self.update = function(){
        self.updateSpeed();
        superUpdate();
    }
    
    self.updateSpeed = function(){
        if(self.right)
            self.spdX = self.maxSpeed;
        else if(self.left)
            self.spdX = -self.maxSpeed;
        else
            self.spdX = 0;
                
        if(self.up)
            self.spdY = self.maxSpeed;
        else if(self.down)
            self.spdY = -self.maxSpeed;
        else
            self.spdY = 0;        
    }
    Player.list[id] = self;
    return self;
}


Player.list = {};

Player.onConnect = function(socket){
    var player = Player(socket.id);
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
}

Player.onDisconnect = function(socket){
    delete Player.list[socket.id];

}

Player.update = function(){
    var pack = [];
        for (var i in Player.list){
            var player = Player.list[i];
            player.update();
            pack.push({
                x:player.x,
                y:player.y,
                number:player.number
            });
    }
    return pack;
}

//Projectiles
var Bullet = function(angle){
    var self = Entity();
    self.id = Math.random();
    self.spdX = Math.cos(angle/180*Math.PI) * 10;
    self.spdY = Math.sin(angle/180*Math.PI) * 10;

    self.timer = 0;
    self.toRemove = false;
    var superUpdate = self.update;
    self.update = function(){
        if(self.timer++ > 100)
            self.toRemove = true;
        superUpdate();
    }
    Bullet.list[self.id] = self;
    return self;
}
Bullet.list = {};

Bullet.update = function(){
    if (Math.random() < 0.1) {
        Bullet(Math.random()*360);
    }

    var pack = [];
        for (var i in Bullet.list){
            var bullet = Bullet.list[i];
            bullet.update();
            pack.push({
                x:bullet.x,
                y:bullet.y,
                number:bullet.number
            });
    }
    return pack;
}



//getting the usernames of the players.
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
    
    //creating a new player.
    Player.onConnect(socket);

    //disconnecting a player
    socket.on('disconnect', function(){
        delete socketList[socket.id];
        Player.onDisconnect(socket);
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
   var pack = {
       player:Player.update(),
       bullet:Bullet.update(),
   }

    for(var i in socketList){
        var socket = socketList[i];
        socket.emit('newPositions',pack)
    } 
   
},1000/25);

