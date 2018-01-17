// board.js


//assign a unique id to the user in a cookie that can be persistent
function generateHash(len) {
  var symbols = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
  var hash = '';
  for (var i = 0; i < len; i++) {
    var symIndex = Math.floor(Math.random() * symbols.length);
    hash += symbols.charAt(symIndex);
  }
  console.log(hash)
  return hash;
}

window.localStorage.setItem("aclient", "board") //set avalon client type to player
if (!window.localStorage.getItem("aid")) { //if no avalonId in storage, create one
  window.localStorage.setItem("aid", "board"+generateHash(32)) 
}

//if (!/\buser_id=/.test(document.cookie) || !document.cookie.includes("board")) { //if no 'user_id' in cookies
//  document.cookie = 'user_id=' + 'board'+generateHash(32);  //add cookie 'user_id'
//}
console.log(document.cookie)




var app = angular.module('board', ['btford.socket-io','ui.router']);

app.factory('bsocket', function (socketFactory) {
  return socketFactory({
    ioSocket: io.connect('/')
  });
})

app.controller('Main', function($scope, bsocket,$http) {
    
    bsocket.on('connect', function() {
        bsocket.emit('registerBoard', window.localStorage.getItem("aid")) //send avalonId
    });
    
    //{"IDxytwub67":{"name":"Jana", "leader":0, "selected":0, "mission":0, "vote":0}}
    //It is a time for great decisions and strong leaders. Not all knights and ladies of Avalon are loyal to Arthur, and yet you must choose only those that are Good to represent him in his quests. If an open ear and eye is kept, Merlin's sage advice can be discerned as whispers of truth. 
    $scope.phasetext={
        "leader":{"title":"Team Leader", "message":"Discuss, discuss, discuss! All the players must participate in helping the Leader make the right choice of players to be on the Team. Active and logical discussion is a great way to catch Mordred's agents in their webs of deciet."},
        "vote":{"title":"Team Vote", "message":"The Leader has made his proposal known, but all the Avalonians have a Vote - you can accept or reject his proposal. The Leader may be Evil, or one of the players chosen could be a mistake. Choose carefully."},
        "mission":{"title":"The Quest", "message":"You have debated well and wisely chosen the brave knights and ladies with whom you place your trust. Now it is time to measure a person's true intent and loyalty to the noble cause for which Arthur fights. Be true and goodness will prevail!"},
        "assassin":{"title":"Assassination", "message":"Mordred and Mi. can still win if they can assassinate Merlin."},
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
    
    
    //starting screen options logic
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
            "chars":chars
        }
        console.log(data)
        bsocket.emit("startroom",data)
    }
    
    $scope.closeroom = function(){
        bsocket.emit('closeroom', $scope.room)
        location.reload();
    }
    
    
    $scope.players={}
    $scope.njoinedplayers = function(){return Object.keys($scope.players).length}
    
    
    
    $scope.score=[-1,-1,-1,-1,-1]
    $scope.sabotages=[-1,-1,-1,-1,-1]
    $scope.fvotes=0
    $scope.leader=""
    $scope.votest=-1
    $scope.votesv=0
    $scope.votesn=0
    $scope.result=-1
    $scope.phase=""
    $scope.selplayers=[]
    
    
    $scope.expansions="None"
        
    $scope.join= function(){
        bsocket.emit("playagain",$scope.room)
    }
    $http.post( "http://127.0.0.1:3000/roomnumber", { 'aid' : window.localStorage.getItem("aid")} )
    .then(function(result) {
        $scope.room = result.data;
    });
      
    
    bsocket.on('console', function(msg){
        console.log(msg)
    });
    
    bsocket.on('updateplayerlist', function(players){
        //$scope.players=players 
        Object.assign($scope.players, players); 
        console.log($scope.players)
    });

    bsocket.on('leaderdataboard', function(teamsize){
        $scope.pls=teamsize
    });
    
    bsocket.on('updatephaseboard', function(phase){
        console.log("phase recieved")
        $scope.phase=phase
    });
    
    bsocket.on('selectedplayerstoboard', function(players){
        console.log("players recieved")
        $scope.selplayers=players
    });
    
    bsocket.on('sendnumberofvotes', function(data) {
        $scope.votesn=data[0]
        $scope.votesv=data[1]
    });
    bsocket.on('voteendtimer', function(timeleft) {
        $scope.votest=timeleft
    });
    
    
    bsocket.on('missionresult', function(result) {
        
        var opacity = anime.timeline();
        opacity
          .add({
            targets: '.boardmain',
            height: 300,
            duration: 500,
            easing: 'linear'
            })
           
        console.log("missionresults")
        var gif = document.getElementById('gif');
        if (result==1){
            //$scope.resultgif="/img/missionpass.gif"
            gif.src = "/img/missionpass.gif"+"?a="+Math.random();;
        }
        else {
            gif.src = "/img/missionfail.gif"+"?a="+Math.random();;
        }
        opacity
          .add({
            targets: '.boardmain',
            height: 0,
            duration: 500,
            delay:6500,
            easing: 'linear'
            })
    });
    
    
    
    bsocket.on('updateboard', function(data){
        for(d in data){
            $scope[d]=data[d]
        }
    });
    
    bsocket.on('victory', function(r){
        if(r==0) {
            $scope.result=0
        }
        else if (r==1) {
            $scope.result=1
        }
    });
    
    
    //bsocket.on('refreshboard', function(data){
    //    $scope.started=true
    //});
    //bsocket.on('sabotages', function(d){
    //  console.log(d)
    //    $scope.sabotages[d[1]]=new Array(d[0]); 
    //    $scope.$apply()
    //});
    bsocket.on('voteresult', function(data){
        if (data[0]==1) [//pass
            $scope.voteresult=data[1]
        ]
        else if (data[0]==0) [//fail
            $scope.voteresult=data[1]
        ]
    });
});

