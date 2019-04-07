import PJAX from '../global';

/**
 * Parse options based on the IOptions object passed in by the Pjax class' constructor
 */
export default (options:PJAX.IOptions = null)=>{
    const   parsedOptions                               = (options !== null) ? options : {};
            parsedOptions.elements                      = (options !== null && options.elements !== undefined) ? options.elements : 'a[href]';
            parsedOptions.selectors                     = (options !== null && options.selectors !== undefined) ? options.selectors : ['.js-pjax'];
            parsedOptions.history                       = (options !== null && options.history !== undefined) ? options.history : true;
            parsedOptions.cacheBust                     = (options !== null && options.cacheBust !== undefined) ? options.cacheBust : false;
            parsedOptions.debug                         = (options !== null && options.debug !== undefined) ? options.debug : false;
            parsedOptions.timeout                       = (options !== null && options.timeout !== undefined) ? options.timeout : 0;
            parsedOptions.titleSwitch                   = (options !== null && options.titleSwitch !== undefined) ? options.titleSwitch : true;
            parsedOptions.customTransitions             = (options !== null && options.customTransitions !== undefined) ? options.customTransitions : false;
            parsedOptions.customPreventionAttributes    = (options !== null && options.customPreventionAttributes !== undefined) ? options.customPreventionAttributes : [];
            parsedOptions.importScripts                 = (options !== null && options.importScripts !== undefined) ? options.importScripts : true;
            parsedOptions.importCSS                     = (options !== null && options.importCSS !== undefined) ? options.importCSS : true;
    return  parsedOptions;
}