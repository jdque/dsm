Solver = function () {
}

//This solves KU + F = R
//K = stiffness matrix
//U = prescribed displacement
//F = external force
//R = internal (reaction) force
//A = nodal support angle
//IsFree = degree of freedom (true/false)
Solver.prototype.solveNodes = function (resultGraph) {
	var N = numeric;
	var graph = resultGraph.sourceGraph;

	//Element-node connectivity table
	//Assign nodes integer ID's based on their array index
	var connectivityTable = {};
	graph.links.forEach(function (link) {
		connectivityTable[link.id] = {
			i: graph.nodes.indexOf(link.source),
			j: graph.nodes.indexOf(link.target)
		};
	});

	//Construct global K
	var globalK = N.rep([graph.nodes.length * 3, graph.nodes.length * 3], 0);
	graph.links.forEach(function (link) {
		var length = N.norm2(N.sub(link.target.position, link.source.position));

		var elementR = this._createFlexureR(
			link.source.position, link.target.position,
			link.source.rotation, link.target.rotation);

		var elementK = this._createFlexureK(
			link.section.area, link.material.elasticMod, length, link.section.momInertia,
			elementR);

		var localGlobalIdxMap = {
			0: 3 * connectivityTable[link.id].i,     //ix
			1: 3 * connectivityTable[link.id].i + 1, //iy
			2: 3 * connectivityTable[link.id].i + 2, //itheta
			3: 3 * connectivityTable[link.id].j,     //jx
			4: 3 * connectivityTable[link.id].j + 1, //jy
			5: 3 * connectivityTable[link.id].j + 2  //jtheta
		};

		/*var localGlobalIdxMap = {
			0: 2 * connectivityTable[link.id].i,     //ix
			1: 2 * connectivityTable[link.id].i + 1, //iy
			2: 2 * connectivityTable[link.id].j,     //jx
			3: 2 * connectivityTable[link.id].j + 1  //jy
		};*/

		//Add element K to global K
		for (var y = 0; y < elementK.length; y++) {
			for (var x = 0; x < elementK[y].length; x++) {
				globalK[localGlobalIdxMap[y]][localGlobalIdxMap[x]] += elementK[y][x];
			}
		}
	}.bind(this));

	//Construct global vectors
	var globalU = [];
	var globalA = [];
	var globalF = [];
	var globalR = [];
	var globalIsFree = [];
	graph.nodes.forEach(function (node) {
		globalA.push.apply(globalA, [node.rotation, node.rotation, 0]);
		globalU.push.apply(globalU, node.displacement);
		globalF.push.apply(globalF, [
			node.force[0] * Math.cos(node.rotation * Math.PI / 180) +
			node.force[1] * Math.cos((90-node.rotation) * Math.PI / 180),
			node.force[0] * Math.sin(node.rotation * Math.PI / 180) +
			node.force[1] * Math.sin((90-node.rotation) * Math.PI / 180),
			node.force[2]
		]);
		globalR.push.apply(globalR, [0, 0, 0]);
		globalIsFree.push.apply(globalIsFree, node.freedom);
	});

	var indexKey = [];
	for (var i = 0; i < globalU.length; i++) {
		indexKey.push(i);
	}

	//Swap entries in system so active displacements are on the bottom
	//TODO - preorder system of equations so swapping is not necessary
	var cursor = globalU.length - 1;
	for (var i = globalU.length - 1; i >= 0; i--) {
		if (globalIsFree[i] !== false) {
			Util.swapRows2D(globalK, i, cursor);
			Util.swapCols2D(globalK, i, cursor);
			Util.swapRows1D(globalU, i, cursor);
			Util.swapRows1D(globalF, i, cursor);
			Util.swapRows1D(globalA, i, cursor);
			Util.swapRows1D(globalR, i, cursor);
			Util.swapRows1D(indexKey, i, cursor);
			cursor -= 1;
		}
	}

	console.log("----------GLOBAL----------")
	console.log("K " + N.prettyPrint(globalK));
	console.log("U " + N.prettyPrint(globalU));
	console.log("A " + N.prettyPrint(globalA));
	console.log("F " + N.prettyPrint(globalF));
	console.log("I " + N.prettyPrint(indexKey));

	//Construct matrix equation for active displacements only
	var size = globalIsFree.length;
	var activeDim = size - globalIsFree.filter(function (free) { return free !== false; }).length;
	var activeK = N.getBlock(globalK, [activeDim, activeDim], [size-1, size-1]);
	var activeU = globalU.slice(activeDim);
	var activeA = globalA.slice(activeDim);
	var activeF = globalF.slice(activeDim);
	var activeR = globalR.slice(activeDim);

	console.log("----------ACTIVE----------")
	console.log("K " + N.prettyPrint(activeK));
	console.log("U " + N.prettyPrint(activeU));
	console.log("A " + N.prettyPrint(activeA));
	console.log("F " + N.prettyPrint(activeF));

	//Solve active displacements
	var solvedActiveU = N.solve(activeK, activeF);
	for (var i = 0; i < solvedActiveU.length; i++) {
		globalU[i+activeDim] = solvedActiveU[i];
	}

	//Solve reaction forces
	var forceK = globalK;
	var reactionF = N.sub(N.dot(forceK, globalU), globalF);
	var globalReactionF = N.rep([size], 0)
	for (var i = 0; i < reactionF.length; i++) {
		globalReactionF[i] = reactionF[i];
	}

	console.log("U " + N.prettyPrint(globalU));
	console.log("Reaction F " + N.prettyPrint(globalReactionF));

	//Convert rotated values to global axes
	var alignedGlobalU = N.rep([size], 0);
	var alignedGlobalF = N.rep([size], 0);
	var alignedGlobalReactionF = N.rep([size], 0);
	for (var i = 0; i < size; i++) {
		if ((indexKey[i] + 1) % 3 === 0) {  //rotation, keep as is
			var realI = indexKey.indexOf(indexKey[i]);
			alignedGlobalU[realI] = globalU[i];
			alignedGlobalF[realI] = globalF[i];
			alignedGlobalReactionF[realI] = globalReactionF[i];
		}
		else {  //displacement, decompose
			var i1 = indexKey[i];
			var i2 = i1 % 3 === 0 ? i1 + 1 : i1 - 1;
			var angle = globalA[i] * Math.PI / 180;
			var component1 = i1 < i2 ? Math.cos(angle) : Math.sin(Math.PI / 2 + angle);
			var component2 = i1 < i2 ? Math.sin(angle) : Math.cos(Math.PI / 2 + angle);
			var realI1 = indexKey.indexOf(i1);
			var realI2 = indexKey.indexOf(i2);

			alignedGlobalU[realI1] += globalU[i] * component1;
			alignedGlobalU[realI2] += globalU[i] * component2;
			alignedGlobalF[realI1] += globalF[i] * component1;
			alignedGlobalF[realI2] += globalF[i] * component2;
			alignedGlobalReactionF[realI1] += globalReactionF[i] * component1;
			alignedGlobalReactionF[realI2] += globalReactionF[i] * component2;
		}
	}
	globalU = alignedGlobalU;
	globalF = alignedGlobalF;
	globalReactionF = alignedGlobalReactionF;

	console.log("----------NEW GLOBAL----------")
	console.log("U " + N.prettyPrint(globalU));
	console.log("F " + N.prettyPrint(globalF));
	console.log("Reaction F " + N.prettyPrint(globalReactionF));

	//Add displacements and reactions to nodes in result graph
	graph.nodes.forEach(function (node) {
		var resultNode = resultGraph.findNodeByRefId(node.id);
		var baseIdx = graph.nodes.indexOf(node) * 3;
		var ix = indexKey.indexOf(baseIdx);
		var iy = indexKey.indexOf(baseIdx + 1);
		var itheta = indexKey.indexOf(baseIdx + 2);
		resultGraph.updateNode(resultNode, {
			displacement: [globalU[ix], globalU[iy], globalU[itheta]],
			reaction: [globalReactionF[ix], globalReactionF[iy], globalReactionF[itheta]]
		});
	});
}

Solver.prototype.solveElement = function (resultLink, resultGraph) {
	var N = numeric;
	var linkRef = resultLink.linkRef;

	var elementR = this._createFlexureR(
		linkRef.source.position, linkRef.target.position,
		linkRef.source.rotation, linkRef.target.rotation);

	//Convert displacements to element local coordinates
	var elementGlobalU = resultLink.source.displacement.concat(resultLink.target.displacement);
	var elementLocalU = N.dot(elementR, elementGlobalU);

	//Strain and stress
	var length = N.norm2(N.sub(linkRef.target.position, linkRef.source.position));
	var axialInterpolation = [-1 / length, 0, 0, 1 / length, 0, 0];
	var strain = N.dot(axialInterpolation, elementLocalU);
	var stress = linkRef.material.elasticMod * strain;

	var s = stress < 0 ? "COMPRESSION" : "TENSION";
	console.log(linkRef.id + ": " + stress.toFixed(3) + " " + s);

	resultGraph.updateLink(resultLink, {
		axialStrain: strain,
		axialStress: stress
	});
}

Solver.prototype.solveElements = function (resultGraph) {
	resultGraph.links.forEach(function (link) {
		this.solveElement(link, resultGraph);
	}.bind(this));
}

Solver.prototype._createAxialR = function (sourcePos, targetPos, sourceAngle, targetAngle) {
	var dx = targetPos[0] - sourcePos[0];
	var dy = targetPos[1] - sourcePos[1];
	var linkAngle = Math.atan2(dy, dx);
	var sourceAngle = sourceAngle * Math.PI / 180;
	var targetAngle = targetAngle * Math.PI / 180;
	var sourceDiff = linkAngle > sourceAngle ? linkAngle - sourceAngle : -(sourceAngle - linkAngle);
	var targetDiff = linkAngle > targetAngle ? linkAngle - targetAngle : -(targetAngle - linkAngle);
	var c1 = Math.cos(sourceDiff);
	var s1 = Math.sin(sourceDiff);
	var c2 = Math.cos(targetDiff);
	var s2 = Math.sin(targetDiff);
	var elementR = [
		[c1, s1, 0 , 0 ],
		[0 , 0 , c2, s2]
	];

	return elementR;
}

Solver.prototype._createFlexureR = function (sourcePos, targetPos, sourceAngle, targetAngle) {
	var dx = targetPos[0] - sourcePos[0];
	var dy = targetPos[1] - sourcePos[1];
	var linkAngle = Math.atan2(dy, dx);
	var sourceAngle = sourceAngle * Math.PI / 180;
	var targetAngle = targetAngle * Math.PI / 180;
	var sourceDiff = linkAngle > sourceAngle ? linkAngle - sourceAngle : -(sourceAngle - linkAngle);
	var targetDiff = linkAngle > targetAngle ? linkAngle - targetAngle : -(targetAngle - linkAngle);
	var c1 = Math.cos(sourceDiff);
	var s1 = Math.sin(sourceDiff);
	var c2 = Math.cos(targetDiff);
	var s2 = Math.sin(targetDiff);
	var elementR = [
		[c1 , s1, 0, 0  , 0 , 0],
		[-s1, c1, 0, 0  , 0 , 0],
		[0  , 0 , 1, 0  , 0 , 0],
		[0  , 0 , 0, c2 , s2, 0],
		[0  , 0 , 0, -s2, c2, 0],
		[0  , 0 , 0, 0  , 0 , 1]
	];

	return elementR;
}

Solver.prototype._createAxialK = function (area, elasticMod, length, R) {
	var k = area * elasticMod / length;
	var ke = [
		[ k, -k],
		[-k,  k]
	];
	var K = numeric.dot(numeric.transpose(R), numeric.dot(ke, R));

	/*var l1 = Math.cos(sourceDiff);
	var m1 = Math.sin(sourceDiff);
	var l2 = Math.cos(targetDiff);
	var m2 = Math.sin(targetDiff);
	var elementK = N.mul(k, [
		[l1*l1, l1*m1, -l1*l2, -l1*m2],
		[l1*m1, m1*m1, -m1*l2, -m1*m2],
		[-l1*l2, -m1*l2, l2*l2, l2*m2],
		[-l1*m2, -m1*m2, l2*m2, m2*m2]
	]);*/

	return K;
}

Solver.prototype._createFlexureK = function (area, elasticMod, length, momInertia, R) {
	var A = area;
	var I = momInertia;
	var EL  = elasticMod / length;
	var EL2 = elasticMod / Math.pow(length, 2);
	var EL3 = elasticMod / Math.pow(length, 3);
	var ke = [ 
		[A*EL , 0        , 0       , -A*EL, 0        , 0       ],
		[0    , 12*I*EL3 , 6*I*EL2 , 0    , -12*I*EL3, 6*I*EL2 ],
		[0    , 6*I*EL2  , 4*I*EL  , 0    , -6*I*EL2 , 2*I*EL  ],
		[-A*EL, 0        , 0       , A*EL , 0        , 0       ],
		[0    , -12*I*EL3, -6*I*EL2, 0    , 12*I*EL3 , -6*I*EL2],
		[0    , 6*I*EL2  , 2*I*EL  , 0    , -6*I*EL2 , 4*I*EL  ]
	];
	var K = numeric.dot(numeric.transpose(R), numeric.dot(ke, R));

	return K;
}

//------------------------------------------------------------------------------

Util = {};

Util.swapRows2D = function (mat, i, j) {
	var width = mat[0].length;
	var temp = numeric.getBlock(mat, [i, 0], [i, width - 1]);

	numeric.setBlock(mat, [i, 0], [i, width - 1], numeric.getBlock(mat, [j, 0], [j, width - 1]));
	numeric.setBlock(mat, [j, 0], [j, width - 1], temp);
}

Util.swapCols2D = function (mat, i, j) {
	var height = mat.length;
	var temp = numeric.getBlock(mat, [0, i], [height - 1, i]);

	numeric.setBlock(mat, [0, i], [height - 1, i], numeric.getBlock(mat, [0, j], [height - 1, j]));
	numeric.setBlock(mat, [0, j], [height - 1, j], temp);	
}

Util.swapRows1D = function (vec, i, j) {
	var temp = vec[i];
	vec[i] = vec[j];
	vec[j] = temp;
}