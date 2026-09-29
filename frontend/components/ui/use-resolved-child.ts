"use client"

import * as React from "react"

const REACT_LAZY_TYPE = Symbol.for("react.lazy")

interface LazyNode {
  $$typeof: symbol
  _payload: unknown
  _init: (payload: unknown) => unknown
}

const isLazy = (node: unknown): node is LazyNode =>
  typeof node === "object" && node !== null && (node as LazyNode).$$typeof === REACT_LAZY_TYPE

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === "object" && value !== null && "then" in value

// Um elemento passado de um Server Component para um Client Component (ex.: o botão `trigger`
// de um diálogo) pode chegar, na navegação, como referência "lazy" — às vezes uma dentro da
// outra. O Slot do Radix (asChild) só desembrulha um nível e falha com "failed to slot onto its
// children". Aqui desembrulhamos todos os níveis; `use` suspende enquanto o conteúdo não chegou.
export function useResolvedChild(node: React.ReactNode): React.ReactNode {
  let current: unknown = node
  while (isLazy(current)) {
    const payload = current._payload
    current = isThenable(payload) ? React.use(payload) : current._init(payload)
  }
  return current as React.ReactNode
}
