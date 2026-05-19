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
    'Glass Card': '<div style="background-color:rgba(255,255,255,0.1);padding:24;border:1px solid rgba(255,255,255,0.2)">\n  <h1 style="color:white">Glassmorphism</h1>\n  <p style="color:#94a3b8">This is a glass card effect.</p>\n</div>',
    'Hero Section': '<div style="padding:40;background-color:#6366f1;color:white">\n  <h1 style="font-size:48">Modern Web</h1>\n  <p>Building the future of the internet.</p>\n</div>',
    'Flex Layout': '<div style="display:flex;flex-direction:row;gap:20;padding:20">\n  <div style="background-color:#ef4444;padding:20;width:30%">A</div>\n  <div style="background-color:#10b981;padding:20;width:30%">B</div>\n  <div style="background-color:#3b82f6;padding:20;width:30%">C</div>\n</div>',
    'Styled Text': '<h1 style="color:#8b5cf6;font-size:42;font-weight:bold">DevLens</h1>\n<p style="color:#64748b;font-size:18">Watch how browsers work.</p>'
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
            
            // 4. Paint (Collects steps) - we use a dummy context just to record the steps
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

        // DRAW HIGHLIGHTS
        if (hoveredBox) {
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)'
            ctx.lineWidth = 2
            ctx.setLineDash([5, 3])
            ctx.strokeRect(hoveredBox.x, hoveredBox.y, hoveredBox.width, hoveredBox.height)
            ctx.setLineDash([])
            
            ctx.fillStyle = 'rgba(99, 102, 241, 0.9)'
            const label = `<${hoveredBox.node.name || 'text'}>`
            const textWidth = ctx.measureText(label).width
            ctx.fillRect(hoveredBox.x, hoveredBox.y - 20, textWidth + 8, 20)
            ctx.fillStyle = 'white'
            ctx.font = 'bold 10px sans-serif'
            ctx.fillText(label, hoveredBox.x + 4, hoveredBox.y - 6)
        }

        if (selectedBox) {
            ctx.strokeStyle = '#10b981'
            ctx.lineWidth = 3
            ctx.strokeRect(selectedBox.x, selectedBox.y, selectedBox.width, selectedBox.height)
            
            const p = selectedBox.paddingTop || 0
            if (p > 0) {
                ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'
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
        // Re-calculate to be sure we click the right thing
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
        ctx.strokeStyle = '#cccccc'
        ctx.lineWidth = 1
        ctx.strokeRect(box.x, box.y, box.width, box.height)

        const textChild = box.node.children?.find(c => c.type === 'text')
        if (textChild && textChild.value) {
            ctx.fillStyle = style.color || '#000000'
            ctx.font = '16px sans-serif'
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
        const color = isText ? 'var(--success)' : 'var(--accent)'
        const tag = isText ? `"${node.value?.slice(0, 15)}..."` : `<${node.name}>`
        
        return (
            <div style={{ marginLeft: depth > 0 ? 16 : 0, borderLeft: depth > 0 ? '1px dashed var(--border)' : 'none', paddingLeft: depth > 0 ? 12 : 0, marginTop: 6 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: 6, border: `1px solid ${color}`, animation: 'fadeIn 0.3s ease-out' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
                    <span style={{ fontSize: 11, color: 'white', fontFamily: 'var(--font-mono)' }}>{tag}</span>
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
    const phaseColors: Record<Phase, string> = {
        idle: '#4b5563',
        tokenizing: '#3b82f6',
        building: '#10b981',
        layouting: '#f59e0b',
        painting: '#ef4444',
        done: '#8b5cf6'
    }

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 20, gap: 20 }}>
            
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>DevLens</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>The Browser Engine Visualizer</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={copyLink} className="glass-panel" style={{ padding: '8px 16px', color: 'white', cursor: 'pointer', transition: 'all 0.2s', borderColor: showCopyFeedback ? 'var(--success)' : 'var(--glass-border)' }}>
                        {showCopyFeedback ? '✓ Copied' : '🔗 Share Link'}
                    </button>
                    <button onClick={handleReset} className="glass-panel" style={{ padding: '8px 16px', color: 'white', cursor: 'pointer' }}>↻ Reset</button>
                </div>
            </header>

            {/* ONBOARDING BANNER */}
            {showOnboarding && (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent-glow)', borderRadius: 8, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', animation: 'fadeIn 0.3s ease-out' }}>
                    <div>
                        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>Welcome to DevLens</h2>
                        <p style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5, maxWidth: 800 }}>
                            Ever wonder how modern browsers turn HTML into beautiful websites? DevLens is an educational engine visualizer. 
                            Write some HTML, and watch step-by-step as our engine reads your code, builds a node tree, and paints it on the screen!
                        </p>
                    </div>
                    <button onClick={() => setShowOnboarding(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 320px', gap: 20, flex: 1, minHeight: 0 }}>
                
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Examples</h3>
                    </div>
                    <div style={{ padding: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {Object.entries(EXAMPLES).map(([name, code]) => (
                                <button 
                                    key={name} 
                                    onClick={() => { setHtml(code); handleReset() }}
                                    style={{ padding: '6px 8px', fontSize: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>HTML Editor</h3>
                        <textarea 
                            value={html}
                            onChange={e => setHtml(e.target.value)}
                            spellCheck={false}
                            style={{ flex: 1, width: '100%', background: 'transparent', border: 'none', color: '#e2e8f0', fontFamily: 'var(--font-mono)', fontSize: 13, resize: 'none', outline: 'none', lineHeight: 1.6 }}
                        />
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 8, padding: 12, fontSize: 11, color: 'var(--warning)', lineHeight: 1.5 }}>
                            <strong style={{ display: 'block', marginBottom: 4 }}>⚠️ Safe Zone for Learning</strong>
                            DevLens supports basic tags (<code>&lt;div&gt;</code>, <code>&lt;h1&gt;</code>, <code>&lt;p&gt;</code>) and simple inline styles (<code>color</code>, <code>background-color</code>, <code>padding</code>, <code>margin</code>, <code>border</code>, <code>display: flex</code>). Complex CSS might not work!
                        </div>
                        <button 
                            onClick={run} 
                            style={{ width: '100%', padding: '14px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                        >
                            RUN ENGINE
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="glass-panel" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {(['tokenizing', 'building', 'layouting', 'painting'] as Phase[]).map(p => (
                                <div key={p} style={{ width: 8, height: 8, borderRadius: '50%', background: phase === p || (phase === 'done' && steps.length > 0) ? phaseColors[p] : 'var(--border)' }} />
                            ))}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            {phase === 'idle' ? 'System Ready' : `Phase: ${phase}`}
                        </span>
                        {steps.length > 0 && (
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>⏮</button>
                                    <button onClick={() => setIsAutoplay(!isAutoplay)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', width: 30 }}>{isAutoplay ? '⏸' : '▶'}</button>
                                    <button onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>⏭</button>
                                </div>
                                <span style={{ fontSize: 12, opacity: 0.5 }}>{currentStep + 1} / {steps.length}</span>
                            </div>
                        )}
                    </div>

                    <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
                        <canvas 
                            ref={canvasRef} 
                            width={600} 
                            height={400} 
                            style={{ maxWidth: '100%', maxHeight: '100%', cursor: hoveredBox ? 'crosshair' : 'default' }} 
                            onMouseMove={handleMouseMove}
                            onMouseLeave={() => setHoveredBox(null)}
                            onClick={handleCanvasClick}
                        />
                        {phase === 'idle' && (
                            <div style={{ position: 'absolute', color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
                                Output will appear here
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Engine Log</h3>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {step ? (
                            <div className="animate-fade-in">
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8, borderLeft: `4px solid ${phaseColors[step.type as Phase]}`, marginBottom: 16 }}>
                                    <p style={{ fontSize: 13, lineHeight: 1.5 }}>{step.message}</p>
                                </div>

                                {step.tokens && (
                                    <div style={{ marginBottom: 16 }}>
                                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700 }}>EMITTED TOKENS</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {step.tokens.map((t, i) => (
                                                <span key={i} style={{ fontSize: 10, background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, color: t.type === 'text' ? 'var(--success)' : 'var(--accent)' }}>
                                                    {t.type === 'text' ? `"${t.value?.slice(0, 8)}..."` : `<${t.name}>`}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(step.dom || dom) && (
                                    <div style={{ marginTop: 24 }}>
                                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 700 }}>VISUAL DOM TREE</p>
                                        <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 8, overflowX: 'auto' }}>
                                            <VisualDomNode node={(step.dom || dom)!} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, textAlign: 'center', fontSize: 12 }}>
                                No engine data<br/>available yet
                            </div>
                        )}
                    </div>

                    {/* INSPECTOR PANEL */}
                    {selectedBox && (
                        <div style={{ 
                            padding: 20, 
                            borderTop: '2px solid var(--success)', 
                            background: 'var(--bg-tertiary)', 
                            animation: 'fadeIn 0.2s ease-out',
                            position: 'relative',
                            zIndex: 10
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success)' }} />
                                    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inspector</h3>
                                </div>
                                <button onClick={() => setSelectedBox(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', width: 24, height: 24, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>TAG</p>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>&lt;{selectedBox.node.name || 'text'}&gt;</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>SIZE</p>
                                    <p style={{ fontSize: 14, fontWeight: 700 }}>{Math.round(selectedBox.width)} × {Math.round(selectedBox.height)}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>POSITION</p>
                                    <p style={{ fontSize: 12, color: 'white' }}>X: {Math.round(selectedBox.x)}, Y: {Math.round(selectedBox.y)}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>SPACING</p>
                                    <p style={{ fontSize: 12, color: 'white' }}>P: {selectedBox.paddingTop}px, M: {selectedBox.marginTop}px</p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* JARGON BUSTER GLOSSARY */}
                    <div style={{ padding: 14, borderTop: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
                        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Jargon Buster</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>TOKENIZING</span>
                                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>Reading code and splitting it into tiny pieces (tokens) like words in a sentence.</p>
                            </div>
                            <div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)' }}>BUILDING</span>
                                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>Taking tokens to build a family tree. Each HTML tag becomes a "Node" (branch).</p>
                            </div>
                            <div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)' }}>LAYOUTING</span>
                                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>Browser does math to figure out how wide, tall, and where every box goes.</p>
                            </div>
                            <div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--error)' }}>PAINTING</span>
                                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>Filling the boxes with background colors, borders, and text.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <footer style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                <span>DEV_LENS ENGINE v1.0.5 // STATUS: {phase.toUpperCase()}</span>
                <span>BUILD_DATE: 2026-04-25</span>
            </footer>
        </div>
    )
}