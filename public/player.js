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
          document.cookie = 'user_id=' + generateHash(32);  //add cookie 'user_id'
        }
        console.log(document.cookie)


var app = angular.module('player', ['btford.socket-io','ui.router']);

app.factory('psocket', function (socketFactory) {
  return socketFactory({
    ioSocket: io.connect('/')
  });
})

app.controller('Main', function($scope, psocket, $state) {
    
    $scope.room=""
    psocket.on('startroom', function(room){
        $scope.room=room
    });
    psocket.on('console', function(msg){
        console.log(msg)
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
                    $state.go('leader')
                });
            }   
        })
    
        // player console =================================
        .state('leader', {
            templateUrl: 'playerviews/leader.html',
            controller: function($scope, psocket, $state) {
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
                    psocket.emit("leaderdone",$scope.room);
                }
                psocket.on('startvote', function(data) {
                    $state.go('vote')
                });
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

