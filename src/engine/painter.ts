import { LayoutBox } from "./layoutEngine";
import { computeStyle } from "./styleEngine";
import { addStep } from "./stepEmitter"


// canvasrenderingcontext2d is the built in browser type for canvas drawing
export function paint(box: LayoutBox , ctx: CanvasRenderingContext2D): void {

    const style = computeStyle(box.node);

    // sets background color for the element (default to white if not specified)
    ctx.fillStyle = style.backgroundColor || '#ffffff'
    ctx.fillRect(box.x, box.y , box.width , box.height); // draw the background rectangle 

    ctx.strokeStyle = '#cccccc' // draw a border around the box
    ctx.strokeRect(box.x , box.y , box.width, box.height); // draws just the outline of a rectangle

    // record step for this box paint
    addStep({
        type: 'painting',
        message: `Painted box: <${box.node.name || 'text'}> at (${box.x}, ${box.y}) size ${box.width}x${box.height}`,
        dom: box.node
    })

    // paint text if present
    const textChild = box.node.children?.find(c => c.type === 'text' )
    if ( textChild && textChild.value){
        ctx.fillStyle = style.color || '#000000'
        ctx.font = `${style.fontWeight || 'normal'} ${style.fontSize || '16'}px ${style.fontFamily || 'sans-serif'}`;
        ctx.fillText(textChild.value, box.x + 4, box.y + (style.fontSize || 16));
    }

    for(const child of box.children){
        paint(child, ctx);
    }
}