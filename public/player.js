// player.js


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
if (!/\buser_id=pl/.test(document.cookie)) { //if no 'user_id' in cookies
  document.cookie = 'user_id=' + "pl"+generateHash(32);  //add cookie 'user_id'
}

console.log(document.cookie)


var app = angular.module('player', ['btford.socket-io','ui.router']);

app.factory('psocket', function (socketFactory) {
  return socketFactory({
    ioSocket: io.connect('/')
  });
})

app.controller('Main', function($scope, psocket, $state) {
    $scope.phase="idle"
    $scope.room=""
    $scope.loyalty=""
    psocket.on('startroom', function(room){
        console.log("starting room" + room)
        $scope.room=room
    });
    psocket.on('console', function(msg){
        console.log(msg)
    });
    psocket.on('loyalty', function(data){
        $scope.loyalty=data
    });
    psocket.on('updatephase', function(phase){
        console.log(phase)
        $scope.phase=phase
        $state.go($scope.phase)
    });
    psocket.on('joinstatus', function(status) {
        if (status==300) {
            alert("Game has already started :(")
        }
        if (status==404) {
            alert("Room not found :(")
        }
        $state.go('join')
    })
    
    $scope.gotointel=function() {
        $state.go('intel')
    }
    $scope.gotogame=function() {
        $state.go($scope.phase)
        console.log($scope.phase)
         //$state.go('wait')
    }
    $scope.join=function(){
        $state.go('join')
    }

});


app.config(function($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/');

    $stateProvider

        // HOME STATES AND NESTED VIEWS ========================================
        .state('join', {
            url: '/',
            templateUrl: 'playerviews/pjoinroom.html',
            controller: function($scope, psocket, $state) {
                $scope.join =function() {
                    var data=[$scope.r, $scope.pname]
                    psocket.emit('join', data);
                    $scope.room=$scope.r //room=room
                    console.log($scope.room)
                    $state.go('wait')
                }
                
            }
        })

        // wait screen  =================================
        .state('wait', {
            templateUrl: 'playerviews/wait.html',
            controller: function($scope, psocket, $state) {
                $scope.message="Waiting for players to join..."
                console.log($scope.room)
                psocket.on('startroom', function(room) {
                    console.log("Entering game")
                    console.log($scope.room)
                    $state.go('intel')
                });
            }   
        })
    
        // player console =================================
        .state('intel', {
            templateUrl: 'playerviews/intel.html',
            controller: function($scope, psocket, $state) {
                $scope.images={"Merlin":"/img/Merlin.png",
                        "Morgana":"/img/Morgana.png",
                        "Oberon":"/img/Oberon.png",
                        "Mordred":"/img/Mordred.png",
                        "Knight":"/img/Knight.png",
                        "Minion":"/img/Minion.png",
                        "Assassin":"/img/Assassin.png",
                        "Percival":"/img/Percival.png",
                       }
                psocket.emit("getintel",$scope.room);
                psocket.on('intel', function(data) {
                    console.log("Intel is")
                    console.log(data)
                    $scope.char=data.character
                    $scope.intel=data.intel
                    $scope.loyalty=data.loyalty
                });
            }   
        })
        .state('idle', {
            templateUrl: 'playerviews/idle.html',
            controller: function($scope, psocket, $state) {
                //($scope.phase=="leader"){$scope.message="The Leader is picking a team, help him choose wisely."}
                if($scope.phase!="mission"){$scope.message="Your kinsman valiently face the mighty dragon. May the Gods be kind."}
                //psocket.emit("getintel",$scope.room);
            }   
        })
        
        
        .state('leader', {
            templateUrl: 'playerviews/leader.html',
            controller: function($scope, psocket, $state) {
                console.log($scope.room)
                psocket.on('leaderdata', function(data) {
                    console.log(data)
                    $scope.teamsize=data.teamsize
                    $scope.players=data.players
                });
                psocket.emit("leaderready",$scope.room);
                $scope.selected=[]
                $scope.select = function(p){
                    if ($scope.selected.indexOf(p)==-1) {
                       while ($scope.selected.length >= $scope.teamsize){
                            $scope.selected.shift()
                        } 
                        $scope.selected.push(p)
                    }
                    else {
                        $scope.selected.splice($scope.selected.indexOf(p),1)
                    }
                    psocket.emit("selectedteam",[$scope.room, $scope.selected]);
                }
                $scope.submit=function(){
                    psocket.emit("leaderdone",[$scope.room, $scope.selected]);
                }
            }  
        })
    
        .state('assassin', {
            templateUrl: 'playerviews/leader.html',
            controller: function($scope, psocket, $state) {
                console.log($scope.room)
                psocket.on('leaderdata', function(data) {
                    console.log(data)
                    $scope.teamsize=1
                    $scope.players=data.players
                });
                psocket.emit("leaderready",$scope.room);
                $scope.selected=[]
                $scope.select = function(p){
                    if ($scope.selected.indexOf(p)==-1) {
                       while ($scope.selected.length >= $scope.teamsize){
                            $scope.selected.shift()
                        } 
                        $scope.selected.push(p)
                    }
                    psocket.emit("selectedteam",[$scope.room, $scope.selected]);
                }
                $scope.submit=function(){
                    psocket.emit("assassindone",[$scope.room, $scope.selected]);
                }
            }  
        })
    
        .state('vote', {
            templateUrl: 'playerviews/tvote.html',
            controller: function($scope, psocket, $state) {
                $scope.selected=-1
                $scope.select = function(p){
                    if ($scope.selected!=p) {
                       $scope.selected=p
                    }
                    console.log("voted")
                    psocket.emit("voteselected",[$scope.room,$scope.selected]);
                }
            }  
        })

        .state('mission', {
            templateUrl: 'playerviews/mission.html',
            controller: function($scope, psocket, $state) {
                $scope.selected=-1
                $scope.select = function(p){
                    if ($scope.selected!=p) {
                       $scope.selected=p
                    }
                    psocket.emit("missionselected",[$scope.room,$scope.selected]);
                }
            }  
        })
    
        .state('victory', {
            //url: '/v',
            templateUrl: 'playerviews/victory.html',
            controller: function($scope, psocket, $state) {
                psocket.on('won', function(l) {
                    if(l=="b"){
                        $scope.loyalty=0
                    }
                    if(l=="g"){
                        $scope.loyalty=1
                    }
                });
                $scope.loyalty=-1 //0 is bad, 1 is good
            }
        })
        .state('defeat', {
            //url: '/d',
            templateUrl: 'playerviews/defeat.html',
            controller: function($scope, psocket, $state) {
                psocket.on('lost', function(l) {
                    if(l=="b"){
                        $scope.loyalty=0
                    }
                    if(l=="g"){
                        $scope.loyalty=1
                    }
                });
                $scope.loyalty=1 //0 is bad, 1 is good
            }
        })
    
});

