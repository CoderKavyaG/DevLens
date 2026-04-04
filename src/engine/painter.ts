import { LayoutBox } from "./layoutEngine";
import { computeStyle } from "./styleEngine";


// canvasrenderingcontext2d is the built in browser type for canvas drawing
export function paint(box: LayoutBox , ctx: CanvasRenderingContext2D): void {

    const style = computeStyle(box.node);

    // sets color for the style 
    ctx.fillStyle = style.color || '#ffffff'
    ctx.fillRect(box.x, box.y , box.width , box.height); // draw the background rectangle 

    ctx.strokeStyle = '#cccccc' // draw a border around the box
    ctx.strokeRect(box.x , box.y , box.width, box.height); // draws just the outline of a rectangle

    const textChild = box.node.children?.find(c => c.type === 'text' )
    if ( textChild && textChild.value){
        ctx.fillStyle = '#000000'
        ctx.font = `${style.fontWeight || 'normal'} ${style.fontSize || '16'}px sans-serif`;
        ctx.fillText(textChild.value, box.x + 4, box.y + (style.fontSize || 16));
    }

    for(const child of box.children){
        paint(child, ctx);
    }
}