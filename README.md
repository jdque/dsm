# DSM

Web application for designing beam structures and calculting its displacement and internal forces under load. This is an ongoing project to bring a bit of my structural engineering background into front-end software development. The end goal is to provide a highly accessible learning tool for those studying introductory structural analysis.

Developed with the help of the following libraries:

* **[Konva](https://konvajs.github.io)** - Canvas-based rendering and scene graph. Although not as performant as WebGL 2D renderers, Konva has batched drawing and layered canvases to make things fast. Also has great support for user interaction events and primitive drawing.

* **[Numeric](http://www.numericjs.com)** - Linear algebra in Javascript. This was used to construct and solve the system of equations in the [direct stiffness method](https://en.wikipedia.org/wiki/Direct_stiffness_method).

Planned features:

* Real world units of measurement
* Distributed forces
* Material and cross-section editor
* Diagram generator (axial, shear, moment, displacement)