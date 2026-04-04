import { Token } from "./tokenizer"

export type NodeType = 'element' | 'text'

export type DomNode = {
    type: NodeType
    name?: string
    attributes?: Record<string, string> 
    children?: DomNode[]              
    value? : string
}

export function buildDom(tokens: Token[]) : DomNode | null {

    let root: DomNode | null = null
    const stack: DomNode[] = []

    for(const token of tokens){
        if(token.type === 'openTag'){

            // create a nnew domnode object from token using name
            const node: DomNode = {
                type: 'element',
                name: token.name,
                attributes: token.attributes,
                children: []
            }

            // if the root is still null , assign the first tag 
            if(!root){
                root = node
            }else {
                const parent = stack[stack.length -1]
                parent.children.push(node)
            }
            // if not empty , set this node as child of top node
            // push this to the stack 
            stack.push(node);

        }
        else if(token.type === 'text'){
            const textNode: DomNode = {
                type:'text',
                value: token.value
            }

            const parent = stack[stack.length -1]
            parent.children.push(textNode)

        }else if(token.type === 'closeTag'){
            stack.pop()
        }
    }

    return root
}