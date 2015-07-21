function Node(settings) {
	this.id         = settings.id 		  || -1;
	this.position   = settings.position   || [0, 0];
	this.constraint = settings.constraint || ["free", "free"];
	this.force      = settings.force      || [0, 0];
}

function Link(settings) {
	this.id 		= settings.id         || -1;
	this.source 	= settings.source	  || null;
	this.target 	= settings.target	  || null;
	this.material   = settings.material   || null;
	this.section    = settings.section    || null;
}

function Material(settings) {
	this.id 		= settings.id         || -1;
	this.elasticMod = settings.elasticMod || 0;
}

function Section(settings) {
	this.id 		= settings.id         || -1;
	this.area       = settings.area       || 0;
}

function Graph() {
	this.nodes = [];
	this.links = [];
	this.materials = [];
	this.sections = [];
}

Graph.fromJSON = function (json) {
	var graph = new Graph();
	var error = false;

	json['materials'].forEach(function (material) {
		graph.addMaterial(new Material({
			id: material['id'],
			elasticMod: material['elasticMod']
		}));
	});

	json['sections'].forEach(function (section) {
		graph.addSection(new Section({
			id: section['id'],
			area: section['area']
		}));
	})
	
	json['nodes'].forEach(function (node) {
		graph.addNode(new Node({
			id: node['id'],
			position: node['position'],
			constraint: node['constraint'],
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

		graph.addLink(new Link({
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
}

Graph.prototype.addLink = function (link) {
	this.links.push(link);
}

Graph.prototype.addMaterial = function (material) {
	this.materials.push(material);
}

Graph.prototype.addSection = function (section) {
	this.sections.push(section);
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

Graph.prototype.findById = function (list, id) {
	var foundItems = list.filter(function (item) {
		return item.id === id;
	});

	if (foundItems.length === 1)
		return foundItems[0];

	return null;
}

Graph.prototype.findNodeById = function (id) {
	return this.findById(this.nodes, id);
}

Graph.prototype.findMaterialById = function (id) {
	return this.findById(this.materials, id);
}

Graph.prototype.findSectionById = function (id) {
	return this.findById(this.sections, id);
}

Graph.prototype.associate = function (renderObject, graphObject) {
	renderObject.__graphObject = graphObject;
	graphObject.__renderObject = renderObject;
}

Graph.prototype.getGraphObject = function (renderObject) {
	return renderObject.__graphObject;
}

Graph.prototype.getRenderObject = function (graphObject) {
	return graphObject.__renderObject;
}

var test = {
	nodes: [
		{
			id: 1,
			position: [32, 32],
			constraint: ["free", "fixed"],
			force: [0, 0]
		},
		{
			id: 2,
			position: [288, 32],
			constraint: ["fixed", "fixed"],
			force: [0, 0]
		},
		{
			id: 3,
			position: [160, 128],
			constraint: ["free", "free"],
			force: [0, -20]
		}
	],
	elements: [
		{
			id: "a",
			source: 1,
			target: 2,
			material: "steel",
			section: "spar"
		},
		{
			id: "b",
			source: 1,
			target: 3,
			material: "steel",
			section: "spar"
		},
		{
			id: "c",
			source: 3,
			target: 2,
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