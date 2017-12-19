// board.js


//assign a unique id to the user in a cookie that can be persistent
        function generateHash(len) {
          var symbols = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
          var hash = '';
          for (var i = 0; i < len; i++) {
            var symIndex = Math.floor(Math.random() * symbols.length);
            hash += symbols.charAt(symIndex);
          }
          return hash;
        }
        if (!/\buser_id=/.test(document.cookie)) { //if no 'user_id' in cookies
          document.cookie = 'user_id=' + 'board'+generateHash(32);  //add cookie 'user_id'
        }
        console.log(document.cookie)


var app = angular.module('board', ['btford.socket-io','ui.router']);

app.factory('bsocket', function (socketFactory) {
  return socketFactory({
    ioSocket: io.connect('/')
  });
})

app.controller('Main', function($scope, bsocket,$http) {
    //{"IDxytwub67":{"name":"Jana", "leader":0, "selected":0, "mission":0, "vote":0}}
    //It is a time for great decisions and strong leaders. Not all knights and ladies of Avalon are loyal to Arthur, and yet you must choose only those that are Good to represent him in his quests. If an open ear and eye is kept, Merlin's sage advice can be discerned as whispers of truth. 
    $scope.phasetext={
        "leader":{"title":"Team Leader", "message":"Discuss, discuss, discuss! All the players must participate in helping the Leader make the right choice of players to be on the Team. Active and logical discussion is a great way to catch Mordred's agents in their webs of deciet."},
        "vote":{"title":"Team Vote", "message":"The Leader has made his proposal known, but all the Avalonians have a Vote - you can accept or reject his proposal. The Leader may be Evil, or one of the players chosen could be a mistake. Choose carefully."},
        "mission":{"title":"The Quest", "message":"You have debated well and wisely chosen the brave knights and ladies with whom you place your trust. Now it is time to measure a person's true intent and loyalty to the noble cause for which Arthur fights. Be true and goodness will prevail!"},
        "assasin":{"title":"Assassination", "message":"Mordred and Mi. can still win if they can assassinate Merlin."},
    }
    
    rules={
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
        }
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
        $scope.knights=goodN
        $scope.minions=badN
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
    
    $scope.split= function(n) {
        if (n<5) {return [0,0]}
        return [n-rules.teamsplit[String(n)].g, rules.teamsplit[String(n)].g]
    }
    
    $scope.started=false
    $scope.nplayers=2
     
    $scope.chars=['Merlin','Assassin']
    $scope.gchars=['Merlin']
    $scope.bchars=['Assassin']
    $scope.select = function(p){
        if (rules.characters[p].loyalty=="g") {
           if ($scope.gchars.indexOf(p)==-1) {
               if ($scope.gchars.length >=  $scope.split($scope.nplayers)[1]) {
                    $scope.gchars.shift()
                } 
                $scope.gchars.push(p)
            }
            else {
                $scope.gchars.splice($scope.gchars.indexOf(p),1)
            } 
        }
        if (rules.characters[p].loyalty=="b") {
           if ($scope.bchars.indexOf(p)==-1) {
               if ($scope.bchars.length >=  ($scope.split($scope.nplayers)[0])) {
                    $scope.bchars.shift()
                } 
                $scope.bchars.push(p)
            }
            else {
                $scope.bchars.splice($scope.bchars.indexOf(p),1)
            } 
        }
        $scope.chars=$scope.gchars.concat($scope.bchars)
    }
    
    $scope.startgame = function(){
        $scope.started=true
        var chars=getroles($scope.chars, $scope.nplayers)
        data={
            "room":String($scope.room),
            "nplayers":$scope.nplayers,
            "chars":chars,
        }
        console.log(data)
        bsocket.emit("startroom",data)
    }
    
    //gotta fix everything below this comment
    
    $scope.players={"IDytwu67":{"nickname":"Janardhan", "selected":0, "vote":-1},"IDxtwub67":{"nickname":"Nick", "selected":0,  "vote":-1},"IDxytw67":{"nickname":"Mario", "selected":0,  "vote":-1},"IDxytub67":{"nickname":"Jana", "selected":0,  "vote":-1},"IDxyub67":{"nickname":"Jiby", "selected":0,  "vote":-1},"Dxytub67":{"nickname":"Janard", "selected":0,  "vote":-1},"IDxytub6":{"nickname":"Janar", "selected":0,  "vote":-1},"IDxytub7":{"nickname":"Jan", "selected":0,  "vote":-1}}
    $scope.njoinedplayers = function(){return Object.keys($scope.players).length}
    
    
    
    $scope.score=[0,1,0,-1,-1]
    $scope.fvotes=3
    $scope.leader="IDytwu67"
    
    $scope.expansions="None"
    
    $scope.now={"phase":"mission", "selplayers":["Janardhan","Mario","Nick"]}
    $scope.pls=3
    
    
    $http.get('/roomnumber')
      .then(function(result) {
        $scope.room = result.data;
    });
    
    bsocket.on('startroom', function(room){
        $scope.room=room
        
    });
    
    bsocket.on('console', function(msg){
        console.log(msg)
    });
    
    bsocket.on('updateplayerlist', function(players){
        //$scope.players=players 
        Object.assign($scope.players, players); 
        console.log($scope.players)
    });

});
