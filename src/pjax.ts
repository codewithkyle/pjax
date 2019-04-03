// Function Imports
import parseOptions from './lib/parse-options';
import trigger from './lib/events/trigger';
import parseDOM from './lib/parse-dom';
import scrollWindow from './lib/util/scroll';
import clearActive from './lib/util/clear-active';

// Custom Packages
import StateManager from '@codewithkyle/state-manager';
import DeviceManager from '@codewithkyle/device-manager';

// Type Definitions
import PJAX from './global';

export default class Pjax{

    public static VERSION:string    = '2.0.0';

    public  options:        PJAX.IOptions;
    private _cache:         PJAX.ICacheObject;
    private _request:       string;
    private _response:      Response;
    private _confirmed:     boolean;
    private _cachedSwitch:  PJAX.ICachedSwitchOptions;
    private _scrollTo:      PJAX.IScrollPosition;
    private _isPushstate:   boolean;
    private _dom:           HTMLElement;

    constructor(options?:PJAX.IOptions){
        this._dom           = document.documentElement;

        // If IE 11 is detected abort pjax
        if(DeviceManager.isIE){
            console.log('%c[Pjax] '+`%cIE 11 detected - Pjax aborted`,'color:#f3ff35','color:#eee');
            this._dom.classList.remove('dom-is-loading');
            this._dom.classList.add('dom-is-loaded');
            return;
        }
        
        this._cache         = null;
        this.options        = parseOptions(options);
        this._request       = null;
        this._response      = null;
        this._confirmed     = false;
        this._cachedSwitch  = null;
        this._scrollTo      = {x:0, y:0};
        this._isPushstate   = true;

        this.init();
    }

    init(){
        if(this.options.debug){
            console.log('%c[Pjax] '+`%cinitializing Pjax version ${ Pjax.VERSION }`, 'color:#f3ff35','color:#eee');
            console.log('%c[Pjax] '+`%cview Pjax documentation at http://papertrain.io/pjax`, 'color:#f3ff35','color:#eee');
            console.log('%c[Pjax] '+`%cloaded with the following options: `, 'color:#f3ff35','color:#eee');
            console.log(this.options);
        }

        // Handle status classes for initial load
        this._dom.classList.add('dom-is-loaded');
        this._dom.classList.remove('dom-is-loading');
        

        new StateManager(this.options.debug, true);

        window.addEventListener('popstate', this.handlePopstate);

        if(this.options.customTransitions){
            document.addEventListener('pjax:continue', this.handleContinue );
        }

        // Attach listeners to initial link elements
        parseDOM(document.body, this);
    }

    /**
     * Fired when the `popstate` event is fired on the `window`.
     */
    private handlePopstate:EventListener = (e:PopStateEvent)=>{
        
        // Check if the state object is available
        if(e.state){
            if(this.options.debug){
                console.log('%c[Pjax] '+`%chijacking popstate event`,'color:#f3ff35','color:#eee');
            }
            this._scrollTo = e.state.scrollPos;
            this.loadUrl(e.state.uri, 'popstate');
        }
    }

    /**
     * 
     * @param href - URI from the popstates state object
     * @param loadType - the load type that should be perfomred (eg: popstate)
     */
    private loadUrl(href:string, loadType:string):void{
        
        if(this._confirmed){
            return;
        }

        // Abort any current request
        this.abortRequest();
        this._cache = null;

        // Handle the page load request
        this.handleLoad(href, loadType);
    }

    /**
     * Called when the current request needs to be aborted.
     */
    private abortRequest(): void{
        // Reset the request
        this._request = null;

        // Reset the response
        this._response = null;
    }

    /**
     * Called when Pjax needs to finish the page transition.
     * This method is responsible for cleaning up all the status trackers.
     */
    private finalize(): void{
        if(this.options.debug){
            console.log('%c[Pjax] '+`%cpage transition completed`,'color:#f3ff35','color:#eee');
        }

        // Update the windows scroll position
        scrollWindow(this._scrollTo);

        // Handle the pushState
        if(this.options.history){
            if(this._isPushstate){
                StateManager.doPush(this._response.url, document.title);
            }else{
                StateManager.doReplace(this._response.url, document.title);
            }
        }

        // Trigger the complete event
        trigger(document, ['pjax:complete']);

        // Handle status classes
        this._dom.classList.add('dom-is-loaded');
        this._dom.classList.remove('dom-is-loading');

        // Reset status trackers
        this._cache             = null;
        this._request           = null;
        this._response          = null;
        this._cachedSwitch      = null;
        this._isPushstate       = true;
        this._scrollTo          = {x:0,y:0};
        this._confirmed         = false;
    }

    /**
     * Loops through the `SwitchObject` array and swapps the `innerHTML` from the containers.
     * @param switchQueue -`SwitchObject` array
     */
    private handleSwitches(switchQueue:Array<PJAX.ISwitchObject>): void{
        
        // Loop through all the queued switch objects
        for(let i = 0; i < switchQueue.length; i++){
            
            // Swap out the innerHTML
            switchQueue[i].current.innerHTML = switchQueue[i].new.innerHTML;
            
            // Parse the new container and handle event listeners
            parseDOM(switchQueue[i].current, this);
        }

        // Finalize the page transition
        this.finalize();
    }

    /**
     * Called when the `pjax:continue` event is fired.
     * Only listening if the `customTransition` is enabled in the options object.
     */
    private handleContinue:EventListener = (e:Event)=>{
        // Check if Pjax has cached the new page
        if(this._cachedSwitch !== null){
            
            // Check if the titles need to be swapped
            if(this.options.titleSwitch){
                document.title = this._cachedSwitch.title;
            }
            
            // Swap content
            this.handleSwitches(this._cachedSwitch.queue);
        }else{
            // The developer fired the continue event too early so the page hasn't finished loading
            if(this.options.debug){
                console.log('%c[Pjax] '+`%cswitch queue was empty. You might be sending pjax:continue early`,'color:#f3ff35','color:#eee');
            }
            trigger(document, ['pjax:error']);
        }
    }

    /**
     * Builds an array of `SwitchObjects` that need to be swapped based on the `options.selectors` array.
     * @param selectors - an array of container selectors that Pjax needs to swap
     * @param tempDocument - the temporary `HTMLDocument` generated from the `XMLHttpRequest` response
     * @param currentDocument - the current `HTMLDocument` element
     */
    private switchSelectors(selectors:string[], tempDocument:HTMLDocument, currentDocument:HTMLDocument): void{
        
        if(tempDocument === null){
            if(this.options.debug){
                console.log('%c[Pjax] '+`%ctemporary document was null, telling the browser to load ${ (this._cache !== null) ? this._cache.url : this._response.url }`,'color:#f3ff35','color:#eee');
            }

            if(this._cache !== null){
                this.lastChance(this._cache.url);
            }else{
                this.lastChance(this._response.url);
            }
        }

        // Build a queue of containers to swap
        const switchQueue:Array<PJAX.ISwitchObject> = [];

        // Track if the new page contains additional `HTMLScriptElement`
        let contiansScripts = false;

        // Loop though all the selector strings
        for(let i = 0; i < selectors.length; i++){
            
            // Grab the selector containers from the temporay and current documents
            const newContainers = Array.from(tempDocument.querySelectorAll(selectors[i]));
            const currentContainers = Array.from(currentDocument.querySelectorAll(selectors[i]));

            if(this.options.debug){
                console.log('%c[Pjax] '+`%cswapping content from ${ selectors[i] }`,'color:#f3ff35','color:#eee');
            }

            // Check that the selector contains exist on both documents
            if(newContainers.length !== currentContainers.length){
                if(this.options.debug){
                    console.log('%c[Pjax] '+`%cthe dom doesn't look the same`,'color:#f3ff35','color:#eee');
                    
                }

                // If a document is missing a container natively load the page
                this.lastChance(this._response.url);

                return;
            }

            // Loop though all the new containers
            for(let k = 0; k < newContainers.length; k++){
                
                // Check for any scripts
                const scripts = Array.from(newContainers[k].querySelectorAll('script'));
                if(scripts.length > 0){
                    contiansScripts = true;
                }

                // Get the current container object
                const newContainer = newContainers[k];
                const currentContainer = currentContainers[k];

                // Build the switch object
                const switchObject:PJAX.ISwitchObject = {
                    new: newContainer,
                    current: currentContainer
                };
    
                // Queue the switch
                switchQueue.push(switchObject);
            }
        }
        
        // Check that there are switch objects in the queue
        if(switchQueue.length === 0){
            if(this.options.debug){
                console.log('%c[Pjax] '+`%ccouldn't find anything to switch`,'color:#f3ff35','color:#eee');
            }
            this.lastChance(this._response.url);
            return;
        }

        // Abort switch if one of the new containers contains a script element
        if(contiansScripts){
            if(this.options.debug){
                console.log('%c[Pjax] '+`%cthe new page contains scripts`,'color:#f3ff35','color:#eee');
            }
            this.lastChance(this._response.url);
            return;
        }
        
        // Check if Pjax needs to wait for the continue event
        if(!this.options.customTransitions){
            if(this.options.titleSwitch){
                document.title = tempDocument.title;
            }
            this.handleSwitches(switchQueue);
        }else{
            this._cachedSwitch = {
                queue: switchQueue,
                title: tempDocument.title
            };
        }
    }

    /**
     * Called when something went wrong with Pjax.
     * This fallback will force the browser to natively load the page.
     * @param uri - URI of the page that should be natively loaded
     */
    private lastChance(uri:string): void{
        if(this.options.debug){
            console.log('%c[Pjax] '+`%csomething caused Pjax to break, native loading ${ uri }`,'color:#f3ff35','color:#eee');
        }
        window.location.href = uri;
    }

    /**
     * Check if the cached content has a successful response.
     * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
     */
    private statusCheck(): boolean{
        for(let status = 200; status <= 206; status++){
            if(this._cache.status === status){
                return true;
            }
        }
        return false;
    }

    /**
     * Called when Pjax needs to load the temporary `HTMLDocument` that's currently cached.
     */
    private loadCachedContent(): void{
        
        // Verify that the server responded with a 200 level response status
        if(!this.statusCheck()){
            this.lastChance(this._cache.url);
            return;
        }

        // Clear the active element
        clearActive();

        StateManager.doReplace(window.location.href, document.title);

        // Build the selector swapping queue
        this.switchSelectors(this.options.selectors, this._cache.document, document);
    }

    /**
     * Builds a temporary `HTMLDocument` using the `responseText` provided by the `XMLHttpRequest` response.
     * @param responseText - `responseText` from the `XMLHttpRequest` response
     * @returns `HTMLDocument` or `null`
     */
    private parseContent(responseText:string): HTMLDocument{        
        const tempDocument:HTMLDocument = document.implementation.createHTMLDocument('pjax-temp-document');

        // Use regex to verify the response is a `HTMLDocument`
        const htmlRegex = /<html[^>]+>/gi;
        const matches = responseText.match(htmlRegex);
        
        // Check that the regex match was successful
        if(matches !== null){
            tempDocument.documentElement.innerHTML = responseText;
            return tempDocument;
        }

        return null;
    }

    /**
     * Caches the response from the server in a temporary `HTMLDocument`.
     * @param responseText - `responseText` from the `XMLHttpRequest` response
     * @param responseStatus - `status` from the `XMLHttpRequest` response
     * @param uri - the URI that was used for the request
     */
    private cacheContent(responseText:string, responseStatus:number, uri:string): void{
        
        // Create a temp HTML document
        const tempDocument = this.parseContent(responseText);

        // Create the cache object
        this._cache = {
            status: responseStatus,
            document: tempDocument,
            url: uri
        }

        // Check that the temp document is valid
        if(tempDocument instanceof HTMLDocument){
            if(this.options.debug){
                console.log('%c[Pjax] '+`%ccaching content`,'color:#f3ff35','color:#eee');
            }
        }else{
            if(this.options.debug){
                console.log('%c[Pjax] '+`%cresponse wan't an HTML document`,'color:#f3ff35','color:#eee');
            }

            // Trigger error if the response wasn't an HTML Document
            trigger(document, ['pjax:error']);
        }
    }

    /**
     * Handles building the new `HTMLDocument` generated by the `XMLHttpRequest` response.
     * @param responseText - `responseText` from the `XMLHttpRequest` response
     */
    private loadContent(responseText:string): void{

        // Create a temp HTML document
        const tempDocument = this.parseContent(responseText);

        if(tempDocument instanceof HTMLDocument){
            
            // Clear the active element
            clearActive();

            StateManager.doReplace(window.location.href, document.title);
    
            // Swap the current page with the new page
            this.switchSelectors(this.options.selectors, tempDocument, document);

        }else{
            if(this.options.debug){
                console.log('%c[Pjax] '+`%cresponse wasn't an HTML document`,'color:#f3ff35','color:#eee');
            }

            // Trigger the error event
            trigger(document, ['pjax:error']);

            // Have the browser load the page natively
            this.lastChance(this._response.url);

            return;
        }
    }

    /**
     * Handles the `XMLHttpRequest` response based on the load type.
     * @param e - `ProgressEvent` provided by the `XMLHttpRequest`
     * @param loadType - informs the response handler what type of load is being preformed (eg: reload)
     */
    private handleResponse(response:Response): void{
        if(this.options.debug){
            console.log('%c[Pjax] '+`%cXML Http Request status: ${ response.status }`,'color:#f3ff35','color:#eee');
        }
        
        // Check if the server response is valid
        if(!response.ok){
            trigger(document, ['pjax:error']);
            return;
        }

        this._response = response;

        response.text().then((responseText:string)=>{
            // Handle the response based on the load type provided
            switch(this._request){
                case 'prefetch':
                    if(this._confirmed){
                        this.loadContent(responseText);
                    }else{
                        this.cacheContent(responseText, this._response.status, this._response.url);
                    }
                    break;
                case 'popstate':
                    this._isPushstate = false;
                    this.loadContent(responseText);
                    break;
                case 'reload':
                    this._isPushstate = false;
                    this.loadContent(responseText);
                    break;
                default:
                    this.loadContent(responseText);
                    break;
            }
        });
    }

    /**
     * Request the new page using the `fetch` api.
     * @see https://fetch.spec.whatwg.org/
     * @param href - URI of the reqeusted page
     */
    private doRequest(href:string):void{
        let     uri                   = href;
        const   queryString           = href.split('?')[1];

        // Check if Pjax needs to modify the URI with a cache busting param
        if(this.options.cacheBust){
            uri += (queryString === undefined) ? (`?cb=${Date.now()}`) : (`&cb=${Date.now()}`);
        }

        fetch(uri).then((response:Response)=>{
            this.handleResponse(response);
        }).catch((error:Error)=>{
            if(this.options.debug){
                console.group();
                console.error('%c[Pjax] '+`%cXHR error:`,'color:#f3ff35','color:#eee');
                console.error(error);
                console.groupEnd();
            }
        });
    }

    /**
     * Called when the user hovers over an element.
     * Handles prefetching the page request before the user clicks.
     * @param href - URI of the requested page
     */
    public handlePrefetch(href:string): void{
        
        // Don't prefetch links after the user has confirmed a page switch
        if(this._confirmed){
            return;
        }

        if(this.options.debug){
            console.log('%c[Pjax] '+`%cprefetching ${ href }`,'color:#f3ff35','color:#eee');
        }

        // Abort any outstanding request
        this.abortRequest();

        // Trigger the prefetch event
        trigger(document, ['pjax:prefetch']);

        this._request = 'prefetch';
        this.doRequest(href);
    }

    /**
     * Called when a new page needs to be loaded.
     * @param href - URI of the reqeusted page
     * @param loadType - informs the response handler what type of load is being preformed (eg: prefetch)
     * @param el - `Element` that the triggered the page load
     */
    public handleLoad(href:string, loadType:string, el:Element = null): void{
        
        // If the user already confirmed the page switch abort load
        if(this._confirmed){
            return;
        }

        // Trigger the send event
        trigger(document, ['pjax:send'], el);

        // Handle status classes
        this._dom.classList.remove('dom-is-loaded');
        this._dom.classList.add('dom-is-loading');

        // Set the page switch confirmed flag
        this._confirmed = true;

        // Check if the new page is cached
        if(this._cache !== null){
            if(this.options.debug){
                console.log('%c[Pjax] '+`%cloading cached content from ${ href }`,'color:#f3ff35','color:#eee');
            }
            this.loadCachedContent();
        }
        // Pjax isn't prefetching, do the request
        else if(this._request !== 'prefetch'){
            if(this.options.debug){
                console.log('%c[Pjax] '+`%cloading ${ href }`,'color:#f3ff35','color:#eee');
            }
            this._request = loadType;
            this.doRequest(href);
        }
    }

    /**
     * Called when Pjax needs to clear a prefetch.
     */
    public clearPrefetch(): void{
        
        // Check that the user hasn't confirmed a page switch
        if(!this._confirmed){
            
            // Reset the cache
            this._cache = null;

            // Abort any current requests
            this.abortRequest();

            // Trigger the cancel event
            trigger(document, ['pjax:cancel']);
        }
    }
}