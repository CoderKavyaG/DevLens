import { tokenize } from './engine/tokenizer'

function App() {
  const html = '<h1 class="title">kavi u did it</h1>'
  const tokens = tokenize(html)
  console.log(tokens)

  return <div>open the console</div>
}

export default App