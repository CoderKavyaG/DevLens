import { tokenize } from './engine/tokenizer'
import { buildDom } from './engine/domBuilder'

function App() {
  const html = '<div><h1>Hello</h1><p>World</p></div>'
  const tokens = tokenize(html)
  const dom = buildDom(tokens)
  console.log(JSON.stringify(dom, null, 2))
  return <div>open console</div>
}

export default App