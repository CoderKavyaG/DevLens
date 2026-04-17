import { DomNode } from "./domBuilder"
import { addStep } from "./stepEmitter"
import { computeStyle } from "./styleEngine"

export type LayoutBox = {
    x: number
    y: number
    width: number
    height: number
    paddingTop?: number
    paddingBottom?: number
    paddingLeft?: number
    paddingRight?: number
    marginTop?: number
    marginBottom?: number
    marginLeft?: number
    marginRight?: number
    contentWidth?: number
    contentHeight?: number
    node: DomNode
    children: LayoutBox[]
}

// more off the stacking of the block elements fucntion driveen 
export function layout(node: DomNode, width: number, x: number = 0, y: number = 0, parentStyle?: any): LayoutBox {
    const style = computeStyle(node, parentStyle)

    // Calculate padding and margin
    const padding = style.padding || 0
    const margin = style.margin || 0

    // Calculate width - handle percentage
    let boxWidth = width
    if (style.width) {
        if (typeof style.width === 'string' && style.width.includes('%')) {
            const percent = parseInt(style.width)
            boxWidth = (width * percent) / 100
        } else if (typeof style.width === 'number') {
            boxWidth = style.width
        }
    }

    const contentWidth = boxWidth - padding * 2
    let contentHeight = 0

    const box: LayoutBox = {
        x: x + margin,
        y: y + margin,
        width: boxWidth,
        height: 0,
        paddingTop: padding,
        paddingBottom: padding,
        paddingLeft: padding,
        paddingRight: padding,
        marginTop: margin,
        marginBottom: margin,
        marginLeft: margin,
        marginRight: margin,
        contentWidth,
        node,
        children: []
    }

    let currentY = padding
    let maxX = 0

    // Handle flexbox
    const isFlex = style.display === 'flex'
    const flexDirection = style.flexDirection || 'column'
    const gap = style.gap || 0

    if (isFlex && flexDirection === 'row') {
        // Flex row: arrange children horizontally
        let currentX = padding
        const childCount = (node.children || []).filter(c => c.type !== 'text').length || 1
        const childWidth = contentWidth / childCount
        
        for (const child of node.children || []) {
            if (child.type === 'text') {
                const textStyle = computeStyle(child, style)
                const textHeight = (textStyle.fontSize || 16) + 8
                const childBox = layout(child, childWidth, currentX, padding, style)
                childBox.y = padding
                childBox.height = textHeight
                childBox.width = childWidth
                box.children.push(childBox)
                currentX += childBox.width + gap
                currentY = Math.max(currentY, textHeight + padding)
                maxX = currentX
            } else {
                const childBox = layout(child, childWidth, currentX, padding, style)
                childBox.y = padding
                box.children.push(childBox)
                currentX += childBox.width + gap
                currentY = Math.max(currentY, childBox.height + padding)
                maxX = currentX
            }
        }
        contentHeight = currentY + padding
    } else {
        // Default block layout: stack vertically
        for (const child of node.children || []) {
            if (child.type === 'text') {
                const textStyle = computeStyle(child, style)
                const textHeight = (textStyle.fontSize || 16) + 8
                box.height += textHeight + gap
                currentY += textHeight + gap

                addStep({
                    type: 'layouting',
                    message: `Text layout: height=${textHeight}px, padding=${padding}px at y=${currentY - textHeight}`,
                    dom: node
                })
            } else {
                const childBox = layout(child, contentWidth, padding, currentY, style)
                box.children.push(childBox)
                box.height += childBox.height + gap
                currentY += childBox.height + gap
                maxX = Math.max(maxX, childBox.width + padding)

                addStep({
                    type: 'layouting',
                    message: `Element layout: <${child.name}> box=${childBox.width}x${childBox.height}px, padding=${padding}px`,
                    dom: node
                })
            }
        }
        contentHeight = currentY + padding
    }

    box.height = contentHeight
    box.contentHeight = contentHeight - padding * 2
    box.width = Math.max(boxWidth, maxX)

    return box
}