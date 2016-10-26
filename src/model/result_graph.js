var Notifier = require('../common/notifier');

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
    this.deflection  = settings.deflection  || [];
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

    this.notifier.notify(ResultGraph.Event.UPDATE_LINK, link);
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

module.exports = ResultGraph;