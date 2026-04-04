import { DomNode } from "./domBuilder"

export type LayoutBox = {
    x: number
    y: number
    width: number
    height: number
    node: DomNode
    children: LayoutBox[]
}

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
            box.height += 20
            currentY += 20 
        }else{
            const childBox = layout(child, width , x , currentY)
            box.children.push(childBox)
            box.height += childBox.height
            currentY += childBox.height
        }

        // Each child knows its y position because currentY told it where the previous sibling ended.
    }

    return box;
}