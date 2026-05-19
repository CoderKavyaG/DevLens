import { useState, useRef, useEffect } from 'react'
import { tokenize } from '../engine/tokenizer'
import { buildDom } from '../engine/domBuilder'
import { layout } from '../engine/layoutEngine'
import { paint } from '../engine/painter'
import { getSteps, resetSteps, Step } from '../engine/stepEmitter'
import { DomNode } from '../engine/domBuilder'
import { LayoutBox } from '../engine/layoutEngine'

const EXAMPLES = {
    'Basic heading': '<h1>Hello World</h1>\n<p>Welcome to DevLens</p>',
    'Glass Card': '<div style="background-color:rgba(0,0,0,0.05);padding:24;border:1px solid #111111">\n  <h1 style="color:#111111">Blueprint Card</h1>\n  <p style="color:#555555">This is a clean wireframe card layout.</p>\n</div>',
    'Hero Section': '<div style="padding:40;background-color:#111111;color:white">\n  <h1 style="font-size:48">Modern Web</h1>\n  <p>Minimalist layout design system.</p>\n</div>',
    'Flex Layout': '<div style="display:flex;flex-direction:row;gap:20;padding:20">\n  <div style="background-color:#f0efed;padding:20;width:30%;border:1px solid #111111">A</div>\n  <div style="background-color:#e8e7e4;padding:20;width:30%;border:1px solid #111111">B</div>\n  <div style="background-color:#ffffff;padding:20;width:30%;border:1px solid #111111">C</div>\n</div>',
    'Styled Text': '<h1 style="color:#111111;font-size:42;font-weight:bold">DevLens</h1>\n<p style="color:#555555;font-size:18">Watch how browser engines run.</p>'
}

type Phase = 'idle' | 'tokenizing' | 'building' | 'layouting' | 'painting' | 'done'

export default function Visualizer() {
    const [html, setHtml] = useState(EXAMPLES['Basic heading'])
    const [steps, setSteps] = useState<Step[]>([])
    const [currentStep, setCurrentStep] = useState(0)
    const [dom, setDom] = useState<DomNode | null>(null)
    const [layoutTree, setLayoutTree] = useState<LayoutBox | null>(null)
    const [isAutoplay, setIsAutoplay] = useState(false)
    const [autoplaySpeed] = useState(400)
    const [phase, setPhase] = useState<Phase>('idle')
    const [showCopyFeedback, setShowCopyFeedback] = useState(false)
    const [showOnboarding, setShowOnboarding] = useState(true)
    const [hoveredBox, setHoveredBox] = useState<LayoutBox | null>(null)
    const [selectedBox, setSelectedBox] = useState<LayoutBox | null>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Load from URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const urlHtml = params.get('html')
        if (urlHtml) {
            try {
                const decoded = atob(urlHtml)
                setHtml(decoded)
            } catch (e) {
                console.error('Failed to decode HTML from URL')
            }
        }
    }, [])

    // Autoplay logic
    useEffect(() => {
        if (!isAutoplay || steps.length === 0) return
        const timeout = setTimeout(() => {
            if (currentStep < steps.length - 1) {
                setCurrentStep(s => s + 1)
            } else {
                setIsAutoplay(false)
            }
        }, autoplaySpeed)
        return () => clearTimeout(timeout)
    }, [isAutoplay, currentStep, steps.length, autoplaySpeed])

    // Update phase based on current step
    useEffect(() => {
        if (steps.length === 0) {
            setPhase('idle')
            return
        }
        const currentStepObj = steps[currentStep]
        if (currentStepObj) {
            setPhase(currentStepObj.type as Phase)
        }
        if (currentStep === steps.length - 1) {
            setPhase('done')
        }
    }, [currentStep, steps])

    function run() {
        resetSteps()
        setPhase('tokenizing')
        
        try {
            // 1. Tokenize (Collects steps)
            const tokenized = tokenize(html, false)
            
            // 2. Build DOM (Collects steps)
            const builtDom = buildDom(tokenized, false)
            if (!builtDom) {
                setSteps([...getSteps()])
                setPhase('done')
                return
            }

            // 3. Layout (Collects steps)
            const layouted = layout(builtDom, 600, 0, 0, undefined, false)
            
            // 4. Paint (Collects steps)
            const dummyCanvas = document.createElement('canvas')
            const dummyCtx = dummyCanvas.getContext('2d')
            if (dummyCtx) {
                paint(layouted, dummyCtx, false)
            }

            setDom(builtDom)
            setLayoutTree(layouted)
            
            const collectedSteps = [...getSteps()]
            setSteps(collectedSteps)
            setCurrentStep(0)
        } catch (e) {
            console.error('Engine error:', e)
            setSteps([...getSteps()])
        }
    }

    function handleReset() {
        setSteps([])
        setCurrentStep(0)
        setPhase('idle')
        setIsAutoplay(false)
        setSelectedBox(null)
        setHoveredBox(null)
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d')
            if (ctx) {
                ctx.clearRect(0, 0, 600, 400)
            }
        }
    }

    function copyLink() {
        const encoded = btoa(html)
        const url = `${window.location.origin}${window.location.pathname}?html=${encoded}`
        navigator.clipboard.writeText(url)
        setShowCopyFeedback(true)
        setTimeout(() => setShowCopyFeedback(false), 2000)
    }

    // Canvas Rendering
    useEffect(() => {
        if (!canvasRef.current || !layoutTree) return
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.clearRect(0, 0, 600, 400)

        const currentStepObj = steps[currentStep]
        if (!currentStepObj) return

        if (currentStepObj.type === 'painting') {
            let paintCount = 0
            for (let i = 0; i <= currentStep; i++) {
                if (steps[i].type === 'painting') paintCount++
            }
            paintProgressive(layoutTree, ctx, paintCount)
        } else if (currentStep === steps.length - 1) {
            paintProgressive(layoutTree, ctx, Infinity)
        }

        // DRAW HIGHLIGHTS (Black & White Sketch style)
        if (hoveredBox) {
            ctx.strokeStyle = '#111111'
            ctx.lineWidth = 1.5
            ctx.setLineDash([4, 4])
            ctx.strokeRect(hoveredBox.x, hoveredBox.y, hoveredBox.width, hoveredBox.height)
            ctx.setLineDash([])
            
            ctx.fillStyle = '#111111'
            const label = `<${hoveredBox.node.name || 'text'}>`
            const textWidth = ctx.measureText(label).width
            ctx.fillRect(hoveredBox.x, hoveredBox.y - 18, textWidth + 8, 18)
            ctx.fillStyle = '#ffffff'
            ctx.font = 'normal 10px monospace'
            ctx.fillText(label, hoveredBox.x + 4, hoveredBox.y - 5)
        }

        if (selectedBox) {
            ctx.strokeStyle = '#111111'
            ctx.lineWidth = 2.5
            ctx.strokeRect(selectedBox.x, selectedBox.y, selectedBox.width, selectedBox.height)
            
            const p = selectedBox.paddingTop || 0
            if (p > 0) {
                ctx.fillStyle = 'rgba(17, 17, 17, 0.08)'
                ctx.fillRect(selectedBox.x, selectedBox.y, selectedBox.width, p)
                ctx.fillRect(selectedBox.x, selectedBox.y + selectedBox.height - p, selectedBox.width, p)
                ctx.fillRect(selectedBox.x, selectedBox.y + p, p, selectedBox.height - p * 2)
                ctx.fillRect(selectedBox.x + selectedBox.width - p, selectedBox.y + p, p, selectedBox.height - p * 2)
            }
        }
    }, [currentStep, layoutTree, steps, phase, hoveredBox, selectedBox])

    function findBoxAt(box: LayoutBox, x: number, y: number): LayoutBox | null {
        for (const child of box.children) {
            const found = findBoxAt(child, x, y)
            if (found) return found
        }
        if (x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height) {
            return box
        }
        return null
    }

    function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
        if (!layoutTree || !canvasRef.current) return
        const rect = canvasRef.current.getBoundingClientRect()
        
        // Map mouse coordinates to canvas internal 600x400 space
        const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width)
        const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height)
        
        const found = findBoxAt(layoutTree, x, y)
        setHoveredBox(found)
    }

    function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
        if (!layoutTree || !canvasRef.current) return
        const rect = canvasRef.current.getBoundingClientRect()
        const x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width)
        const y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height)
        
        const found = findBoxAt(layoutTree, x, y)
        setSelectedBox(found)
    }

    function paintProgressive(box: LayoutBox, ctx: CanvasRenderingContext2D, max: number, state = { count: 0 }) {
        if (state.count >= max) return
        
        paintBox(box, ctx)
        state.count++
        
        for (const child of box.children) {
            paintProgressive(child, ctx, max, state)
        }
    }

    function paintBox(box: LayoutBox, ctx: CanvasRenderingContext2D) {
        const style = box.node.attributes?.style ? parseInlineStyle(box.node.attributes.style) : {}
        const padding = box.paddingLeft || 0
        
        ctx.fillStyle = style.backgroundColor || '#ffffff'
        ctx.fillRect(box.x, box.y, box.width, box.height)
        ctx.strokeStyle = '#111111'
        ctx.lineWidth = 1
        ctx.strokeRect(box.x, box.y, box.width, box.height)

        const textChild = box.node.children?.find(c => c.type === 'text')
        if (textChild && textChild.value) {
            ctx.fillStyle = style.color || '#111111'
            ctx.font = '14px monospace'
            ctx.fillText(textChild.value, box.x + 4 + padding, box.y + 20 + padding)
        }
    }

    function parseInlineStyle(style: string): any {
        const res: any = {}
        style.split(';').forEach(s => {
            const [k, v] = s.split(':').map(x => x.trim())
            if (k && v) res[k.replace(/-./g, x => x[1].toUpperCase())] = v
        })
        return res
    }

    function VisualDomNode({ node, depth = 0 }: { node: DomNode, depth?: number }) {
        if (!node || depth > 8) return null
        const isText = node.type === 'text'
        const tag = isText ? `"${node.value?.slice(0, 15)}..."` : `<${node.name}>`
        
        return (
            <div style={{ marginLeft: depth > 0 ? 16 : 0, borderLeft: depth > 0 ? '1px dashed var(--border-mid)' : 'none', paddingLeft: depth > 0 ? 12 : 0, marginTop: 6 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg-inset)', padding: '4px 10px', borderRadius: 2, border: `1px solid var(--border-strong)`, animation: 'fadeIn 0.3s ease-out' }}>
                    <div style={{ width: 6, height: 6, background: 'var(--ink-primary)' }} />
                    <span style={{ fontSize: 11, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>{tag}</span>
                </div>
                {node.children && node.children.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                        {node.children.map((child, i) => <VisualDomNode key={i} node={child} depth={depth + 1} />)}
                    </div>
                )}
            </div>
        )
    }

    const step = steps[currentStep]

    return (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 20, gap: 20 }}>
            
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink-primary)' }}>DEVLENS</h1>
                    <p style={{ color: 'var(--ink-secondary)', fontSize: 13, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Browser Engine Blueprint Visualizer</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                        onClick={() => {
                            if (!canvasRef.current) return
                            const link = document.createElement('a')
                            link.download = 'devlens-blueprint.png'
                            link.href = canvasRef.current.toDataURL()
                            link.click()
                        }} 
                        className="btn"
                    >
                        DOWNLOAD BLUEPRINT
                    </button>
                    <button onClick={copyLink} className="btn" style={{ borderColor: showCopyFeedback ? 'var(--border-strong)' : 'var(--border-strong)' }}>
                        {showCopyFeedback ? 'COPIED' : 'SHARE LINK'}
                    </button>
                    <button onClick={handleReset} className="btn">RESET</button>
                </div>
            </header>

            {/* ONBOARDING BANNER */}
            {showOnboarding && (
                <div className="sketch-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', animation: 'fadeIn 0.3s ease-out' }}>
                    <div>
                        <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-primary)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>Blueprint Overview</h2>
                        <p style={{ color: 'var(--ink-secondary)', fontSize: 13, lineHeight: 1.5, maxWidth: 800 }}>
                            An educational engine visualizer simulating the four core pipeline steps of a rendering engine.
                            Write structural HTML, run the engine, and step through each component visually to observe node builders and canvas paint arrays.
                        </p>
                    </div>
                    <button onClick={() => setShowOnboarding(false)} style={{ background: 'transparent', border: 'none', color: 'var(--ink-primary)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>[CLOSE]</button>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 320px', gap: 20, flex: 1, minHeight: 0 }}>
                
                <div className="sketch-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: 14, borderBottom: '1px solid var(--border-strong)' }}>
                        <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Examples</h3>
                    </div>
                    <div style={{ padding: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {Object.entries(EXAMPLES).map(([name, code]) => (
                                <button 
                                    key={name} 
                                    onClick={() => { setHtml(code); handleReset() }}
                                    style={{ padding: '6px 8px', fontSize: 11, background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', color: 'var(--ink-primary)', borderRadius: 2, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-mono)' }}
                                >
                                    {name.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--border-strong)' }}>
                        <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>HTML Editor</h3>
                        <textarea 
                            value={html}
                            onChange={e => setHtml(e.target.value)}
                            spellCheck={false}
                            style={{ flex: 1, width: '100%', background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', padding: 10, borderRadius: 2, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)', fontSize: 12, resize: 'none', outline: 'none', lineHeight: 1.6 }}
                        />
                        <div style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', borderRadius: 2, padding: 12, fontSize: 11, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
                            <strong style={{ display: 'block', marginBottom: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>SAFE ZONE</strong>
                            Supports divs, headings, spans, and clean styles (margins, padding, basic backgrounds). Complex properties will fall back cleanly.
                        </div>
                        <button 
                            onClick={run} 
                            className="btn btn-primary"
                        >
                            RUN ENGINE
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="sketch-panel" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {(['tokenizing', 'building', 'layouting', 'painting'] as Phase[]).map(p => (
                                <div key={p} style={{ width: 8, height: 8, border: '1px solid var(--border-strong)', background: phase === p || (phase === 'done' && steps.length > 0) ? '#111111' : 'transparent' }} />
                            ))}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)', textTransform: 'uppercase' }}>
                            {phase === 'idle' ? 'Ready' : `Phase: ${phase}`}
                        </span>
                        {steps.length > 0 && (
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} className="btn" style={{ padding: '2px 8px', fontSize: 10 }}>PREV</button>
                                    <button onClick={() => setIsAutoplay(!isAutoplay)} className="btn" style={{ padding: '2px 8px', fontSize: 10 }}>{isAutoplay ? 'PAUSE' : 'PLAY'}</button>
                                    <button onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))} className="btn" style={{ padding: '2px 8px', fontSize: 10 }}>NEXT</button>
                                </div>
                                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)' }}>{currentStep + 1} / {steps.length}</span>
                            </div>
                        )}
                    </div>

                    <div className="sketch-panel canvas-bg" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                        <canvas 
                            ref={canvasRef} 
                            width={600} 
                            height={400} 
                            style={{ maxWidth: '100%', maxHeight: '100%', border: '1px solid var(--border-strong)', cursor: hoveredBox ? 'crosshair' : 'default' }} 
                            onMouseMove={handleMouseMove}
                            onMouseLeave={() => setHoveredBox(null)}
                            onClick={handleCanvasClick}
                        />
                        {phase === 'idle' && (
                            <div style={{ position: 'absolute', color: 'var(--ink-tertiary)', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                                Output array ready
                            </div>
                        )}
                    </div>
                </div>

                <div className="sketch-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: 14, borderBottom: '1px solid var(--border-strong)' }}>
                        <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Engine Log</h3>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {step ? (
                            <div className="animate-in">
                                <div style={{ background: 'var(--bg-inset)', padding: 12, borderRadius: 2, borderLeft: `3px solid var(--border-strong)`, marginBottom: 16 }}>
                                    <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ink-primary)' }}>{step.message}</p>
                                </div>

                                {step.tokens && (
                                    <div style={{ marginBottom: 16 }}>
                                        <p style={{ fontSize: 10, color: 'var(--ink-secondary)', marginBottom: 8, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>EMITTED TOKENS</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {step.tokens.map((t, i) => (
                                                <span key={i} style={{ fontSize: 10, background: 'var(--bg-muted)', border: '1px solid var(--border-mid)', padding: '2px 6px', borderRadius: 2, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>
                                                    {t.type === 'text' ? `"${t.value?.slice(0, 8)}..."` : `<${t.name}>`}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(step.dom || dom) && (
                                    <div style={{ marginTop: 20 }}>
                                        <p style={{ fontSize: 10, color: 'var(--ink-secondary)', marginBottom: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>VISUAL DOM TREE</p>
                                        <div style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-strong)', padding: 16, borderRadius: 2, overflowX: 'auto' }}>
                                            <VisualDomNode node={(step.dom || dom)!} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-tertiary)', textAlign: 'center', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                                NO ACTIVE PIPELINE RUN
                            </div>
                        )}
                    </div>

                    {/* INSPECTOR PANEL */}
                    {selectedBox && (
                        <div style={{ 
                            padding: 20, 
                            borderTop: '1px solid var(--border-strong)', 
                            background: 'var(--bg-inset)', 
                            animation: 'fadeIn 0.2s ease-out',
                            position: 'relative',
                            zIndex: 10
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 8, height: 8, background: 'var(--ink-primary)' }} />
                                    <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-primary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Inspector</h3>
                                </div>
                                <button onClick={() => setSelectedBox(null)} style={{ background: 'transparent', border: 'none', color: 'var(--ink-primary)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11 }}>[X]</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                                <div>
                                    <p style={{ color: 'var(--ink-secondary)', marginBottom: 2 }}>TAG</p>
                                    <p style={{ fontWeight: 700, color: 'var(--ink-primary)' }}>&lt;{selectedBox.node.name || 'text'}&gt;</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--ink-secondary)', marginBottom: 2 }}>SIZE</p>
                                    <p style={{ fontWeight: 700 }}>{Math.round(selectedBox.width)} x {Math.round(selectedBox.height)}</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--ink-secondary)', marginBottom: 2 }}>POSITION</p>
                                    <p style={{ color: 'var(--ink-primary)' }}>X: {Math.round(selectedBox.x)}, Y: {Math.round(selectedBox.y)}</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--ink-secondary)', marginBottom: 2 }}>SPACING</p>
                                    <p style={{ color: 'var(--ink-primary)' }}>P: {selectedBox.paddingTop}px, M: {selectedBox.marginTop}px</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* JARGON BUSTER GLOSSARY */}
                    <div style={{ padding: 14, borderTop: '1px solid var(--border-strong)', background: 'var(--bg-inset)' }}>
                        <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-primary)', marginBottom: 10, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Glossary</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                            <div>
                                <span style={{ fontWeight: 700, color: 'var(--ink-primary)' }}>TOKENIZING</span>
                                <p style={{ color: 'var(--ink-secondary)', marginTop: 2, lineHeight: 1.4 }}>Reading source markup and parsing text characters into structural blocks.</p>
                            </div>
                            <div>
                                <span style={{ fontWeight: 700, color: 'var(--ink-primary)' }}>BUILDING</span>
                                <p style={{ color: 'var(--ink-secondary)', marginTop: 2, lineHeight: 1.4 }}>Arranging tokens into tree-based node objects linking parent to child.</p>
                            </div>
                            <div>
                                <span style={{ fontWeight: 700, color: 'var(--ink-primary)' }}>LAYOUTING</span>
                                <p style={{ color: 'var(--ink-secondary)', marginTop: 2, lineHeight: 1.4 }}>Computing layout bounds, coordinates, line spacing, and positioning grids.</p>
                            </div>
                            <div>
                                <span style={{ fontWeight: 700, color: 'var(--ink-primary)' }}>PAINTING</span>
                                <p style={{ color: 'var(--ink-secondary)', marginTop: 2, lineHeight: 1.4 }}>Filling bounds with styled strokes, solid backgrounds, and text layers.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <footer style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', fontSize: 10, color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                <span>DEV_LENS ENGINE v1.0.6 // STATUS: {phase.toUpperCase()}</span>
                <span>BUILD_DATE: 2026-05-19</span>
            </footer>
        </div>
    )
}