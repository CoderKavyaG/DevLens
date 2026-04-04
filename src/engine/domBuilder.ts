export type NodeType = 'element' | 'text'

export type DomNode = {
    type: NodeType
    name?: string
    attributes?: Record<string, string> 
    children?: DomNode[]              
    value? : string
}