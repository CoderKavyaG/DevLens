import { LayoutBox } from "./layoutEngine";
import { computeStyle } from "./styleEngine";
import { addStep } from "./stepEmitter"

export function paint(box: LayoutBox , ctx: CanvasRenderingContext2D, silent: boolean = false): void {

    const style = computeStyle(box.node);
    const padding = box.paddingLeft || 0
    const margin = box.marginLeft || 0

    // Draw margin (light gray background)
    if (margin > 0) {
        ctx.fillStyle = '#e5e7eb'
        ctx.fillRect(box.x - margin, box.y - margin, box.width + margin * 2, box.height + margin * 2)
    }

    // Draw padding area and background
    ctx.fillStyle = style.backgroundColor || '#ffffff'
    ctx.fillRect(box.x, box.y, box.width, box.height)

    // Draw border
    if (style.border) {
        ctx.strokeStyle = '#cccccc'
        ctx.lineWidth = 1
        ctx.strokeRect(box.x + padding, box.y + padding, box.width - padding * 2, box.height - padding * 2)
    } else {
        // Default border
        ctx.strokeStyle = '#cccccc'
        ctx.lineWidth = 1
        ctx.strokeRect(box.x, box.y, box.width, box.height)
    }

    // Paint text if present
    const textChild = box.node.children?.find(c => c.type === 'text')
    if (textChild && textChild.value) {
        const textStyle = computeStyle(textChild, style)
        ctx.fillStyle = textStyle.color || style.color || '#000000'
        ctx.font = `${textStyle.fontWeight || 'normal'} ${textStyle.fontSize || 16}px ${textStyle.fontFamily || 'sans-serif'}`
        const textX = box.x + padding + 4
        const textY = box.y + padding + (textStyle.fontSize || 16)
        ctx.fillText(textChild.value, textX, textY)
    }

    // Record step for this box paint
    if (!silent) {
        addStep({
            type: 'painting',
            message: `Painted box: <${box.node.name || 'text'}> at (${box.x}, ${box.y}) size ${box.width}x${box.height} padding=${padding}`,
            dom: box.node
        })
    }

    // Paint children
    for (const child of box.children) {
        paint(child, ctx, silent)
    }
}