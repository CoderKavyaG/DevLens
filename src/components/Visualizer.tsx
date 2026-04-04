import { useState } from 'react'
import { tokenize } from '../engine/tokenizer'
import { buildDom } from '../engine/domBuilder'
import { layout } from '../engine/layoutEngine'
import { paint } from '../engine/painter'
import { getSteps, resetSteps, Step } from '../engine/stepEmitter'
import { useRef } from 'react'

export default function Visualizer() {
    const [html, setHtml] = useState('<div><h1>Hello</h1><p>World</p></div>')
    const [steps, setSteps] = useState<Step[]>([])
    const [currentStep, setCurrentStep] = useState(0)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    function run() {
        // reset everything
        resetSteps()
        
        // run the full engine
        const tokens = tokenize(html)
        const dom = buildDom(tokens)
        if (!dom) return
        const layoutTree = layout(dom, 600)

        // paint to canvas
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, 600, 400)
        paint(layoutTree, ctx)

        // capture all steps
        setSteps(getSteps())
        setCurrentStep(0)
    }

    const step = steps[currentStep]

    return (
        <div style={{ display: 'flex', gap: 24, padding: 24, fontFamily: 'sans-serif' }}>
            
            {/* left panel - editor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 300 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#666' }}>write your html</div>
                <textarea
                    value={html}
                    onChange={e => setHtml(e.target.value)}
                    style={{ width: '100%', height: 160, fontFamily: 'monospace', fontSize: 13, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                />
                <button
                    onClick={run}
                    style={{ padding: '8px 16px', background: '#5b4af7', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                >
                    run engine
                </button>

                {/* step controls */}
                {steps.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 12, color: '#888' }}>step {currentStep + 1} of {steps.length}</div>
                        
                        {/* tooltip */}
                        <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 6, padding: 10, fontSize: 12, color: '#5b21b6' }}>
                            {step?.message}
                        </div>

                        {/* stage badge */}
                        <div style={{ display: 'inline-block', background: '#e0e7ff', color: '#3730a3', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 500 }}>
                            {step?.type}
                        </div>

                        {/* navigation */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }}>← back</button>
                            <button onClick={() => setCurrentStep(s => Math.min(steps.length - 1, s + 1))} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }}>next →</button>
                        </div>

                        {/* token list */}
                        {step?.tokens && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>tokens so far</div>
                                {step.tokens.map((t, i) => (
                                    <div key={i} style={{ fontFamily: 'monospace', fontSize: 11, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4, padding: '4px 8px' }}>
                                        {t.type} {t.name || t.value}
                                    </div>
                                ))}
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
                    style={{ border: '1px solid #e5e7eb', borderRadius: 8 }}
                />
            </div>
        </div>
    )
}