// player.js
var app = angular.module('player', ['ui.router','btford.socket-io']);

app.controller('Main', function($scope, psocket) {
    //isnt working atm\/
    $(function () {
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
    });
    psocket.on('chat', function(msg){
        console.log(msg)
    });

});


app.config(function($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/join');

    $stateProvider

        // HOME STATES AND NESTED VIEWS ========================================
        .state('join', {
            url: '/join',
            templateUrl: 'playerviews/pjoinroom.html',
            controller: function($scope, psocket) {
                $scope.join =function() {
                    console.log($scope.room)
                    console.log($scope.pname)
                    psocket.emit('chat', $scope.room);
                }
            }
        })

        // ABOUT PAGE AND MULTIPLE NAMED VIEWS =================================
        .state('about', {
            // we'll get to this in a bit       
        });

});



factory('psocket', function (socketFactory) {
  return socketFactory();
});