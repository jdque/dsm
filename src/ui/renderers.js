var Konva = require('konva');
var Graph = require('model/graph');
var Style = require('./style');
var Interactables = require('./interactables');

function GraphRenderer(layer, graphToDisplayPos) {
    this.layer = layer;
    this.graphToDisplayPos = graphToDisplayPos;
    this.graph = new Graph();
    this.nodeMap = {};
    this.linkMap = {};
}

GraphRenderer.prototype.redraw = function () {
    //Remove rendered nodes/links that are no longer in the graph
    //TODO - do set comparison so this is not O(n^2)
    Object.keys(this.nodeMap).forEach(function (nodeId) {
        if (this.graph.findNodeById(parseInt(nodeId) || nodeId) === null) {
            this.nodeMap[nodeId].destroy();
            delete this.nodeMap[nodeId];
        }
    }.bind(this));

    Object.keys(this.linkMap).forEach(function (linkId) {
        if (this.graph.findLinkById(parseInt(linkId) || linkId) === null) {
            this.linkMap[linkId].destroy();
            delete this.linkMap[linkId];
        }
    }.bind(this));

    //Add new graph nodes/links or update existing ones
    this.graph.nodes.forEach(function (node) {
        if (this.nodeMap.hasOwnProperty(node['id'])) {
            this.updateNode(node);
        }
        else {
            this.addNode(node);
        }
    }.bind(this));

    this.graph.links.forEach(function (link) {
        if (this.linkMap.hasOwnProperty(link['id'])) {
            this.updateLink(link);
        }
        else {
            this.addLink(link);
        }
    }.bind(this));

    this.layer.draw();
}

GraphRenderer.prototype.clear = function () {
    Object.keys(this.nodeMap).forEach(function (nodeId) {
        this.nodeMap[nodeId].destroy();
        delete this.nodeMap[nodeId];
    }.bind(this));

    Object.keys(this.linkMap).forEach(function (linkId) {
        this.linkMap[linkId].destroy();
        delete this.linkMap[linkId];
    }.bind(this));
}

GraphRenderer.prototype.setGraph = function (graph) {
    this.clear();
    this.graph = graph;
    //TODO remove listeners from previous graph
    this.graph.on(Graph.Event.ADD_NODE, this.addNode.bind(this));
    this.graph.on(Graph.Event.ADD_LINK, this.addLink.bind(this));
    this.graph.on(Graph.Event.REMOVE_NODE, this.removeNode.bind(this));
    this.graph.on(Graph.Event.REMOVE_LINK, this.removeLink.bind(this));
    this.graph.on(Graph.Event.UPDATE_NODE, this.updateNode.bind(this));
    this.graph.on(Graph.Event.UPDATE_LINK, this.updateLink.bind(this));
}

GraphRenderer.prototype.addNode = function (node) {
    var nodeCircle = Interactables.NodeCircle.create(this.graphToDisplayPos(node.position));
    this.layer.add(nodeCircle);
    this.layer.draw();

    this._associateNode(node, nodeCircle);
    this.addNodeAttachments(node);
}

GraphRenderer.prototype.addLink = function (link) {
    var fromNode = this.getRenderNode(link.source);
    var toNode = this.getRenderNode(link.target);

    var linkLine = Interactables.LinkLine.create(fromNode.position(), toNode.position());
    this.layer.add(linkLine);
    linkLine.moveToBottom();
    this.layer.draw();

    this._associateLink(link, linkLine);
}

GraphRenderer.prototype.addNodeAttachments = function (node) {
    var renderNode = this.getRenderNode(node);

    //Supports
    var support = node.support;
    var xFree = support.freedom[0];
    var yFree = support.freedom[1];
    var rotFree = support.freedom[2];
    if (!xFree & !yFree & !rotFree) {
        var renderSupport = Interactables.Support.create(-support.rotation, renderNode, Style.FixedSupport);
        renderNode.add(renderSupport);
        this._associateSupport(support, renderSupport);
    }
    else if (!xFree && !yFree && rotFree) {
        var renderSupport = Interactables.Support.create(-support.rotation, renderNode, Style.PinSupport);
        renderNode.add(renderSupport);
        this._associateSupport(support, renderSupport);
    }
    else if ((xFree && !yFree || !xFree && yFree) && !rotFree) {
        //slider support
    }
    else if ((xFree && !yFree || !xFree && yFree) && rotFree) {
        var renderSupport = Interactables.Support.create(-support.rotation, renderNode, Style.RollerSupport);
        renderNode.add(renderSupport);
        this._associateSupport(support, renderSupport);
    }

    //Forces
    node.forces.forEach(function (force) {
        if (force.vector[0] !== 0 || force.vector[1] !== 0) {
            var angle = -Math.atan2(force.vector[1], force.vector[0]) * 180 / Math.PI - 90;
            var renderForce = Interactables.Force.create(angle, renderNode);
            renderNode.add(renderForce);
            this._associateForce(force, renderForce);
        }
    }.bind(this));
}

GraphRenderer.prototype.removeNode = function (node) {
    var links = this.graph.getLinks(node);
    links.forEach(function (link) {
        this.removeLink(link);
    }.bind(this));

    this.removeNodeAttachments(node);

    var renderNode = this.getRenderNode(node);
    this._unassociateNode(node, renderNode);
    renderNode.destroy();
    this.layer.draw();
}

GraphRenderer.prototype.removeLink = function (link) {
    var renderLink = this.getRenderLink(link);
    this._unassociateLink(link, renderLink);
    renderLink.destroy();
    this.layer.draw();
}

GraphRenderer.prototype.removeNodeAttachments = function (node) {
    var renderNode = this.getRenderNode(node);
    renderNode.destroyAttachments();
    this.layer.draw();
}

GraphRenderer.prototype.updateNode = function (node) {
    var renderNode = this.getRenderNode(node);

    //Position
    renderNode.setAttrs({
        position: this.graphToDisplayPos(node.position)
    });

    //Redraw links that are connected to the node
    var links = this.graph.getLinks(node);
    links.forEach(function (link) {
        this.updateLink(link);
    }.bind(this));

    //TODO - Modify existing externals instead of replacing them
    this.removeNodeAttachments(node);
    this.addNodeAttachments(node);

    this.layer.draw();
}

GraphRenderer.prototype.updateLink = function (link) {
    //Position
    var renderLink = this.getRenderLink(link);
    var sourceRenderNode = this.getRenderNode(link.source);
    var targetRenderNode = this.getRenderNode(link.target);
    renderLink.setAttrs({
        points: [sourceRenderNode.x(), sourceRenderNode.y(),
                 targetRenderNode.x(), targetRenderNode.y()]
    });

    this.layer.draw();
}

GraphRenderer.prototype.getGraphNode = function (renderNode) {
    return renderNode._graphNode;
}

GraphRenderer.prototype.getGraphLink = function (renderLink) {
    return renderLink._graphLink;
}

GraphRenderer.prototype.getGraphSupport = function (renderSupport) {
    return renderSupport._graphSupport;
}

GraphRenderer.prototype.getGraphForce = function (renderForce) {
    return renderForce._graphForce;
}

GraphRenderer.prototype.getRenderNode = function (graphNode) {
    return this.nodeMap[graphNode['id']];
}

GraphRenderer.prototype.getRenderLink = function (graphLink) {
    return this.linkMap[graphLink['id']];
}

GraphRenderer.prototype._associateNode = function (node, renderObject) {
    this.nodeMap[node['id']] = renderObject;
    renderObject._graphNode = node;
}

GraphRenderer.prototype._associateLink = function (link, renderObject) {
    this.linkMap[link['id']] = renderObject;
    renderObject._graphLink = link;
}

GraphRenderer.prototype._associateSupport = function (support, renderObject) {
    renderObject._graphSupport = support;
}

GraphRenderer.prototype._associateForce = function (force, renderObject) {
    renderObject._graphForce = force;
}

GraphRenderer.prototype._unassociateNode = function (node, renderObject) {
    renderObject._graphNode = null;
    delete this.nodeMap[node['id']];
}

GraphRenderer.prototype._unassociateLink = function (link, renderObject) {
    renderObject._graphLink = null;
    delete this.linkMap[link['id']];
}

GraphRenderer.prototype._unassociateSupport = function (support, renderObject) {
    renderObject._graphSupport = null;
}

GraphRenderer.prototype._unassociateForce = function (force, renderObject) {
    renderObject._graphForce = null;
}

//------------------------------------------------------------------------------

function ResultGraphRenderer(layer, graphToDisplayPos) {
    this.layer = layer;
    this.graphToDisplayPos = graphToDisplayPos;
    this.graph = new Graph();
    this.nodeMap = {};
    this.linkMap = {};
}

ResultGraphRenderer.prototype.redraw = function () {
    //Add new graph nodes/links or update existing ones
    this.graph.nodes.forEach(function (node) {
        if (this.nodeMap.hasOwnProperty(node.nodeRef['id'].toString())) {
            this.updateNode(node);
        }
        else {
            this.addNode(node);
        }
    }.bind(this));

    this.graph.links.forEach(function (link) {
        if (this.linkMap.hasOwnProperty(link.linkRef['id'].toString())) {
            this.updateLink(link);
        }
        else {
            this.addLink(link);
        }
    }.bind(this));

    this.layer.draw();
}

ResultGraphRenderer.prototype.clear = function () {
    Object.keys(this.nodeMap).forEach(function (nodeId) {
        this.nodeMap[nodeId].destroy();
        delete this.nodeMap[nodeId];
    }.bind(this));

    Object.keys(this.linkMap).forEach(function (linkId) {
        this.linkMap[linkId].destroy();
        delete this.linkMap[linkId];
    }.bind(this));
}

ResultGraphRenderer.prototype.setGraph = function (graph) {
    this.clear();
    this.graph = graph;
}

ResultGraphRenderer.prototype.addNode = function (node) {
    var nodeCircle = Interactables.NodeCircle.create(
        this.graphToDisplayPos(node.position), Style.ResultNode);
    this.layer.add(nodeCircle);
    nodeCircle.moveToTop();
    this.layer.draw();

    this._associateNode(node, nodeCircle);
}

ResultGraphRenderer.prototype.addLink = function (link) {
    var fromNode = this.getRenderNode(link.source);
    var toNode = this.getRenderNode(link.target);
    var linkLine = Interactables.LinkLine.create(fromNode.position(), toNode.position(), Style.ResultLink);
    this.layer.add(linkLine);
    this.layer.draw();

    this._associateLink(link, linkLine);
}

ResultGraphRenderer.prototype.updateNode = function (node) {
    var renderNode = this.getRenderNode(node);

    //Position
    renderNode.setAttrs({
        position: this.graphToDisplayPos(node.position)
    });

    //Redraw links that are connected to the node
    var links = this.graph.getLinks(node);
    links.forEach(function (link) {
        this.updateLink(link);
    }.bind(this));

    this.layer.draw();
}

ResultGraphRenderer.prototype.updateLink = function (link) {
    //Position
    var renderLink = this.getRenderLink(link);
    var sourceRenderNode = this.getRenderNode(link.source);
    var targetRenderNode = this.getRenderNode(link.target);
    renderLink.setAttrs({
        points: [sourceRenderNode.x(), sourceRenderNode.y(),
                 targetRenderNode.x(), targetRenderNode.y()]
    });

    this.layer.draw();
}

ResultGraphRenderer.prototype.getGraphNode = function (renderNode) {
    return renderNode._graphNode;
}

ResultGraphRenderer.prototype.getGraphLink = function (renderLink) {
    return renderLink._graphLink;
}

ResultGraphRenderer.prototype.getRenderNode = function (graphNode) {
    return this.nodeMap[graphNode.nodeRef['id']];
}

ResultGraphRenderer.prototype.getRenderLink = function (graphLink) {
    return this.linkMap[graphLink.linkRef['id']];
}

ResultGraphRenderer.prototype._associateNode = function (node, renderObject) {
    this.nodeMap[node.nodeRef['id']] = renderObject;
    renderObject._graphNode = node;
}

ResultGraphRenderer.prototype._associateLink = function (link, renderObject) {
    this.linkMap[link.linkRef['id']] = renderObject;
    renderObject._graphLink = link;
}

ResultGraphRenderer.prototype._unassociateNode = function (node) {
    delete this.nodeMap[node.nodeRef['id']];
}

ResultGraphRenderer.prototype._unassociateLink = function (link) {
    delete this.linkMap[link.linkRef['id']];
}

//------------------------------------------------------------------------------

function GridRenderer(layer) {
    this.layer = layer;
    this.lines = [];
    this.xSpacing = 32;
    this.ySpacing = 32;
}

GridRenderer.prototype.setSpacing = function (xSpacing, ySpacing) {
    if (xSpacing <= 0 || ySpacing <= 0)
        throw new Error("Can't set non-positive spacing for grid");

    this.xSpacing = xSpacing;
    this.ySpacing = ySpacing;
}

GridRenderer.prototype.modifySpacing = function (dx, dy) {
    if (this.xSpacing + dx <= 0 || this.ySpacing + dy <= 0)
        throw new Error("Can't set non-positive spacing for grid");

    this.xSpacing += dx;
    this.ySpacing += dy;
}

GridRenderer.prototype.redraw = function () {
    this.clear();

    for (var y = 0; y < this.layer.height(); y += this.ySpacing) {
        var line = new Konva.Line(Style.GridLine);
        line.setAttrs({
            listening: false
        });
        line.points([0, y, this.layer.width(), y]);
        this.layer.add(line);
        this.lines.push(line);
    }

    for (var x = 0; x < this.layer.width(); x += this.xSpacing) {
        var line = new Konva.Line(Style.GridLine);
        line.setAttrs({
            listening: false
        });
        line.points([x, 0, x, this.layer.height()]);
        this.layer.add(line);
        this.lines.push(line);
    }

    this.layer.draw();
}

GridRenderer.prototype.clear = function () {
    this.lines.forEach(function (line) {
        line.destroy();
    });
    this.lines = [];
    this.layer.draw();
}

GridRenderer.prototype.snapObject = function (object, anchor) {
    var x, y;

    if (anchor === "center") {
        x = Math.round(object.x() / this.xSpacing) * this.xSpacing;
        y = Math.round(object.y() / this.ySpacing) * this.ySpacing;
    }
    else {
        x = Math.round(object.x() / this.xSpacing) * this.xSpacing;
        y = Math.round(object.y() / this.ySpacing) * this.ySpacing;
    }

    object.setAttrs({
        x: x,
        y: y
    });
}

//------------------------------------------------------------------------------

function TransientRenderer(layer) {
    this.layer = layer;
    this.boundingBox = null;
    this.boundingBoxTarget = null;

    this.highlightIdMap = {};
}

TransientRenderer.prototype.setBoundingBox = function (object) {
    if (!object && this.boundingBox) {
        this.boundingBox.destroy();
        this.boundingBox = null;
        this.boundingBoxTarget = null;
        return;
    }

    this.boundingBoxTarget = object;
    if (!this.boundingBox) {
        this.boundingBox = new Konva.Rect(Style.BoundingBox);
        this.layer.add(this.boundingBox);
    }
    this.updateBoundingBox();
}

TransientRenderer.prototype.updateBoundingBox = function () {
    if (!this.boundingBox || !this.boundingBoxTarget) {
        return;
    }

    var objectStageRect = this.boundingBoxTarget.getClientRect();
    var current = this.boundingBoxTarget.getParent();
    while (current && current !== this.boundingBoxTarget.getLayer()) {
        objectStageRect.x += current.x();
        objectStageRect.y += current.y();
        current = current.getParent();
    }

    this.boundingBox.setAttrs({
        x: objectStageRect.x - 2,
        y: objectStageRect.y - 2,
        width: objectStageRect.width + 4,
        height: objectStageRect.height + 4,
        listening: false
    });
}

TransientRenderer.prototype.highlight = function (object) {
    if (this.highlightIdMap[object._id]) {
        return;
    }

    this.highlightIdMap[object._id] = {
        object: object,
        originalFill: object.fill(),
        originalStroke: object.stroke()
    };
    if (object.fill()) {
        object.fill('rgba(255, 0, 255, 1.0)');
    }
    if (object.stroke()) {
        object.stroke('rgba(255, 0, 255, 1.0)');
    }
    object.getLayer().draw();
}

TransientRenderer.prototype.unhighlight = function (object) {
    var highlight = this.highlightIdMap[object._id];
    if (highlight) {
        if (highlight.object && highlight.object.getParent()) {
            object.fill(highlight.originalFill);
            object.stroke(highlight.originalStroke);
            object.getLayer().draw();
        }
        delete this.highlightIdMap[object._id];
    }
}

TransientRenderer.prototype.clearHighlights = function () {
    for (var key in this.highlightIdMap) {
        this.unhighlight(this.highlightIdMap[key].object);
    }
}

TransientRenderer.prototype.redraw = function () {
    this.layer.draw();
}

module.exports = {
    GraphRenderer: GraphRenderer,
    ResultGraphRenderer: ResultGraphRenderer,
    GridRenderer: GridRenderer,
    TransientRenderer: TransientRenderer
};