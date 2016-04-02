var StateManager = require('./common/state_manager.js');
var SelectionSet = require('./common/selection_set.js');
var Graph = require('./model/graph.js');
var ResultGraph = require('./model/result_graph.js');
var Solver = require('./analysis/solver.js');
var Style = require('./ui/style.js');
var Interactables = require('./ui/interactables.js');
var Renderers = require('./ui/renderers.js');

var testData = require('./test_data.js');

var appState;
var stage;
var canvas;
var origin;
var graph;
var graphRenderer;
var resultRenderer;
var gridRenderer;
var transientRenderer;
var mainSelection;

//------------------------------------------------------------------------------

var selectionState = {
	enter: function () {
		this.clickedObject = false;

		stage.on("dragstart", function (e) {
			mainSelection.select(e.target);
		});

		stage.on("dragmove", function (e) {
			var selectedObject = mainSelection.get();
			if (selectedObject instanceof Interactables.NodeCircle) {
				gridRenderer.snapObject(selectedObject, "center");
				canvas.draw();
				graph.updateNode(graphRenderer.getGraphNode(selectedObject), {
					position: [selectedObject.x(), origin[1] - selectedObject.y()]
				});
			}
			transientRenderer.updateBoundingBox();
			transientRenderer.redraw();
		}.bind(this));

		stage.on("dragend", function (e) {
			var selectedObject = mainSelection.get();
			if (selectedObject instanceof Interactables.Support) {
				var node = graphRenderer.getGraphNode(selectedObject.getParent());
				graph.updateNode(node, {
					rotation: -selectedObject.rotation()
				});
			}
			else if (selectedObject instanceof Interactables.Force) {
				var node = graphRenderer.getGraphNode(selectedObject.getParent());
				var angle = selectedObject.rotation() * Math.PI / 180;
				var magnitude = Math.sqrt(Math.pow(node.force[0], 2) + Math.pow(node.force[1], 2));
				graph.updateNode(node, {
					force: [-magnitude * Math.sin(angle), -magnitude * Math.cos(angle), node.force[2]]
				});
			}
		}.bind(this));

		stage.on("click", function (e) {
			this.clickedObject = true;
			mainSelection.select(e.target);
			transientRenderer.setBoundingBox(e.target);
			transientRenderer.redraw();
		}.bind(this));

		stage.on("contentClick", function (e) {
			if (!this.clickedObject) {
				mainSelection.clear();
				transientRenderer.setBoundingBox(null);
				transientRenderer.redraw();
			}
			this.clickedObject = false;
		}.bind(this));

		stage.on("contentMouseup", function () {
		}.bind(this));

		stage.on("contentMousemove", function () {
			var object = stage.getIntersection(stage.getPointerPosition());
			transientRenderer.clearHighlights();
			if (object) {
				transientRenderer.highlight(object);
			}
			transientRenderer.redraw();
		}.bind(this));
	},

	exit: function () {
	}
};

var drawState = {
	enter: function () {
		//TODO - deactivate dragging on nodes
		this.activeEndNode = Interactables.NodeCircle.create(0, 0);
		canvas.add(this.activeEndNode);

		var selectedObject = mainSelection.get();
		if (selectedObject && selectedObject.name() === Interactables.NodeCircle.Name) {
			this.activeLine = Interactables.LinkLine.create(selectedObject, selectedObject);
			canvas.add(this.activeLine);
			this.activeLine.moveToBottom();
			this.startNodeCircle = selectedObject.getParent();

			this.activeStartNode = Interactables.NodeCircle.create(this.startNodeCircle.x(), this.startNodeCircle.y());
			canvas.add(this.activeStartNode);
		}
		canvas.draw();

		stage.on("contentClick", function () {
			var intersectObject = stage.getIntersection(this.activeEndNode.position());
			if (intersectObject) {
				if (intersectObject.name() === Interactables.NodeCircle.Name && intersectObject.getParent() !== this.startNodeCircle) {
					if (this.activeLine) {
						createNewLink(this.startNodeCircle, intersectObject.getParent());
						mainSelection.select(intersectObject);
					}
				}
			}
			else {
				var newNodeCircle = createNewNode(this.activeEndNode.position());
				if (this.activeLine) {
					createNewLink(this.startNodeCircle, newNodeCircle);
				}
				mainSelection.select(newNodeCircle.circle);
			}
			appState.setState('draw');
		}.bind(this));

		stage.on("contentMousemove", function () {
			this.activeEndNode.setAttrs({
				x: stage.getPointerPosition().x,
				y: stage.getPointerPosition().y
			});
			gridRenderer.snapObject(this.activeEndNode, "center");

			if (this.activeLine) {
				this.activeLine.setAttrs({
					points: [this.startNodeCircle.x(), this.startNodeCircle.y(),
							 this.activeEndNode.x(), this.activeEndNode.y()]
				});
			}
			canvas.draw();
		}.bind(this));
	},

	exit: function () {
		this.activeEndNode.destroy();
		if (this.activeStartNode) {
			this.activeStartNode.destroy();
		}
		if (this.activeLine) {
			this.activeLine.destroy();
		}
		canvas.draw();
		this.activeStartNode = null;
		this.activeEndNode = null;
		this.activeLine = null;
		this.startNodeCircle = null;
	}
};

function createNewNode(position) {
	var node = new Graph.Node({
		id: Math.round(Math.random(1) * 100000),
		position: [position.x, origin[1] - position.y]
	});
	graph.addNode(node);
	return graphRenderer.getRenderNode(node);
}

function createNewLink(startNodeCircle, endNodeCircle) {
	var mat = new Graph.Material({id: "steel", elasticMod: 4});
	graph.addMaterial(mat);

	var sec = new Graph.Section({id: "spar", area: 100, momInertia: 1000000});
	graph.addSection(sec);

	var fromNode = graphRenderer.getGraphNode(startNodeCircle);
	var toNode = graphRenderer.getGraphNode(endNodeCircle);
	var link = new Graph.Link({
		id: Math.round(Math.random(1) * 100000),
		source: fromNode,
		target: toNode,
		material: mat,
		section: sec
	});
	graph.addLink(link);
	return graphRenderer.getRenderLink(link);
}

function setupDOM() {
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
				var node = graphRenderer.getGraphNode(selectedObject.getParent());
				graph.updateNode(node, {freedom: [false, false, false]});
			}
		}
	}

	document.getElementById("pin-button").onclick = function () {
		if (appState.getActiveStateId() === 'selection') {
			var selectedObject = mainSelection.get();
			if (selectedObject && selectedObject.name() === Interactables.NodeCircle.Name) {
				var node = graphRenderer.getGraphNode(selectedObject.getParent());
				graph.updateNode(node, {freedom: [false, false, true]});
			}
		}
	}

	document.getElementById("roller-button").onclick = function () {
		if (appState.getActiveStateId() === 'selection') {
			var selectedObject = mainSelection.get();
			if (selectedObject && selectedObject.name() === Interactables.NodeCircle.Name) {
				var node = graphRenderer.getGraphNode(selectedObject.getParent());
				graph.updateNode(node, {freedom: [true, false, true]});
			}
		}
	}

	document.getElementById("force-button").onclick = function () {
		if (appState.getActiveStateId() === 'selection') {
			var selectedObject = mainSelection.get();
			if (selectedObject && selectedObject.name() === Interactables.NodeCircle.Name) {
				var node = graphRenderer.getGraphNode(selectedObject.getParent());
				graph.updateNode(node, {force: [0, -100, 0]});
			}
		}
	}

	document.getElementById("solve-button").onclick = function () {
		var resultGraph = new ResultGraph(graph);
		var solver = new Solver();
		solver.solveNodes(resultGraph);
		solver.solveElements(resultGraph);
		console.log(resultGraph);

		resultRenderer.setGraph(resultGraph);
		resultRenderer.redraw();
	}

	var canvasWrapper = document.getElementById("canvas-wrapper");
	canvasWrapper.addEventListener("mousedown", function (e) {
		if (document.activeElement !== canvasWrapper)
			canvasWrapper.focus();
	});
	canvasWrapper.addEventListener("keydown", function (e) {
		if (appState.getActiveStateId() === 'selection') {
			var selectedObject = mainSelection.get();
			if (!selectedObject)
				return;

			if (selectedObject.name() === Interactables.NodeCircle.Name) {
				if (e.keyCode === 46) {
					var node = graphRenderer.getGraphNode(selectedObject.getParent());
					graph.removeNode(node);
					mainSelection.clear();
					transientRenderer.setBoundingBox(null);
					transientRenderer.redraw();
				}
			}
			else if (selectedObject instanceof Interactables.Force) {
				if (e.keyCode === 46) {
					var node = graphRenderer.getGraphNode(selectedObject.getParent());
					graph.updateNode(node, {force: [0, 0, 0]});
					mainSelection.clear();
					transientRenderer.setBoundingBox(null);
					transientRenderer.redraw();
				}
			}
			else if (selectedObject instanceof Interactables.Support) {
				if (e.keyCode === 46) {
					var node = graphRenderer.getGraphNode(selectedObject.getParent());
					graph.updateNode(node, {
						freedom: [true, true, true],
						rotation: 0
					});
					mainSelection.clear();
					transientRenderer.setBoundingBox(null);
					transientRenderer.redraw();
				}
			}
		}
	}, false);
	canvasWrapper.tabIndex = 1;
	canvasWrapper.focus();
}

function run() {
	setupDOM();

	stage = new Konva.Stage({
		container: 'canvas-wrapper',
		width: 1024,
		height: 768
	});

	var gridLayer = new Konva.Layer();
	gridLayer.disableHitGraph();
	var transientLayer = new Konva.Layer();
	transientLayer.disableHitGraph();
	var objectLayer = new Konva.Layer();
	stage.add(gridLayer, objectLayer, transientLayer);

	canvas = transientLayer;

	origin = [0, canvas.height()];
	//graph = new Graph();
	graph = Graph.fromJSON(testData.test3);

	gridRenderer = new Renderers.GridRenderer(gridLayer);
	gridRenderer.setSpacing(32, 32);
	gridRenderer.redraw();

	transientRenderer = new Renderers.TransientRenderer(transientLayer);

	graphRenderer = new Renderers.GraphRenderer(objectLayer, origin);
	graphRenderer.setGraph(graph);
	graphRenderer.redraw();

	resultRenderer = new Renderers.ResultGraphRenderer(objectLayer, origin);

	mainSelection = new SelectionSet();

	appState = new StateManager(stage);
	appState.addState('selection', selectionState);
	appState.addState('draw', drawState);

	appState.setState('selection');
}

var App = {
    run: run
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = App;
}