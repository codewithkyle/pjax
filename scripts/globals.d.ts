declare namespace pjax{

    export interface IOptions{
        elements?: string
        selectors?: string[]
        switches?: StringKeyedObject<Switch>
        switchesOptions?: StringKeyedObject
        history?: boolean
        cacheBust?: boolean
        scrollTo?: number
        debug?: boolean
        timeout?: number
        attrState?: string
        titleSwitch?: boolean
        requestOptions?:{
            requestUrl?: string
            requestMethod?: string
            requestParams?: IRequestParams[]
            formData?: FormData
        }
    }

    export interface CacheObject{
        status: number
        html: Document
        url: string
    }

    export interface StateObject{
        url?: string
        title?: string
        history?: boolean
        scrollPos?: number[]
    }

    export type Switch = (oldEl: Element, newEl: Element, options?: IOptions, switchesOptions?: StringKeyedObject) => void;

    export interface IRequestParams{
        name: string,
        value: string
    }

    export interface EventOptions{
        triggerElement: Element
    }

    export interface SwitchOptions{
        oldEl: Element
        newEl: Element
    }
}

interface StringKeyedObject<T = any>{
    [key: string]: T
}

type ElementFunction = (el: Element) => void;

declare enum DefaultSwitches{
    innerHTML   = 'innerHTML',
    outerHTML   = 'outerHTML',
    sideBySide  = 'sideBySide',
    replaceNode = 'replaceNode'
}

export {pjax as default};