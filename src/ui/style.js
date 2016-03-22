var Style = {
	Node: {
		fill: 'red',
		radius: 10
	},

	Link: {
		fill: 'black',
	    stroke: 'black',
	    strokeWidth: 4
	},

	ResultNode: {
		fill: 'blue',
		radius: 4
	},

	ResultLink: {
		fill: 'blue',
	    stroke: 'blue',
	    strokeWidth: 2
	},

	FixedSupport: {
		points: [0, 0, -12, 24, 12, 24, 0, 0],
		width: 24,
		height: 24,
		fill: 'red',
		stroke: 'black',
		strokeWidth: 1,
		closed: true
	},

	PinSupport: {
		points: [0, 0, -12, 24, 12, 24, 0, 0],
		width: 24,
		height: 24,
		fill: 'blue',
		stroke: 'black',
		strokeWidth: 1,
		closed: true
	},

	RollerSupport: {
		points: [0, 0, -12, 24, 12, 24, 0, 0],
		width: 24,
		height: 24,
		fill: 'green',
		stroke: 'black',
		strokeWidth: 1,
		closed: true
	},

	Force: {
		points: [0, 0, 0, 48],
		width: 32,
		height: 48,
		fill: 'black',
		stroke: 'black',
		strokeWidth: 3
	},

	ForceArrow: {
		stroke: 'black',
		strokeWidth: 2
	},

	GridLine: {
		stroke: 'rgba(128, 128, 128, 1.0)',
		strokeWidth: 1,
		listening: false
	}
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Style;
}