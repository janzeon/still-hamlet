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
        if (!/\buser_id=/.test(document.cookie)) { //if no 'user_id' in cookies
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
    psocket.on('startroom', function(room){
        $scope.room=room
    });
    psocket.on('console', function(msg){
        console.log(msg)
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
                    $state.go('wait')
                }
                
            }
        })

        // wait screen  =================================
        .state('wait', {
            templateUrl: 'playerviews/wait.html',
            controller: function($scope, psocket, $state) {
                $scope.message="Waiting for players to join..."
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
                $scope.images={"Merlin":"https://i.ytimg.com/vi/W1pdEQB6cSU/hqdefault.jpg",
                       "Percival":"https://vignette.wikia.nocookie.net/heroes-of-camelot/images/4/46/Sir_Percival_T1.PNG/revision/latest?cb=20140812113124",
                        "Morgana":"https://vignette.wikia.nocookie.net/heroes-of-camelot/images/3/31/MorganaTheYoungT1.png/revision/latest/scale-to-width-down/662?cb=20141211204755",
                        "Oberon":"https://vignette.wikia.nocookie.net/heroes-of-camelot/images/6/65/Ember_Druid.jpg/revision/latest?cb=20140304143742",
                        "Mordred":"https://vignette.wikia.nocookie.net/heroes-of-camelot/images/5/53/Screenshot_2016-09-19-08-01-18.jpg/revision/latest?cb=20160925145047",
                        "Knight":"https://vignette.wikia.nocookie.net/heroes-of-camelot/images/6/65/2015-11-13_19.58.23.png/revision/latest/scale-to-width-down/665?cb=20151114031253",
                        "Minion":"https://vignette.wikia.nocookie.net/heroes-of-camelot/images/6/6b/IwynasTheSageT4.jpg/revision/latest?cb=20160106211728",
                        "Assassin":"https://vignette.wikia.nocookie.net/heroes-of-camelot/images/f/f2/Shanke_T3.jpg/revision/latest?cb=20150318220539",
                       }
                psocket.emit("getintel",$scope.room);
                psocket.on('intel', function(data) {
                    console.log("Intel is")
                    console.log(data)
                    $scope.char=data.character
                    $scope.intel=data.intel
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
                    psocket.emit("selectedteam",[$scope.room, $scope.selected]);
                }
                $scope.submit=function(){
                    psocket.emit("leaderdone",[$scope.room, $scope.selected]);
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
    
});

