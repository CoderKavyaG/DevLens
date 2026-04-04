import { Token } from "./tokenizer"
import { DomNode } from "./domBuilder"

export type StepType = 'tokenizing' | 'building' | 'layouting' | 'painting'

export type Step = {
    type: StepType
    message: string
    tokens?: Token[]
    dom?: DomNode | null
}

const steps: Step[] = []

export function resetSteps() {
    steps.length = 0
}

export function addStep(step: Step) {
    steps.push(step)
}

export function getSteps(): Step[] {
    return steps
}