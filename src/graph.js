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
	this.freedom      = settings.freedom      || [true, true, true];
	this.rotation     = settings.rotation     || 0;
	this.force        = settings.force        || [0, 0, 0];
}

Graph.Link = function (settings) {
	this.id 		= settings.id         || -1;
	this.source 	= settings.source	  || null;
	this.target 	= settings.target	  || null;
	this.material   = settings.material   || null;
	this.section    = settings.section    || null;
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
		graph.addNode(new Graph.Node({
			id: node['id'],
			position: node['position'],
			displacement: node['displacement'],
			freedom: node['freedom'],
			rotation: node['rotation'],
			force: node['force']
		}));
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

//------------------------------------------------------------------------------

function ResultGraph(sourceGraph) {
	this.sourceGraph = sourceGraph;
	this.nodes = [];
	this.links = [];
	this.notifier = new Notifier();

	sourceGraph.nodes.forEach(function (node) {
		var baseIdx = sourceGraph.nodes.indexOf(node) * 3;
		var node = new ResultGraph.Node({
			nodeRef: node
		});
		this.addNode(node);
	}.bind(this));

	sourceGraph.links.forEach(function (link) {
		var source = this.findNodeByRefId(link.source.id);
		var target = this.findNodeByRefId(link.target.id);
		var link = new ResultGraph.Link({
			linkRef: link,
			source: source,
			target: target
		});
		this.addLink(link);
	}.bind(this));
}

ResultGraph.Event = {
	ADD_NODE:    0,
	ADD_LINK:    1,
	UPDATE_NODE: 2,
	UPDATE_LINK: 3
};

ResultGraph.Node = function (settings) {
	this.nodeRef      = settings.nodeRef      || null;
	this.displacement = settings.displacement || [0, 0, 0];
	this.reaction     = settings.reaction     || [0, 0, 0];
	this.position     = settings.position     || [0, 0];
}

ResultGraph.Link = function (settings) {
	this.linkRef     = settings.linkRef     || null;
	this.source      = settings.source      || null;
	this.target      = settings.target      || null;
	this.axialStrain = settings.axialStrain || null;
	this.axialStress = settings.axialStress || null;
}

ResultGraph.prototype.addNode = function (node) {
	this.nodes.push(node);
	this.notifier.notify(ResultGraph.Event.ADD_NODE, node);
}

ResultGraph.prototype.addLink = function (link) {
	this.links.push(link);
	this.notifier.notify(ResultGraph.Event.ADD_LINK, link);
}

ResultGraph.prototype.updateNode = function (node, properties) {
	for (var key in properties) {
		if (properties.hasOwnProperty(key)) {
			node[key] = properties[key];
		}
	}

	this.notifier.notify(ResultGraph.Event.UPDATE_NODE, node);
}

ResultGraph.prototype.updateLink = function (link, properties) {
	for (var key in properties) {
		if (properties.hasOwnProperty(key)) {
			link[key] = properties[key];
		}
	}

	this.notifier.notify(Graph.Event.UPDATE_LINK, link);
}

ResultGraph.prototype.getLinks = function (node) {
	var links = this.links.filter(function (link) {
		return link.source === node || link.target === node;
	});

	return links;
}

ResultGraph.prototype.findNodeByRefId = function (id) {
	var foundItems = this.nodes.filter(function (node) {
		return node.nodeRef.id === id;
	});

	if (foundItems.length === 1)
		return foundItems[0];

	return null;
}

ResultGraph.prototype.on = function (type, func) {
	this.notifier.addListener(type, func);
}

ResultGraph.prototype.off = function (type, func) {
	this.notifier.removeListener(type, func);
}

//------------------------------------------------------------------------------

var test = {
	nodes: [
		{
			id: 1,
			position: [32, 32],
			displacement: [0, 0],
			freedom: [true, false],
			rotation: -45,
			force: [0, -20]
		},
		{
			id: 2,
			position: [288, 32],
			displacement: [0, 0],
			freedom: [false, false],
			rotation: 0,
			force: [0, 0]
		}
	],
	elements: [
		{
			id: "a",
			source: 2,
			target: 1,
			material: "steel",
			section: "spar"
		}
	],
	materials: [
		{
			id: "steel",
			elasticMod: 4
		}
	],
	sections: [
		{
			id: "spar",
			area: 100
		}
	]
};

var test2 = {
	nodes: [
		{
			id: 1,
			position: [32, 32],
			displacement: [0, 0],
			freedom: [true, false],
			rotation: -45,
			force: [0, 0]
		},
		{
			id: 2,
			position: [288, 32],
			displacement: [0, 0],
			freedom: [false, false],
			rotation: 0,
			force: [0, 0]
		},
		{
			id: 3,
			position: [160, 160],
			displacement: [0, 0],
			freedom: [true, true],
			rotation: 0,
			force: [0, -20]
		}
	],
	elements: [
		{
			id: "a",
			source: 2,
			target: 1,
			material: "steel",
			section: "spar"
		},
		{
			id: "b",
			source: 3,
			target: 1,
			material: "steel",
			section: "spar"
		},
		{
			id: "c",
			source: 2,
			target: 3	,
			material: "steel",
			section: "spar"
		}
	],
	materials: [
		{
			id: "steel",
			elasticMod: 4
		}
	],
	sections: [
		{
			id: "spar",
			area: 100
		}
	]
};

var test3 = {
	nodes: [
		{
			id: 1,
			position: [32, 32],
			displacement: [0, 0, 0],
			freedom: [true, false, true],
			rotation: -45,
			force: [0, 0, 0]
		},
		{
			id: 2,
			position: [288, 32],
			displacement: [0, 0, 0],
			freedom: [false, false, true],
			rotation: 0,
			force: [0, 0, 0]
		},
		{
			id: 3,
			position: [160, 160],
			displacement: [0, 0, 0],
			freedom: [true, true, true],
			rotation: 0,
			force: [0, -100, 0]
		}
	],
	elements: [
		{
			id: "a",
			source: 2,
			target: 1,
			material: "steel",
			section: "spar"
		},
		{
			id: "b",
			source: 3,
			target: 1,
			material: "steel",
			section: "spar"
		},
		{
			id: "c",
			source: 2,
			target: 3	,
			material: "steel",
			section: "spar"
		}
	],
	materials: [
		{
			id: "steel",
			elasticMod: 4
		}
	],
	sections: [
		{
			id: "spar",
			area: 100,
			momInertia: 1
		}
	]
};