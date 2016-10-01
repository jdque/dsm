var Notifier = require('./common/notifier');
var StateManager = require('./common/state_manager');
var SelectionSet = require('./common/selection_set');
var Graph = require('./model/graph');
var ActionComponent = require('./components/action_component');
var DisplayComponent = require('./components/display_component');
var SidebarComponent = require('./components/sidebar_component');
var testData = require('./test_data');

function run() {
	var graph = Graph.fromJSON(testData.test3);
	var mainSelection = new SelectionSet();
	var appActions = new Notifier();
	var appState = new StateManager(['selection', 'draw']);

	var displayComponent = DisplayComponent.create(document.getElementById('canvas'), {
		appActions: appActions,
		appState: appState,
		graph: graph,
		mainSelection: mainSelection
	});

	var actionComponent = ActionComponent.create(document.getElementById('actions'), {
		appActions: appActions,
		appState: appState,
		graph: graph,
		mainSelection: mainSelection
	});

	var sidebarComponent = SidebarComponent.create(document.getElementById('sidebar'), {
		appActions: appActions,
		appState: appState,
		graph: graph,
		mainSelection: mainSelection
	});

	appState.setState('selection');
}

var App = {
    run: run
};

module.exports = App;