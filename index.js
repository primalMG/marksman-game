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
var Entity = function(parameter){
    var self = {
        x:250,
        y:250,
        spdX: 0,
        spdY: 0,
        id: "",
    }
    if(parameter){
        if(parameter.x)
            self.x = parameter.x;
        if(parameter.y)
            self.id = parameter.id;
        if(parameter.id)
            self.id = parameter.id;    
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

var Player = function(parameter){
    var self = Entity(parameter); 
        self.username = parameter.username;
        self.number = "" + Math.floor(10 * Math.random());
        self.right = false;
        self.left = false;
        self.down = false;
        self.up = false;
        self.attacking = false;
        self.width = 10;
        self.height = 10;
        self.maxSpeed = 10;
        self.hp = 1;
        self.hpMax = 1;
        self.score = 0;
    

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


    Player.list[self.id] = self;

    initialisePack.player.push(self.getInitialisePack());

    return self;
}


Player.list = {};

Player.onConnect = function(socket,username){
    var player = Player({
        username:username,
        id:socket.id,
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
        else if(data.inputId === 'space')
            player.attacking = data.state;             
    });
    
    //sending a users message to the server.
    socket.on('pushMessage', function(data){
        for(var i in socketList){
            socketList[i].emit('newMessage',player.username  + ': ' + data);
            }
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

    //bullet collision
        for(var i in Enemy.list){
            var e =  Enemy.list[i];
            if(self.getDistance (e) < 32 && self.parent !== e.id){
                e.eHp -= 1;
                if(e.eHp <= 0){
                var shooter = Player.list[self.parent];
                    if(shooter)
                        shooter.score += 1;
                        e.hp = e.hpMax;
                        e.x = Math.random() * 500;
                        e.y = Math.random() * 500;     
                    }    
                self.toRemove = true;
            }
        }

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


var Enemy = function(id){
        var self = Entity();
        self.id = "" + Math.floor(50 * Math.random());  
        self.width = 10 + Math.random()*30;
        self.height = 10 + Math.random()*30;
        self.spdX = 5 + Math.random()*10;
        self.spdY = 5 + Math.random()*10;
        self.maxSpeed = 10;
        self.eHp = 1;
        self.eHp = 1;

      
        self.timer = 0;


        var superUpdate = self.update;
        self.update = function(){
            self.updateSpeed();
            superUpdate();
        }

        self.updateSpeed = function(){
        //getting the enemy to move across the screen.     

        if(self.y < 0 || self.y > HEIGHT){
                self.spdY = -self.spdY;
            }
        if(self.x < 0 || self.x > WIDTH){
            self.spdX = -self.spdX;
        }    
        }

        self.getInitialisePack = function(){
            return {
                id:self.id,
                width:self.width,
                height:self.height,
                x:self.x,
                y:self.y,
                spdX:self.spdX,
                spdY:self.spdY,
                eHp:self.hp,
                maxHp:self.maxHp,
            };
        }

        self.getUpdatePack = function(){
            return {
                id:self.id,
                x:self.x,
                y:self.y,
            };
        }

        /*for(var i in Player.list){
            var p =  Player.list[i];
            if(self.getDistance(p) < 32 && self.parent !== p.id){
                p.hp -= 1;
            }    
        }*/
     

        Enemy.list[id] = self;

        initialisePack.enemy.push(self.getInitialisePack());

        return self;
}

Enemy.list = {};

Enemy.Spawn = function(socket){
    var enemy = Enemy(socket.id);
    var enemies = [];
    for (var i in Enemy.list)
        enemies.push(Enemy.list[i].getInitialisePack()); 

    socket.emit('initialiseE',{
        selfID:socket.id,
        enemy:enemies,
    })
}

Enemy.update = function(){
    var pack = [];
        for (var i in Enemy.list){
            var enemy = Enemy.list[i];
            enemy.update();
            pack.push(enemy.getUpdatePack());
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
	socket.on('join',function(data){ //{username,password}
			if(passwordValidation){
				Player.onConnect(socket,data.username);
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

    //spawning the emeies
    Enemy.Spawn(socket);

    //disconnecting a player
    socket.on('disconnect', function(){
        delete socketList[socket.id];
        Player.onDisconnect(socket);
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
        socket.emit('initialiseE',initialisePack);
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
