var ResultGraph = require('../model/result_graph');
var Solver = require('../analysis/solver');
var Interactables = require('../ui/interactables');

var ActionComponent = function (parent, props) {
	var appState;
	var appActions;
	var graph;
	var mainSelection;

	return {
		init: function (parent, props) {
			appActions = props.appActions;
			appState = props.appState;
			graph = props.graph;
			mainSelection = props.mainSelection;

			document.getElementById("draw-button").onclick = function () {
				if (appState.getActiveStateId() === 'selection') {
					appState.setState('draw');
				}
				else if (appState.getActiveStateId() === 'draw') {
					appState.setState('selection');
				}
			}

			document.getElementById("fixed-button").onclick = function () {
				if (appState.getActiveStateId() === 'selection') {
					var selectedObject = mainSelection.get();
					if (selectedObject && selectedObject.name() === Interactables.NodeCircle.Name) {
						appActions.notify('add_support', {
							type: 'fixed',
							nodeCircle: selectedObject
						});
					}
				}
			}

			document.getElementById("pin-button").onclick = function () {
				if (appState.getActiveStateId() === 'selection') {
					var selectedObject = mainSelection.get();
					if (selectedObject && selectedObject.name() === Interactables.NodeCircle.Name) {
						appActions.notify('add_support', {
							type: 'pin',
							nodeCircle: selectedObject
						});
					}
				}
			}

			document.getElementById("roller-button").onclick = function () {
				if (appState.getActiveStateId() === 'selection') {
					var selectedObject = mainSelection.get();
					if (selectedObject && selectedObject.name() === Interactables.NodeCircle.Name) {
						appActions.notify('add_support', {
							type: 'roller',
							nodeCircle: selectedObject
						});
					}
				}
			}

			document.getElementById("force-button").onclick = function () {
				if (appState.getActiveStateId() === 'selection') {
					var selectedObject = mainSelection.get();
					if (selectedObject && selectedObject.name() === Interactables.NodeCircle.Name) {
						appActions.notify('add_force', {
							nodeCircle: selectedObject
						});
					}
				}
			}

			document.getElementById("solve-button").onclick = function () {
				var resultGraph = new ResultGraph(graph);
				var solver = new Solver();
				solver.solveNodes(resultGraph);
				solver.solveElements(resultGraph);
				console.log(resultGraph);

				appActions.notify('solve', {
					resultGraph: resultGraph
				});
			}
		}
	};
};

ActionComponent.create = function (parent, props) {
	var component = ActionComponent();
	component.init.apply(component, arguments);
	return component;
};

module.exports = ActionComponent;