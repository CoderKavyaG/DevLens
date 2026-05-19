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

export function buildDom(tokens: Token[], silent: boolean = false) : DomNode | null {
    // Create a single virtual root element that represents the browser viewport
    const root: DomNode = {
        type: 'element',
        name: 'root',
        attributes: { style: 'background-color: #ffffff; padding: 10;' },
        children: []
    }
    const stack: DomNode[] = [root]

    for(const token of tokens){
        if(token.type === 'openTag'){
            const node: DomNode = {
                type: 'element',
                name: token.name,
                attributes: token.attributes,
                children: []
            }

            const parent = stack[stack.length - 1]
            if(parent.children) parent.children.push(node)
            stack.push(node);

            if (!silent) {
                addStep({
                    type:'building',
                    message: `ELEMENT NODE CREATED: <${token.name}>`,
                    dom: JSON.parse(JSON.stringify(root))
                })
            }
        }
        else if(token.type === 'text'){
            const val = token.value || ''
            // Filter out whitespace-only nodes (which break flex gaps and margins)
            if (val.trim() === '') {
                continue
            }

            const textNode: DomNode = {
                type:'text',
                value: val
            }
            
            const parent = stack[stack.length - 1]
            if(parent.children) parent.children.push(textNode)

            if (!silent) {
                addStep({
                    type:'building',
                    message: `TEXT NODE CREATED: "${val}"`,
                    dom: JSON.parse(JSON.stringify(root))
                })
            }
        }else if(token.type === 'closeTag'){
            // Pop stack, but keep the virtual root at the bottom
            if (stack.length > 1) {
                stack.pop()
            }

            if (!silent) {
                addStep({
                    type: 'building',
                    message: `CLOSE TAG ENCOUNTERED: </${token.name}>`,
                    dom: JSON.parse(JSON.stringify(root))
                })
            }
        }
    }

    return root
}