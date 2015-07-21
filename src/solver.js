Solver = {};

//This solves KU = F
//K = stiffness matrix
//U = nodal displacement vector
//F = prescribed force vector
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
		var cos = (link.target.position[0] - link.source.position[0]) / length;
		var sin = (link.target.position[1] - link.source.position[1]) / length;

		var c2 = Math.pow(cos, 2);
		var s2 = Math.pow(sin, 2);
		var sc = sin * cos;
		var elementK = N.mul(k, [
			[c2, sc, -c2, -sc],
			[sc, s2, -sc, -s2],
			[-c2, -sc, c2, sc],
			[-sc, -s2, sc, s2]
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

	//Construct global U and F
	var globalU = [];
	var globalF = [];
	graph.nodes.forEach(function (node) {
		if (node.constraint[0] === "fixed") {
			globalU.push(0);
			globalF.push(null);
		}
		else {
			globalU.push(null);
			globalF.push(node.force[0]);
		}
		if (node.constraint[1] === "fixed") {
			globalU.push(0);
			globalF.push(null);
		}
		else {
			globalU.push(null);
			globalF.push(node.force[1]);
		}
	});
	console.log(JSON.stringify(globalK))
	console.log(JSON.stringify(globalU));
	console.log(JSON.stringify(globalF));

	var indexKey = [];
	for (var i = 0; i < globalU.length; i++) {
		indexKey.push(i);
	}

	//Swap entries in system so active displacements are on the bottom
	//TODO - preorder system of equations so swapping is not necessary
	var cursor = globalU.length - 1;
	for (var i = globalU.length - 1; i >= 0; i--) {
		if (globalU[i] === null) {
			Util.swapRows2D(globalK, i, cursor);
			Util.swapCols2D(globalK, i, cursor);
			Util.swapRows1D(globalU, i, cursor);
			Util.swapRows1D(globalF, i, cursor);
			Util.swapRows1D(indexKey, i, cursor);
			cursor -= 1;
		}
	}
	console.log("----------")
	console.log(JSON.stringify(globalK))
	console.log(JSON.stringify(globalU));
	console.log(JSON.stringify(globalF));
	console.log(JSON.stringify(indexKey));

	//Construct matrix equation for active displacements only
	var size = globalU.length;
	var activeDim = size - globalU.filter(function (u) { return u === null; }).length;
	var activeK = N.getBlock(globalK, [activeDim, activeDim], [size-1, size-1]);
	var activeF = globalF.slice(activeDim);
	console.log(JSON.stringify(activeK));
	console.log(JSON.stringify(activeF));

	//Solve active displacements
	var solvedActiveU = N.solve(activeK, activeF);
	for (var i = 0; i < solvedActiveU.length; i++) {
		globalU[i+activeDim] = solvedActiveU[i];
	}

	//Solve reaction forces
	var forceK = N.getBlock(globalK, [0, 0], [activeDim-1, size-1]);
	var reactionF = N.dot(forceK, globalU);
	for (var i = 0; i < reactionF.length; i++) {
		globalF[i] = reactionF[i];
	}

	console.log(JSON.stringify(globalU));
	console.log(JSON.stringify(globalF));

	//Compute element internal forces
	//TODO move this to a separate function to make it optional or user selectable
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
		console.log(link.id + ": " + stress + " " + s);
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