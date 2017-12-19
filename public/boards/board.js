angular
	.module('DemoApp', ['ui.router', 'ngAnimate'])

	.config(function($stateProvider, $urlRouterProvider)
	{
		$stateProvider
			.state('tab1', {
				name: 'tab1',
				url: '/tab1',
				template: '<div class="tab tab1"><p>Caerphilly fromage cheeseburger. Goat fromage frais halloumi melted cheese cheese and biscuits macaroni cheese babybel ricotta. Roquefort croque monsieur babybel fromage frais chalk and cheese bavarian bergkase cream cheese emmental. When the cheese comes out everybody\'s happy camembert de normandie fromage frais ricotta.</p></div>'
			})

			.state('tab2', {
				name: 'tab2',
				url: '/tab2',
				template: '<div class="tab tab2"><p>Airedale hard cheese roquefort. Paneer pepper jack jarlsberg st. agur blue cheese bavarian bergkase macaroni cheese             croque monsieur cauliflower cheese. Bavarian bergkase cheesy grin port-salut taleggio stinking bishop cheese and biscuits rubber cheese blue   castello. Everyone loves.</p></div>'
			})
    })

    .controller('DemoController', function( $scope, $window, $state )
	{
		$scope.transition = 'slide-left';
    });