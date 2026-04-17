import { Token } from "./tokenizer"
import { addStep } from "./stepEmitter"

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
                if(parent.children) parent.children.push(node)
            }
            // if not empty , set this node as child of top node
            // push this to the stack 
            stack.push(node);

            //recrod the step 
            addStep({
                type:'building',
                message: `eLEMENT NODE CREATED: <${token.name}>`,
                dom: root
            })

        }
        else if(token.type === 'text'){
            const textNode: DomNode = {
                type:'text',
                value: token.value
            }
            addStep({
                type:'building',
                message: `TEXT NODE CREATED: "${token.value}"`,
                dom: root
            })

            const parent = stack[stack.length -1]
            if(parent.children) parent.children.push(textNode)

        }else if(token.type === 'closeTag'){
            stack.pop()


            addStep({
                type: 'building',
                message: `CLOSE TAG ENCOUNTERED: </${token.name}>`,
                dom: root
            })
        }
    }

    return root
}