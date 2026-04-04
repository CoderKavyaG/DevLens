import { addStep } from './stepEmitter'

export type TokenType = 'openTag' | 'closeTag' | 'text';

// <h1 class = "title" > { type: 'openTag' , name: 'h1' , attributes: { class: 'title'}} 
export type Token = {
    type: TokenType
    name?: string
    attributes?: Record<string, string> // key and object for { class : "title" , id: " main" }
    value?: string // this is for text type as they donot have attributes
}

// no other machine in engine needs to know mood of internal stuff 
type State = 'initial' | 'inTag' | 'inText'

// initial - not doing anything ( idle state ) , inTag - currently reading and inText - currently reading text content between tags 

export function tokenize(html: string): Token[] {
    const tokens: Token[] = []
    let state: State = 'initial'
    let buffer = ''
    let i = 0

    while (i < html.length) {
        const char = html[i]
        i++

        if (state === 'initial') {
            if (char === '<') {
                state = 'inTag'
                buffer = ''
            } else {
                state = 'inText'
                buffer = char
            }
        }

        else if (state === 'inText') {
            if (char === '<') {
                tokens.push({ type: 'text', value: buffer })
                // record step only when token is actually emitted
                addStep({
                    type: 'tokenizing',
                    message: `Text token found: "${buffer}"`,
                    tokens: [...tokens]
                })
                state = 'inTag'
                buffer = ''
            } else {
                buffer += char
            }
        }

        else if (state === 'inTag') {
            if (char === '>') {
                const token = parseTag(buffer)
                if (token) {
                    tokens.push(token)
                    // record step only when token is actually emitted
                    addStep({
                        type: 'tokenizing',
                        message: `Tag token found: <${buffer}>`,
                        tokens: [...tokens]
                    })
                }
                buffer = ''
                state = 'initial'
            } else {
                buffer += char
            }
        }
    }

    return tokens
}

// this function takes the raw string stored in buffer and returns
// either a token or null - sorry humse nhi ho payega
function parseTag(raw: string): Token | null {
    raw = raw.trim() // removes any accidental spaces from start and end , just a clean process to be safe

    if (raw.startsWith('/')) {
        return { type: 'closeTag', name: raw.slice(1).trim() }
    } // just for close tag , slice is to remove the / from start and trim is again to remove the spaces created after slicing

    const parts = raw.match(/^(\w+)(.*)$/)
    if (!parts) return null

    // This is a regex — a pattern matcher. Looks scary but it's doing one simple thing — splitting h1 class="title" into two pieces:
    // parts[1] = h1 — the tag name
    // parts[2] = class="title" — everything after

    const name = parts[1] // tag name
    const attrString = parts[2].trim() // class = "title"

    const attributes: Record<string, string> = {}

    const attrRegex = /(\w+)="([^"]*)"/g // Another regex — this one hunts through class="title" id="main" and pulls out every key-value pair one by one.

    let match
    while ((match = attrRegex.exec(attrString)) !== null) {
        attributes[match[1]] = match[2]
    }

    return { type: 'openTag', name, attributes }
}