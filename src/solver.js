Solver = {};

//This solves KU + F = R
//K = stiffness matrix
//U = prescribed displacement
//F = external force
//R = internal (reaction) force
//A = nodal support angle
//IsFree = degree of freedom (true/false)
Solver.solve = function (graph) {
	var N = numeric;

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
	var globalK = N.rep([graph.nodes.length * 2, graph.nodes.length * 2], 0);
	graph.links.forEach(function (link) {
		var length = Math.sqrt(N.sum(N.pow(N.sub(link.target.position, link.source.position), 2)));
		var k = link.section.area * link.material.elasticMod / length;

		var dx = link.target.position[0] - link.source.position[0];
		var dy = link.target.position[1] - link.source.position[1];
		var linkAngle = Math.atan2(dy, dx);
		var sourceAngle = link.source.rotation * Math.PI / 180;
		var targetAngle = link.target.rotation * Math.PI / 180;
		var sourceDiff = linkAngle > sourceAngle ? linkAngle - sourceAngle : -(sourceAngle - linkAngle);
		var targetDiff = linkAngle > targetAngle ? linkAngle - targetAngle : -(targetAngle - linkAngle);
		var l1 = Math.cos(sourceDiff);
		var m1 = Math.sin(sourceDiff);
		var l2 = Math.cos(targetDiff);
		var m2 = Math.sin(targetDiff);

		var elementK = N.mul(k, [
			[l1*l1, l1*m1, -l1*l2, -l1*m2],
			[l1*m1, m1*m1, -m1*l2, -m1*m2],
			[-l1*l2, -m1*l2, l2*l2, l2*m2],
			[-l1*m2, -m1*m2, l2*m2, m2*m2]
		]);

		var elementGlobalMap = {
			0: 2 * connectivityTable[link.id].i,     //ix
			1: 2 * connectivityTable[link.id].i + 1, //iy
			2: 2 * connectivityTable[link.id].j,     //jx
			3: 2 * connectivityTable[link.id].j + 1  //jy
		};

		//Add element K to global K
		for (var y = 0; y < elementK.length; y++) {
			for (var x = 0; x < elementK[y].length; x++) {
				globalK[elementGlobalMap[y]][elementGlobalMap[x]] += elementK[y][x];
			}
		}
	});

	//Construct global vectors
	var globalU = [];
	var globalA = [];
	var globalF = [];
	var globalR = [];
	var globalIsFree = [];
	graph.nodes.forEach(function (node) {
		globalA.push(node.rotation);
		globalA.push(node.rotation);

		globalU.push(node.displacement[0]);
		globalU.push(node.displacement[1]);

		globalF.push(node.force[0] * Math.cos(node.rotation * Math.PI / 180) +
					 node.force[1] * Math.cos((90-node.rotation) * Math.PI / 180));
		globalF.push(node.force[0] * Math.sin(node.rotation * Math.PI / 180) +
					 node.force[1] * Math.sin((90-node.rotation) * Math.PI / 180));

		globalR.push(0);
		globalR.push(0);

		globalIsFree.push(node.freedom[0]);
		globalIsFree.push(node.freedom[1]);
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
	console.log("K " + JSON.stringify(globalK))
	console.log("U " + JSON.stringify(globalU));
	console.log("A " + JSON.stringify(globalA));
	console.log("F " + JSON.stringify(globalF));
	console.log("I " + JSON.stringify(indexKey));

	//Construct matrix equation for active displacements only
	var size = globalIsFree.length;
	var activeDim = size - globalIsFree.filter(function (free) { return free !== false; }).length;
	var activeK = N.getBlock(globalK, [activeDim, activeDim], [size-1, size-1]);
	var activeU = globalU.slice(activeDim);
	var activeA = globalA.slice(activeDim);
	var activeF = globalF.slice(activeDim);
	var activeR = globalR.slice(activeDim);

	console.log("----------ACTIVE----------")
	console.log("K " + JSON.stringify(activeK));
	console.log("U " + JSON.stringify(activeU));
	console.log("A " + JSON.stringify(activeA));
	console.log("F " + JSON.stringify(activeF));

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

	console.log("U " + JSON.stringify(globalU));
	console.log("Reaction F " + JSON.stringify(globalReactionF));

	//Convert rotated values to global axes
	var rotatedGlobalU = N.rep([size], 0);
	var rotatedGlobalF = N.rep([size], 0);
	var rotatedGlobalReactionF = N.rep([size], 0);
	for (var i = 0; i < size; i++) {
		var i1 = indexKey[i];
		var i2 = i1 % 2 === 0 ? i1 + 1 : i1 - 1;
		var angle = globalA[i] * Math.PI / 180;
		var component1 = i1 < i2 ? Math.cos(angle) : Math.sin(Math.PI / 2 + angle);
		var component2 = i1 < i2 ? Math.sin(angle) : Math.cos(Math.PI / 2 + angle);
		var realI1 = indexKey.indexOf(i1);
		var realI2 = indexKey.indexOf(i2);

		rotatedGlobalU[realI1] += globalU[i] * component1;
		rotatedGlobalU[realI2] += globalU[i] * component2;
		rotatedGlobalF[realI1] += globalF[i] * component1;
		rotatedGlobalF[realI2] += globalF[i] * component2;
		rotatedGlobalReactionF[realI1] += globalReactionF[i] * component1;
		rotatedGlobalReactionF[realI2] += globalReactionF[i] * component2;
	}
	globalU = rotatedGlobalU;
	globalF = rotatedGlobalF;
	globalReactionF = rotatedGlobalReactionF;

	console.log("----------NEW GLOBAL----------")
	console.log("U " + JSON.stringify(globalU));
	console.log("F " + JSON.stringify(globalF));
	console.log("Reaction F " + JSON.stringify(globalReactionF));

	//Compute element internal forces
	//TODO move this to a separate function to make it optional or user selectable
	console.log("----------ELEMENT INTERNAL----------")
	graph.links.forEach(function (link) {
		var length = Math.sqrt(N.sum(N.pow(N.sub(link.target.position, link.source.position), 2)));
		var k = link.section.area * link.material.elasticMod / length;
		var cos = (link.target.position[0] - link.source.position[0]) / length;
		var sin = (link.target.position[1] - link.source.position[1]) / length;

		var elementR = [
			[cos, sin, 0, 0],
			[0, 0, cos, sin]
		];

		var elementGlobalMap = {
			0: 2 * connectivityTable[link.id].i,     //ix
			1: 2 * connectivityTable[link.id].i + 1, //iy
			2: 2 * connectivityTable[link.id].j,     //jx
			3: 2 * connectivityTable[link.id].j + 1  //jy
		};

		var elementGlobalU = [];
		for (var i = 0; i < 4; i++) {
			var idx = indexKey.indexOf(elementGlobalMap[i]);
			elementGlobalU.push(globalU[idx]);
		}

		var elementU = N.dot(elementR, elementGlobalU);
		
		var interpolationFunc = [-1 / length, 1 / length];

		var strain = N.dot(interpolationFunc, elementU);
		var stress = link.material.elasticMod * strain;

		var s = stress < 0 ? "COMPRESSION" : "TENSION";
		console.log(link.id + ": " + stress.toFixed(3) + " " + s);
	});
}

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