import { useState, useRef, useEffect } from 'react'
import { tokenize } from '../engine/tokenizer'
import { buildDom } from '../engine/domBuilder'
import { layout } from '../engine/layoutEngine'
import { paint } from '../engine/painter'
import { getSteps, resetSteps, Step } from '../engine/stepEmitter'
import { DomNode } from '../engine/domBuilder'
import { LayoutBox } from '../engine/layoutEngine'

const EXAMPLES = {
    'Basic heading': '<h1>Hello World</h1><p>Welcome to DevLens</p>',
    'Colored boxes': '<div style="background-color:#5b4af7;color:white;padding:20">Purple Box</div>',
    'Nested layout': '<div style="padding:20"><h1>Title</h1><p>Paragraph inside a div</p></div>',
    'Multiple elements': '<div><h1>One</h1><h1>Two</h1><p>Three</p><p>Four</p></div>',
    'Inline styles': '<h1 style="color:#e74c3c;font-size:40">Red Heading</h1><p style="color:#3498db">Blue paragraph</p>'
}

type Phase = 'idle' | 'tokenizing' | 'building' | 'layouting' | 'painting' | 'done'

export default function Visualizer() {
    const [html, setHtml] = useState(EXAMPLES['Basic heading'])
    const [steps, setSteps] = useState<Step[]>([])
    const [currentStep, setCurrentStep] = useState(0)
    const [dom, setDom] = useState<DomNode | null>(null)
    const [layoutTree, setLayoutTree] = useState<LayoutBox | null>(null)
    const [darkMode, setDarkMode] = useState(false)
    const [isAutoplay, setIsAutoplay] = useState(false)
    const [autoplaySpeed, setAutoplaySpeed] = useState(600)
    const [phase, setPhase] = useState<Phase>('idle')
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Autoplay effect
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
        
        const tokenized = tokenize(html)
        const builtDom = buildDom(tokenized)
        if (!builtDom) return
        const layouted = layout(builtDom, 600, 0, 0, undefined)

        setDom(builtDom)
        setLayoutTree(layouted)
        setSteps(getSteps())
        setCurrentStep(0)
        setPhase('done')
    }

    function handleReset() {
        setSteps([])
        setCurrentStep(0)
        setPhase('idle')
        setIsAutoplay(false)
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d')
            if (ctx) ctx.fillStyle = darkMode ? '#1a1a1a' : '#f9fafb'
            if (ctx) ctx.fillRect(0, 0, 600, 400)
        }
    }

    function copyLink() {
        const encoded = btoa(html)
        const url = `${window.location.href}?html=${encoded}`
        navigator.clipboard.writeText(url)
        alert('Link copied to clipboard!')
    }

    // Re-render canvas when step changes
    useEffect(() => {
        if (!layoutTree || !canvasRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Clear canvas
        ctx.fillStyle = darkMode ? '#1a1a1a' : '#f9fafb'
        ctx.fillRect(0, 0, 600, 400)

        // Show full render or progressive during painting
        const currentPhaseType = steps[currentStep]?.type
        if (currentPhaseType === 'painting') {
            let paintCount = 0
            for (let i = 0; i <= currentStep; i++) {
                if (steps[i].type === 'painting') paintCount++
            }
            paintProgressively(layoutTree, ctx, paintCount)
        } else if (steps.length > 0) {
            paintFull(layoutTree, ctx)
        }
    }, [currentStep, layoutTree, steps, darkMode])

    function paintProgressively(box: LayoutBox, ctx: CanvasRenderingContext2D, maxBoxes: number, count = { value: 0 }): void {
        if (count.value >= maxBoxes) return

        const padding = box.paddingLeft || 0
        const margin = box.marginLeft || 0

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(box.x, box.y, box.width, box.height)
        ctx.strokeStyle = '#999999'
        ctx.lineWidth = 1
        ctx.strokeRect(box.x, box.y, box.width, box.height)

        const textChild = box.node.children?.find(c => c.type === 'text')
        if (textChild && textChild.value) {
            ctx.fillStyle = '#000000'
            ctx.font = 'normal 16px sans-serif'
            ctx.fillText(textChild.value, box.x + 4 + padding, box.y + 16 + padding)
        }

        count.value++

        for (const child of box.children) {
            paintProgressively(child, ctx, maxBoxes, count)
        }
    }

    function paintFull(box: LayoutBox, ctx: CanvasRenderingContext2D): void {
        const padding = box.paddingLeft || 0
        const margin = box.marginLeft || 0

        if (margin > 0) {
            ctx.fillStyle = '#e5e7eb'
            ctx.fillRect(box.x - margin, box.y - margin, box.width + margin * 2, box.height + margin * 2)
        }

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(box.x, box.y, box.width, box.height)
        ctx.strokeStyle = '#999999'
        ctx.lineWidth = 1
        ctx.strokeRect(box.x, box.y, box.width, box.height)

        const textChild = box.node.children?.find(c => c.type === 'text')
        if (textChild && textChild.value) {
            ctx.fillStyle = '#000000'
            ctx.font = 'normal 16px sans-serif'
            ctx.fillText(textChild.value, box.x + 4 + padding, box.y + 16 + padding)
        }

        for (const child of box.children) {
            paintFull(child, ctx)
        }
    }

    function renderDomTree(node: DomNode | null, depth = 0): string {
        if (!node || depth > 5) return ''
        
        const indent = '  '.repeat(depth)
        const tag = node.type === 'text' ? `"${node.value?.slice(0, 20)}"` : `<${node.name}>`
        let tree = `${indent}${tag}\n`
        
        if (node.children) {
            for (const child of node.children) {
                tree += renderDomTree(child, depth + 1)
            }
        }
        
        return tree
    }

    const step = steps[currentStep]
    const tokenChips = step?.tokens || []

    const bgColor = darkMode ? '#0f0f0f' : '#ffffff'
    const textColor = darkMode ? '#ffffff' : '#000000'
    const panelBg = darkMode ? '#1a1a1a' : '#f9fafb'
    const borderColor = darkMode ? '#333333' : '#e5e7eb'
    const accentColor = '#5b4af7'

    const phaseColors: Record<Phase, string> = {
        idle: '#6b7280',
        tokenizing: '#3b82f6',
        building: '#10b981',
        layouting: '#f59e0b',
        painting: '#ef4444',
        done: '#8b5cf6'
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: bgColor, color: textColor, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            
            {/* HEADER */}
            <div style={{ borderBottom: `1px solid ${borderColor}`, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: '0 0 4px 0', fontSize: 24, fontWeight: 700 }}>DevLens</h1>
                    <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>watch html become pixels</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        style={{
                            padding: '8px 12px',
                            background: 'transparent',
                            border: `1px solid ${borderColor}`,
                            color: textColor,
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12
                        }}
                    >
                        {darkMode ? '☀️ Light' : '🌙 Dark'}
                    </button>
                    <button
                        onClick={copyLink}
                        style={{
                            padding: '8px 12px',
                            background: 'transparent',
                            border: `1px solid ${borderColor}`,
                            color: textColor,
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12
                        }}
                    >
                        🔗 Share
                    </button>
                    <button
                        onClick={handleReset}
                        style={{
                            padding: '8px 12px',
                            background: 'transparent',
                            border: `1px solid ${borderColor}`,
                            color: textColor,
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12
                        }}
                    >
                        ↻ Reset
                    </button>
                </div>
            </div>

            {/* PHASE TIMELINE */}
            {steps.length > 0 && (
                <div style={{ borderBottom: `1px solid ${borderColor}`, padding: '12px 24px', display: 'flex', gap: 16, alignItems: 'center', fontSize: 12, fontWeight: 500 }}>
                    {(['tokenizing', 'building', 'layouting', 'painting'] as Phase[]).map(p => (
                        <div
                            key={p}
                            style={{
                                padding: '6px 12px',
                                borderRadius: 4,
                                background: phase === p ? phaseColors[p] : phase === 'done' ? phaseColors[p] : '#6b7280',
                                color: '#ffffff',
                                opacity: phase === p || phase === 'done' ? 1 : 0.5,
                                textTransform: 'capitalize'
                            }}
                        >
                            {p}
                        </div>
                    ))}
                    <span style={{ marginLeft: 'auto', opacity: 0.6 }}>
                        {currentStep + 1} / {steps.length} steps
                    </span>
                </div>
            )}

            {/* MAIN CONTENT */}
            <div style={{ display: 'flex', gap: 0, flex: 1, overflow: 'hidden' }}>
                
                {/* LEFT PANEL - EDITOR */}
                <div style={{ flex: '0 0 300px', borderRight: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', padding: 16, overflow: 'auto' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.7 }}>EXAMPLES</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                        {Object.entries(EXAMPLES).map(([name, code]) => (
                            <button
                                key={name}
                                onClick={() => { setHtml(code); handleReset() }}
                                style={{
                                    padding: '8px 12px',
                                    background: 'transparent',
                                    border: `1px solid ${borderColor}`,
                                    color: textColor,
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    textAlign: 'left'
                                }}
                            >
                                {name}
                            </button>
                        ))}
                    </div>

                    <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.7 }}>HTML</label>
                    <textarea
                        value={html}
                        onChange={e => setHtml(e.target.value)}
                        style={{
                            flex: 1,
                            fontFamily: 'monospace',
                            fontSize: 12,
                            padding: 12,
                            borderRadius: 6,
                            border: `1px solid ${borderColor}`,
                            backgroundColor: panelBg,
                            color: textColor,
                            resize: 'none'
                        }}
                    />

                    <button
                        onClick={run}
                        style={{
                            marginTop: 12,
                            padding: '12px',
                            background: accentColor,
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 12
                        }}
                    >
                        ▶ RUN ENGINE
                    </button>
                </div>

                {/* MIDDLE PANEL - DEBUG */}
                <div style={{ flex: '0 0 320px', borderRight: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', padding: 16, overflow: 'auto' }}>
                    
                    {steps.length > 0 ? (
                        <>
                            {/* AUTOPLAY CONTROLS */}
                            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${borderColor}` }}>
                                <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', opacity: 0.7 }}>PLAYBACK</label>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                    <button
                                        onClick={() => setIsAutoplay(!isAutoplay)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            background: isAutoplay ? accentColor : 'transparent',
                                            border: `1px solid ${borderColor}`,
                                            color: isAutoplay ? '#ffffff' : textColor,
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                            fontSize: 12,
                                            fontWeight: 500
                                        }}
                                    >
                                        {isAutoplay ? '⏸ Pause' : '▶ Play'}
                                    </button>
                                    <button
                                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                                        style={{
                                            padding: '8px 12px',
                                            background: 'transparent',
                                            border: `1px solid ${borderColor}`,
                                            color: textColor,
                                            borderRadius: 6,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                                        style={{
                                            padding: '8px 12px',
                                            background: 'transparent',
                                            border: `1px solid ${borderColor}`,
                                            color: textColor,
                                            borderRadius: 6,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Next →
                                    </button>
                                </div>
                                <label style={{ fontSize: 11, opacity: 0.6 }}>
                                    Speed: {autoplaySpeed}ms
                                </label>
                                <input
                                    type="range"
                                    min="200"
                                    max="1500"
                                    value={autoplaySpeed}
                                    onChange={e => setAutoplaySpeed(parseInt(e.target.value))}
                                    style={{ width: '100%', marginTop: 4 }}
                                />
                            </div>

                            {/* MESSAGE */}
                            <div style={{ marginBottom: 12, padding: 12, borderRadius: 6, backgroundColor: panelBg, border: `1px solid ${borderColor}`, fontSize: 12, lineHeight: 1.5, minHeight: 60 }}>
                                {step?.message}
                            </div>

                            {/* TOKEN CHIPS */}
                            {tokenChips.length > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, marginBottom: 6, display: 'block' }}>TOKENS</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {tokenChips.map((t, i) => {
                                            const bgColor = t.type === 'openTag' ? '#8b5cf6' :
                                                           t.type === 'closeTag' ? '#ef4444' : '#10b981'
                                            const label = t.type === 'text' ? `"${t.value?.slice(0, 10)}"` : `<${t.name}>`
                                            return (
                                                <div key={i} style={{
                                                    background: bgColor,
                                                    color: '#ffffff',
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

                            {/* DOM TREE */}
                            {dom && (
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, marginBottom: 6, display: 'block' }}>DOM TREE</label>
                                    <div style={{
                                        background: panelBg,
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: 6,
                                        padding: 8,
                                        fontSize: 11,
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        maxHeight: 200,
                                        overflowY: 'auto'
                                    }}>
                                        {renderDomTree(dom)}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ opacity: 0.5, fontSize: 12, textAlign: 'center', marginTop: 100 }}>
                            Click "RUN ENGINE" to start
                        </div>
                    )}
                </div>

                {/* RIGHT PANEL - CANVAS */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, justifyContent: 'center', alignItems: 'center' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, opacity: 0.7 }}>RENDERED OUTPUT</label>
                    <canvas
                        ref={canvasRef}
                        width={600}
                        height={400}
                        style={{
                            border: `1px solid ${borderColor}`,
                            borderRadius: 8,
                            background: '#ffffff'
                        }}
                    />
                </div>
            </div>

            {/* STATUS BAR */}
            <div style={{ borderTop: `1px solid ${borderColor}`, padding: '8px 24px', fontSize: 11, opacity: 0.6, textAlign: 'right' }}>
                {phase !== 'idle' ? `Status: ${phase.toUpperCase()}` : 'Ready'}
            </div>
        </div>
    )
}
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
        const layouted = layout(builtDom, 600, 0, 0, undefined)

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

        // Clear canvas with light background
        ctx.fillStyle = '#f9fafb'
        ctx.fillRect(0, 0, 600, 400)

        // Show full render by default, or progressive during painting phase
        const currentPhaseType = steps[currentStep]?.type
        if (currentPhaseType === 'painting') {
            // Count how many painting steps up to current
            let paintCount = 0
            for (let i = 0; i <= currentStep; i++) {
                if (steps[i].type === 'painting') paintCount++
            }
            paintProgressively(layoutTree, ctx, paintCount)
        } else if (steps.length > 0) {
            // After painting is done, show full render
            paintFull(layoutTree, ctx)
        }
    }, [currentStep, layoutTree, steps])

    // Paint boxes one by one based on count
    function paintProgressively(box: LayoutBox, ctx: CanvasRenderingContext2D, maxBoxes: number, count = { value: 0 }): void {
        if (count.value >= maxBoxes) return

        // Draw this box with box model
        const padding = box.paddingLeft || 0
        const margin = box.marginLeft || 0

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(box.x, box.y, box.width, box.height)
        ctx.strokeStyle = '#999999'
        ctx.lineWidth = 1
        ctx.strokeRect(box.x, box.y, box.width, box.height)

        // Draw text if present
        const textChild = box.node.children?.find(c => c.type === 'text')
        if (textChild && textChild.value) {
            ctx.fillStyle = '#000000'
            ctx.font = 'normal 16px sans-serif'
            ctx.fillText(textChild.value, box.x + 4 + padding, box.y + 16 + padding)
        }

        count.value++

        // Paint children
        for (const child of box.children) {
            paintProgressively(child, ctx, maxBoxes, count)
        }
    }

    // Paint full tree
    function paintFull(box: LayoutBox, ctx: CanvasRenderingContext2D): void {
        // Draw this box
        const padding = box.paddingLeft || 0
        const margin = box.marginLeft || 0

        if (margin > 0) {
            ctx.fillStyle = '#e5e7eb'
            ctx.fillRect(box.x - margin, box.y - margin, box.width + margin * 2, box.height + margin * 2)
        }

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(box.x, box.y, box.width, box.height)
        ctx.strokeStyle = '#999999'
        ctx.lineWidth = 1
        ctx.strokeRect(box.x, box.y, box.width, box.height)

        // Draw text if present
        const textChild = box.node.children?.find(c => c.type === 'text')
        if (textChild && textChild.value) {
            ctx.fillStyle = '#000000'
            ctx.font = 'normal 16px sans-serif'
            ctx.fillText(textChild.value, box.x + 4 + padding, box.y + 16 + padding)
        }

        // Paint children
        for (const child of box.children) {
            paintFull(child, ctx)
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