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

var enemies = {};

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
    self.getDistance = function(pt){
        return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
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
        self.attacking = false;
        self.maxSpeed = 10;
    }

    var superUpdate = self.update;
    self.update = function(){
        self.updateSpeed();
        superUpdate();

        if (self.attacking) {
           self.shootRockets(Math.random()*0);
        }
    }

    //shooting the projectiles 
    self.shootRockets = function(angle){
        var rockets = Bullet(angle);
            rockets.x = self.x;
            rockets.y = self.y;
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

    initialisePack.player.push({
        id:self.id,
        x:self.x,
        y:self.y,
        number:self.number,
    });

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
        else if(data.inputId === 'space')
            player.attacking = data.state;             
    });
}

Player.onDisconnect = function(socket){
    delete Player.list[socket.id];
    removePack.player.push(socket.id);
}

Player.update = function(){
    var pack = [];
        for (var i in Player.list){
            var player = Player.list[i];
            player.update();
            pack.push({
                id:player.id,
                x:player.x,
                y:player.y               
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

        /* bullet collision
        for(var i in Player.list){
            var e =  enemies.list[i];
            if(self.getDistance (e) < 32 && self.parent !== e.id){
                //score ++
                self.toRemove = true;
            }
        }*/

    }

    Bullet.list[self.id] = self;
    initialisePack.bullet.push({
        id:self.id,
        x:self.x,
        y:self.y,
    });
    return self;
}
Bullet.list = {};

Bullet.update = function(){

    var pack = [];
        for (var i in Bullet.list){
            var bullet = Bullet.list[i];
            bullet.update();
            if(bullet.toRemove){
                delete Bullet.list[i];
                removePack.bullet.push(bullet.id);
            } else 
                pack.push({
                    id:bullet.id,
                    x:bullet.x,
                    y:bullet.y,
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

var initialisePack = {player:[],bullet:[]};
var removePack = {player:[],bullet:[]};


setInterval(function(){
   var pack = {
       player:Player.update(),
       bullet:Bullet.update(),
   }

    for(var i in socketList){
        var socket = socketList[i];
        socket.emit('initialise',initialisePack);
        socket.emit('update',pack);
        socket.emit('remove',removePack);
    } 
    initialisePack.player = [];
    initialisePack.bullet = [];
    removePack.player = [];
    removePack.bullet = [];

   
},1000/25);

