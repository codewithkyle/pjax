/**
 * Called by `Pjax.parseDOM`
 * Takes the provided element and checks to make sure
 * the element is an HTMLAnchorElement by checking it's tag name
 * If the element is an HTMLAnchorElement check if it alreay has a pjax state
 * If not set link event listeners
 * @param el Element
 */
export default (el:Element)=>{
    switch(el.tagName.toLocaleLowerCase()){
        case 'a':
            if(!el.hasAttribute(this.options.attrState)) this.setLinkListeners(el);
            break;
        default:
            throw 'Pjax can only be applied on <a> elements'
    }
}