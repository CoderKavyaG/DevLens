import { useState, useRef, useEffect } from 'react'
import { tokenize } from '../engine/tokenizer'
import { buildDom } from '../engine/domBuilder'
import { layout } from '../engine/layoutEngine'
import { paint } from '../engine/painter'
import { getSteps, resetSteps, Step } from '../engine/stepEmitter'
import { DomNode } from '../engine/domBuilder'
import { LayoutBox } from '../engine/layoutEngine'

export default function Visualizer() {
    const [html, setHtml] = useState('<div><h1>Hello</h1><p>World</p></div>')
    const [steps, setSteps] = useState<Step[]>([])
    const [currentStep, setCurrentStep] = useState(0)
    const [tokens, setTokens] = useState<any[]>([])
    const [dom, setDom] = useState<DomNode | null>(null)
    const [layoutTree, setLayoutTree] = useState<LayoutBox | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    function run() {
        resetSteps()
        
        const tokenized = tokenize(html)
        const builtDom = buildDom(tokenized)
        if (!builtDom) return
        const layouted = layout(builtDom, 600)

        // Store for re-rendering on step change
        setTokens(tokenized)
        setDom(builtDom)
        setLayoutTree(layouted)
        setSteps(getSteps())
        setCurrentStep(0)
    }

    // Re-render canvas whenever step changes
    useEffect(() => {
        if (!layoutTree || !canvasRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Clear canvas
        ctx.clearRect(0, 0, 600, 400)
        ctx.fillStyle = '#f9fafb'
        ctx.fillRect(0, 0, 600, 400)

        // Only paint if we're in painting phase
        const currentPhaseType = steps[currentStep]?.type
        if (currentPhaseType === 'painting') {
            // Count how many painting steps have occurred up to current
            let paintCount = 0
            for (let i = 0; i <= currentStep; i++) {
                if (steps[i].type === 'painting') paintCount++
            }
            
            // Paint only boxes up to this count
            paintProgressively(layoutTree, ctx, paintCount)
        }
    }, [currentStep, layoutTree, steps])

    // Paint boxes one by one based on count
    function paintProgressively(box: LayoutBox, ctx: CanvasRenderingContext2D, maxBoxes: number, count = { value: 0 }): void {
        if (count.value >= maxBoxes) return

        // Draw this box
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(box.x, box.y, box.width, box.height)
        ctx.strokeStyle = '#cccccc'
        ctx.strokeRect(box.x, box.y, box.width, box.height)

        // Draw text if present
        const textChild = box.node.children?.find(c => c.type === 'text')
        if (textChild && textChild.value) {
            ctx.fillStyle = '#000000'
            ctx.font = 'normal 16px sans-serif'
            ctx.fillText(textChild.value, box.x + 4, box.y + 16)
        }

        count.value++

        // Paint children
        for (const child of box.children) {
            paintProgressively(child, ctx, maxBoxes, count)
        }
    }

    const step = steps[currentStep]
    const tokenChips = step?.tokens || []

    // Build ASCII DOM tree for visualization
    function renderDomTree(node: DomNode | null, depth = 0, maxDepth = steps[currentStep]?.type === 'building' ? 10 : 2): string {
        if (!node || depth > maxDepth) return ''
        
        const indent = '  '.repeat(depth)
        const tag = node.type === 'text' ? `"${node.value}"` : `<${node.name}>`
        let tree = `${indent}${tag}\n`
        
        if (node.children) {
            for (const child of node.children) {
                tree += renderDomTree(child, depth + 1, maxDepth)
            }
        }
        
        return tree
    }

    return (
        <div style={{ display: 'flex', gap: 24, padding: 24, fontFamily: 'sans-serif' }}>
            
            {/* left panel - editor + controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 380 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#666' }}>write your html</div>
                <textarea
                    value={html}
                    onChange={e => setHtml(e.target.value)}
                    style={{ width: '100%', height: 140, fontFamily: 'monospace', fontSize: 13, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                />
                <button
                    onClick={run}
                    style={{ padding: '8px 16px', background: '#5b4af7', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                >
                    run engine
                </button>

                {/* step controls */}
                {steps.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
                        <div style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>step {currentStep + 1} of {steps.length}</div>
                        
                        {/* message */}
                        <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 6, padding: 10, fontSize: 12, color: '#5b21b6', lineHeight: 1.4 }}>
                            {step?.message}
                        </div>

                        {/* phase badge */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{
                                display: 'inline-block',
                                background: step?.type === 'tokenizing' ? '#dbeafe' : 
                                           step?.type === 'building' ? '#dcfce7' :
                                           step?.type === 'layouting' ? '#fef3c7' : '#fecaca',
                                color: step?.type === 'tokenizing' ? '#1e40af' :
                                       step?.type === 'building' ? '#166534' :
                                       step?.type === 'layouting' ? '#92400e' : '#991b1b',
                                borderRadius: 4,
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 600
                            }}>
                                {step?.type}
                            </div>
                        </div>

                        {/* navigation */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer', fontSize: 12 }}>← back</button>
                            <button onClick={() => setCurrentStep(s => Math.min(steps.length - 1, s + 1))} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer', fontSize: 12 }}>next →</button>
                        </div>

                        {/* color-coded token chips */}
                        {tokenChips.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>tokens so far</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {tokenChips.map((t, i) => {
                                        const bgColor = t.type === 'openTag' ? '#dcfce7' :
                                                       t.type === 'closeTag' ? '#fee2e2' : '#dbeafe'
                                        const textColor = t.type === 'openTag' ? '#166534' :
                                                         t.type === 'closeTag' ? '#991b1b' : '#1e40af'
                                        const label = t.type === 'text' ? `"${t.value}"` : `<${t.name}>`
                                        return (
                                            <div key={i} style={{
                                                background: bgColor,
                                                color: textColor,
                                                borderRadius: 4,
                                                padding: '4px 8px',
                                                fontSize: 11,
                                                fontWeight: 500,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {label}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* DOM tree visualization */}
                        {dom && step?.type && ['building', 'layouting', 'painting'].includes(step.type) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>dom tree</div>
                                <div style={{
                                    background: '#f9fafb',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 4,
                                    padding: 8,
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    maxHeight: 200,
                                    overflowY: 'auto',
                                    color: '#374151'
                                }}>
                                    {renderDomTree(dom)}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* right panel - canvas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#666' }}>rendered output</div>
                <canvas
                    ref={canvasRef}
                    width={600}
                    height={400}
                    style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}
                />
            </div>
        </div>
    )
}