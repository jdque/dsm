var Graph = require('../model/graph');
var Interactables = require('../ui/interactables');
var Renderers = require('../ui/renderers');

var DisplayComponent = function () {
	var appActions;
	var appState;
	var graph;
	var mainSelection;

	var stage;
	var origin;
	var graphRenderer;
	var resultRenderer;
	var gridRenderer;
	var transientRenderer;

	var SelectionState = function () {
		var clickedObject;

		return {
			enter: function () {
				clickedObject = null;

				stage.on("dragstart", function (e) {
					mainSelection.select(e.target);
				});

				stage.on("dragmove", function (e) {
					var selectedObject = mainSelection.get();
					if (selectedObject instanceof Interactables.NodeCircle) {
						gridRenderer.snapObject(selectedObject, "center");
						graph.updateNode(graphRenderer.getGraphNode(selectedObject), {
							position: [selectedObject.x(), origin[1] - selectedObject.y()]
						});
					}
					transientRenderer.updateBoundingBox();
					transientRenderer.redraw();
				});

				stage.on("dragend", function (e) {
					var selectedObject = mainSelection.get();
					if (selectedObject instanceof Interactables.Support) {
						var support = graphRenderer.getGraphSupport(selectedObject);
						var node = support.parentNode;
						support.rotation = -selectedObject.rotation();
						graph.updateNode(node, {
							support: support
						});
					}
					else if (selectedObject instanceof Interactables.Force) {
						var force = graphRenderer.getGraphForce(selectedObject);
						var node = force.parentNode;
						var angle = selectedObject.rotation() * Math.PI / 180;
						var magnitude = Math.sqrt(Math.pow(force.vector[0], 2) + Math.pow(force.vector[1], 2));
						force.vector = [-magnitude * Math.sin(angle), -magnitude * Math.cos(angle), force.vector[2]];
						graph.updateNode(node, {
							forces: node.forces
						});
					}
				});

				stage.on("click", function (e) {
					clickedObject = e.target;
					mainSelection.select(e.target);
					transientRenderer.setBoundingBox(e.target);
					transientRenderer.redraw();
				});

				stage.on("contentClick", function (e) {
					if (!clickedObject) {
						mainSelection.clear();
						transientRenderer.setBoundingBox(null);
						transientRenderer.redraw();
					}
					clickedObject = null;
				});

				stage.on("contentMouseup", function () {
				});

				stage.on("contentMousemove", function () {
					var object = stage.getIntersection(stage.getPointerPosition());
					transientRenderer.clearHighlights();
					if (object) {
						transientRenderer.highlight(object);
					}
					transientRenderer.redraw();
				});
			},

			exit: function () {
				clickedObject = null;
				stage.off();
			}
		};
	};

	var DrawState = function () {
		var activeStartNode;
		var activeEndNode;
		var activeLine;
		var startNodeCircle;

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

		return {
			enter: function () {
				//TODO - deactivate dragging on nodes
				activeEndNode = Interactables.NodeCircle.create({x: -32, y: -32});
				transientRenderer.layer.add(activeEndNode);

				var selectedObject = mainSelection.get();
				if (selectedObject && selectedObject.name() === Interactables.NodeCircle.Name) {
					startNodeCircle = selectedObject.getParent();

					activeLine = Interactables.LinkLine.create(startNodeCircle.position(), startNodeCircle.position());
					transientRenderer.layer.add(activeLine);
					activeLine.moveToBottom();

					activeStartNode = Interactables.NodeCircle.create(startNodeCircle.position());
					transientRenderer.layer.add(activeStartNode);
				}
				transientRenderer.layer.draw();

				stage.on("contentClick contentTouchend", function () {
					var placementPosition = activeEndNode.x() !== null && activeEndNode.y() !== null ?
						activeEndNode.position() : stage.getPointerPosition();
					var intersectObject = stage.getIntersection(placementPosition);
					if (intersectObject) {
						if (intersectObject.name() === Interactables.NodeCircle.Name && intersectObject.getParent() !== startNodeCircle) {
							if (activeLine) {
								createNewLink(startNodeCircle, intersectObject.getParent());
								mainSelection.select(intersectObject);
							}
						}
					}
					else {
						var newNodeCircle = createNewNode(placementPosition);
						if (activeLine) {
							createNewLink(startNodeCircle, newNodeCircle);
						}
						mainSelection.select(newNodeCircle.circle);
					}
					appState.setState('draw');
				});

				stage.on("contentMousemove contentTouchmove", function () {
					activeEndNode.setAttrs({
						x: stage.getPointerPosition().x,
						y: stage.getPointerPosition().y
					});
					gridRenderer.snapObject(activeEndNode, "center");

					if (activeLine) {
						activeLine.setAttrs({
							points: [startNodeCircle.x(), startNodeCircle.y(),
									 activeEndNode.x(), activeEndNode.y()]
						});
					}

					var intersectObject = stage.getIntersection(activeEndNode.position());
					if (intersectObject && intersectObject.name() === Interactables.NodeCircle.Name) {
						transientRenderer.highlight(activeEndNode.circle);
					}
					else {
						transientRenderer.unhighlight(activeEndNode.circle);
					}

					transientRenderer.redraw();
				});
			},

			exit: function () {
				activeEndNode.destroy();
				if (activeStartNode) {
					activeStartNode.destroy();
				}
				if (activeLine) {
					activeLine.destroy();
				}
				transientRenderer.layer.draw();
				activeStartNode = null;
				activeEndNode = null;
				activeLine = null;
				startNodeCircle = null;

				stage.off();
			}
		};
	};

	function onAddSupport(ev) {
		var typeFreedomMap = {
			'fixed':  [false, false, false],
			'pin':    [false, false, true],
			'roller': [true, false, true]
		};

		var node = graphRenderer.getGraphNode(ev.nodeCircle.getParent());
		node.support.freedom = typeFreedomMap[ev.type];
		graph.updateNode(node, {support: node.support});
	}

	function onAddForce(ev) {
		var node = graphRenderer.getGraphNode(ev.nodeCircle.getParent());
		node.forces.push(new Graph.Force({
			parentNode: node,
			vector: [0, -100, 0]
		}));
		graph.updateNode(node, {forces: node.forces});
	}

	function onDeleteObject(ev) {
		var object = ev.object;

		if (object.name() === Interactables.NodeCircle.Name) {
			var node = graphRenderer.getGraphNode(object.getParent());
			graph.removeNode(node);
			transientRenderer.setBoundingBox(null);
			transientRenderer.redraw();
		}
		else if (object instanceof Interactables.LinkLine) {
			var link = graphRenderer.getGraphLink(object);
			graph.removeLink(link);
			transientRenderer.setBoundingBox(null);
			transientRenderer.redraw();
		}
		else if (object instanceof Interactables.Force) {
			var force = graphRenderer.getGraphForce(object);
			var node = force.parentNode;
			node.forces.splice(node.forces.indexOf(force), 1);
			graph.updateNode(node, {forces: node.forces});
			transientRenderer.setBoundingBox(null);
			transientRenderer.redraw();
		}
		else if (object instanceof Interactables.Support) {
			var support = graphRenderer.getGraphSupport(object);
			var node = support.parentNode;
			support.freedom = [true, true, true];
			support.rotation = 0;
			graph.updateNode(node, {
				support: support
			});
			transientRenderer.setBoundingBox(null);
			transientRenderer.redraw();
		}
	}

	function onSolve(ev) {
		resultRenderer.setGraph(ev.resultGraph);
		resultRenderer.redraw();
	}

	return {
		init: function (parent, props) {
			appActions = props.appActions;
			appState = props.appState;
			graph = props.graph;
			mainSelection = props.mainSelection;

			appState.on('selection', SelectionState());
			appState.on('draw', DrawState());

			appActions.addListener('add_support', onAddSupport);
			appActions.addListener('add_force', onAddForce)
			appActions.addListener('delete_object', onDeleteObject);
			appActions.addListener('solve', onSolve);

			stage = new Konva.Stage({
				container: parent,
				width: parent.scrollWidth,
				height: parent.scrollHeight
			});

			var gridLayer = new Konva.Layer();
			gridLayer.disableHitGraph();
			var transientLayer = new Konva.Layer();
			transientLayer.disableHitGraph();
			var objectLayer = new Konva.Layer();
			stage.add(gridLayer, objectLayer, transientLayer);

			origin = [0, objectLayer.height()];

			gridRenderer = new Renderers.GridRenderer(gridLayer);
			gridRenderer.setSpacing(32, 32);
			gridRenderer.redraw();

			transientRenderer = new Renderers.TransientRenderer(transientLayer);

			graphRenderer = new Renderers.GraphRenderer(objectLayer, origin);
			graphRenderer.setGraph(graph);
			graphRenderer.redraw();

			resultRenderer = new Renderers.ResultGraphRenderer(objectLayer, origin);

			parent.addEventListener("mousedown", function (e) {
				if (document.activeElement !== parent)
					parent.focus();
			});
			parent.addEventListener("keydown", function (e) {
				if (appState.getActiveStateId() === 'selection') {
					if (e.keyCode === 46) {
						var selectedObject = mainSelection.get();
						if (selectedObject) {
							appActions.notify('delete_object', {
								object: selectedObject
							});
							mainSelection.clear();
						}
					}
				}
			}, false);
			parent.tabIndex = 1;
			parent.focus();
		}
	};
};

DisplayComponent.create = function (parent, props) {
	var component = DisplayComponent();
	component.init.apply(component, arguments);
	return component;
};

module.exports = DisplayComponent;