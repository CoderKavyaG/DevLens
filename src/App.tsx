import { tokenize } from './engine/tokenizer'
import { buildDom } from './engine/domBuilder'
import { layout } from './engine/layoutEngine'

function App() {
  const html = '<div><h1>Hello</h1><p>World</p></div>'
  const tokens = tokenize(html)
  const dom = buildDom(tokens)
  if (dom) {
    const layoutTree = layout(dom, 800)
    console.log(JSON.stringify(layoutTree, null, 2))
  }
  return <div>open console</div>
}

export default App