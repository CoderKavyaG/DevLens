import { DomNode } from "./domBuilder"

export type  StyleMap = {
    fontSize?: number
    fontWeight? : string
    color?: string
    display? : string
}

const defaultStyles: Record<string , StyleMap> = {
    h1: {
        fontSize: 32,
        fontWeight: 'bold',
        display: 'block'
    },
    p: {
        fontSize: 16,
        color: '#333',
        display: 'block'
    },
    div: {
        display: 'block'
    },
    span: {
        color: '#000'
    }
}

export function computeStyle(node : DomNode) : StyleMap {
    const defaultStyle = node.name ? defaultStyles[node.name] || {} : {}

    // so when we get style attributes it is a plain string hence , we have to converrt int oclean object so we get the styles we want and use it inline style so that parseinlinestyle
    const inlineStyle = node.attributes?.style ? parseInlineStyle(node.attributes.style) : {} 
    

    // if there are any inline styles defined in attributes . we will parse them and overrisde the default styles with inline styles 
    // as ...a copes eveeyrhting from a and than ...b copies everything from b on top 
    return { ...defaultStyle, ...inlineStyle }

}


function parseInlineStyle(style: string) : StyleMap {

    const declarations = style.split(';')
    const result: StyleMap = {}

    for (const declaration of declarations) {
        // split "color:red" into ["color", "red"]
        const [key, value] = declaration.split(':')
        
        // skip if empty
        if (!key || !value) continue
        
        const cleanKey = key.trim()
        const cleanValue = value.trim()
        
        // map the string key to our StyleMap properties
        if (cleanKey === 'color') result.color = cleanValue
        if (cleanKey === 'font-size') result.fontSize = parseInt(cleanValue)
        if (cleanKey === 'font-weight') result.fontWeight = cleanValue
        if (cleanKey === 'display') result.display = cleanValue
    }
    
    return result
}