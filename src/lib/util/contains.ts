/**
 * Checks if the requested document contains the required selectors and element
 * Loops through all selectors and checks for the selector class or id
 * If there are elements loop through those elements and check if the element is our required element
 * Return true if the document matches our required framework
 * Return false by default
 * @param {Document} doc
 * @param {Array<string>} selectors
 * @param {Element} element
 */
export default (doc: Document, selectors: string[], element: Element)=>{
    selectors.map((selector)=>{
        const selectorEls = Array.from(doc.querySelectorAll(selector));
        selectorEls.forEach((el)=>{
            if(el.contains(element)){
                return true;
            }
        });
    });

    return false;
}