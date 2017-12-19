var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(function(req, res, next){
  res.io = io;
  next();
});
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var players={}
//playeruid(fromcookie):{sid:"socketid",room:"",nickname:"",}


var rooms={"5599":{"players":[],"currentstate":"","score":[-1,-1,-1,-1,-1],"characters":[],"nextmission":1,"failedvotes":0,"n":5}}

//room :{"players":[],"currentstate":"","score":"","characters":[]}
var rules={
    "teamsplit":{"5":{"g":3}, "6":{"g":4}, "7":{"g":4}, "8":{"g":5}, "9":{"g":6}, "10":{"g":6}},
    "characters":{
        "Merlin":{"loyalty":"g"},
        "Assassin":{"loyalty":"b"},
        "Mordred":{"loyalty":"b"},
        "Oberon":{"loyalty":"b"},
        "Percival":{"loyalty":"g"}, 
        "Morgana":{"loyalty":"b"}, 
        "Knight":{"loyalty":"g"},
        "Minion":{"loyalty":"b"}
    },
    "teamsize":{"5":[2,3,2,3,3],"6":[2,3,4,3,4],"7":[2,3,3,4,4],"8":[3,4,4,5,5],"9":[3,4,4,5,5],"10":[3,4,4,5,5] }
}





function getroles(selchars, n) {
    goodN=rules.teamsplit[String(n)].g //number of good players
    badN=n-goodN    //number of bad players
    for(i in selchars){
        if(rules.characters[selchars[i]].loyalty=="g") {
            goodN=goodN-1
        }
        else {
            badN=badN-1
        }
    }
    for (var i = 0; i < goodN; i++) selchars.push("Knight");
    for (var i = 0; i < badN; i++) selchars.push("Minion");
    for (var i = selchars.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = selchars[i];
        selchars[i] = selchars[j];
        selchars[j] = temp;
    }
    return selchars
}

function assignroles(roles, players) {
    i=0
    for (p in players) {
        players[p].char = roles[i]
        i=i+1
    }
    return players
}







//HTTP
app.get('/', function(req, res, next) {
  res.sendfile('views/index.html');
});
app.get('/player', function(req, res, next) {
  res.sendfile('public/player.html');  
});
app.get('/board', function(req, res, next) {
  res.sendfile('public/board.html');  
});
app.get('/roomnumber', function(req, res, next) {
  boardId=req.headers.cookie.match(/\buser_id=([a-zA-Z0-9]{32})/)[1]
  res.json(players[boardId].room);  
});
//app.post('/start', function(req, res, next) {
//  var n=10 //get from request
//  var selchars=["Merlin","Assassin"] //get from request
//  var room = "5599"
//  var roles=getroles(selchars,n)
//  assignroles(roles, room)
//  var rand = roles[Math.floor(Math.random() * roles.length)];
//  res.sendfile('submit/index.html');
//    
//});

//SOCKET!
io.on('connection', function(socket){
  //extracts unique user id from cookie
  var cookie = socket.handshake.headers.cookie;
  var match = cookie.match(/\buser_id=([a-zA-Z0-9]{32})/);  //parse cookie header
  var userId = match ? match[1] : null;
  socket.nickname=userId
  
  //Room assignment - assigns a new number for each UNIQUE socket. yay recursion   
  function assignroom() {
      room=Math.floor(Math.random()*9000) + 1000 //max number of simultaneous rooms = 9999
      if(room in rooms) {
          return assignroom()
      }
      return room
  }
  if(userId.startsWith("board") && !(userId in players)) {
      room=assignroom()
      players[userId]={"room":room} //register board in players variable.
      rooms[room]={"players":{},"currentstate":"","score":[-1,-1,-1,-1,-1],"characters":[],"nextmission":1,"failedvotes":0,"n":-1,"fvotes":0,"leader":"","mission":1,"phase":"leader","selplayers":[],"started":false, "leader":0}
  }
  else {
      
  }
  
  //Register every UNIQUE player
  if(!(userId in players)) {
      players[userId]={"room":""}
      io.emit('console', userId)
  }

    
  console.log('Yay, connection was recorded')
    
  //join player    
  socket.on('join', function(data){
      var room =data[0]
      var nickname =data[1]
      console.log(!(room in rooms))
      if (!(room in rooms)) { 
           console.log("!(room in rooms)")
        io.to(socket.id).emit('joinstatus', 404)
      }
      else if (rooms[room]["started"]!=true) {
          socket.join(String(room))
          console.log(players[socket.nickname])
          if (players[socket.nickname]["room"]!='') { //if the user is already in a room, remove them from other room first. 
              var otherroom=players[socket.nickname]["room"] //store users current room
              delete rooms[String(otherroom)]['players'][socket.nickname]; //remove user from previous room
          }
          players[socket.nickname]["room"]=room  //update room info for current player 
          if(socket.nickname in rooms[String(room)]['players']) {
              rooms[String(room)]['players'][socket.nickname]["nickname"]=nickname}  
          else {
              rooms[String(room)]['players'][socket.nickname]={"nickname":nickname}}//register player (uid) into room object
          console.log(rooms)
          io.emit('updateplayerlist', rooms[String(room)]['players'])

          //console.log("in 5599")
          //console.log(io.sockets.adapter.rooms["5599"].sockets);
      }
      else {
          io.to(socket.id).emit('joinstatus', 300)
      }
      console.log("All")
      console.log(io.sockets.clients())
  });
    
 // socket.on('nickname', function(msg){
 //   players[userId]["nickname"]=msg     //update username info for current player
//    io.emit('console', "New user joined - "+msg);
//    console.log(players)
//  });
    
  function getplayernames(room) {
      var players={}
      for (p in rooms[room].players) {
          players[p]=rooms[room].players[p].nickname
      }
      console.log(players)
      return players
  }
    
  //LEADER EVENTS

  function getleader(room) {
      var leader=Object.key(rooms[room].players)[rooms[room].leader]
      rooms[room].leader=rooms[room].leader+1
      if (rooms[room].leader>Object.key(rooms[room].players).length-1) {
          rooms[room].leader=0
      }
  }
    
  socket.on('leaderready', function(room) {
    console.log("mission "+rooms[room].nextmission)
    data = {"players":getplayernames(room),"teamsize":rules.teamsize[String(rooms[room].n)][rooms[room].nextmission-1]}
    console.log(data)
    io.sockets.in(room).emit('leaderdata', data);
  });  
  
  socket.on('selectedteam', function(d) {
    io.sockets.in(d[0]).emit('selectedplayerstoboard', d[1]); //connect to board
  }); 
    
  socket.on('leaderdone', function(room) {
    io.sockets.in(room).emit('startvote', "");
  });   
    
  //VOTE EVENTS
  nvotes=[]
  socket.on('votedone', function(d) {
    console.log(players[socket.nickname].nickname)
    io.sockets.in(d[0]).emit('votestoboard', data);
  });    
    
    
  //BOARD EVENTS  
  socket.on('startroom', function(data) {
    //console.log(io.sockets.connected)
    
    
    var room=data.room
    console.log(data)
    rooms[room]["n"]=data.nplayers
    rooms[room]["characters"]=data.chars
    rooms[room]["players"]=assignroles(rooms[room]["characters"], rooms[room]["players"])
    
    rooms[room]["n"]=data.nplayers
    rooms[room]["started"]=true
    rooms[room]["characters"]=data.chars
    rooms[room]["players"]=assignroles(rooms[room]["characters"], rooms[room]["players"])
    //rooms.room.n=data.nplayers
    //rooms.room.characters=data.chars
    console.log(data.chars)

    io.sockets.in(room).emit('startroom', room);
    //for (var key in players) {
       // if (players.hasOwnProperty(key)) {
         //   socketid=players[key].sid
           // io.to(socketid).emit('console', "Heres"+key);
    //    }
    // }
    //data = {"players":getplayernames(room),"teamsize":rules.teamsize[String(rooms[room].n)][rooms[room].nextmission-1]}
    console.log(data)
  });  
    
  function updateroom(room) {
        io.emit('room', rooms[room])
  }
  
    
    
    
  //Fix all below
  socket.on('missonstat', function(msg){
    io.emit('console', msg);
  });
  
  socket.on('leaveroom', function() {
    room=players[socket.nickname]["room"]
    socket.leave(room);
    io.emit('console', 'socket '+socket.id+' disconnected from '+ room);
  });
    
});
module.exports = {app: app, server: server};
