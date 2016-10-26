var Interactables = require('../ui/interactables');

var SidebarComponent = function () {
    var appState;
    var appActions;
    var graph;
    var mainSelection;

    return {
        init: function (parent, props) {
            appActions = props.appActions;
            appState = props.appState;
            mainSelection = props.mainSelection;

            mainSelection.addListener('select', function (selectedObj) {
                var text = "";
                if (selectedObj) {
                    text = selectedObj.name();
                }

                parent.textContent = text;
            });
        }
    };
};

SidebarComponent.create = function (parent, props) {
    var component = SidebarComponent();
    component.init.apply(component, arguments);
    return component;
};

module.exports = SidebarComponent;