var Style = {
	Node: {
		fill: 'red',
		radius: 10,
		hasControls: false,
		lockRotation: true,
		lockScalingX: true,
		lockScalingY: true
	},

	Link: {
		fill: 'black',
	    stroke: 'black',
	    strokeWidth: 5,
	    selectable: false,
	    hasControls: false
	},

	PinSupport: {
		width: 24,
		height: 24,
		fill: 'blue',
		stroke: 'black',
		strokeWidth: 1,
		hasControls: false,
		lockMovementX: true,
		lockMovementY: true
	},

	RollerSupport: {
		width: 24,
		height: 24,
		fill: 'green',
		stroke: 'black',
		strokeWidth: 1,
		hasControls: false,
		lockMovementX: true,
		lockMovementY: true
	},

	Force: {
		width: 32,
		height: 64,
		hasControls: false,
		lockMovementX: true,
		lockMovementY: true
	},

	ForceArrow: {
		stroke: 'black',
		strokeWidth: 2
	},

	GridLine: {
		stroke: 'rgba(128, 128, 128, 0.8)',
		strokeWidth: 1,
		selectable: false,
	    hasControls: false
	}
}