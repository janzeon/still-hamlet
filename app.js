var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

//var routes = require('./routes/index');

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
    "teamsize":{"5":[2,3,2,3,3],"6":[2,3,4,3,4],"7":[2,3,3,4,4],"8":[3,4,4,5,5],"9":[3,4,4,5,5],"10":[3,4,4,5,5] },
    "doublefails":[7,8,9,10] //for n players on the 4th mission
}

function intelrules (room) {
    intel={"Merlin":[],"Percival":[],"Evil":[]}
    rplayers=rooms[room].players
    for (p in rplayers) {
        if (rules.characters[rplayers[p].char].loyalty == "b") {
            if(rplayers[p].char!="Mordred") {
                intel["Merlin"].push(rplayers[p].nickname)
            }
            if(rplayers[p].char!="Oberon") {
                intel["Evil"].push(rplayers[p].nickname)
            }
        }
        if(rplayers[p].char=="Morgana" || rplayers[p].char=="Merlin") {
                intel["Percival"].push(rplayers[p].nickname)
        }
    }
    rooms[room].intel=intel
    console.log(intel)
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
        players[p]["char"] = roles[i]
        i=i+1
    }
    return players
    console.log(players)
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
  //console.log(userId)
    
  //Room assignment - assigns a new number for each UNIQUE socket. yay recursion   
  function assignroom() {
      room=Math.floor(Math.random()*9000) + 1000 //max number of simultaneous rooms = 9999
      if(room in rooms) {
          return assignroom()
      }
      return room
  }
  if((userId.startsWith("board") && !(userId in players)) || (userId.startsWith("board") && (userId in players) && !rooms[players[userId].room].started)) {
      var room=assignroom()
      socket.join(String(room))//join room again
      console.log(io.sockets.adapter.rooms[room].sockets);
      players[userId]={"room":room,"id":socket.id} //register board in players variable.
      console.log(players)
      
      rooms[room]={"players":{"IDytwu67":{"nickname":"Janardhan", "selected":0, "vote":-1},"IDxtwub67":{"nickname":"Nick", "selected":0,  "vote":-1},"IDxytw67":{"nickname":"Mario", "selected":0,  "vote":-1},"IDxytub67":{"nickname":"Jana", "selected":0,  "vote":-1}},
      
    "score":[-1,-1,-1,-1,-1],"sabotages":[-1,-1,-1,-1,-1],"characters":[], "n":-1,"fvotes":0,"nvotes":[],"mvotes":[],"leader":4,"mission":1,"phase":"leader","selplayers":[], "started":false, "bid":socket.nickname}
  }
  else if (userId.startsWith("board") && (userId in players) && rooms[players[userId].room].started) {
      socket.join(String(players[userId].room))//join room again
      players[socket.nickname]["id"]=socket.id
      io.to(socket.id).emit('updateplayerlist', rooms[players[userId].room]['players'])
      io.to(socket.id).emit('updateboard', [rooms[players[userId].room].score,rooms[players[userId].room].fvotes,rooms[players[userId].room].phase,rooms[players[userId].room].selplayers] );
      io.to(socket.id).emit('refreshboard',1)
  }
  else if (userId in players && players[userId].room) {
      if(rooms[players[userId].room].started){
          socket.join(String(room))//join room again
          io.to(socket.id).emit("startroom", players[userId].room)
          phase=rooms[players[userId].room].phase
          players[socket.nickname]["id"]=socket.id
          if(phase=="leader"){
              if( rooms[players[userId].room].selplayers.indexOf(rooms[players[userId].room].players[userId].nickname)>=0) {
                console.log(rooms[players[userId].room].players[userId].nickname)
                  io.to(socket.id).emit("updatephase", "leader")
              }
              else {
                  io.to(socket.id).emit("updatephase", "idle")
              }
          }
          else if(phase=="vote"){
              io.to(socket.id).emit("updatephase", "vote")
          }
          else if(phase=="mission"){
              if( rooms[players[userId].room].selplayers.indexOf(rooms[players[userId].room].players[userId].nickname)>=0) {
                  io.to(socket.id).emit("updatephase", "mission")
              }
              else {
                  io.to(socket.id).emit("updatephase", "idle")
              }
          }
      }
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
      //console.log(!(room in rooms))
      if (!(room in rooms)) { 
           console.log("!(room in rooms)")
        io.to(socket.id).emit('joinstatus', 404)
      }
      else if (rooms[room]["started"]!=true) {
          socket.join(String(room))
          
          if (players[socket.nickname]["room"]!='') { //if the user is already in a room, remove them from other room first. 
              var otherroom=players[socket.nickname]["room"] //store users current room
              delete rooms[String(otherroom)]['players'][socket.nickname]; //remove user from previous room
          }
          
          players[socket.nickname]["room"]=room  //update room info for current player 
          players[socket.nickname]["id"]=socket.id  //update room info for current player 
          
          if(socket.nickname in rooms[String(room)]['players']) {
              rooms[String(room)]['players'][socket.nickname]["nickname"]=nickname}  
          else {
              rooms[String(room)]['players'][socket.nickname]={"nickname":nickname}}//register player (uid) into room object
          //console.log(rooms[String(room)]['players'][socket.nickname])
          //console.log(rooms[room].bid)
          //console.log(players)
          bid=players[rooms[room].bid].id
          console.log(players[rooms[room].bid].id)
          console.log(players[rooms[room].bid])
          console.log(rooms[room].bid)
          //io.to(bid).emit('updateplayerlist', rooms[String(room)]['players'])
          io.to(room).emit('updateplayerlist', rooms[String(room)]['players'])

          console.log("in" + room)
          console.log(io.sockets.adapter.rooms[room].sockets);
      }
      else {
          io.to(socket.id).emit('joinstatus', 300)
      }
      //console.log("All")
      //console.log(io.sockets.clients())
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
      //console.log(players)
      return players
  }
    
  //LEADER EVENTS

  function getleader(room) {
      rooms[room].phase="leader"
      var leader=Object.keys(rooms[room].players)[rooms[room].leader]
      rooms[room].leader=rooms[room].leader+1
      if (rooms[room].leader>Object.keys(rooms[room].players).length-1) {
          rooms[room].leader=0
      }
      //bid=players[rooms[room].id].id
      io.to(players[leader].id).emit("updatephase", "leader")
      //io.to(room).emit("updatephaseboard", "leader")
      io.to(room).emit('updateplayerlist', rooms[room]['players'])
      rooms[room].selplayers=[rooms[room].players[leader].nickname]
      io.to(room).emit('selectedplayerstoboard', [rooms[room].players[leader].nickname]); 
      io.to(room).emit("updatephaseboard", "leader")//connect to board
  }
  
    
  socket.on('leaderready', function(room) {
      //bid=players[rooms[room].bid].id
    console.log(room)
      console.log("mission "+rooms[room].mission)
    
    data = {"players":getplayernames(room),"teamsize":rules.teamsize[String(rooms[room].n)][rooms[room].mission-1]}
    console.log(data)
    io.to(socket.id).emit('leaderdata', data);
    io.to(room).emit('leaderdataboard', data.teamsize);
  });  
  

  socket.on('selectedteam', function(d) {
      //bid=players[rooms[d[0]].bid].id
    p=rooms[d[0]].players
    Object.keys(p).map(function(el){         
        if(d[1].indexOf(p[el].nickname)>=0) {
            p[el].selected=1
        }
        else {
            p[el].selected=0
        }
        return p[el]})
    io.to(d[0]).emit('updateplayerlist', rooms[d[0]]['players']);
    //io.emit('selectedplayerstoboard', d[1]); //connect to board
  }); 
    

    
  socket.on('leaderdone', function(d) {
      //bid=players[rooms[d[0]].bid].id
    io.sockets.in(d[0]).emit("updatephase", "vote")
    rooms[d[0]].phase="vote"
    io.to(d[0]).emit('sendnumberofvotes', [rooms[d[0]].n, rooms[d[0]].nvotes.length]);
    io.to(d[0]).emit("updatephaseboard", "vote")
    io.to(d[0]).emit('selectedplayerstoboard', d[1]);
    rooms[d[0]].selplayers=d[1]
  });   
    
  //VOTE EVENTS
  socket.on('voteselected', function(d) {
      bid=players[rooms[d[0]].bid].id
    rooms[d[0]].players[socket.nickname].vote=d[1]
    if (rooms[d[0]].nvotes.indexOf(socket.nickname)<0) {
        rooms[d[0]].nvotes.push(socket.nickname)
        console.log("adding to nvotes")
    }
    io.to(d[0]).emit('sendnumberofvotes', [rooms[d[0]].n, rooms[d[0]].nvotes.length]);
    //uncomment for deployment \/
    //if (rooms[d[0]].nvotes.length==rooms[d[0]].n-1) {
    if (rooms[d[0]].nvotes.length==3) {
        //Timer implementation
        var timeleft = 5;
        var downloadTimer = setInterval(function(){
            timeleft--;
            io.to(d[0]).emit('voteendtimer', timeleft);
            if(timeleft <= 0) {
                io.to(d[0]).emit('updateplayerlist', rooms[d[0]]['players']);
                console.log("updating player list")
                votesdone(d[0])
                clearInterval(downloadTimer);
            }
        },1000);
        
        //io.emit('updateplayerlist', rooms[d[0]]['players']);
        //console.log("updating player list")
    }
  }); 
    
    
  function votesdone(room){
      //bid=players[rooms[room].bid].id
      pass=0
      fail=0
      console.log(rooms[room].nvotes)
      for (p in rooms[room].nvotes) {
          console.log(p)
          if (rooms[room].players[rooms[room].nvotes[p]].vote == 0){
              fail=fail+1
          }
          else if (rooms[room].players[rooms[room].nvotes[p]].vote == 1){
              pass=pass+1
          }
      }
      if (pass>fail) {
          //pass 
          var timeleft = 3;
          var downloadTimer = setInterval(function(){
                timeleft--;
                io.to(room).emit('voteresult', [1,1]);
                if(timeleft <= 0) {
                    io.to(room).emit('voteresult', [1,0]);
                    clearInterval(downloadTimer);
                    io.to(room).emit("updatephase","idle")
                      for (nickname in rooms[room].players){
                           if (rooms[room].players[nickname].selected==1){
                               io.to(players[nickname].id).emit("updatephase","mission")
                           }
                      }

                      rooms[room].fvotes=0
                      rooms[room].nvotes=[]
                      rooms[room].phase="mission"
                      io.to(room).emit("updatephaseboard", "mission")
                      var mn=rules.teamsize[String(rooms[room].n)][rooms[room].mission-1] //number of players on the team for this mission
                  io.to(room).emit('sendnumberofvotes', [mn, rooms[room].nvotes.length]); //send to board
                }
            },1000);
      }
      else {
          //fail, (ties fail)
          
          rooms[room].fvotes=rooms[room].fvotes+1
          var timeleft = 3;
          var downloadTimer = setInterval(function(){
                timeleft--;
                io.to(room).emit('voteresult', [0,-1]);
                if(timeleft <= 0) {
                    io.to(room).emit('voteresult', [0,0]);
                    clearInterval(downloadTimer);
                    if(rooms[room].fvotes==5){
                          rooms[room].fvotes=0
                          missiondone(room,-1) //-1 = mission fails due to 5 consec team pick fails
                      }
                      rooms[room].nvotes=[]
                      io.sockets.in(room).emit("updatephase","idle")
                      resetboard(room,0) //must be before get leader else will reset selplayer
                      getleader(room)
                }
            },1000);
          
          
      }
  }
//MISSION EVENTS
  socket.on('missionselected', function(d) {
    if (rooms[d[0]].nvotes.indexOf(socket.nickname)<0) {
        rooms[d[0]].nvotes.push(socket.nickname)
        console.log("adding to nvotes")
    } //adding socketnames into nvotes
    rooms[d[0]].mvotes[rooms[d[0]].nvotes.indexOf(socket.nickname)]=d[1] //adding votes into mvotes
    //console.log(rooms[room].n)
    //console.log(rules.teamsize)
    //console.log(rules.teamsize[String(rooms[room].n)])
    //console.log(rooms[room].mission-1)
      
    var mn=rules.teamsize[String(rooms[d[0]].n)][rooms[d[0]].mission-1] //number of players on the team for this mission
    io.to(d[0]).emit('sendnumberofvotes', [mn, rooms[d[0]].nvotes.length]); //send to board
    if (rooms[d[0]].nvotes.length==mn) { //when votes are in submit in 3 sec
        //Timer implementation
        var timeleft = 3;
        var downloadTimer = setInterval(function(){
            timeleft--;
            io.to(d[0]).emit('voteendtimer', timeleft); //time left to board
            if(timeleft <= 0) {
                missiondone(d[0],0) //submit votes
                clearInterval(downloadTimer);
            }
        },1000);
        
        //io.emit('updateplayerlist', rooms[d[0]]['players']);
        //console.log("updating player list")
    }
  }); 
  function missiondone(room,r){ //mission votes processor and responder
      var sabotages=rooms[room].mvotes.filter(function(it) {return it == 0;}).length //get number of fail votes (0s) 
      rooms[room].sabotages[rooms[room].mission-1]=new Array(sabotages)
      //io.to(room).emit("sabotages",rooms[room].sabotages)
      if (rooms[room].n in rules.doublefails && room[room].mission==4 && sabotages==1) {sabotages=0} //The 4th mission needs 2x fails when playing with 7,8,9,10 players #rules. If theres only 1 sabotage, mission passes.
      
      if (sabotages>=1 || r<0) {
          //fail
          rooms[room].score[rooms[room].mission-1]=0 //0 is fail 
          io.to(room).emit("missionresult",0)
          console.log("dropping mission")
          //change for mission pick variation
      }
      else { //pass
          rooms[room].score[rooms[room].mission-1]=1 //1 is pass 
          io.to(room).emit("missionresult",1)
          console.log("raising mission")
      }
      didanyonewin(room)
      console.log("advancing mission")
      rooms[room].mission=rooms[room].mission+1 //advance mission, change to implement pick your own mission variation 
      io.sockets.in(room).emit("updatephase","idle") //mission over, restart
      resetboard(room,1)
      getleader(room)
  }

  function didanyonewin(room){
      if (rooms[room].score.filter(function(it) {return it == 0;}).length==3){
          io.sockets.in(room).emit("whowon", 0) //Evil wins, 3 to win
          delete rooms[room]
      }
      if (rooms[room].score.filter(function(it) {return it == 1;}).length==3){
          io.sockets.in(room).emit("whowon", 1)//Implement Assassin here
          delete rooms[room]
      }
  }

    
  function resetboard(room, f) { 
    p=rooms[room].players
    Object.keys(p).map(function(el){  
        p[el].selected=0
        p[el].vote=-1
        return p[el]})
    rooms[room].selplayers=[]
    rooms[room].nvotes=[]
    rooms[room].mvotes=[]
    if(f){rooms[room].fvotes=[]}
    io.to(room).emit('updateplayerlist', rooms[room]['players']);
    io.to(room).emit('updateboard', [rooms[room].score,rooms[room].fvotes,rooms[room].phase,rooms[room].selplayers, rooms[room].sabotages] );
    //io.emit('selectedplayerstoboard', d[1]); //connect to board
  }
    
    
  //BOARD EVENTS  
  socket.on('startroom', function(data) {
    //console.log(io.sockets.connected)
    
    
    var room=data.room
    console.log(data)
    rooms[room]["n"]=data.nplayers
    rooms[room]["started"]=true
    rooms[room]["characters"]=data.chars
    rooms[room]["players"]=assignroles(rooms[room]["characters"], rooms[room]["players"])
    intelrules(room) //generate intel for these characters


    io.sockets.in(room).emit('startroom', room);
    getleader(room)
    //for (var key in players) {
       // if (players.hasOwnProperty(key)) {
         //   socketid=players[key].sid
           // io.to(socketid).emit('console', "Heres"+key);
    //    }
    // }
    //data = "score":[-1,-1,-1,-1,-1],"characters":[], "n":-1,"fvotes":0,"leader":"","mission":1,"phase":"leader","selplayers":[], "started":false}
      
    //console.log("Start rooms")
    //console.log(rooms[room].players["IDytwu67"])
    //console.log("End rooms")
  });  
    
    
  function updateroom(room) {
        io.to(room).emit('room', rooms[room])
  }
  
  socket.on('getintel', function(room) {
    character = rooms[room].players[socket.nickname].char
    intel=[]
    if (character == "Merlin" || character == "Percival") {
        intel=rooms[room].intel[character]
    }
    else if (character == "Knight" || character == "Oberon") {
        intel=""
    }
    else if (character == "Mordred" || character == "Morgana" || character == "Assassin" || character == "Minion") {
        intel=rooms[room].intel["Evil"]
    }
    
    io.to(socket.id).emit('intel', {"character":character,"intel":intel})
  });
    
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
