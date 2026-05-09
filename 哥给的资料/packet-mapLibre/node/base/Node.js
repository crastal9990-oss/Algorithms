class Node {
    // type
    static POINT = "Point";
    static LINE = "LineString";
    static POLYGON = "Polygon";
    static CIRCLE = "Circle";
    constructor(options) {
        this._id =  options.properties.id;
        this._selected = false;
        this._hovering = false;
    }
    get id () {
        return this._id;
    }
    get selected() {
        return this._selected;
    }
    set selected(value) {
        this._selected = value;
    }
    get hovering() {
        return this._hovering;
    }
    set hovering(value) {
        this._hovering = value;
    }

    onSelect() {
        this.selected = true;
    }
    unSelect() {
        this.selected = false;
    }
    hover() {
        this.hovering = true;
    }
    leave() {
        this.hovering = false;
    }
    move(position) {
        // 
    }
}

export default Node;