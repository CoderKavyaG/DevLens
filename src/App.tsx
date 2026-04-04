import { useRef, useEffect } from 'react'
import { tokenize } from './engine/tokenizer'
import { buildDom } from './engine/domBuilder'
import { layout } from './engine/layoutEngine'
import { paint } from './engine/painter'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const html = '<div><h1>Hello</h1><p>World</p></div>'
    const tokens = tokenize(html)
    const dom = buildDom(tokens)
    if (!dom) return
    const layoutTree = layout(dom, 800)
    paint(layoutTree, ctx)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ border: '1px solid black' }}
    />
  )
}

export default App