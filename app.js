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
  res.json(Number(players[boardId].room));  
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
  var sroom = ''
  socket.nickname=userId
  //console.log(userId)
    
  //Register every UNIQUE player
  if(!(userId in players)) {
      players[userId]={"room":"", "id":socket.id}
      io.emit('console', userId)
  }
  else {
      sroom=players[userId].room
      players[userId].id=socket.id // update socket id for known player 
  }
    
  //Room assignment - assigns a new number for each UNIQUE socket. yay recursion   
  function assignroom() {
      newroom=Math.floor(Math.random()*9000) + 1000 //max number of simultaneous rooms = 9999
      if(newroom in rooms) {
          return assignroom()
      }
      return newroom
  }
    
  //BOARD CONNECTIONS
  //create new board
  function newboard(r){
      sroom=String(r) //get new room
      socket.join(sroom)
      players[socket.nickname].room=sroom
      //rooms[sroom]={"players":{"IDytwu67":{"nickname":"Janardhan", "selected":0, "vote":-1},"IDxtwub67":{"nickname":"Nick", "selected":0,  "vote":-1},"IDxytw67":{"nickname":"Mario", "selected":0,  "vote":-1},"IDxytub67":{"nickname":"Jana", "selected":0,  "vote":-1}},
        
      rooms[sroom]={"players":{},
        "score":[-1,-1,-1,-1,-1],"sabotages":[-1,-1,-1,-1,-1],"characters":[], "n":-1,"fvotes":0,"nvotes":[],"mvotes":[],"leader":0,"mission":1,"phase":"leader","selplayers":[], "started":false, "bid":socket.nickname}
  }
  function playagain(){
      rooms[sroom]={"players":rooms[sroom].players,
        "score":[-1,-1,-1,-1,-1],"sabotages":[-1,-1,-1,-1,-1],"characters":[], "n":-1,"fvotes":0,"nvotes":[],"mvotes":[],"leader":rooms[sroom].leader+1,"mission":1,"phase":"leader","selplayers":[], "started":false, "bid":socket.nickname}
      //keeo players and leader tracker. reinitialize everything else.
      resetboard(sroom,0)
      updateboard([
          'score','sabotages',
          'characters','n',
          'leader','phase',
          'selplayers','fvotes',
          'mvotes','nvotes',
          'players','started'], sroom)
      io.to(sroom).emit('updateboard',{'result':-1})
  }
  
  function updateboard(items, room){
      var returnobj = {}
      console.log(room)
      console.log(items)
      console.log(rooms)
      console.log(rooms[room])
      io.emit('console',room)
      io.emit('console',items)
      io.emit('console',rooms[room])
      for(i in items){
          io.emit('console',i)
          console.log(i)
          returnobj[items[i]]=rooms[room][items[i]]
          io.emit('console',returnobj)
      }
      io.to(room).emit('updateboard',returnobj)
      io.emit('console',returnobj)
      
      return returnobj
  }
    
  //rejoin existing game
  function rejoingame(){
      socket.join(sroom)//join room again
      updateboard([
          'score',
          'fvotes',
          'phase',
          'selplayers',
          'fvotes',
          'mvotes',
          'nvotes',
          'players',
          'started'], sroom)
  }
  
  if(userId.startsWith("board")) {
      //if(!(userId in players)) { //i.e. board not in 'players'
      //    io.emit('console','Board not in players, Creating new board')
      //    newboard(assignroom())
      //} //Commented because this case is already handled prior to this line
      //else { // i.e. user is in 'players'
      if (players[userId].room!=''){ //board is in a room 
          io.emit('console','Board has a room assigned')
          if (rooms[players[userId].room].started) { //room has started
              //Old board and in game
              io.emit('console','in room and started')
              rejoingame()
          }
          else { //room assigned but has not started
              //update player list and room
              io.emit('console','in room but not started')
              socket.join(sroom) 
              io.to(sroom).emit('updateboard',{'players':rooms[sroom].players,'room':sroom})
          }
      }
      else { //board not in room
          io.emit('console','not in room, reassigning room and creating new')
          newboard(assignroom())
      }
      //}
  }
  else if(userId.startsWith("pl")) {
      if(userId in players) { //i.e. player in 'players'
          if (players[userId].room!=''){ //player has room
              sroom=players[userId].room
              if (players[userId].room in rooms) { 
                  if (rooms[players[userId].room].started) { //game started
                      rejoinplayer() // join again
                  }
                  else { //game not started
                      //refreshed while waiting for players to join.
                      socket.join(String(sroom)) // join socket to room 
                      io.to(socket.id).emit("startroom", players[userId].room)
                      io.to(socket.id).emit("updatephase", "wait")
                  }
              }
              else {
                  //do nothing, this should never be possible because players are evacuated from room at end of game 
                  io.to(socket.id).emit("console", "Impossible: room already closed")
              }
          }
          else {
              io.to(socket.id).emit("console","Did nothing because OLD player trying to join new game")
          }
      }
      else {
          io.to(socket.id).emit("console","Did nothing because NEW player trying to join new game")
      }
  }
 
  function rejoinplayer() {
      socket.join(String(sroom))//join socket to room 
      io.to(socket.id).emit("startroom", players[userId].room)
      phase=rooms[players[userId].room].phase
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
  
  

    
  console.log('Yay, connection was recorded')
    
  //join player    
  socket.on('join', function(data){
      io.emit("console",rooms)
      io.emit("console",players)
      room =data[0]
      console.log('joining room'+data[1])
      console.log(room)
      var nickname =data[1]
      //console.log(!(room in rooms))
      if (!(room in rooms)) { 
           console.log("!(room in rooms)")
        io.to(socket.id).emit('joinstatus', 404)
      }
      else if (rooms[room]["started"]!=true) {
          socket.join(String(room))
          
          if (players[socket.nickname]["room"]!='' && rooms[players[socket.nickname]["room"]]) { //if the user is already in a room, remove them from other room first. 
              var otherroom=players[socket.nickname]["room"] //store users current room
              delete rooms[String(otherroom)]['players'][socket.nickname]; //remove user from previous room
          }
          
          players[socket.nickname]["room"]=String(room)  //update room info for current player 
          players[socket.nickname]["id"]=socket.id  //update room info for current player 
          
          if(socket.nickname in rooms[String(room)]['players']) {
              rooms[String(room)]['players'][socket.nickname]["nickname"]=nickname}  
          else {
              rooms[String(room)]['players'][socket.nickname]={"nickname":nickname}}//register player (uid) into room object
          io.to(room).emit('updateplayerlist', rooms[String(room)]['players'])

          console.log("in" + room)
          console.log(io.sockets.adapter.rooms[room].sockets);
      }
      else {
          io.to(socket.id).emit('joinstatus', 300)
      }
      io.emit("console",players)
      //console.log("All")
      //console.log(io.sockets.clients())
  });
    
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
      console.log('getting leader')
      console.log(room)
      console.log(rooms[room])
      console.log(players)
      
      rooms[room].phase="leader"
      var leader=Object.keys(rooms[room].players)[rooms[room].leader]
      console.log(leader)
      
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
  
    
  socket.on('leaderready', function(r) {
      //bid=players[rooms[room].bid].id
    console.log(r)
    console.log("mission "+rooms[r].mission)
    
    data = {"players":getplayernames(r),"teamsize":rules.teamsize[String(rooms[r].n)][rooms[r].mission-1]}
    console.log(data)
    io.to(socket.id).emit('leaderdata', data);
    io.to(r).emit('leaderdataboard', data.teamsize);
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
    
        io.to(d[0]).emit('sendnumberofvotes', [rooms[d[0]].n, rooms[d[0]].nvotes.length]);
        //uncomment for deployment \/
        if (rooms[d[0]].nvotes.length==rooms[d[0]].n) {
        //if (rooms[d[0]].nvotes.length==3) {
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
        //adding votes into mvotes
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
                if(timeleft == 0) {
                    missiondone(d[0],0) //submit votes
                    clearInterval(downloadTimer);
                }
            },1000);

            //io.emit('updateplayerlist', rooms[d[0]]['players']);
            //console.log("updating player list")
        }
    } //adding socketnames into nvotes
    rooms[d[0]].mvotes[rooms[d[0]].nvotes.indexOf(socket.nickname)]=d[1] 
      
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
      if (didanyonewin(room,-1)==0){
          var v=resetboard(room,1)
          io.to(room).emit("console","victory")
          io.to(room).emit("gameover",v)
      }
      else if (didanyonewin(room,-1)==1){
          var v=resetboard(room,1)
          io.to(room).emit("console","victory")
          io.to(room).emit("gameover",v)
      }
      else if (didanyonewin(room,-1)==2){
          io.to(room).emit("console","assassin")
          io.to(room).emit("assassin",0)
          assassin(room)
      }
      else {
          console.log("advancing mission")
          rooms[room].mission=rooms[room].mission+1 //advance mission, change to implement pick your own mission variation 
          io.sockets.in(room).emit("updatephase","idle") //mission over, restart
          resetboard(room,1)
          getleader(room)
      }
  }

  function didanyonewin(room,r){
      console.log(r)
      if (rooms[room].score.filter(function(it) {return it == 0;}).length==3 || r==1){
          //io.sockets.in(room).emit("whowon", 0) //Evil wins, 3 to win or merlin was assassinated
          winlose(room, 0)
          io.to(room).emit("console", "EVIL WINS")
          rooms[room].phase="gameended"
          return 0
          
      }
      if (rooms[room].score.filter(function(it) {return it == 1;}).length==3 && r==-1){
          //if good won 3 quests, Assassin
          return 2
      }
      if (rooms[room].score.filter(function(it) {return it == 1;}).length==3 && r==0){ //Good wins, 3 to win and merlin survives
          winlose(room, 1)
          io.to(room).emit("console", "Good WINS")
          rooms[room].phase="gameended"
          return 1
      }
      return -1
  }

  function closeroom(room){
      console.log(rooms[room])
      console.log(players)
      players[rooms[room].bid].room = ''
      for (p in rooms[room].players) {
          console.log(p)
          players[p].room=''
      }
      io.to(room).emit("updatephase","join")
      console.log('closing room'+room)
      io.to(room).emit("console","closing room")
      sroom=''
      delete rooms[room]
  }
    
  socket.on('closeroom', function(room) {
      closeroom(room)
  })
  socket.on('playagain', function(room) {
      playagain()
  })
    
  function winlose(room,r){ //update game end status to player consoles
      rooms[room]
      rplayers=rooms[room].players
      if (r==0){
          io.to(room).emit("victory",0)
          for (p in rplayers) {
              if (rules.characters[rplayers[p].char].loyalty == "b") {
                 io.to(players[p].id).emit("updatephase","victory")
                 io.to(players[p].id).emit("won", "b")
              }
              else {
                io.to(players[p].id).emit("updatephase","defeat")
                io.to(players[p].id).emit("lost", "g")
              }
          }
      }
      else {
          io.to(room).emit("victory",1)
          for (p in rplayers) {
              if (rules.characters[rplayers[p].char].loyalty == "g") {
                io.to(players[p].id).emit("updatephase","victory")
                io.to(players[p].id).emit("won", "g")
              }
              else {
                io.to(players[p].id).emit("updatephase","defeat")
                io.to(players[p].id).emit("lost", "b")
              }
          }
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
    if(f){rooms[room].fvotes=0}
    io.to(room).emit('updateplayerlist', rooms[room]['players']);
    updateboard([
          'score',
          'fvotes',
          'phase',
          'selplayers',
          'fvotes',
          'mvotes',
          'nvotes',
          'players',
          'selplayers',
          'sabotages'], room)
    //io.emit('selectedplayerstoboard', d[1]); //connect to board
  }

//ASSASSIN EVENTS

  function assassin(room) {
      io.sockets.in(room).emit("updatephase","idle")
      rooms[room].phase="assassin"
      var assassin=""
      Object.keys(rooms[room].players).map(function(el){         
        if(rooms[room].players[el].char=="Assassin") {
            assassin=el
        }
      })
      console.log(assassin)
      console.log("assassin")
      //bid=players[rooms[room].id].id
      io.to(players[assassin].id).emit("updatephase", "assassin")
      //io.to(room).emit("updatephaseboard", "leader")
      io.to(room).emit('updateplayerlist', rooms[room]['players'])
      io.to(room).emit('console', "assassin")
      rooms[room].selplayers=[rooms[room].players[assassin].nickname]
      io.to(room).emit('selectedplayerstoboard', [rooms[room].players[assassin].nickname]); 
      io.to(room).emit("updatephaseboard", "assassin")//connect to board
  }
  
  //socket.on('leaderready', function(room) {

  //socket.on('selectedteam', function(d) {

  socket.on('assassindone', function(d) {
      //bid=players[rooms[d[0]].bid].id
    var merlin=""
    Object.keys(rooms[d[0]].players).map(function(el){         
        if(rooms[d[0]].players[el].char=="Merlin") {
            merlin=rooms[d[0]].players[el].nickname
        }
      })
    console.log(merlin)
    if(merlin==d[1]){
        didanyonewin(d[0],1)
    }
    else{
        didanyonewin(d[0],0)  
    }
  }); 
    
  //GAME START EVENTS  
  socket.on('startroom', function(data) {
    var room=data.room
    console.log("starting game in room " + room)
    console.log(data)
    rooms[room]["n"]=data.nplayers
    rooms[room]["started"]=true
    rooms[room]["characters"]=data.chars
    rooms[room]["players"]=assignroles(rooms[room]["characters"], rooms[room]["players"])
    intelrules(room) //generate intel for these characters
    io.sockets.in(room).emit('startroom', room);
    getleader(room)
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
    
  socket.on('disconnect', function() { 
    console.log("disconnected")
    console.log(socket.id)
    if(socket.nickname.startsWith('board') && sroom!=''){
        if(rooms[sroom].phase=="gameended" && socket.id==players[rooms[sroom].bid].id){
            closeroom(sroom)
            console.log('closing room'+sroom)
        }
    }
  });
    
});
module.exports = {app: app, server: server};
