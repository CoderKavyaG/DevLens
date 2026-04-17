import { DomNode } from "./domBuilder"

export type  StyleMap = {
    fontSize?: number
    fontWeight? : string
    fontFamily?: string
    color?: string
    backgroundColor?: string
    display? : string
    padding?: number
    margin?: number
    border?: string
    textAlign?: string
    width?: number
    height?: number
}

const defaultStyles: Record<string , StyleMap> = {
    h1: {
        fontSize: 32,
        fontWeight: 'bold',
        display: 'block',
        margin: 16,
        color: '#000'
    },
    h2: {
        fontSize: 24,
        fontWeight: 'bold',
        display: 'block',
        margin: 12,
        color: '#000'
    },
    p: {
        fontSize: 16,
        color: '#333',
        display: 'block',
        margin: 8
    },
    div: {
        display: 'block'
    },
    span: {
        color: '#000',
        display: 'inline'
    },
    button: {
        fontSize: 14,
        padding: 8,
        backgroundColor: '#007bff',
        color: '#fff',
        border: '1px solid #0056b3'
    }
}

export function computeStyle(node : DomNode) : StyleMap {
    const defaultStyle = node.name ? defaultStyles[node.name] || {} : {}

    // so when we get style attributes it is a plain string hence , we have to converrt int oclean object so we get the styles we want and use it inline style so that parseinlinestyle
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
        if (cleanKey === 'background-color') result.backgroundColor = cleanValue
        if (cleanKey === 'font-size') result.fontSize = parseInt(cleanValue)
        if (cleanKey === 'font-weight') result.fontWeight = cleanValue
        if (cleanKey === 'font-family') result.fontFamily = cleanValue
        if (cleanKey === 'display') result.display = cleanValue
        if (cleanKey === 'padding') result.padding = parseInt(cleanValue)
        if (cleanKey === 'margin') result.margin = parseInt(cleanValue)
        if (cleanKey === 'border') result.border = cleanValue
        if (cleanKey === 'text-align') result.textAlign = cleanValue
        if (cleanKey === 'width') result.width = parseInt(cleanValue)
        if (cleanKey === 'height') result.height = parseInt(cleanValue)
    }
    
    return result
}