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

var WIDTH = 475;
var HEIGHT = 475;




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
    var self = Entity();
    self.id = id;    
        self.number = "" + Math.floor(10 * Math.random());
        self.right = false;
        self.left = false;
        self.down = false;
        self.up = false;
        self.attacking = false;
        self.width = 10;
        self.height = 10;
        self.maxSpeed = 10;
        self.hp = 5;
        self.hpMax = 5;
        self.points = 0;
    

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
             
        if(self.x < self.width/2)
            self.x = self.width/2;
        if(self.x > WIDTH - self.width/2)
            self.x = WIDTH - self.width/2;

        if(self.y < self.height/2)
            self.y = self.height/2;
        if(self.y > HEIGHT - self.height/2)
            self.y = HEIGHT - self.height/2;               
    }


    self.getInitialisePack = function(){
        return {
            id:self.id,
            x:self.x,
            y:self.y,
            number:self.number,
            hp:self.hp,
            maxHp:self.hpMax,
            score:self.score,
        };
    }

    self.getUpdatePack = function(){
        return {
            id:self.id,
            x:self.x,
            y:self.y,
            hp:self.hp,
            score:self.score,
        };
    }


    Player.list[id] = self;

    initialisePack.player.push(self.getInitialisePack());

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

    var players = [];
    for (var i in Player.list)
        players.push(Player.list[i].getInitialisePack());  
        
    var bullets = [];
    for (var i in Bullet.list)
        bullets.push(Bullet.list[i].getInitialisePack()); 
      

    socket.emit('initialise',{
        selfID:socket.id,
        player:players,
        bullet:bullets,
        enemy:enemies,
    })
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
            pack.push(player.getUpdatePack());
    }
    return pack;
}

//Projectiles
var Bullet = function(angle){
    var self = Entity();
    self.id = Math.random();
    self.spdX = Math.cos(angle/180*Math.PI) * 10;
    self.spdY = Math.sin(angle/180*Math.PI) * 1;

    self.timer = 0;
    self.toRemove = false;
    var superUpdate = self.update;
    self.update = function(){
        if(self.timer++ > 100)
            self.toRemove = false;
        superUpdate();

       /* bullet collision
        for(var i in Player.list){
            var e =  enemies.list[i];
            if(self.getDistance (e) < 32 && self.parent !== e.id){
                enemy.toRemove = true;

                self.toRemove = true;
            }
        }*/

    }

 

    self.getInitialisePack = function(){
        return {
            id:self.id,
            x:self.x,
            y:self.y,
        };
    }

    self.getUpdatePack = function(){
        return {
            id:self.id,
            x:self.x,
            y:self.y,
        };
    }


    Bullet.list[self.id] = self;
    initialisePack.bullet.push(self.getInitialisePack());
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
                pack.push(bullet.getUpdatePack());
    }
    return pack;
}


var Enemy = function(){
        var self = Entity();
        self.id = Math.random();    
        self.width = 10 + Math.random()*30;
        self.height = 10 + Math.random()*30;
        self.spdX = 5 + Math.random()*30;
        self.spdY = 5 + Math.random()*30;
        self.maxSpeed = 15;
        self.x = 500;
        self.y = Math.random()*HEIGHT;
        self.timer = 0;


        var superUpdate = self.update;
        self.update = function(){
            self.updateSpeed();
            if(self.timer++ > 100)
                self.toRemove = false;
            superUpdate();
        }

        //getting the enemy to move across the screen.
        if(self.y < 0 || self.y > HEIGHT){
                console.log(message);
                self.spdY = -self.spdY;
        }


        /* collision
        for(var i in Enemy.list){
            var p =  Player.list[i];
            if(self.getDistance (p) < 32 && self.parent !== p.id){
                p.hp -= 1;
                var shooter = Player.list[self.parent];
                if(p.hp <= 0){
                    p.hp = p.hpMax;
                    p.y = Math.random * 500;
                }
                

                self.toRemove = true;
            }
        }*/
}
Enemy.list = {};

Enemy.Spawn = function(socket){
    var enemy = [];
    for (var i in Enemy.list)
        enemies.push(Enemy.list[i].getInitialisePack());   

}

Enemy.update = function(){
    var pack = [];
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
            Player.onConnect(socket);
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

var initialisePack = {player:[],bullet:[],enemy:[]};
var removePack = {player:[],bullet:[],enemy:[]};


setInterval(function(){
   var pack = {
       player:Player.update(),
       bullet:Bullet.update(),
       enemy:Enemy.update(),
   }

    for(var i in socketList){
        var socket = socketList[i];
        socket.emit('initialise',initialisePack);
        socket.emit('update',pack);
        socket.emit('remove',removePack);
    } 
    initialisePack.player = [];
    initialisePack.bullet = [];
    initialisePack.enemy = [];
    removePack.player = [];
    removePack.bullet = [];
    removePack.enemy = [];

   
},1000/25);

