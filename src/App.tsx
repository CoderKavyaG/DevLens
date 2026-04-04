import { tokenize } from './engine/tokenizer'
import { buildDom } from './engine/domBuilder'
import { computeStyle } from './engine/styleEngine'

function App() {
  const html = '<h1 style="color:red">Hello</h1>'
  const tokens = tokenize(html)
  const dom = buildDom(tokens)
  if (dom) console.log(computeStyle(dom))
  return <div>open console</div>
}

export default App