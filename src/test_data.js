var testData =
{
    test1: {
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
    },

    test2: {
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
                target: 3   ,
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
    },

    test3: {
        nodes: [
            {
                id: 1,
                position: [32, 32],
                displacement: [0, 0, 0],
                support: {
                    freedom: [true, false, true],
                    rotation: -45
                },
                forces: []
            },
            {
                id: 2,
                position: [288, 32],
                displacement: [0, 0, 0],
                support: {
                    freedom: [false, false, true],
                    rotation: 0
                },
                forces: []
            },
            {
                id: 3,
                position: [160, 160],
                displacement: [0, 0, 0],
                support: {
                    freedom: [true, true, true],
                    rotation: 0
                },
                forces: [
                    {
                        vector: [0, -100, 0]
                    },
                    {
                        vector: [50, 0, 0]
                    }
                ]
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
                area: 100,
                momInertia: 1000000
            }
        ]
    }
}

module.exports = testData;