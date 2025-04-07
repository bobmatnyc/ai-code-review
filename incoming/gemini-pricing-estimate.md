type GeminiModel = 'gemini-pro' | 'gemini-pro-vision'

interface GeminiPricing {
  inputPer1K: number // USD per 1K input characters
  outputPer1K: number // USD per 1K output characters
}

const GEMINI_PRICING: Record<GeminiModel, GeminiPricing> = {
  'gemini-pro': {
    inputPer1K: 0.00025,
    outputPer1K: 0.0005,
  },
  'gemini-pro-vision': {
    inputPer1K: 0.0005, // Text only — Vision image pricing is separate!
    outputPer1K: 0.001,
  },
}

interface EstimateOptions {
  model: GeminiModel
  input: string
  output: string
}

export function estimateGeminiCost({ model, input, output }: EstimateOptions) {
  const pricing = GEMINI_PRICING[model]

  const inputChars = input.length
  const outputChars = output.length

  const inputCost = (inputChars / 1000) * pricing.inputPer1K
  const outputCost = (outputChars / 1000) * pricing.outputPer1K
  const totalCost = inputCost + outputCost

  return {
    model,
    inputChars,
    outputChars,
    inputCost: +inputCost.toFixed(6),
    outputCost: +outputCost.toFixed(6),
    totalCost: +totalCost.toFixed(6),
  }
}