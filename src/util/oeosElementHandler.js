export const OEOS_ONCLICK_ATTRIBUTE = 'data-oeos-onclick'
export const OEOS_VALUE_ATTRIBUTE = 'data-oeos-value'

export default function(vue, container) {
  const els = container.querySelectorAll(`[${OEOS_ONCLICK_ATTRIBUTE}]`)
  for (const el of els) {
    if (!el._oeosEvents) {
      el._oeosEvents = true
      const oeosCallbackJs = el.getAttribute(OEOS_ONCLICK_ATTRIBUTE)
      el.addEventListener('click', function(e) {
        vue.$emit(
          'oeos-click',
          e,
          el.getAttribute(OEOS_VALUE_ATTRIBUTE),
          oeosCallbackJs
        )
      })
    }
  }
}
