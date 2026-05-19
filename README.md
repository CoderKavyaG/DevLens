# 🔬 DevLens — Browser Engine Visualizer

> **Watch how a browser turns HTML into a webpage — step by step.**

DevLens is an interactive, educational tool that simulates the four core phases of a real browser rendering engine: **Tokenizing → DOM Building → Layout → Painting**. Write HTML in the editor and watch the engine process it in real time.

[![Live Demo](https://img.shields.io/badge/Live-Demo-6366f1?style=for-the-badge)](https://coderkavyag.github.io/lens)

---

## ✨ Features

- **Step-by-step engine visualization** — Walk through each phase manually or use autoplay
- **Phase indicator** — Colour-coded dots show which engine phase is active (Tokenizing / Building / Layout / Painting)
- **Visual DOM Tree** — See the node tree build up live in the Engine Log panel
- **Canvas painter** — The final render appears progressively on an HTML Canvas
- **Box Inspector** — Click any element on the canvas to inspect its tag, size, position, and spacing
- **Hover highlight** — Mouse over the canvas to see element boundaries outlined
- **Share Link** — Encode your HTML snippet into a URL and share it with anyone
- **Built-in examples** — Quickly load Glass Card, Hero Section, Flex Layout, and more
- **Jargon Buster** — Plain-English glossary for Tokenizing, Building, Layouting, and Painting

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Rendering | HTML5 Canvas (2D API) |
| Styling | Vanilla CSS (dark theme, glassmorphism) |
| Engine | Custom tokenizer, DOM builder, layout engine, and painter (all in `/src/engine`) |

---

## 📁 Project Structure

```
devlens/
├── src/
│   ├── engine/
│   │   ├── tokenizer.ts      # HTML → Token stream
│   │   ├── domBuilder.ts     # Token stream → DOM tree
│   │   ├── layoutEngine.ts   # DOM tree → Layout boxes
│   │   ├── painter.ts        # Layout boxes → Canvas draw calls
│   │   ├── styleEngine.ts    # Inline style parsing + inheritance
│   │   └── stepEmitter.ts    # Step recording for visualization
│   ├── components/
│   │   └── Visualizer.tsx    # Main UI — editor, canvas, log panel
│   ├── index.css             # Design tokens + global styles
│   └── main.tsx              # React entry point
├── index.html
├── vite.config.ts
└── package.json
```

---

## 🚀 Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/CoderKavyaG/lens.git
cd lens

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🏗 Build for Production

```bash
npm run build
```

The output will be in the `dist/` folder — ready to serve as a static site.

---

## 🌐 Deployment

This project is a pure static site (no backend). You can deploy it to:

- **GitHub Pages** — see deployment steps below
- **Vercel** — connect your GitHub repo, it auto-detects Vite
- **Netlify** — drag & drop the `dist/` folder or connect via Git

### Deploy to GitHub Pages

```bash
# Install the gh-pages package
npm install --save-dev gh-pages

# Add these scripts to package.json:
#   "predeploy": "npm run build"
#   "deploy": "gh-pages -d dist"

# Set the base in vite.config.ts:
#   base: '/lens/'

# Deploy
npm run deploy
```

---

## 📝 Engine Limitations (Safe Zone)

DevLens is a **simplified** educational engine. It supports:
- ✅ Basic tags: `<div>`, `<h1>`–`<h6>`, `<p>`, `<span>`
- ✅ Inline styles: `color`, `background-color`, `padding`, `margin`, `border`, `display: flex`, `gap`, `width`, `font-size`
- ❌ CSS classes, external stylesheets, pseudo-selectors
- ❌ JavaScript, forms, images, or complex HTML attributes

---

## 👩‍💻 Author

Built by **Kavya G** — [@CoderKavyaG](https://github.com/CoderKavyaG)

---

## 📄 License

MIT License — feel free to use, fork, and learn from this project.
