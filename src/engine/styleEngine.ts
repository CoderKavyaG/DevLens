import { DomNode } from "./domBuilder"

export type StyleMap = {
    fontSize?: number
    fontWeight?: string
    fontFamily?: string
    color?: string
    backgroundColor?: string
    display?: string
    padding?: number
    margin?: number
    border?: string
    textAlign?: string
    width?: number | string
    height?: number | string
    flexDirection?: string
    justifyContent?: string
    alignItems?: string
    gap?: number
}

const defaultStyles: Record<string, StyleMap> = {
    h1: {
        fontSize: 32,
        fontWeight: 'bold',
        display: 'block',
        margin: 16,
        color: '#000',
        backgroundColor: '#ffffff'
    },
    h2: {
        fontSize: 24,
        fontWeight: 'bold',
        display: 'block',
        margin: 12,
        color: '#000',
        backgroundColor: '#ffffff'
    },
    h3: {
        fontSize: 20,
        fontWeight: 'bold',
        display: 'block',
        margin: 10,
        color: '#000',
        backgroundColor: '#ffffff'
    },
    p: {
        fontSize: 16,
        color: '#333',
        display: 'block',
        margin: 8,
        backgroundColor: '#ffffff'
    },
    div: {
        display: 'block',
        backgroundColor: '#ffffff'
    },
    span: {
        display: 'inline'
    },
    ul: {
        display: 'block',
        margin: 8
    },
    li: {
        display: 'block',
        fontSize: 16,
        margin: 4
    },
    strong: {
        fontWeight: 'bold'
    },
    a: {
        color: '#5b4af7'
    },
    button: {
        fontSize: 14,
        padding: 8,
        backgroundColor: '#007bff',
        color: '#fff',
        border: '1px solid #0056b3',
        display: 'block'
    }
}

export function computeStyle(node: DomNode, parentStyle?: StyleMap): StyleMap {
    const defaultStyle = node.name ? defaultStyles[node.name] || {} : {}

    const inlineStyle = node.attributes?.style ? parseInlineStyle(node.attributes.style) : {}

    // Start with defaults
    let computed = { ...defaultStyle, ...inlineStyle }

    // Apply inheritance from parent for color and font-size
    if (parentStyle) {
        if (!computed.color && parentStyle.color) {
            computed.color = parentStyle.color
        }
        if (!computed.fontSize && parentStyle.fontSize) {
            computed.fontSize = parentStyle.fontSize
        }
        if (!computed.fontFamily && parentStyle.fontFamily) {
            computed.fontFamily = parentStyle.fontFamily
        }
        if (!computed.fontWeight && parentStyle.fontWeight) {
            computed.fontWeight = parentStyle.fontWeight
        }
    }

    return computed
}

function parseInlineStyle(style: string): StyleMap {
    const declarations = style.split(';')
    const result: StyleMap = {}

    for (const declaration of declarations) {
        const [key, value] = declaration.split(':')

        if (!key || !value) continue

        const cleanKey = key.trim()
        const cleanValue = value.trim()

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
        if (cleanKey === 'width') result.width = cleanValue.includes('%') ? cleanValue : parseInt(cleanValue)
        if (cleanKey === 'height') result.height = parseInt(cleanValue)
        if (cleanKey === 'flex-direction') result.flexDirection = cleanValue
        if (cleanKey === 'justify-content') result.justifyContent = cleanValue
        if (cleanKey === 'align-items') result.alignItems = cleanValue
        if (cleanKey === 'gap') result.gap = parseInt(cleanValue)
    }

    return result
}