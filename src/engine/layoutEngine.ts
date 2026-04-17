import { DomNode } from "./domBuilder"
import { addStep } from "./stepEmitter"
import { computeStyle } from "./styleEngine"

export type LayoutBox = {
    x: number
    y: number
    width: number
    height: number
    node: DomNode
    children: LayoutBox[]
}

// more off the stacking of the block elements fucntion driveen 
export function layout(node: DomNode , width: number , x: number =0, y: number = 0): LayoutBox {

    const box: LayoutBox = {
        x,
        y,
        width,
        height: 0, // starts with 0 because we donot know how tall an element is until we laid out children and we will calculate later based on children 
        node,
        children: [] 
    }

    // curent y tracks how far down the shelf you currently are 
    let currentY = y;
    
    // imagine stacking boxes on a shelf from top to bottom , as we start with pos y=0 , every time we move dowen by however tall box was . 
    for(const child of node.children || []){
        if(child.type === 'text'){
            // calculate text height from style instead of hardcoding to 20px
            const style = computeStyle(child)
            const textHeight = (style.fontSize || 16) + 8 // fontSize + padding
            box.height += textHeight
            currentY += textHeight
            
            // record step
            addStep({
                type: 'layouting',
                message: `Text layout: height=${textHeight}px at y=${currentY - textHeight}`,
                dom: node
            })
        }else{
            const childBox = layout(child, width , x , currentY)
            box.children.push(childBox)
            box.height += childBox.height
            currentY += childBox.height
            
            // record step
            addStep({
                type: 'layouting',
                message: `Element layout: <${child.name}> box=${childBox.width}x${childBox.height}px at y=${childBox.y}`,
                dom: node
            })
        }

        // Each child knows its y position because currentY told it where the previous sibling ended.
    }

    return box;
}