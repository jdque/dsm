var Notifier = require('../common/notifier');

function Graph() {
	this.nodes = [];
	this.links = [];
	this.materials = [];
	this.sections = [];

	this.notifier = new Notifier();
}

Graph.Event = {
	ADD_NODE:    0,
	ADD_LINK:    1,
	REMOVE_NODE: 2,
	REMOVE_LINK: 3,
	UPDATE_NODE: 4,
	UPDATE_LINK: 5
};

Graph.Node = function (settings) {
	this.id           = settings.id           || -1;
	this.position     = settings.position     || [0, 0];
	this.displacement = settings.displacement || [0, 0, 0];
	this.support      = settings.support      || new Graph.Support({});
	this.forces       = settings.forces       || [];
}

Graph.Link = function (settings) {
	this.id 		= settings.id         || -1;
	this.source 	= settings.source	  || null;
	this.target 	= settings.target	  || null;
	this.material   = settings.material   || null;
	this.section    = settings.section    || null;
}

Graph.Support = function (settings) {
	this.id         = settings.id         || -1;
	this.parentNode = settings.parentNode || null;
	this.freedom    = settings.freedom    || [true, true, true];
	this.rotation   = settings.rotation   || 0;
}

Graph.Force = function (settings) {
	this.id         = settings.id         || -1;
	this.parentNode = settings.parentNode || null;
	this.vector     = settings.vector     || [0, 0, 0];
}

Graph.LineForce = function (settings) {
	this.id          = settings.id          || -1;
	this.parentLink  = settings.parentLink  || null;
	this.leftVector  = settings.leftVector  || [0, 0, 0];
	this.rightVector = settings.rightVector || [0, 0, 0];
	this.leftOffset  = settings.leftOffset  || 0.0;
	this.rightOffset = settings.rightOffset || 0.0;
}

Graph.Material = function (settings) {
	this.id 		= settings.id         || -1;
	this.elasticMod = settings.elasticMod || 0;
}

Graph.Section = function (settings) {
	this.id 		= settings.id         || -1;
	this.area       = settings.area       || 0;
	this.momInertia = settings.momInertia || 0;
}

Graph.fromJSON = function (json) {
	var graph = new Graph();
	var error = false;

	json['materials'].forEach(function (material) {
		graph.addMaterial(new Graph.Material({
			id: material['id'],
			elasticMod: material['elasticMod']
		}));
	});

	json['sections'].forEach(function (section) {
		graph.addSection(new Graph.Section({
			id: section['id'],
			area: section['area'],
			momInertia: section['momInertia']
		}));
	})

	json['nodes'].forEach(function (node) {
		var graphNode = new Graph.Node({
			id: node['id'],
			position: node['position'],
			displacement: node['displacement'],
			support: null,
			forces: []
		});
		graphNode.support = new Graph.Support({
			id: -1,
			parentNode: graphNode,
			freedom: node['support']['freedom'],
			rotation: node['support']['rotation']
		});
		graphNode.forces = node['forces'].map(function (force, idx) {
			return new Graph.Force({
				id: idx,
				parentNode: graphNode,
				vector: force['vector']
			});
		});
		graph.addNode(graphNode);
	});

	json['elements'].forEach(function (element) {
		//TODO - use try/catch instead
		var source   = graph.findNodeById(element['source']);
		var target   = graph.findNodeById(element['target']);
		var material = graph.findMaterialById(element['material']);
		var section  = graph.findSectionById(element['section']);
		if (!source || !target || !material || !section) {
			error = true;
			return;
		}

		graph.addLink(new Graph.Link({
			id: element['id'],
			source: source,
			target: target,
			material: material,
			section: section
		}));
	});

	return error ? null : graph;
}

Graph.prototype.addNode = function (node) {
	this.nodes.push(node);
	this.notifier.notify(Graph.Event.ADD_NODE, node);
}

Graph.prototype.addLink = function (link) {
	this.links.push(link);
	this.notifier.notify(Graph.Event.ADD_LINK, link);
}

Graph.prototype.addMaterial = function (material) {
	this.materials.push(material);
}

Graph.prototype.addSection = function (section) {
	this.sections.push(section);
}

Graph.prototype.removeNode = function (node) {
	var links = this.getLinks(node);
	links.forEach(function (link) {
		this.removeLink(link);
	}.bind(this));

	this.nodes.splice(this.nodes.indexOf(node), 1);
	this.notifier.notify(Graph.Event.REMOVE_NODE, node);
}

Graph.prototype.removeLink = function (link) {
	this.links.splice(this.links.indexOf(link), 1);
	this.notifier.notify(Graph.Event.REMOVE_LINK, link);
}

Graph.prototype.removeMaterial = function (material) {
	this.links.forEach(function (link) {
		if (link['material'] === material['id'])
			link['material'] = null;
	});

	this.materials.splice(this.materials.indexOf(material), 1);
}

Graph.prototype.removeSection = function (section) {
	this.links.forEach(function (link) {
		if (link['section'] === section['id'])
			link['section'] = null;
	});

	this.sections.splice(this.sections.indexOf(section), 1);
}

Graph.prototype.updateNode = function (node, properties) {
	for (var key in properties) {
		if (properties.hasOwnProperty(key)) {
			node[key] = properties[key];
		}
	}

	this.notifier.notify(Graph.Event.UPDATE_NODE, node);
}

Graph.prototype.updateLink = function (link, properties) {
	for (var key in properties) {
		if (properties.hasOwnProperty(key)) {
			link[key] = properties[key];
		}
	}

	this.notifier.notify(Graph.Event.UPDATE_LINK, link);
}

Graph.prototype.getInLinks = function (node) {
	var inLinks = this.links.filter(function (link) {
		return link.target === node;
	});

	return inLinks;
}

Graph.prototype.getOutLinks = function (node) {
	var outLinks = this.links.filter(function (link) {
		return link.source === node;
	});

	return outLinks;
}

Graph.prototype.getLinks = function (node) {
	var links = this.links.filter(function (link) {
		return link.source === node || link.target === node;
	});

	return links;
}

Graph.prototype._findById = function (list, id) {
	var foundItems = list.filter(function (item) {
		return item.id === id;
	});

	if (foundItems.length === 1)
		return foundItems[0];

	return null;
}

Graph.prototype.findNodeById = function (id) {
	return this._findById(this.nodes, id);
}

Graph.prototype.findLinkById = function (id) {
	return this._findById(this.links, id);
}

Graph.prototype.findMaterialById = function (id) {
	return this._findById(this.materials, id);
}

Graph.prototype.findSectionById = function (id) {
	return this._findById(this.sections, id);
}

Graph.prototype.on = function (type, func) {
	this.notifier.addListener(type, func);
}

Graph.prototype.off = function (type, func) {
	this.notifier.removeListener(type, func);
}

module.exports = Graph;