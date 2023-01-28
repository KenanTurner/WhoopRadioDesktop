export default class Component extends HTMLElement {
	constructor(inner_html){
		super();
		const root = this.attachShadow({mode:'open'});
		root.innerHTML = inner_html;
	}
}
//customElements.define('component-element',Component);